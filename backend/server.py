from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, File, UploadFile
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.orm import selectinload, load_only
import asyncio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Set, Tuple
import uuid
from datetime import datetime, timezone, timedelta, date
from enum import Enum
import smtplib
import unicodedata
from contextlib import suppress
from email.message import EmailMessage

from database import (
    get_db,
    init_db,
    close_db,
    async_session,
    get_database_state,
    set_database_state,
)
from models import (
    StatusTarefa as StatusTarefaModel,
    User as UserModel,
    Tarefa as TarefaModel,
    Contrato as ContratoModel,
    Projeto as ProjetoModel,
    Notificacao as NotificacaoModel,
    TemplatePrazos as TemplatePrazosModel,
    PrazoContrato as PrazoContratoModel,
    StatusCheck as StatusCheckModel
)
from access_control import (
    normalize_setor,
    operador_tem_acesso_tarefa,
    operador_pode_visualizar_tarefa_compartilhada,
    validar_contexto_finalizacao_operador,
)

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
TASK_UPLOADS_DIR = UPLOADS_DIR / "tarefas"
TASK_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI()
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    sender = os.getenv("SMTP_FROM", user)
    use_tls = os.getenv("SMTP_TLS", "true").lower() == "true"

    if not host or not sender or not user or not password:
        logger.warning("SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM")
        return False

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar email: {e}")
        return False


def parse_iso_date(value) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except Exception:
        return None


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFD", str(value))
    without_accents = "".join(
        char for char in normalized
        if unicodedata.category(char) != "Mn"
    )
    return "".join(char for char in without_accents.lower() if char.isalnum())


def calcular_dias_atraso_sync(prazo_str: Optional[str]) -> tuple[int, bool]:
    if not prazo_str:
        return 0, False
    try:
        prazo = datetime.fromisoformat(str(prazo_str)).date()
        hoje = datetime.now(timezone.utc).date()
        if hoje > prazo:
            dias = (hoje - prazo).days
            return dias, True
        return 0, False
    except Exception:
        return 0, False


def is_tarefa_efetivamente_finalizada(tarefa) -> bool:
    if not tarefa:
        return False

    if getattr(tarefa, "finalizada", False):
        return True

    if getattr(tarefa, "data_finalizacao", None):
        return True

    status_norm = normalize_text(getattr(tarefa, "status_nome", ""))
    return any(
        termo in status_norm
        for termo in ("concluido", "finalizado", "entregue")
    )


def resumir_status_projeto(tarefas) -> dict:
    total_tarefas = len(tarefas or [])
    tarefas_concluidas = sum(1 for tarefa in tarefas if is_tarefa_efetivamente_finalizada(tarefa))
    tarefas_abertas = [tarefa for tarefa in tarefas if not is_tarefa_efetivamente_finalizada(tarefa)]
    tarefas_em_andamento = sum(
        1 for tarefa in tarefas_abertas
        if normalize_text(getattr(tarefa, "status_nome", "")) == "emandamento"
    )
    tarefas_pendentes = max(total_tarefas - tarefas_concluidas - tarefas_em_andamento, 0)
    tarefas_atrasadas = 0

    for tarefa in tarefas_abertas:
        _, is_atrasada = calcular_dias_atraso_sync(getattr(tarefa, "prazo", None))
        if is_atrasada:
            tarefas_atrasadas += 1

    if total_tarefas > 0 and tarefas_concluidas == total_tarefas:
        status = "Concluído"
    elif tarefas_atrasadas > 0:
        status = "Atrasado"
    elif tarefas_em_andamento > 0 or tarefas_concluidas > 0:
        status = "Em Andamento"
    else:
        status = "Pendente"

    progresso = round((tarefas_concluidas / total_tarefas) * 100, 1) if total_tarefas else 0

    return {
        "status": status,
        "progresso": progresso,
        "total_tarefas": total_tarefas,
        "tarefas_concluidas": tarefas_concluidas,
        "tarefas_em_andamento": tarefas_em_andamento,
        "tarefas_pendentes": tarefas_pendentes,
        "tarefas_atrasadas": tarefas_atrasadas,
        "tarefas_abertas": tarefas_abertas,
    }


def ordenar_tarefas_fluxo(tarefas) -> list:
    def sort_key(tarefa):
        prazo_original = parse_iso_date(getattr(tarefa, "prazo_original", None))
        prazo_atual = parse_iso_date(getattr(tarefa, "prazo", None))
        criado_em = getattr(tarefa, "criado_em", None)
        criado_em_key = criado_em.isoformat() if isinstance(criado_em, datetime) else ""
        return (
            prazo_original or prazo_atual or date.max,
            prazo_atual or prazo_original or date.max,
            criado_em_key,
            str(getattr(tarefa, "id", "")),
        )

    return sorted(tarefas or [], key=sort_key)


def obter_contexto_etapa_atual(tarefas) -> dict:
    tarefas_ordenadas = ordenar_tarefas_fluxo(tarefas)
    tarefas_abertas = [
        tarefa for tarefa in tarefas_ordenadas
        if not is_tarefa_efetivamente_finalizada(tarefa)
    ]

    if not tarefas_ordenadas or not tarefas_abertas:
        return {
            "tarefa": None,
            "titulo": "Projeto concluído" if tarefas_ordenadas else "Início",
            "ordem": len(tarefas_ordenadas),
            "setor": None,
        }

    ultimo_indice_concluido = max(
        (
            indice for indice, tarefa in enumerate(tarefas_ordenadas)
            if is_tarefa_efetivamente_finalizada(tarefa)
        ),
        default=-1,
    )

    tarefa_atual = next(
        (
            tarefa for indice, tarefa in enumerate(tarefas_ordenadas)
            if indice > ultimo_indice_concluido and not is_tarefa_efetivamente_finalizada(tarefa)
        ),
        None,
    )

    if tarefa_atual is None:
        tarefa_atual = tarefas_abertas[0]

    ordem = next(
        (
            indice for indice, tarefa in enumerate(tarefas_ordenadas, start=1)
            if tarefa.id == tarefa_atual.id
        ),
        1,
    )

    return {
        "tarefa": tarefa_atual,
        "titulo": tarefa_atual.titulo,
        "ordem": ordem,
        "setor": getattr(tarefa_atual, "setor", None),
    }


# ==========================================
# ENUMS
# ==========================================

class UserRole(str, Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"


# ==========================================
# PYDANTIC MODELS - Status Personalizados
# ==========================================

class StatusTarefa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cor: str = "#64748b"
    ordem: int = 0
    tipo: str = "custom"
    ativo: bool = True
    criado_por: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusTarefaCreate(BaseModel):
    nome: str
    cor: str = "#64748b"
    ordem: int = 0


class StatusTarefaUpdate(BaseModel):
    nome: Optional[str] = None
    cor: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


# ==========================================
# PYDANTIC MODELS - User Management
# ==========================================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    nome: str
    role: str = "operador"
    setor: Optional[str] = None
    ativo: bool = False
    aprovado: bool = False
    aprovado_por: Optional[str] = None
    aprovado_em: Optional[datetime] = None
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    nome: str
    role: str = "operador"
    setor: Optional[str] = None


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    setor: Optional[str] = None
    ativo: Optional[bool] = None
    password: Optional[str] = None


class UserApprove(BaseModel):
    aprovado: bool
    aprovado_por: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserPasswordRecovery(BaseModel):
    username: str
    email: str
    nova_senha: str


# ==========================================
# PYDANTIC MODELS - Tarefas
# ==========================================

class HistoricoAcao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    acao: str
    usuario_id: str
    usuario_nome: str
    setor: str
    data: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    detalhes: Optional[str] = None
    observacao: Optional[str] = None
    anexo: Optional[dict] = None


class Tarefa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    descricao: Optional[str] = None
    projeto_id: str
    contrato_id: str
    setor: str
    responsavel_id: Optional[str] = None
    responsavel_nome: Optional[str] = None
    status_id: str
    status_nome: str
    prazo: Optional[str] = None
    prazo_original: Optional[str] = None
    prioridade: str = "media"
    dias_atraso: int = 0
    atrasada: bool = False
    finalizada: bool = False
    data_finalizacao: Optional[datetime] = None
    observacao_finalizacao: Optional[str] = None
    anexos: List[dict] = []
    criado_por_id: str
    criado_por_nome: str
    criado_por_setor: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    historico: List[HistoricoAcao] = []
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TarefaCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    projeto_id: str
    contrato_id: str
    setor: str
    responsavel_id: Optional[str] = None
    responsavel_nome: Optional[str] = None
    status_id: Optional[str] = None
    prazo: Optional[str] = None
    prioridade: str = "media"
    criado_por_id: str
    criado_por_nome: str
    criado_por_setor: str


class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    setor: Optional[str] = None
    responsavel_id: Optional[str] = None
    responsavel_nome: Optional[str] = None
    status_id: Optional[str] = None
    prazo: Optional[str] = None
    prioridade: Optional[str] = None
    finalizada: Optional[bool] = None
    observacao_finalizacao: Optional[str] = None
    data_finalizacao: Optional[str] = None
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: str = "operador"


class TarefaReabrir(BaseModel):
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: str = "operador"


class TarefaFinalizar(BaseModel):
    observacao: Optional[str] = None
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: str = "operador"
    contrato_id_selecionado: Optional[str] = None


class TarefaFinalizarLote(BaseModel):
    tarefa_ids: List[str]
    observacao: Optional[str] = None
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: str = "admin"


class TarefaAlterarStatus(BaseModel):
    status_id: str
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: Optional[str] = None
    contrato_id_selecionado: Optional[str] = None
    observacao: Optional[str] = None


# ==========================================
# PYDANTIC MODELS - Projetos e Contratos
# ==========================================

class Contrato(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente: str
    faculdade: str
    curso: Optional[str] = None
    numero_contrato: str
    valor: float
    pago: bool = False
    data_inicio: str
    data_fim: Optional[str] = None
    data_aditivo: Optional[str] = None
    observacao: Optional[str] = None
    status: str = "Ativo"
    template_id: Optional[str] = None
    template_nome: Optional[str] = None
    projeto_id: Optional[str] = None
    criado_por: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContratoCreate(BaseModel):
    cliente: str
    faculdade: str
    curso: Optional[str] = None
    numero_contrato: str
    valor: float = 0.0
    pago: bool = False
    data_inicio: str
    data_fim: Optional[str] = None
    observacao: Optional[str] = None
    template_id: str
    criado_por: str
    atribuir_operadores: bool = False
    responsavel_atendimento_id: Optional[str] = None
    responsavel_criacao_id: Optional[str] = None


class ContratoUpdate(BaseModel):
    cliente: Optional[str] = None
    faculdade: Optional[str] = None
    curso: Optional[str] = None
    numero_contrato: Optional[str] = None
    valor: Optional[float] = None
    pago: Optional[bool] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    data_aditivo: Optional[str] = None
    observacao: Optional[str] = None
    status: Optional[str] = None


class ContratoAditivoUpdate(BaseModel):
    data_aditivo: str


class ProjetoResponsaveisUpdate(BaseModel):
    user_role: str
    user_id: Optional[str] = None
    user_nome: Optional[str] = None
    user_setor: Optional[str] = None
    responsavel_atendimento_id: Optional[str] = None
    responsavel_criacao_id: Optional[str] = None
    aplicar_finalizadas: bool = False


class ProjetoPrazoItem(BaseModel):
    tarefa_id: str
    prazo: Optional[str] = None


class ProjetoPrazosUpdate(BaseModel):
    user_role: str
    user_id: Optional[str] = None
    user_nome: Optional[str] = None
    user_setor: Optional[str] = None
    prazos: List[ProjetoPrazoItem]


class Projeto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contrato_id: str
    cliente: str
    etapa_atual: str = "Informar recebimento do contrato"
    etapa_atual_ordem: int = 1
    progresso: float = 0.0
    risco: str = "baixo"
    dias_restantes: int = 134
    data_inicio: str
    data_fim_prevista: str
    template_id: str
    template_nome: str
    status: str = "Em Andamento"
    criado_por: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Notificacao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str
    titulo: str
    mensagem: str
    de_usuario_id: str
    de_usuario_nome: str
    para_usuario_id: str
    para_usuario_nome: str
    tarefa_id: Optional[str] = None
    projeto_id: Optional[str] = None
    lida: bool = False
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificacaoCreate(BaseModel):
    tipo: str
    titulo: str
    mensagem: str
    de_usuario_id: str
    de_usuario_nome: str
    para_usuario_id: str
    para_usuario_nome: str
    tarefa_id: Optional[str] = None
    projeto_id: Optional[str] = None


class CobrancaOperador(BaseModel):
    tarefa_id: str
    operador_id: str
    operador_nome: str
    operador_email: str
    mensagem: str
    gerente_id: str
    gerente_nome: str
    enviar_email: bool = True


class RespostaCobranca(BaseModel):
    notificacao_id: str
    resposta: str
    operador_id: str
    operador_nome: str


class ProjetoAtraso(BaseModel):
    projeto_id: str
    cliente: str
    setor: str
    etapa_nome: str
    dias_atraso: int
    responsavel: Optional[str] = None


# ==========================================
# PYDANTIC MODELS - Template de Prazos
# ==========================================

class EtapaPrazo(BaseModel):
    etapa_id: int
    etapa_nome: str
    departamento: str
    prazo_dias: int
    descricao: Optional[str] = None


class TemplatePrazos(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    etapas: List[EtapaPrazo] = []
    prazo_total_dias: int = 0
    ativo: bool = True
    criado_por: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TemplatePrazosCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    etapas: List[dict] = []
    criado_por: Optional[str] = None


class TemplatePrazosUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    etapas: Optional[List[dict]] = None
    ativo: Optional[bool] = None


# ==========================================
# HELPER FUNCTIONS
# ==========================================

# Ordem dos setores no fluxo de trabalho
SETORES_ORDEM = {
    "atendimento": 1,
    "criacao": 2,
    "pre-producao": 3,
    "producao": 4
}

def verificar_acesso_setor(usuario_role: str, usuario_setor: str, setor_tarefa: str) -> bool:
    """
    Verifica se o operador tem acesso ao setor da tarefa.
    - Admin e gerente tem acesso a todos os setores
    - Operador so pode acessar seu setor ou o setor anterior no fluxo
    """
    if usuario_role in ["admin", "gerente"]:
        return True

    if usuario_role != "operador":
        return False

    usuario_setor_padrao = normalize_setor(usuario_setor)
    setor_tarefa_padrao = normalize_setor(setor_tarefa)

    ordem_usuario = SETORES_ORDEM.get(usuario_setor_padrao, 0)
    ordem_tarefa = SETORES_ORDEM.get(setor_tarefa_padrao, 0)

    # Operador pode acessar seu setor ou o setor anterior
    return ordem_usuario == ordem_tarefa or ordem_usuario == ordem_tarefa + 1


def verificar_pode_finalizar_tarefa(usuario_role: str, usuario_setor: str, setor_tarefa: str) -> bool:
    """
    Verifica se o operador pode finalizar a tarefa.
    - Admin e gerente podem finalizar qualquer tarefa
    - Operador so pode finalizar tarefas do seu proprio setor
    """
    if usuario_role in ["admin", "gerente"]:
        return True

    if usuario_role != "operador":
        return False

    return normalize_setor(usuario_setor) == normalize_setor(setor_tarefa)


def validar_contexto_usuario_operador(usuario_id: Optional[str], usuario_setor: Optional[str]) -> None:
    if not usuario_id or not usuario_setor:
        raise HTTPException(
            status_code=400,
            detail="Operador deve informar usuario_id e usuario_setor.",
        )


async def obter_ids_atribuicoes_operador(
    db: AsyncSession,
    usuario_id: str,
    usuario_setor: str,
) -> Tuple[Set[str], Set[str]]:
    """
    Retorna IDs de projetos e contratos com tarefas atribuidas ao operador
    no mesmo setor do operador logado.
    """
    query = select(
        TarefaModel.projeto_id,
        TarefaModel.contrato_id,
        TarefaModel.setor,
    ).where(TarefaModel.responsavel_id == usuario_id)
    result = await db.execute(query)

    projetos_ids: Set[str] = set()
    contratos_ids: Set[str] = set()
    setor_operador = normalize_setor(usuario_setor)

    for projeto_id, contrato_id, setor_tarefa in result.all():
        if normalize_setor(setor_tarefa) != setor_operador:
            continue
        if projeto_id:
            projetos_ids.add(projeto_id)
        if contrato_id:
            contratos_ids.add(contrato_id)

    return projetos_ids, contratos_ids


def model_to_dict(obj) -> dict:
    """Convert SQLAlchemy model to dictionary"""
    if obj is None:
        return None
    
    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value
    return result


def sanitize_uploaded_filename(filename: str) -> str:
    safe_name = "".join(
        ch if ch.isalnum() or ch in {".", "_", "-"} else "_"
        for ch in (filename or "arquivo")
    ).strip("._")
    return safe_name or "arquivo"


def tarefa_tem_acesso(usuario_role: Optional[str], usuario_id: Optional[str], usuario_setor: Optional[str], tarefa: TarefaModel) -> bool:
    if usuario_role == "operador":
        if not usuario_id or not usuario_setor:
            return False
        return operador_tem_acesso_tarefa(
            tarefa_operador_id=tarefa.responsavel_id,
            tarefa_setor=tarefa.setor,
            usuario_id=usuario_id,
            usuario_setor=usuario_setor,
        )

    if usuario_role == "gerente":
        return verificar_acesso_setor(usuario_role, usuario_setor, tarefa.setor)

    return True


def operador_compartilha_contexto_contrato(
    *,
    tarefa_projeto_id: Optional[str],
    tarefa_contrato_id: Optional[str],
    projetos_ids: Set[str],
    contratos_ids: Set[str],
) -> bool:
    return (
        (tarefa_projeto_id and tarefa_projeto_id in projetos_ids)
        or (tarefa_contrato_id and tarefa_contrato_id in contratos_ids)
    )


def filtro_tarefas_no_escopo_operador(
    *,
    projetos_ids: Set[str],
    contratos_ids: Set[str],
):
    conditions = []
    if projetos_ids:
        conditions.append(TarefaModel.projeto_id.in_(projetos_ids))
    if contratos_ids:
        conditions.append(TarefaModel.contrato_id.in_(contratos_ids))
    if not conditions:
        return False
    if len(conditions) == 1:
        return conditions[0]
    return or_(*conditions)


def tarefa_visivel_para_operador_no_contexto(
    *,
    tarefa_projeto_id: Optional[str],
    tarefa_contrato_id: Optional[str],
    tarefa_operador_id: Optional[str],
    tarefa_setor: Optional[str],
    usuario_id: Optional[str],
    usuario_setor: Optional[str],
    projetos_ids: Set[str],
    contratos_ids: Set[str],
) -> bool:
    return operador_tem_acesso_tarefa(
        tarefa_operador_id=tarefa_operador_id,
        tarefa_setor=tarefa_setor,
        usuario_id=usuario_id,
        usuario_setor=usuario_setor,
    ) or operador_pode_visualizar_tarefa_compartilhada(
        tarefa_setor=tarefa_setor,
        usuario_setor=usuario_setor,
        compartilha_contrato=operador_compartilha_contexto_contrato(
            tarefa_projeto_id=tarefa_projeto_id,
            tarefa_contrato_id=tarefa_contrato_id,
            projetos_ids=projetos_ids,
            contratos_ids=contratos_ids,
        ),
    )


async def obter_usuario_operador_validado(
    db: AsyncSession,
    user_id: Optional[str],
    setor_esperado: str,
) -> Optional[UserModel]:
    if not user_id:
        return None

    result = await db.execute(
        select(UserModel).where(UserModel.id == user_id)
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        return None
    if not (usuario.ativo and usuario.aprovado):
        return None
    if usuario.role != "operador":
        return None
    if normalize_setor(usuario.setor) != normalize_setor(setor_esperado):
        return None
    return usuario


async def obter_status_por_nome(db: AsyncSession, nome_status: str) -> Optional[StatusTarefaModel]:
    result = await db.execute(select(StatusTarefaModel))
    statuses = result.scalars().all()
    status_alvo = normalize_text(nome_status)

    for status in statuses:
        if normalize_text(status.nome) == status_alvo:
            return status

    return None


async def atualizar_responsaveis_projeto(
    db: AsyncSession,
    projeto_id: str,
    *,
    usuario_id: str,
    usuario_nome: str,
    usuario_setor: str,
    responsavel_atendimento_id: Optional[str],
    responsavel_criacao_id: Optional[str],
    aplicar_finalizadas: bool = False,
) -> dict:
    atendimento = await obter_usuario_operador_validado(db, responsavel_atendimento_id, "atendimento")
    criacao = await obter_usuario_operador_validado(db, responsavel_criacao_id, "criacao")

    result = await db.execute(
        select(TarefaModel)
        .where(TarefaModel.projeto_id == projeto_id)
        .order_by(TarefaModel.criado_em)
    )
    tarefas = result.scalars().all()
    if not tarefas:
        raise HTTPException(status_code=404, detail="Projeto sem tarefas cadastradas")

    atualizacoes = []
    now = datetime.now(timezone.utc)

    for tarefa in tarefas:
        setor = normalize_setor(tarefa.setor)
        if setor not in {"atendimento", "criacao"}:
            continue
        if tarefa.finalizada and not aplicar_finalizadas:
            continue

        novo_responsavel = atendimento if setor == "atendimento" else criacao
        novo_id = novo_responsavel.id if novo_responsavel else None
        novo_nome = novo_responsavel.nome if novo_responsavel else None

        if tarefa.responsavel_id == novo_id and tarefa.responsavel_nome == novo_nome:
            continue

        anterior = tarefa.responsavel_nome or "Sem responsável"
        atual = novo_nome or "Sem responsável"
        tarefa.responsavel_id = novo_id
        tarefa.responsavel_nome = novo_nome
        tarefa.atualizado_em = now

        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "responsavel_projeto_atualizado",
            "usuario_id": usuario_id,
            "usuario_nome": usuario_nome,
            "setor": usuario_setor,
            "data": now.isoformat(),
            "detalhes": f"Responsável ajustado em lote de {anterior} para {atual}",
        })
        tarefa.historico = historico

        atualizacoes.append({
            "tarefa_id": tarefa.id,
            "titulo": tarefa.titulo,
            "setor": tarefa.setor,
            "responsavel_nome": novo_nome,
        })

    await db.commit()
    return {
        "atualizacoes": atualizacoes,
        "responsavel_atendimento": {"id": atendimento.id, "nome": atendimento.nome} if atendimento else None,
        "responsavel_criacao": {"id": criacao.id, "nome": criacao.nome} if criacao else None,
    }


async def enriquecer_tarefas_com_contrato(db: AsyncSession, tarefas_payload):
    """Adiciona metadados do contrato nas respostas de tarefas."""
    if isinstance(tarefas_payload, dict):
        tarefas_list = [tarefas_payload]
        single_item = True
    else:
        tarefas_list = list(tarefas_payload or [])
        single_item = False

    contrato_ids = {tarefa.get("contrato_id") for tarefa in tarefas_list if tarefa.get("contrato_id")}
    contratos_map = {}

    if contrato_ids:
        result = await db.execute(
            select(ContratoModel).where(ContratoModel.id.in_(contrato_ids))
        )
        contratos_map = {contrato.id: contrato for contrato in result.scalars().all()}

    for tarefa in tarefas_list:
        contrato = contratos_map.get(tarefa.get("contrato_id"))
        tarefa["anexos"] = tarefa.get("anexos") or []
        tarefa["contrato_numero"] = contrato.numero_contrato if contrato else None
        tarefa["contrato_cliente"] = contrato.cliente if contrato else None
        tarefa["contrato_faculdade"] = contrato.faculdade if contrato else None
        tarefa["contrato_curso"] = contrato.curso if contrato else None

        resumo_partes = [
            tarefa.get("contrato_numero"),
            tarefa.get("contrato_cliente"),
        ]
        resumo = " - ".join([parte for parte in resumo_partes if parte])
        tarefa["contrato_resumo"] = resumo or tarefa.get("contrato_id")

    if single_item:
        return tarefas_list[0] if tarefas_list else {}

    return tarefas_list


async def calcular_dias_atraso(prazo_str: Optional[str]) -> tuple:
    """Calculate days of delay for a task"""
    return calcular_dias_atraso_sync(prazo_str)


async def get_status_padrao(db: AsyncSession):
    """Get or create default statuses"""
    result = await db.execute(select(func.count(StatusTarefaModel.id)))
    status_count = result.scalar()
    
    if status_count == 0:
        # Create default statuses
        default_statuses = [
            StatusTarefaModel(id=str(uuid.uuid4()), nome="Pendente", cor="#94a3b8", ordem=1, tipo="sistema", ativo=True, criado_por="sistema"),
            StatusTarefaModel(id=str(uuid.uuid4()), nome="Em Andamento", cor="#3b82f6", ordem=2, tipo="sistema", ativo=True, criado_por="sistema"),
            StatusTarefaModel(id=str(uuid.uuid4()), nome="Aguardando", cor="#f59e0b", ordem=3, tipo="sistema", ativo=True, criado_por="sistema"),
            StatusTarefaModel(id=str(uuid.uuid4()), nome="Concluído", cor="#10b981", ordem=4, tipo="sistema", ativo=True, criado_por="sistema"),
        ]
        for status in default_statuses:
            db.add(status)
        await db.commit()
        return [model_to_dict(s) for s in default_statuses]
    
    result = await db.execute(
        select(StatusTarefaModel)
        .where(StatusTarefaModel.ativo == True)
        .order_by(StatusTarefaModel.ordem)
    )
    return [model_to_dict(s) for s in result.scalars().all()]


async def recalcular_prazos_projeto(db: AsyncSession, projeto_id: str, tarefa_finalizada_id: str, data_finalizacao: datetime):
    """Recalcula os prazos das tarefas seguintes baseado na data de finalização da tarefa anterior."""
    # Buscar a tarefa finalizada
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_finalizada_id)
    )
    tarefa_finalizada = result.scalar_one_or_none()
    
    if not tarefa_finalizada:
        return []
    
    # Buscar todas as tarefas do projeto não finalizadas
    result = await db.execute(
        select(TarefaModel)
        .where(and_(
            TarefaModel.projeto_id == projeto_id,
            TarefaModel.finalizada == False
        ))
        .order_by(TarefaModel.prazo_original)
    )
    tarefas_projeto = result.scalars().all()
    
    if not tarefas_projeto:
        return []
    
    # Data base é a data de finalização real
    data_base = data_finalizacao.date() if isinstance(data_finalizacao, datetime) else datetime.fromisoformat(str(data_finalizacao)).date()
    prazo_anterior = tarefa_finalizada.prazo_original or tarefa_finalizada.prazo
    
    tarefas_atualizadas = []
    
    for tarefa in tarefas_projeto:
        # Calcular diferença de dias original
        if tarefa.prazo_original and prazo_anterior:
            try:
                prazo_original_tarefa = datetime.fromisoformat(tarefa.prazo_original).date()
                prazo_original_anterior = datetime.fromisoformat(prazo_anterior).date()
                dias_diferenca = (prazo_original_tarefa - prazo_original_anterior).days
                if dias_diferenca < 0:
                    dias_diferenca = 1
            except Exception:
                dias_diferenca = 0
        else:
            dias_diferenca = 0
        
        # Novo prazo baseado na data de finalização real + diferença
        novo_prazo = data_base + timedelta(days=max(dias_diferenca, 0))
        prazo_antigo = tarefa.prazo
        
        # Atualizar histórico
        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "prazo_recalculado",
            "usuario_id": "sistema",
            "usuario_nome": "Sistema",
            "setor": "sistema",
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": f"Prazo recalculado de {prazo_antigo} para {novo_prazo.isoformat()} (baseado na entrega anterior)"
        })
        
        tarefa.prazo = novo_prazo.isoformat()
        tarefa.historico = historico
        tarefa.atualizado_em = datetime.now(timezone.utc)
        
        tarefas_atualizadas.append({
            "id": tarefa.id,
            "titulo": tarefa.titulo,
            "prazo_anterior": prazo_antigo,
            "novo_prazo": novo_prazo.isoformat()
        })
        
        # Atualizar referências para próxima iteração
        data_base = novo_prazo
        prazo_anterior = tarefa.prazo_original
    
    await db.commit()
    return tarefas_atualizadas


async def recalcular_prazos_a_partir_de_tarefa(
    db: AsyncSession,
    projeto_id: str,
    tarefa_base_id: str,
    data_base: date,
):
    """Recalcula os prazos das tarefas seguintes baseado na data base informada."""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_base_id)
    )
    tarefa_base = result.scalar_one_or_none()
    if not tarefa_base:
        return []

    base_date = parse_iso_date(data_base)
    if not base_date:
        return []

    prazo_anterior = tarefa_base.prazo_original or tarefa_base.prazo

    result = await db.execute(
        select(TarefaModel)
        .where(and_(
            TarefaModel.projeto_id == projeto_id,
            TarefaModel.finalizada == False
        ))
        .order_by(TarefaModel.prazo_original)
    )
    tarefas_projeto = result.scalars().all()

    if not tarefas_projeto:
        return []

    base_index = next((i for i, t in enumerate(tarefas_projeto) if t.id == tarefa_base_id), None)
    if base_index is None:
        return []

    tarefas_alvo = tarefas_projeto[base_index + 1:]
    if not tarefas_alvo:
        return []

    tarefas_atualizadas = []
    data_cursor = base_date

    for tarefa in tarefas_alvo:
        if tarefa.prazo_original and prazo_anterior:
            try:
                prazo_original_tarefa = datetime.fromisoformat(tarefa.prazo_original).date()
                prazo_original_anterior = datetime.fromisoformat(prazo_anterior).date()
                dias_diferenca = (prazo_original_tarefa - prazo_original_anterior).days
                if dias_diferenca < 0:
                    dias_diferenca = 1
            except Exception:
                dias_diferenca = 0
        else:
            dias_diferenca = 0

        novo_prazo = data_cursor + timedelta(days=max(dias_diferenca, 0))
        prazo_antigo = tarefa.prazo

        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "prazo_recalculado",
            "usuario_id": "sistema",
            "usuario_nome": "Sistema",
            "setor": "sistema",
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": f"Prazo recalculado de {prazo_antigo} para {novo_prazo.isoformat()} (baseado na edição anterior)"
        })

        tarefa.prazo = novo_prazo.isoformat()
        tarefa.historico = historico
        tarefa.atualizado_em = datetime.now(timezone.utc)

        tarefas_atualizadas.append({
            "id": tarefa.id,
            "titulo": tarefa.titulo,
            "prazo_anterior": prazo_antigo,
            "novo_prazo": novo_prazo.isoformat()
        })

        data_cursor = novo_prazo
        prazo_anterior = tarefa.prazo_original

    await db.commit()
    return tarefas_atualizadas


async def atualizar_projeto_prazos(db: AsyncSession, projeto_id: str):
    """Atualiza data_fim_prevista, dias_restantes e etapa_atual com base nas tarefas."""
    result = await db.execute(
        select(ProjetoModel).where(ProjetoModel.id == projeto_id)
    )
    projeto = result.scalar_one_or_none()
    if not projeto:
        return None

    tarefas_result = await db.execute(
        select(TarefaModel)
        .where(TarefaModel.projeto_id == projeto_id)
        .order_by(TarefaModel.prazo_original)
    )
    tarefas = ordenar_tarefas_fluxo(tarefas_result.scalars().all())
    resumo_projeto = resumir_status_projeto(tarefas)
    etapa_contexto = obter_contexto_etapa_atual(tarefas)

    last_date = None

    for tarefa in tarefas:
        prazo_dt = (
            parse_iso_date(tarefa.data_finalizacao)
            if is_tarefa_efetivamente_finalizada(tarefa)
            else parse_iso_date(tarefa.prazo)
        ) or parse_iso_date(tarefa.prazo)
        if prazo_dt and (not last_date or prazo_dt > last_date):
            last_date = prazo_dt

    if last_date:
        projeto.data_fim_prevista = last_date.isoformat()
        hoje = datetime.now(timezone.utc).date()
        projeto.dias_restantes = max((last_date - hoje).days, 0)

        # Atualizar contrato e prazo do contrato vinculados
        if projeto.contrato_id:
            contrato_result = await db.execute(
                select(ContratoModel).where(ContratoModel.id == projeto.contrato_id)
            )
            contrato = contrato_result.scalar_one_or_none()
            if contrato:
                contrato.data_fim = last_date.isoformat()
                contrato.atualizado_em = datetime.now(timezone.utc)

            prazo_result = await db.execute(
                select(PrazoContratoModel).where(PrazoContratoModel.contrato_id == projeto.contrato_id)
            )
            prazo = prazo_result.scalar_one_or_none()
            if prazo:
                prazo.data_fim_prevista = last_date.isoformat()

    if tarefas:
        projeto.etapa_atual = etapa_contexto["titulo"]
        projeto.etapa_atual_ordem = etapa_contexto["ordem"]

    projeto.progresso = resumo_projeto["progresso"]
    status_calculado = resumo_projeto["status"]
    projeto.status = "Finalizado" if status_calculado == "Concluído" else status_calculado
    if status_calculado == "Concluído":
        projeto.dias_restantes = 0
        if projeto.contrato_id:
            contrato_concluido_result = await db.execute(
                select(ContratoModel).where(ContratoModel.id == projeto.contrato_id)
            )
            contrato_concluido = contrato_concluido_result.scalar_one_or_none()
            if contrato_concluido:
                contrato_concluido.status = "Finalizado"
                contrato_concluido.atualizado_em = datetime.now(timezone.utc)

    projeto.atualizado_em = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(projeto)
    return model_to_dict(projeto)


async def aplicar_aditivo_contrato(
    db: AsyncSession,
    contrato: ContratoModel,
    data_aditivo: str
):
    """Redistribui proporcionalmente os prazos pendentes de um contrato ate a nova data final."""
    nova_data_final = parse_iso_date(data_aditivo)
    if not nova_data_final:
        raise HTTPException(status_code=400, detail="Data de aditivo invalida")

    if not contrato.projeto_id:
        raise HTTPException(status_code=400, detail="Contrato sem projeto vinculado")

    projeto_result = await db.execute(
        select(ProjetoModel).where(ProjetoModel.id == contrato.projeto_id)
    )
    projeto = projeto_result.scalar_one_or_none()
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto do contrato nao encontrado")

    tarefas_result = await db.execute(
        select(TarefaModel)
        .where(TarefaModel.projeto_id == contrato.projeto_id)
        .order_by(TarefaModel.prazo_original, TarefaModel.criado_em)
    )
    tarefas = tarefas_result.scalars().all()
    if not tarefas:
        raise HTTPException(status_code=400, detail="Contrato sem etapas cadastradas")

    datas_finalizadas = [
        parse_iso_date(tarefa.data_finalizacao) or parse_iso_date(tarefa.prazo)
        for tarefa in tarefas
        if tarefa.finalizada
    ]
    datas_finalizadas = [dt for dt in datas_finalizadas if dt]

    data_ancora = (
        max(datas_finalizadas)
        if datas_finalizadas
        else parse_iso_date(projeto.data_inicio)
    ) or datetime.now(timezone.utc).date()

    if nova_data_final < data_ancora:
        raise HTTPException(
            status_code=400,
            detail="Data de aditivo deve ser posterior a ultima etapa concluida"
        )

    tarefas_pendentes = [tarefa for tarefa in tarefas if not tarefa.finalizada]
    if not tarefas_pendentes:
        raise HTTPException(status_code=400, detail="Nao ha etapas pendentes para recalcular")

    def data_referencia_tarefa(tarefa: TarefaModel):
        return parse_iso_date(tarefa.prazo) or parse_iso_date(tarefa.prazo_original) or data_ancora

    tarefas_pendentes.sort(
        key=lambda tarefa: (
            data_referencia_tarefa(tarefa),
            tarefa.criado_em or datetime.min.replace(tzinfo=timezone.utc),
            tarefa.titulo or "",
        )
    )

    data_final_atual = max(data_referencia_tarefa(tarefa) for tarefa in tarefas_pendentes)
    dias_totais_atuais = max((data_final_atual - data_ancora).days, 1)
    dias_totais_novos = max((nova_data_final - data_ancora).days, 0)

    prazos_recalculados = []
    ultima_data_aplicada = data_ancora

    for idx, tarefa in enumerate(tarefas_pendentes):
        prazo_antigo = tarefa.prazo
        data_atual_tarefa = data_referencia_tarefa(tarefa)

        if idx == len(tarefas_pendentes) - 1:
            novo_prazo = nova_data_final
        else:
            dias_desde_ancora = max((data_atual_tarefa - data_ancora).days, 0)
            proporcao = dias_desde_ancora / dias_totais_atuais
            novo_offset = round(proporcao * dias_totais_novos)
            novo_prazo = data_ancora + timedelta(days=novo_offset)
            if novo_prazo < ultima_data_aplicada:
                novo_prazo = ultima_data_aplicada
            if novo_prazo > nova_data_final:
                novo_prazo = nova_data_final

        tarefa.prazo = novo_prazo.isoformat()
        tarefa.prazo_original = novo_prazo.isoformat()
        tarefa.dias_atraso, tarefa.atrasada = await calcular_dias_atraso(tarefa.prazo)
        tarefa.atualizado_em = datetime.now(timezone.utc)

        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "aditivo_aplicado",
            "usuario_id": "sistema",
            "usuario_nome": "Sistema",
            "setor": "sistema",
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": (
                f"Prazo reajustado via aditivo contratual de {prazo_antigo} "
                f"para {tarefa.prazo} ate a nova data final {nova_data_final.isoformat()}"
            ),
        })
        tarefa.historico = historico

        prazos_recalculados.append({
            "tarefa_id": tarefa.id,
            "titulo": tarefa.titulo,
            "prazo_anterior": prazo_antigo,
            "novo_prazo": tarefa.prazo,
            "setor": tarefa.setor,
        })
        ultima_data_aplicada = novo_prazo

    prazo_result = await db.execute(
        select(PrazoContratoModel).where(PrazoContratoModel.contrato_id == contrato.id)
    )
    prazo_contrato = prazo_result.scalar_one_or_none()
    if prazo_contrato:
        etapas_recalculadas = []
        data_inicio_cursor = parse_iso_date(projeto.data_inicio) or data_ancora
        for tarefa in tarefas:
            data_fim_tarefa = (
                parse_iso_date(tarefa.data_finalizacao)
                if tarefa.finalizada
                else parse_iso_date(tarefa.prazo)
            ) or parse_iso_date(tarefa.prazo) or data_inicio_cursor
            etapas_recalculadas.append({
                "etapa_id": tarefa.id,
                "etapa_nome": tarefa.titulo,
                "departamento": tarefa.setor,
                "data_inicio": data_inicio_cursor.isoformat(),
                "data_fim": data_fim_tarefa.isoformat(),
                "prazo_dias": max((data_fim_tarefa - data_inicio_cursor).days, 0),
            })
            data_inicio_cursor = data_fim_tarefa

        prazo_contrato.data_fim_prevista = nova_data_final.isoformat()
        prazo_contrato.prazo_total_dias = max(
            (nova_data_final - (parse_iso_date(projeto.data_inicio) or data_ancora)).days,
            0,
        )
        prazo_contrato.etapas = etapas_recalculadas

    contrato.data_aditivo = nova_data_final.isoformat()
    contrato.data_fim = nova_data_final.isoformat()
    contrato.atualizado_em = datetime.now(timezone.utc)

    projeto.data_fim_prevista = nova_data_final.isoformat()
    projeto.atualizado_em = datetime.now(timezone.utc)

    projeto_atualizado = await atualizar_projeto_prazos(db, contrato.projeto_id)
    await db.refresh(contrato)

    return {
        "contrato": model_to_dict(contrato),
        "projeto": projeto_atualizado,
        "prazos_recalculados": prazos_recalculados,
    }


async def aplicar_template_no_projeto(
    db: AsyncSession,
    projeto_id: str,
    template: TemplatePrazosModel,
    data_inicio: Optional[str] = None
):
    """Aplica um template de prazos ao projeto, atualizando prazos das tarefas não finalizadas."""
    result = await db.execute(
        select(ProjetoModel).where(ProjetoModel.id == projeto_id)
    )
    projeto = result.scalar_one_or_none()
    if not projeto:
        return None

    tarefas_result = await db.execute(
        select(TarefaModel)
        .where(TarefaModel.projeto_id == projeto_id)
        .order_by(TarefaModel.prazo_original)
    )
    tarefas = tarefas_result.scalars().all()
    if not tarefas:
        return None

    inicio_base = parse_iso_date(data_inicio) or parse_iso_date(projeto.data_inicio) or datetime.now(timezone.utc).date()
    data_cursor = inicio_base

    etapas = template.etapas or []
    total_etapas = len(etapas)

    for idx, tarefa in enumerate(tarefas):
        if idx >= total_etapas:
            break

        etapa = etapas[idx]
        prazo_dias = etapa.get("prazo_dias", 0)
        data_fim = data_cursor + timedelta(days=prazo_dias)

        if tarefa.finalizada:
            data_cursor = parse_iso_date(tarefa.data_finalizacao) or parse_iso_date(tarefa.prazo) or data_fim
            continue

        prazo_anterior = tarefa.prazo
        tarefa.prazo = data_fim.isoformat()
        tarefa.prazo_original = data_fim.isoformat()
        dias_atraso, atrasada = await calcular_dias_atraso(tarefa.prazo)
        tarefa.dias_atraso = dias_atraso
        tarefa.atrasada = atrasada
        tarefa.atualizado_em = datetime.now(timezone.utc)

        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "prazo_recalculado",
            "usuario_id": "sistema",
            "usuario_nome": "Sistema",
            "setor": "sistema",
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": f"Prazo recalculado de {prazo_anterior} para {tarefa.prazo} (aplicação de template)"
        })
        tarefa.historico = historico

        data_cursor = data_fim

    projeto.template_id = template.id
    projeto.template_nome = template.nome
    projeto.atualizado_em = datetime.now(timezone.utc)

    await db.commit()
    await atualizar_projeto_prazos(db, projeto_id)
    return model_to_dict(projeto)


# ==========================================
# ROUTES - Health Check
# ==========================================

@api_router.get("/")
async def root():
    return {"message": "IDEIABH API - Sistema de Gestão Operacional (PostgreSQL)"}


@api_router.get("/health")
async def health_check():
    database_state = get_database_state()
    database_ready = database_state["ready"]
    return {
        "status": "healthy" if database_ready else "starting",
        "database": "postgresql",
        "database_status": "ready" if database_ready else "starting",
        "database_error": database_state["error"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ==========================================
# ROUTES - Status de Tarefas
# ==========================================

def _normalizar_texto_status(nome: Optional[str]) -> str:
    if not nome:
        return ""
    return "".join(ch for ch in nome.lower() if ch.isalnum())


def _status_teste_postgres(nome: Optional[str]) -> bool:
    normalizado = _normalizar_texto_status(nome)
    return normalizado.startswith("statustestepostgre")


@api_router.get("/status-tarefas", response_model=List[dict])
async def listar_status_tarefas(db: AsyncSession = Depends(get_db)):
    """Lista todos os status de tarefas ativos"""
    await get_status_padrao(db)
    result = await db.execute(
        select(StatusTarefaModel)
        .where(StatusTarefaModel.ativo == True)
        .order_by(StatusTarefaModel.ordem)
    )
    status = [model_to_dict(s) for s in result.scalars().all()]
    return [s for s in status if not _status_teste_postgres(s.get("nome"))]


@api_router.post("/status-tarefas", response_model=dict)
async def criar_status_tarefa(
    input: StatusTarefaCreate,
    user_role: str = Query(...),
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo status de tarefa (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar status")
    
    # Check if status with same name exists
    result = await db.execute(
        select(StatusTarefaModel).where(StatusTarefaModel.nome == input.nome)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um status com este nome")
    
    status_obj = StatusTarefaModel(
        id=str(uuid.uuid4()),
        nome=input.nome,
        cor=input.cor,
        ordem=input.ordem,
        tipo="custom",
        criado_por=user_id
    )
    
    db.add(status_obj)
    await db.commit()
    await db.refresh(status_obj)
    
    return model_to_dict(status_obj)


@api_router.put("/status-tarefas/{status_id}", response_model=dict)
async def atualizar_status_tarefa(
    status_id: str,
    input: StatusTarefaUpdate,
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um status de tarefa (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar status")
    
    result = await db.execute(
        select(StatusTarefaModel).where(StatusTarefaModel.id == status_id)
    )
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Status não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    await db.commit()
    await db.refresh(existing)
    
    return model_to_dict(existing)


@api_router.delete("/status-tarefas/{status_id}")
async def deletar_status_tarefa(
    status_id: str,
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta um status de tarefa (apenas admin, apenas status custom)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar status")
    
    result = await db.execute(
        select(StatusTarefaModel).where(StatusTarefaModel.id == status_id)
    )
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Status não encontrado")
    
    if existing.tipo == "sistema":
        raise HTTPException(status_code=400, detail="Não é possível deletar status do sistema")
    
    # Check if any task uses this status
    result = await db.execute(
        select(func.count(TarefaModel.id)).where(TarefaModel.status_id == status_id)
    )
    tasks_count = result.scalar()
    if tasks_count > 0:
        raise HTTPException(status_code=400, detail=f"Existem {tasks_count} tarefas usando este status")
    
    await db.delete(existing)
    await db.commit()
    return {"message": "Status deletado com sucesso"}


# ==========================================
# ROUTES - Users
# ==========================================

@api_router.post("/auth/register", response_model=dict)
async def register_user(input: UserCreate, db: AsyncSession = Depends(get_db)):
    """Registra novo usuário (aguarda aprovação do admin)"""
    import bcrypt
    
    # Verificar se username já existe
    result = await db.execute(
        select(UserModel).where(UserModel.username == input.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username já existe")
    
    # Verificar se email já existe
    result = await db.execute(
        select(UserModel).where(UserModel.email == input.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Validar setor para operadores
    if input.role == "operador" and not input.setor:
        raise HTTPException(status_code=400, detail="Operadores devem ter um setor definido")
    
    # Hash da senha
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Criar usuário
    user_obj = UserModel(
        id=str(uuid.uuid4()),
        username=input.username,
        email=input.email,
        password_hash=password_hash,
        nome=input.nome,
        role=input.role,
        setor=input.setor,
        ativo=False,
        aprovado=False
    )
    
    db.add(user_obj)
    await db.commit()
    
    logger.info(f"Novo usuário registrado: {input.username} (aguardando aprovação)")
    
    return {
        "message": "Usuário registrado com sucesso! Aguarde aprovação do administrador.",
        "username": input.username,
        "aprovado": False
    }


@api_router.post("/auth/login", response_model=dict)
async def login_user(input: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login de usuário"""
    import bcrypt
    
    result = await db.execute(
        select(UserModel).where(UserModel.username == input.username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    
    if not user.aprovado:
        raise HTTPException(status_code=403, detail="Usuário ainda não foi aprovado pelo administrador")
    
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Usuário desativado")
    
    if not bcrypt.checkpw(input.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    
    user_data = model_to_dict(user)
    user_data.pop("password_hash", None)
    
    return {
        "message": "Login realizado com sucesso",
        "user": user_data
    }


@api_router.post("/auth/recover-password", response_model=dict)
async def recover_password(input: UserPasswordRecovery, db: AsyncSession = Depends(get_db)):
    """Permite redefinir senha validando username + email."""
    import bcrypt

    result = await db.execute(
        select(UserModel).where(
            and_(
                UserModel.username == input.username,
                UserModel.email == input.email,
            )
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Usuário e email não conferem")

    if len(input.nova_senha or "") < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 6 caracteres")

    user.password_hash = bcrypt.hashpw(input.nova_senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user.atualizado_em = datetime.now(timezone.utc)
    await db.commit()

    try:
        send_email(
            user.email,
            "Senha redefinida - IDEIABH",
            (
                f"Olá {user.nome},\n\n"
                "Sua senha foi redefinida com sucesso no sistema IDEIABH.\n"
                "Se você não reconhece esta alteração, procure a administração imediatamente.\n"
            ),
        )
    except Exception:
        logger.warning("Falha ao enviar email de confirmação de redefinição para %s", user.email)

    return {"message": "Senha redefinida com sucesso"}


@api_router.get("/users", response_model=List[dict])
async def listar_usuarios(user_role: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Lista todos os usuários (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem listar usuários")
    
    result = await db.execute(select(UserModel))
    users = result.scalars().all()
    
    user_list = []
    for u in users:
        user_dict = model_to_dict(u)
        user_dict.pop("password_hash", None)
        user_list.append(user_dict)
    
    return user_list


@api_router.get("/users/pending", response_model=List[dict])
async def listar_usuarios_pendentes(user_role: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Lista usuários pendentes de aprovação (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.execute(
        select(UserModel).where(UserModel.aprovado == False)
    )
    users = result.scalars().all()
    
    user_list = []
    for u in users:
        user_dict = model_to_dict(u)
        user_dict.pop("password_hash", None)
        user_list.append(user_dict)
    
    return user_list


@api_router.post("/users/{user_id}/approve", response_model=dict)
async def aprovar_usuario(
    user_id: str,
    input: UserApprove,
    admin_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Aprova ou rejeita usuário (apenas admin)"""
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem aprovar usuários")
    
    result = await db.execute(
        select(UserModel).where(UserModel.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.aprovado = input.aprovado
    user.ativo = input.aprovado
    user.aprovado_por = input.aprovado_por
    user.aprovado_em = datetime.now(timezone.utc)
    user.atualizado_em = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(user)
    
    user_data = model_to_dict(user)
    user_data.pop("password_hash", None)
    
    status = "aprovado" if input.aprovado else "rejeitado"
    logger.info(f"Usuário {user.username} {status} por {input.aprovado_por}")
    
    return {
        "message": f"Usuário {status} com sucesso",
        "user": user_data
    }


@api_router.post("/users", response_model=dict)
async def criar_usuario(
    input: UserCreate,
    admin_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Cria usuário diretamente (apenas admin) - já aprovado"""
    import bcrypt
    
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar usuários")
    
    result = await db.execute(
        select(UserModel).where(UserModel.username == input.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username já existe")
    
    if input.role == "operador" and not input.setor:
        raise HTTPException(status_code=400, detail="Operadores devem ter um setor definido")
    
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_obj = UserModel(
        id=str(uuid.uuid4()),
        username=input.username,
        email=input.email,
        password_hash=password_hash,
        nome=input.nome,
        role=input.role,
        setor=input.setor,
        ativo=True,
        aprovado=True,
        aprovado_por="admin",
        aprovado_em=datetime.now(timezone.utc)
    )
    
    db.add(user_obj)
    await db.commit()
    await db.refresh(user_obj)
    
    user_data = model_to_dict(user_obj)
    user_data.pop("password_hash", None)
    
    return {
        "message": "Usuário criado com sucesso",
        "user": user_data
    }


@api_router.put("/users/{user_id}", response_model=dict)
async def atualizar_usuario(
    user_id: str,
    input: UserUpdate,
    admin_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza usuário (apenas admin)"""
    import bcrypt
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.execute(
        select(UserModel).where(UserModel.id == user_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    password = update_data.pop("password", None)
    for key, value in update_data.items():
        setattr(existing, key, value)
    if password:
        existing.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    existing.atualizado_em = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(existing)
    
    user_data = model_to_dict(existing)
    user_data.pop("password_hash", None)
    
    return user_data


@api_router.delete("/users/{user_id}")
async def deletar_usuario(
    user_id: str,
    admin_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta usuário (apenas admin)"""
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.execute(
        select(UserModel).where(UserModel.id == user_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db.delete(existing)
    await db.commit()
    
    return {"message": "Usuário deletado com sucesso"}


# ==========================================
# ROUTES - Tarefas
# ==========================================

@api_router.get("/tarefas", response_model=List[dict])
async def listar_tarefas(
    projeto_id: Optional[str] = None,
    contrato_id: Optional[str] = None,
    setor: Optional[str] = None,
    status_id: Optional[str] = None,
    responsavel_id: Optional[str] = None,
    finalizada: Optional[bool] = None,
    atrasada: Optional[bool] = None,
    usuario_role: Optional[str] = None,
    usuario_setor: Optional[str] = None,
    usuario_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista tarefas com filtros opcionais"""
    query = select(TarefaModel)

    conditions = []
    if projeto_id:
        conditions.append(TarefaModel.projeto_id == projeto_id)
    if contrato_id:
        conditions.append(TarefaModel.contrato_id == contrato_id)
    if setor:
        conditions.append(TarefaModel.setor == setor)
    if status_id:
        conditions.append(TarefaModel.status_id == status_id)
    if responsavel_id:
        conditions.append(TarefaModel.responsavel_id == responsavel_id)
    if finalizada is not None:
        conditions.append(TarefaModel.finalizada == finalizada)
    if atrasada is not None:
        conditions.append(TarefaModel.atrasada == atrasada)

    if conditions:
        query = query.where(and_(*conditions))

    projetos_ids_operador: Set[str] = set()
    contratos_ids_operador: Set[str] = set()

    if usuario_role == "operador":
        validar_contexto_usuario_operador(usuario_id, usuario_setor)
        projetos_ids_operador, contratos_ids_operador = await obter_ids_atribuicoes_operador(
            db,
            usuario_id,
            usuario_setor,
        )
        if not projetos_ids_operador and not contratos_ids_operador:
            return []
        if projeto_id and projeto_id not in projetos_ids_operador:
            raise HTTPException(status_code=403, detail="Projeto nao atribuido ao operador logado")
        if contrato_id and contrato_id not in contratos_ids_operador:
            raise HTTPException(status_code=403, detail="Contrato nao atribuido ao operador logado")
        query = query.where(
            filtro_tarefas_no_escopo_operador(
                projetos_ids=projetos_ids_operador,
                contratos_ids=contratos_ids_operador,
            )
        )

    query = query.order_by(TarefaModel.criado_em.desc())

    result = await db.execute(query)
    tarefas = result.scalars().all()

    result_list = []
    for tarefa in tarefas:
        if usuario_role == "operador":
            if not tarefa_visivel_para_operador_no_contexto(
                tarefa_projeto_id=tarefa.projeto_id,
                tarefa_contrato_id=tarefa.contrato_id,
                tarefa_operador_id=tarefa.responsavel_id,
                tarefa_setor=tarefa.setor,
                usuario_id=usuario_id,
                usuario_setor=usuario_setor,
                projetos_ids=projetos_ids_operador,
                contratos_ids=contratos_ids_operador,
            ):
                continue
        
        tarefa_dict = model_to_dict(tarefa)
        finalizada_calc = is_tarefa_efetivamente_finalizada(tarefa)
        tarefa_dict["finalizada"] = finalizada_calc
        if finalizada_calc:
            tarefa_dict["status_nome"] = "Concluído"
            tarefa_dict["dias_atraso"] = 0
            tarefa_dict["atrasada"] = False
        else:
            dias_atraso, atrasada_calc = await calcular_dias_atraso(tarefa.prazo)
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = atrasada_calc
        result_list.append(tarefa_dict)

    return await enriquecer_tarefas_com_contrato(db, result_list)


@api_router.get("/tarefas-por-acesso", response_model=List[dict])
async def listar_tarefas_por_acesso(
    usuario_role: str = Query(...),
    usuario_setor: str = Query(...),
    usuario_id: str = Query(...),
    projeto_id: Optional[str] = None,
    contrato_id: Optional[str] = None,
    status_id: Optional[str] = None,
    responsavel_id: Optional[str] = None,
    finalizada: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista tarefas filtradas pelo acesso do usuario.
    - Admin e gerente veem todas as tarefas
    - Operador ve apenas tarefas atribuidas para ele, no seu setor
    """
    query = select(TarefaModel)

    conditions = []
    if projeto_id:
        conditions.append(TarefaModel.projeto_id == projeto_id)
    if contrato_id:
        conditions.append(TarefaModel.contrato_id == contrato_id)
    if status_id:
        conditions.append(TarefaModel.status_id == status_id)
    if responsavel_id:
        conditions.append(TarefaModel.responsavel_id == responsavel_id)
    if finalizada is not None:
        conditions.append(TarefaModel.finalizada == finalizada)

    if conditions:
        query = query.where(and_(*conditions))

    if usuario_role == "operador":
        validar_contexto_usuario_operador(usuario_id, usuario_setor)
        projetos_ids_operador, contratos_ids_operador = await obter_ids_atribuicoes_operador(
            db,
            usuario_id,
            usuario_setor,
        )
        if not projetos_ids_operador and not contratos_ids_operador:
            return []
        if projeto_id and projeto_id not in projetos_ids_operador:
            raise HTTPException(status_code=403, detail="Projeto nao atribuido ao operador logado")
        if contrato_id and contrato_id not in contratos_ids_operador:
            raise HTTPException(status_code=403, detail="Contrato nao atribuido ao operador logado")
        query = query.where(
            filtro_tarefas_no_escopo_operador(
                projetos_ids=projetos_ids_operador,
                contratos_ids=contratos_ids_operador,
            )
        )

    query = query.order_by(TarefaModel.criado_em.desc())

    result = await db.execute(query)
    tarefas = result.scalars().all()

    result_list = []
    for tarefa in tarefas:
        if usuario_role == "operador":
            if not tarefa_visivel_para_operador_no_contexto(
                tarefa_projeto_id=tarefa.projeto_id,
                tarefa_contrato_id=tarefa.contrato_id,
                tarefa_operador_id=tarefa.responsavel_id,
                tarefa_setor=tarefa.setor,
                usuario_id=usuario_id,
                usuario_setor=usuario_setor,
                projetos_ids=projetos_ids_operador,
                contratos_ids=contratos_ids_operador,
            ):
                continue
        elif not verificar_acesso_setor(usuario_role, usuario_setor, tarefa.setor):
            continue

        tarefa_dict = model_to_dict(tarefa)
        finalizada_calc = is_tarefa_efetivamente_finalizada(tarefa)
        tarefa_dict["finalizada"] = finalizada_calc
        if finalizada_calc:
            tarefa_dict["status_nome"] = "Concluído"
            tarefa_dict["dias_atraso"] = 0
            tarefa_dict["atrasada"] = False
        else:
            dias_atraso, atrasada_calc = await calcular_dias_atraso(tarefa.prazo)
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = atrasada_calc

        tarefa_dict["pode_finalizar"] = verificar_pode_finalizar_tarefa(
            usuario_role,
            usuario_setor,
            tarefa.setor,
        )
        result_list.append(tarefa_dict)

    return await enriquecer_tarefas_com_contrato(db, result_list)


@api_router.get("/setores-acessiveis", response_model=dict)
async def obter_setores_acessiveis(
    usuario_role: str = Query(...),
    usuario_setor: str = Query(...)
):
    """
    Retorna os setores que o usuário pode acessar.
    - Admin e gerente: todos os setores
    - Operador: seu setor e o anterior no fluxo
    """
    todos_setores = ["atendimento", "criacao", "pre-producao", "producao"]
    
    if usuario_role in ["admin", "gerente"]:
        return {
            "setores_acessiveis": todos_setores,
            "setor_principal": usuario_setor,
            "pode_acessar_todos": True
        }
    
    # Para operador, calcular setores acessíveis
    setor_map = {
        "atendimento": "atendimento",
        "criacao": "criacao",
        "criação": "criacao",
        "preproducao": "pre-producao",
        "préproducao": "pre-producao",
        "pre-producao": "pre-producao",
        "pré-produção": "pre-producao",
        "producao": "producao",
        "produção": "producao",
    }
    
    usuario_setor_norm = usuario_setor.lower().replace("-", "").replace("_", "").replace(" ", "")
    usuario_setor_padrao = setor_map.get(usuario_setor_norm, usuario_setor.lower())
    
    ordem_usuario = SETORES_ORDEM.get(usuario_setor_padrao, 0)
    
    setores_acessiveis = []
    for setor in todos_setores:
        ordem_setor = SETORES_ORDEM.get(setor, 0)
        # Pode acessar seu setor ou o anterior
        if ordem_usuario == ordem_setor or ordem_usuario == ordem_setor + 1:
            setores_acessiveis.append(setor)
    
    return {
        "setores_acessiveis": setores_acessiveis,
        "setor_principal": usuario_setor_padrao,
        "pode_acessar_todos": False
    }


@api_router.get("/tarefas/{tarefa_id}", response_model=dict)
async def obter_tarefa(
    tarefa_id: str,
    usuario_role: Optional[str] = None,
    usuario_setor: Optional[str] = None,
    usuario_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Obtem uma tarefa especifica"""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()

    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    if usuario_role == "operador":
        validar_contexto_usuario_operador(usuario_id, usuario_setor)
        projetos_ids_operador, contratos_ids_operador = await obter_ids_atribuicoes_operador(
            db,
            usuario_id,
            usuario_setor,
        )
        if not tarefa_visivel_para_operador_no_contexto(
            tarefa_projeto_id=tarefa.projeto_id,
            tarefa_contrato_id=tarefa.contrato_id,
            tarefa_operador_id=tarefa.responsavel_id,
            tarefa_setor=tarefa.setor,
            usuario_id=usuario_id,
            usuario_setor=usuario_setor,
            projetos_ids=projetos_ids_operador,
            contratos_ids=contratos_ids_operador,
        ):
            raise HTTPException(status_code=403, detail="Tarefa nao atribuida ao operador logado")

    tarefa_dict = model_to_dict(tarefa)
    if not tarefa.finalizada:
        dias_atraso, atrasada = await calcular_dias_atraso(tarefa.prazo)
        tarefa_dict["dias_atraso"] = dias_atraso
        tarefa_dict["atrasada"] = atrasada

    return await enriquecer_tarefas_com_contrato(db, tarefa_dict)


@api_router.post("/tarefas/{tarefa_id}/anexos", response_model=dict)
async def anexar_documento_tarefa(
    tarefa_id: str,
    user_role: str = Query(...),
    user_id: str = Query(...),
    user_setor: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    arquivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Faz upload de um documento vinculado a uma tarefa."""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()

    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    if not tarefa_tem_acesso(user_role, user_id, user_setor, tarefa):
        raise HTTPException(status_code=403, detail="Sem acesso a esta tarefa")

    if not arquivo.filename:
        raise HTTPException(status_code=400, detail="Arquivo invalido")

    content = await arquivo.read()
    await arquivo.close()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio")

    task_dir = TASK_UPLOADS_DIR / tarefa_id
    task_dir.mkdir(parents=True, exist_ok=True)

    safe_name = sanitize_uploaded_filename(arquivo.filename)
    stored_name = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = task_dir / stored_name
    file_path.write_bytes(content)

    now = datetime.now(timezone.utc)
    anexos = list(tarefa.anexos or [])
    anexo_payload = {
        "id": str(uuid.uuid4()),
        "nome_original": arquivo.filename,
        "arquivo_nome": stored_name,
        "url": f"/uploads/tarefas/{tarefa_id}/{stored_name}",
        "content_type": arquivo.content_type,
        "size_bytes": len(content),
        "uploaded_by_id": user_id,
        "uploaded_by_name": user_name or user_id,
        "created_at": now.isoformat(),
    }
    anexos.append(anexo_payload)

    historico = tarefa.historico or []
    historico.append({
        "id": str(uuid.uuid4()),
        "acao": "anexo_adicionado",
        "usuario_id": user_id,
        "usuario_nome": user_name or user_id,
        "setor": user_setor or "geral",
        "data": now.isoformat(),
        "detalhes": f"Anexo enviado: {arquivo.filename}",
        "anexo": anexo_payload,
    })

    tarefa.anexos = anexos
    tarefa.historico = historico
    tarefa.atualizado_em = now

    await db.commit()
    await db.refresh(tarefa)

    tarefa_dict = model_to_dict(tarefa)
    tarefa_dict = await enriquecer_tarefas_com_contrato(db, tarefa_dict)
    return {"anexo": anexo_payload, "tarefa": tarefa_dict}


@api_router.delete("/tarefas/{tarefa_id}/anexos/{anexo_id}", response_model=dict)
async def remover_documento_tarefa(
    tarefa_id: str,
    anexo_id: str,
    user_role: str = Query(...),
    user_id: str = Query(...),
    user_setor: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Remove um documento anexado a uma tarefa."""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()

    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    if not tarefa_tem_acesso(user_role, user_id, user_setor, tarefa):
        raise HTTPException(status_code=403, detail="Sem acesso a esta tarefa")

    anexos = list(tarefa.anexos or [])
    anexo = next((item for item in anexos if item.get("id") == anexo_id), None)
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo nao encontrado")

    file_path = TASK_UPLOADS_DIR / tarefa_id / str(anexo.get("arquivo_nome") or "")
    if file_path.exists():
        file_path.unlink()

    tarefa.anexos = [item for item in anexos if item.get("id") != anexo_id]
    tarefa.atualizado_em = datetime.now(timezone.utc)

    historico = tarefa.historico or []
    historico.append({
        "id": str(uuid.uuid4()),
        "acao": "anexo_removido",
        "usuario_id": user_id,
        "usuario_nome": user_name or user_id,
        "setor": user_setor or "geral",
        "data": tarefa.atualizado_em.isoformat(),
        "detalhes": f"Anexo removido: {anexo.get('nome_original') or anexo.get('arquivo_nome')}",
    })
    tarefa.historico = historico

    await db.commit()
    await db.refresh(tarefa)

    tarefa_dict = model_to_dict(tarefa)
    tarefa_dict = await enriquecer_tarefas_com_contrato(db, tarefa_dict)
    return {"message": "Anexo removido com sucesso", "tarefa": tarefa_dict}


@api_router.post("/tarefas", response_model=dict)
async def criar_tarefa(input: TarefaCreate, db: AsyncSession = Depends(get_db)):
    """Cria uma nova tarefa"""
    status_list = await get_status_padrao(db)
    
    if input.status_id:
        result = await db.execute(
            select(StatusTarefaModel).where(StatusTarefaModel.id == input.status_id)
        )
        status = result.scalar_one_or_none()
        if not status:
            raise HTTPException(status_code=400, detail="Status não encontrado")
        status_nome = status.nome
    else:
        input.status_id = status_list[0]["id"]
        status_nome = status_list[0]["nome"]
    
    dias_atraso, atrasada = await calcular_dias_atraso(input.prazo)
    
    historico = [{
        "id": str(uuid.uuid4()),
        "acao": "criada",
        "usuario_id": input.criado_por_id,
        "usuario_nome": input.criado_por_nome,
        "setor": input.criado_por_setor,
        "data": datetime.now(timezone.utc).isoformat(),
        "detalhes": f"Tarefa criada: {input.titulo}"
    }]
    
    tarefa_obj = TarefaModel(
        id=str(uuid.uuid4()),
        titulo=input.titulo,
        descricao=input.descricao,
        projeto_id=input.projeto_id,
        contrato_id=input.contrato_id,
        setor=input.setor,
        responsavel_id=input.responsavel_id,
        responsavel_nome=input.responsavel_nome,
        status_id=input.status_id,
        status_nome=status_nome,
        prazo=input.prazo,
        prazo_original=input.prazo,
        prioridade=input.prioridade,
        dias_atraso=dias_atraso,
        atrasada=atrasada,
        criado_por_id=input.criado_por_id,
        criado_por_nome=input.criado_por_nome,
        criado_por_setor=input.criado_por_setor,
        historico=historico
    )
    
    db.add(tarefa_obj)
    await db.commit()
    await db.refresh(tarefa_obj)
    
    logger.info(f"Tarefa criada: {tarefa_obj.id} por {input.criado_por_nome} ({input.criado_por_setor})")
    
    return model_to_dict(tarefa_obj)


@api_router.put("/tarefas/{tarefa_id}", response_model=dict)
async def atualizar_tarefa(
    tarefa_id: str,
    input: TarefaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma tarefa (apenas admin ou gerente podem editar)"""
    if input.usuario_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem editar tarefas")
    
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    detalhes = []
    prazo_alterado = False
    
    if input.titulo and input.titulo != tarefa.titulo:
        tarefa.titulo = input.titulo
        detalhes.append(f"Título alterado para: {input.titulo}")
    
    if input.descricao is not None:
        tarefa.descricao = input.descricao
    
    if input.setor and input.setor != tarefa.setor:
        tarefa.setor = input.setor
        detalhes.append(f"Setor alterado para: {input.setor}")
    
    if input.responsavel_id is not None:
        tarefa.responsavel_id = input.responsavel_id
        tarefa.responsavel_nome = input.responsavel_nome
        if input.responsavel_nome:
            detalhes.append(f"Responsável alterado para: {input.responsavel_nome}")
    
    if input.prazo and input.prazo != tarefa.prazo:
        prazo_anterior = tarefa.prazo
        tarefa.prazo = input.prazo
        tarefa.prazo_original = input.prazo
        dias_atraso, atrasada = await calcular_dias_atraso(input.prazo)
        tarefa.dias_atraso = dias_atraso
        tarefa.atrasada = atrasada
        detalhes.append(f"Prazo alterado de {prazo_anterior} para: {input.prazo}")
        prazo_alterado = True
    
    if input.prioridade and input.prioridade != tarefa.prioridade:
        tarefa.prioridade = input.prioridade
        detalhes.append(f"Prioridade alterada para: {input.prioridade}")

    if input.observacao_finalizacao is not None and input.observacao_finalizacao != tarefa.observacao_finalizacao:
        tarefa.observacao_finalizacao = input.observacao_finalizacao or None
        detalhes.append("Observacao de finalizacao atualizada")

    if input.data_finalizacao is not None:
        nova_data_finalizacao = None
        if input.data_finalizacao:
            try:
                nova_data_finalizacao = datetime.fromisoformat(str(input.data_finalizacao))
            except ValueError:
                raise HTTPException(status_code=400, detail="Data de finalizacao invalida")
        if nova_data_finalizacao != tarefa.data_finalizacao:
            tarefa.data_finalizacao = nova_data_finalizacao
            detalhes.append("Data de finalizacao atualizada")

    if input.finalizada is not None and input.finalizada != tarefa.finalizada:
        tarefa.finalizada = input.finalizada
        if not input.finalizada:
            tarefa.data_finalizacao = None
            if input.observacao_finalizacao is None:
                tarefa.observacao_finalizacao = None
            status_pendente = await obter_status_por_nome(db, "Pendente")
            if status_pendente:
                tarefa.status_id = status_pendente.id
                tarefa.status_nome = status_pendente.nome
            detalhes.append("Tarefa reaberta para edicao")
        else:
            if not tarefa.data_finalizacao:
                tarefa.data_finalizacao = datetime.now(timezone.utc)
            status_concluido = await obter_status_por_nome(db, "ConcluÃ­do")
            if status_concluido:
                tarefa.status_id = status_concluido.id
                tarefa.status_nome = status_concluido.nome
            detalhes.append("Tarefa marcada como finalizada")
    
    if detalhes:
        tarefa.atualizado_em = datetime.now(timezone.utc)
        
        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "atualizada",
            "usuario_id": input.usuario_id,
            "usuario_nome": input.usuario_nome,
            "setor": input.usuario_setor,
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": "; ".join(detalhes) if detalhes else "Tarefa atualizada"
        })
        tarefa.historico = historico
    
    prazos_recalculados = []
    if detalhes:
        await db.commit()
        await db.refresh(tarefa)

    if prazo_alterado and tarefa.projeto_id:
        base_date = parse_iso_date(input.prazo)
        if base_date:
            prazos_recalculados = await recalcular_prazos_a_partir_de_tarefa(
                db, tarefa.projeto_id, tarefa.id, base_date
            )
        await atualizar_projeto_prazos(db, tarefa.projeto_id)

    await db.refresh(tarefa)
    result_dict = model_to_dict(tarefa)
    result_dict["prazos_recalculados"] = prazos_recalculados
    
    return result_dict


async def executar_finalizacao_tarefa(
    db: AsyncSession,
    tarefa: TarefaModel,
    input: TarefaFinalizar,
    status_concluido: Optional[StatusTarefaModel] = None,
):
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    if is_tarefa_efetivamente_finalizada(tarefa):
        raise HTTPException(status_code=400, detail="Tarefa ja esta finalizada")

    if input.usuario_role == "operador":
        valido, mensagem_erro = validar_contexto_finalizacao_operador(
            tarefa_operador_id=tarefa.responsavel_id,
            tarefa_setor=tarefa.setor,
            tarefa_contrato_id=tarefa.contrato_id,
            usuario_id=input.usuario_id,
            usuario_setor=input.usuario_setor,
            contrato_id_selecionado=input.contrato_id_selecionado,
        )
        if not valido:
            raise HTTPException(status_code=403, detail=mensagem_erro)
    elif input.contrato_id_selecionado and input.contrato_id_selecionado != tarefa.contrato_id:
        raise HTTPException(status_code=400, detail="Contrato selecionado nao corresponde ao contrato da tarefa")

    if not verificar_pode_finalizar_tarefa(input.usuario_role, input.usuario_setor, tarefa.setor):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Operadores so podem finalizar tarefas do proprio setor ({input.usuario_setor}). "
                f"Esta tarefa pertence ao setor {tarefa.setor}."
            ),
        )

    status_concluido = status_concluido or await obter_status_por_nome(db, "Concluído")
    if not status_concluido:
        raise HTTPException(status_code=500, detail="Status 'Concluido' nao encontrado")

    now = datetime.now(timezone.utc)
    historico = tarefa.historico or []
    historico.append({
        "id": str(uuid.uuid4()),
        "acao": "finalizada",
        "usuario_id": input.usuario_id,
        "usuario_nome": input.usuario_nome,
        "setor": input.usuario_setor,
        "data": now.isoformat(),
        "observacao": input.observacao,
        "detalhes": (
            f"Tarefa finalizada por {input.usuario_nome} ({input.usuario_setor}) "
            f"no contrato {tarefa.contrato_id}"
        ),
    })

    tarefa.finalizada = True
    tarefa.data_finalizacao = now
    tarefa.observacao_finalizacao = input.observacao or None
    tarefa.status_id = status_concluido.id
    tarefa.status_nome = "Concluído"
    tarefa.atualizado_em = now
    tarefa.historico = historico

    await db.commit()

    logger.info(
        f"Tarefa finalizada: {tarefa.id} por {input.usuario_nome} "
        f"({input.usuario_setor}) no contrato {tarefa.contrato_id}"
    )

    prazos_recalculados = []
    if tarefa.projeto_id:
        prazos_recalculados = await recalcular_prazos_projeto(
            db, tarefa.projeto_id, tarefa.id, now
        )
        if prazos_recalculados:
            logger.info(
                f"Prazos recalculados para {len(prazos_recalculados)} tarefas do projeto {tarefa.projeto_id}"
            )
        await atualizar_projeto_prazos(db, tarefa.projeto_id)

    await db.refresh(tarefa)
    result_dict = model_to_dict(tarefa)
    result_dict["prazos_recalculados"] = prazos_recalculados
    return result_dict


@api_router.post("/tarefas/{tarefa_id}/finalizar", response_model=dict)
async def finalizar_tarefa(
    tarefa_id: str,
    input: TarefaFinalizar,
    db: AsyncSession = Depends(get_db)
):
    """Finaliza uma tarefa e recalcula prazos das proximas etapas"""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    return await executar_finalizacao_tarefa(db, tarefa, input)


@api_router.post("/tarefas/finalizar-lote", response_model=dict)
async def finalizar_tarefas_lote(
    input: TarefaFinalizarLote,
    db: AsyncSession = Depends(get_db)
):
    """Finaliza varias tarefas em lote. Disponivel apenas para administradores."""
    if input.usuario_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem finalizar tarefas em lote")

    tarefa_ids = []
    vistos = set()
    for tarefa_id in input.tarefa_ids or []:
        tarefa_id = str(tarefa_id or "").strip()
        if not tarefa_id or tarefa_id in vistos:
            continue
        vistos.add(tarefa_id)
        tarefa_ids.append(tarefa_id)

    if not tarefa_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos uma tarefa para finalizar")

    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id.in_(tarefa_ids))
    )
    tarefas_por_id = {tarefa.id: tarefa for tarefa in result.scalars().all()}
    status_concluido = await obter_status_por_nome(db, "Concluído")

    tarefas_finalizadas = []
    tarefas_ignoradas = []
    erros = []

    for tarefa_id in tarefa_ids:
        tarefa = tarefas_por_id.get(tarefa_id)
        if not tarefa:
            tarefas_ignoradas.append({"tarefa_id": tarefa_id, "motivo": "Tarefa nao encontrada"})
            continue

        if is_tarefa_efetivamente_finalizada(tarefa):
            tarefas_ignoradas.append({"tarefa_id": tarefa_id, "motivo": "Tarefa ja finalizada"})
            continue

        payload = TarefaFinalizar(
            observacao=input.observacao,
            usuario_id=input.usuario_id,
            usuario_nome=input.usuario_nome,
            usuario_setor=input.usuario_setor,
            usuario_role=input.usuario_role,
            contrato_id_selecionado=tarefa.contrato_id,
        )

        try:
            resultado = await executar_finalizacao_tarefa(db, tarefa, payload, status_concluido=status_concluido)
            tarefas_finalizadas.append(resultado)
        except HTTPException as exc:
            erros.append({"tarefa_id": tarefa_id, "motivo": exc.detail})
        except Exception as exc:
            erros.append({"tarefa_id": tarefa_id, "motivo": str(exc) or type(exc).__name__})

    return {
        "total_solicitadas": len(tarefa_ids),
        "total_finalizadas": len(tarefas_finalizadas),
        "total_ignoradas": len(tarefas_ignoradas),
        "total_erros": len(erros),
        "tarefas_finalizadas": tarefas_finalizadas,
        "tarefas_ignoradas": tarefas_ignoradas,
        "erros": erros,
    }


@api_router.post("/tarefas/{tarefa_id}/reabrir", response_model=dict)
async def reabrir_tarefa(
    tarefa_id: str,
    input: TarefaReabrir,
    db: AsyncSession = Depends(get_db)
):
    """Reabre uma tarefa finalizada para correção."""
    if input.usuario_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem reabrir tarefas")

    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()

    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    if not tarefa.finalizada:
        raise HTTPException(status_code=400, detail="A tarefa ja esta em aberto")

    status_pendente = await obter_status_por_nome(db, "Pendente")
    if not status_pendente:
        raise HTTPException(status_code=500, detail="Status 'Pendente' nao encontrado")

    now = datetime.now(timezone.utc)
    historico = tarefa.historico or []
    historico.append({
        "id": str(uuid.uuid4()),
        "acao": "reaberta",
        "usuario_id": input.usuario_id,
        "usuario_nome": input.usuario_nome,
        "setor": input.usuario_setor,
        "data": now.isoformat(),
        "detalhes": "Tarefa reaberta para correcao",
    })

    tarefa.finalizada = False
    tarefa.data_finalizacao = None
    tarefa.status_id = status_pendente.id
    tarefa.status_nome = status_pendente.nome
    tarefa.atualizado_em = now
    tarefa.historico = historico

    await db.commit()
    if tarefa.projeto_id:
        await atualizar_projeto_prazos(db, tarefa.projeto_id)
    await db.refresh(tarefa)
    return model_to_dict(tarefa)


@api_router.post("/tarefas/{tarefa_id}/alterar-status", response_model=dict)
async def alterar_status_tarefa(
    tarefa_id: str,
    input: TarefaAlterarStatus,
    db: AsyncSession = Depends(get_db)
):
    """Altera o status de uma tarefa"""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()

    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    if tarefa.finalizada:
        raise HTTPException(status_code=400, detail="Nao e possivel alterar status de tarefa finalizada")

    if input.usuario_role == "operador":
        if not operador_tem_acesso_tarefa(
            tarefa_operador_id=tarefa.responsavel_id,
            tarefa_setor=tarefa.setor,
            usuario_id=input.usuario_id,
            usuario_setor=input.usuario_setor,
        ):
            raise HTTPException(status_code=403, detail="Tarefa nao atribuida ao operador logado")
        contrato_referencia = input.contrato_id_selecionado or tarefa.contrato_id
        if contrato_referencia != tarefa.contrato_id:
            raise HTTPException(status_code=403, detail="Tarefa fora do contrato selecionado")
    elif input.contrato_id_selecionado and input.contrato_id_selecionado != tarefa.contrato_id:
        raise HTTPException(status_code=400, detail="Contrato selecionado nao corresponde ao contrato da tarefa")

    result = await db.execute(
        select(StatusTarefaModel).where(StatusTarefaModel.id == input.status_id)
    )
    status = result.scalar_one_or_none()

    if not status:
        raise HTTPException(status_code=400, detail="Status nao encontrado")

    now = datetime.now(timezone.utc)

    historico = tarefa.historico or []
    historico.append({
        "id": str(uuid.uuid4()),
        "acao": "status_alterado",
        "usuario_id": input.usuario_id,
        "usuario_nome": input.usuario_nome,
        "setor": input.usuario_setor,
        "data": now.isoformat(),
        "observacao": input.observacao,
        "detalhes": (
            f"Status alterado de '{tarefa.status_nome}' para '{status.nome}' "
            f"no contrato {tarefa.contrato_id}"
        ),
    })

    tarefa.status_id = input.status_id
    tarefa.status_nome = status.nome
    tarefa.atualizado_em = now
    tarefa.historico = historico

    await db.commit()
    await db.refresh(tarefa)

    return model_to_dict(tarefa)


@api_router.delete("/tarefas/{tarefa_id}")
async def deletar_tarefa(
    tarefa_id: str,
    user_role: str = Query(...),
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta uma tarefa (apenas admin ou gerente podem deletar)"""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem deletar tarefas")
    projeto_id = tarefa.projeto_id

    await db.delete(tarefa)
    await db.commit()

    if projeto_id:
        await atualizar_projeto_prazos(db, projeto_id)
    
    logger.info(f"Tarefa deletada: {tarefa_id} por user {user_id} (role: {user_role})")
    
    return {"message": "Tarefa deletada com sucesso"}


@api_router.delete("/tarefas")
async def deletar_todas_tarefas(
    user_role: str = Query(...),
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta todas as tarefas (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar todas as tarefas")
    
    result = await db.execute(delete(TarefaModel))
    await db.commit()
    
    logger.info(f"Todas as tarefas deletadas por user {user_id}")
    
    return {"message": "Tarefas deletadas com sucesso"}


# ==========================================
# ROUTES - Atribuição de Tarefas
# ==========================================

class AtribuirTarefaInput(BaseModel):
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: str
    atribuidor_id: str
    atribuidor_nome: str
    atribuidor_setor: str


@api_router.get("/usuarios/setor/{setor}", response_model=List[dict])
async def listar_usuarios_setor(
    setor: str,
    usuario_role: str = Query(...),
    usuario_setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista usuários disponíveis em um setor específico para atribuição de tarefas.
    Apenas admin/gerente podem acessar este endpoint.
    
    - Admin vê todos os usuários ativos em qualquer setor
    - Gerente vê todos os usuários ativos do seu próprio setor
    - Operador não tem acesso
    """
    # Verificar permissão
    if usuario_role not in ["admin", "gerente"]:
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores e gerentes podem listar usuários para atribuição"
        )
    
    # Se é gerente, verificar se está tentando acessar outro setor
    if usuario_role == "gerente" and usuario_setor:
        setor_norm = setor.lower().replace("-", "").replace("_", "").replace(" ", "")
        usuario_setor_norm = usuario_setor.lower().replace("-", "").replace("_", "").replace(" ", "")
        
        if setor_norm != usuario_setor_norm:
            raise HTTPException(
                status_code=403, 
                detail=f"Gerentes podem atribuir tarefas apenas dentro de seu setor ({usuario_setor})"
            )
    
    # Normalizar nome do setor
    setor_map = {
        "atendimento": "atendimento",
        "criacao": "criacao",
        "criação": "criacao",
        "preproducao": "pre-producao",
        "préproducao": "pre-producao",
        "pre-producao": "pre-producao",
        "pré-produção": "pre-producao",
        "producao": "producao",
        "produção": "producao",
    }
    
    setor_normalizado = setor_map.get(setor.lower().replace("-", "").replace("_", "").replace(" ", ""), setor)
    
    # Buscar usuários do setor
    result = await db.execute(
        select(UserModel).where(
            and_(
                UserModel.setor == setor_normalizado,
                UserModel.ativo == True,
                UserModel.aprovado == True,
                UserModel.role != "admin"  # Não mostrar admins na lista de atribuição
            )
        ).order_by(UserModel.nome)
    )
    usuarios = result.scalars().all()
    
    # Convertendo para dict e removendo campos sensíveis
    usuarios_list = []
    for u in usuarios:
        user_dict = model_to_dict(u)
        user_dict.pop("password_hash", None)
        usuarios_list.append(user_dict)
    
    if not usuarios_list:
        return []
    
    return usuarios_list


class AtribuirTarefaRequest(BaseModel):
    usuario_id: str
    usuario_nome: str
    usuario_setor: str


@api_router.post("/tarefas/{tarefa_id}/atribuir", response_model=dict)
async def atribuir_tarefa(
    tarefa_id: str,
    input: AtribuirTarefaRequest,
    atribuidor_id: str = Query(...),
    atribuidor_nome: str = Query(...),
    atribuidor_setor: str = Query(...),
    atribuidor_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Atribui uma tarefa a um usuário específico.
    
    Permissões:
    - Apenas admin ou gerente podem atribuir tarefas
    - Gerente pode atribuir apenas dentro de seu setor
    - A tarefa e o usuário devem estar no mesmo setor
    
    Retorna: Tarefa atualizada com histórico de atribuição
    """
    # Verificar permissão do atribuidor
    if atribuidor_role not in ["admin", "gerente"]:
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores e gerentes podem atribuir tarefas"
        )
    
    # Buscar tarefa
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.finalizada:
        raise HTTPException(status_code=400, detail="Não é possível atribuir uma tarefa finalizada")
    
    # Normalizar setores para comparação
    setor_map = {
        "atendimento": "atendimento",
        "criacao": "criacao",
        "criação": "criacao",
        "preproducao": "pre-producao",
        "préproducao": "pre-producao",
        "pre-producao": "pre-producao",
        "pré-produção": "pre-producao",
        "producao": "producao",
        "produção": "producao",
    }
    
    tarefa_setor_norm = setor_map.get(tarefa.setor.lower().replace("-", "").replace("_", "").replace(" ", ""), tarefa.setor)
    usuario_setor_norm = setor_map.get(input.usuario_setor.lower().replace("-", "").replace("_", "").replace(" ", ""), input.usuario_setor)
    
    # Verificação 1: Se é gerente, só pode atribuir no seu setor
    if atribuidor_role == "gerente":
        atribuidor_setor_norm = setor_map.get(atribuidor_setor.lower().replace("-", "").replace("_", "").replace(" ", ""), atribuidor_setor)
        if tarefa_setor_norm != atribuidor_setor_norm:
            raise HTTPException(
                status_code=403,
                detail=f"Gerentes podem atribuir tarefas apenas em seu setor ({atribuidor_setor_norm})"
            )
    
    # Verificação 2: Tarefa e usuário devem estar no mesmo setor
    if tarefa_setor_norm != usuario_setor_norm:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível atribuir tarefa do setor '{tarefa_setor_norm}' para usuário do setor '{usuario_setor_norm}'"
        )
    
    # Buscar o usuário a ser atribuído
    result = await db.execute(
        select(UserModel).where(UserModel.id == input.usuario_id)
    )
    usuario = result.scalar_one_or_none()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if not usuario.ativo or not usuario.aprovado:
        raise HTTPException(status_code=400, detail="Usuário não está ativo ou aprovado")
    
    # Preparar informações antigas (para historico)
    responsavel_anterior = tarefa.responsavel_nome or "Não atribuído"
    
    # Atualizar tarefa
    tarefa.responsavel_id = input.usuario_id
    tarefa.responsavel_nome = input.usuario_nome
    tarefa.atualizado_em = datetime.now(timezone.utc)
    
    # Registrar no histórico
    historico = tarefa.historico or []
    historico.append({
        "id": str(uuid.uuid4()),
        "acao": "atribuida",
        "usuario_id": atribuidor_id,
        "usuario_nome": atribuidor_nome,
        "setor": atribuidor_setor,
        "data": datetime.now(timezone.utc).isoformat(),
        "detalhes": f"Tarefa atribuída de '{responsavel_anterior}' para '{input.usuario_nome}' ({input.usuario_setor})"
    })
    tarefa.historico = historico
    
    await db.commit()
    await db.refresh(tarefa)
    
    # Criar notificação para o usuário
    notif = NotificacaoModel(
        id=str(uuid.uuid4()),
        tipo="atribuicao",
        titulo=f"Nova tarefa atribuída por {atribuidor_nome}",
        mensagem=f"Você foi atribuído à tarefa: {tarefa.titulo}",
        de_usuario_id=atribuidor_id,
        de_usuario_nome=atribuidor_nome,
        para_usuario_id=input.usuario_id,
        para_usuario_nome=input.usuario_nome,
        tarefa_id=tarefa_id,
        projeto_id=tarefa.projeto_id
    )
    
    db.add(notif)
    await db.commit()
    
    logger.info(
        f"Tarefa atribuída: {tarefa_id} para {input.usuario_nome} ({input.usuario_setor}) "
        f"por {atribuidor_nome} ({atribuidor_setor})"
    )
    
    return {
        "message": f"Tarefa atribuída com sucesso para {input.usuario_nome}",
        "tarefa": model_to_dict(tarefa),
        "notificacao_enviada": True
    }


# ==========================================
# ROUTES - Atrasos e Relatórios
# ==========================================

@api_router.get("/tarefas-atrasadas", response_model=List[dict])
async def listar_tarefas_atrasadas(
    projeto_id: Optional[str] = None,
    setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as tarefas atrasadas"""
    query = select(TarefaModel).where(TarefaModel.finalizada == False)
    
    if projeto_id:
        query = query.where(TarefaModel.projeto_id == projeto_id)
    if setor:
        query = query.where(TarefaModel.setor == setor)
    
    result = await db.execute(query)
    tarefas = result.scalars().all()
    
    atrasadas = []
    for tarefa in tarefas:
        tarefa_dict = model_to_dict(tarefa)
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
        if is_atrasada:
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = True
            atrasadas.append(tarefa_dict)
    
    atrasadas.sort(key=lambda x: x.get("dias_atraso", 0), reverse=True)
    
    return atrasadas


@api_router.get("/atrasos-por-setor", response_model=List[dict])
async def atrasos_por_setor(db: AsyncSession = Depends(get_db)):
    """Retorna resumo de atrasos agrupados por setor"""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.finalizada == False)
    )
    tarefas = result.scalars().all()
    
    setores = {}
    for tarefa in tarefas:
        tarefa_dict = model_to_dict(tarefa)
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
        
        setor = tarefa.setor or "Sem setor"
        if setor not in setores:
            setores[setor] = {
                "setor": setor,
                "total_tarefas": 0,
                "tarefas_atrasadas": 0,
                "total_dias_atraso": 0,
                "tarefas": []
            }
        
        setores[setor]["total_tarefas"] += 1
        if is_atrasada:
            setores[setor]["tarefas_atrasadas"] += 1
            setores[setor]["total_dias_atraso"] += dias_atraso
            setores[setor]["tarefas"].append({
                "id": tarefa.id,
                "titulo": tarefa.titulo,
                "dias_atraso": dias_atraso,
                "responsavel": tarefa.responsavel_nome,
                "criado_por": tarefa.criado_por_nome
            })
    
    result_list = list(setores.values())
    result_list.sort(key=lambda x: x["tarefas_atrasadas"], reverse=True)
    
    return result_list


@api_router.get("/atrasos-por-projeto/{projeto_id}", response_model=dict)
async def atrasos_por_projeto(projeto_id: str, db: AsyncSession = Depends(get_db)):
    """Retorna detalhes de atrasos de um projeto específico"""
    result = await db.execute(
        select(TarefaModel).where(
            and_(TarefaModel.projeto_id == projeto_id, TarefaModel.finalizada == False)
        )
    )
    tarefas = result.scalars().all()
    
    resultado = {
        "projeto_id": projeto_id,
        "total_tarefas": len(tarefas),
        "tarefas_atrasadas": 0,
        "tarefas_em_dia": 0,
        "total_dias_atraso": 0,
        "atrasos_por_setor": {},
        "detalhes_atrasos": []
    }
    
    for tarefa in tarefas:
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
        
        if is_atrasada:
            resultado["tarefas_atrasadas"] += 1
            resultado["total_dias_atraso"] += dias_atraso
            
            setor = tarefa.setor or "Sem setor"
            if setor not in resultado["atrasos_por_setor"]:
                resultado["atrasos_por_setor"][setor] = 0
            resultado["atrasos_por_setor"][setor] += 1
            
            resultado["detalhes_atrasos"].append({
                "tarefa_id": tarefa.id,
                "titulo": tarefa.titulo,
                "setor": setor,
                "dias_atraso": dias_atraso,
                "responsavel": tarefa.responsavel_nome,
                "criado_por": tarefa.criado_por_nome,
                "criado_por_setor": tarefa.criado_por_setor
            })
        else:
            resultado["tarefas_em_dia"] += 1
    
    resultado["detalhes_atrasos"].sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    return resultado


# ==========================================
# ROUTES - Dashboard Stats
# ==========================================

@api_router.get("/dashboard-stats", response_model=dict)
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Retorna estatísticas gerais para o dashboard"""
    result = await db.execute(select(TarefaModel))
    tarefas = result.scalars().all()
    
    total = len(tarefas)
    finalizadas = sum(1 for t in tarefas if t.finalizada)
    em_andamento = total - finalizadas
    
    atrasadas = 0
    for tarefa in tarefas:
        if not tarefa.finalizada:
            _, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                atrasadas += 1
    
    por_setor = {}
    for tarefa in tarefas:
        setor = tarefa.setor or "Sem setor"
        if setor not in por_setor:
            por_setor[setor] = {"total": 0, "finalizadas": 0, "em_andamento": 0}
        por_setor[setor]["total"] += 1
        if tarefa.finalizada:
            por_setor[setor]["finalizadas"] += 1
        else:
            por_setor[setor]["em_andamento"] += 1
    
    return {
        "total_tarefas": total,
        "tarefas_finalizadas": finalizadas,
        "tarefas_em_andamento": em_andamento,
        "tarefas_atrasadas": atrasadas,
        "percentual_conclusao": round((finalizadas / total * 100) if total > 0 else 0, 1),
        "por_setor": por_setor,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ==========================================
# ROUTES - Template de Prazos
# ==========================================

@api_router.get("/templates-prazos", response_model=List[dict])
async def listar_templates_prazos(db: AsyncSession = Depends(get_db)):
    """Lista todos os templates de prazos"""
    result = await db.execute(
        select(TemplatePrazosModel).where(TemplatePrazosModel.ativo == True)
    )
    templates = result.scalars().all()
    return [model_to_dict(t) for t in templates]


@api_router.get("/templates-prazos/{template_id}", response_model=dict)
async def obter_template_prazo(template_id: str, db: AsyncSession = Depends(get_db)):
    """Obtém um template específico"""
    result = await db.execute(
        select(TemplatePrazosModel).where(TemplatePrazosModel.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    return model_to_dict(template)


@api_router.post("/templates-prazos", response_model=dict)
async def criar_template_prazo(
    input: TemplatePrazosCreate,
    user_id: str = Query(...),
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar templates")
    
    prazo_total = sum(etapa.get("prazo_dias", 0) for etapa in input.etapas)
    
    template_obj = TemplatePrazosModel(
        id=str(uuid.uuid4()),
        nome=input.nome,
        descricao=input.descricao,
        etapas=input.etapas,
        prazo_total_dias=prazo_total,
        criado_por=input.criado_por or user_id
    )
    
    db.add(template_obj)
    await db.commit()
    await db.refresh(template_obj)
    
    return model_to_dict(template_obj)


@api_router.put("/templates-prazos/{template_id}", response_model=dict)
async def atualizar_template_prazo(
    template_id: str,
    input: TemplatePrazosUpdate,
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar templates")
    
    result = await db.execute(
        select(TemplatePrazosModel).where(TemplatePrazosModel.id == template_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if "etapas" in update_data:
        update_data["prazo_total_dias"] = sum(etapa.get("prazo_dias", 0) for etapa in update_data["etapas"])
    
    for key, value in update_data.items():
        setattr(existing, key, value)
    existing.atualizado_em = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(existing)
    
    return model_to_dict(existing)


@api_router.delete("/templates-prazos/{template_id}")
async def deletar_template_prazo(
    template_id: str,
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta um template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar templates")
    
    result = await db.execute(
        select(TemplatePrazosModel).where(TemplatePrazosModel.id == template_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    await db.delete(existing)
    await db.commit()
    
    return {"message": "Template deletado com sucesso"}


@api_router.post("/contratos/{contrato_id}/aplicar-template/{template_id}", response_model=dict)
async def aplicar_template_contrato(
    contrato_id: str,
    template_id: str,
    data_inicio: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Aplica um template de prazos a um contrato"""
    contrato_result = await db.execute(
        select(ContratoModel).where(ContratoModel.id == contrato_id)
    )
    contrato = contrato_result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    result = await db.execute(
        select(TemplatePrazosModel).where(TemplatePrazosModel.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    try:
        inicio = datetime.fromisoformat(data_inicio).date()
    except:
        raise HTTPException(status_code=400, detail="Data de início inválida")
    
    prazos_gerados = []
    data_atual = inicio
    
    for etapa in template.etapas or []:
        prazo_dias = etapa.get("prazo_dias", 0)
        data_fim = data_atual + timedelta(days=prazo_dias)
        
        prazos_gerados.append({
            "etapa_id": etapa.get("etapa_id"),
            "etapa_nome": etapa.get("etapa_nome"),
            "departamento": etapa.get("departamento"),
            "data_inicio": data_atual.isoformat(),
            "data_fim": data_fim.isoformat(),
            "prazo_dias": prazo_dias
        })
        
        data_atual = data_fim
    
    prazos_result = await db.execute(
        select(PrazoContratoModel).where(PrazoContratoModel.contrato_id == contrato_id)
    )
    prazo_contrato = prazos_result.scalar_one_or_none()

    if prazo_contrato:
        prazo_contrato.template_id = template_id
        prazo_contrato.template_nome = template.nome
        prazo_contrato.data_inicio = data_inicio
        prazo_contrato.data_fim_prevista = data_atual.isoformat()
        prazo_contrato.prazo_total_dias = template.prazo_total_dias
        prazo_contrato.etapas = prazos_gerados
    else:
        prazo_contrato = PrazoContratoModel(
            id=str(uuid.uuid4()),
            contrato_id=contrato_id,
            template_id=template_id,
            template_nome=template.nome,
            data_inicio=data_inicio,
            data_fim_prevista=data_atual.isoformat(),
            prazo_total_dias=template.prazo_total_dias,
            etapas=prazos_gerados
        )
        db.add(prazo_contrato)

    contrato.template_id = template_id
    contrato.template_nome = template.nome
    contrato.atualizado_em = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(prazo_contrato)

    if contrato.projeto_id:
        await aplicar_template_no_projeto(db, contrato.projeto_id, template, data_inicio)

    return model_to_dict(prazo_contrato)


@api_router.get("/contratos/{contrato_id}/prazos", response_model=dict)
async def obter_prazos_contrato(contrato_id: str, db: AsyncSession = Depends(get_db)):
    """Obtém os prazos aplicados a um contrato"""
    result = await db.execute(
        select(PrazoContratoModel).where(PrazoContratoModel.contrato_id == contrato_id)
    )
    prazos = result.scalar_one_or_none()
    
    if not prazos:
        return {"contrato_id": contrato_id, "prazos": None, "message": "Nenhum template aplicado"}
    
    return model_to_dict(prazos)


# ==========================================
# ROUTES - Relatórios de Gargalos e Cobrança
# ==========================================

@api_router.get("/relatorio-gargalos", response_model=dict)
async def relatorio_gargalos(db: AsyncSession = Depends(get_db)):
    """Relatório de gargalos - O que está travando os processos"""
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.finalizada == False)
    )
    tarefas = result.scalars().all()
    
    gargalos_por_setor = {}
    gargalos_por_responsavel = {}
    gargalos_por_projeto = {}
    tarefas_criticas = []
    
    for tarefa in tarefas:
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
        
        if not is_atrasada:
            continue
        
        setor = tarefa.setor or "Sem setor"
        responsavel = tarefa.responsavel_nome or "Não atribuído"
        projeto = tarefa.projeto_id or "Sem projeto"
        
        # Por setor
        if setor not in gargalos_por_setor:
            gargalos_por_setor[setor] = {
                "setor": setor,
                "quantidade_atrasadas": 0,
                "total_dias_atraso": 0,
                "media_dias_atraso": 0,
                "tarefas": []
            }
        gargalos_por_setor[setor]["quantidade_atrasadas"] += 1
        gargalos_por_setor[setor]["total_dias_atraso"] += dias_atraso
        gargalos_por_setor[setor]["tarefas"].append({
            "id": tarefa.id,
            "titulo": tarefa.titulo,
            "dias_atraso": dias_atraso,
            "responsavel": responsavel,
            "prioridade": tarefa.prioridade
        })
        
        # Por responsável
        if responsavel not in gargalos_por_responsavel:
            gargalos_por_responsavel[responsavel] = {
                "responsavel": responsavel,
                "quantidade_atrasadas": 0,
                "total_dias_atraso": 0,
                "setores_afetados": set()
            }
        gargalos_por_responsavel[responsavel]["quantidade_atrasadas"] += 1
        gargalos_por_responsavel[responsavel]["total_dias_atraso"] += dias_atraso
        gargalos_por_responsavel[responsavel]["setores_afetados"].add(setor)
        
        # Por projeto
        if projeto not in gargalos_por_projeto:
            gargalos_por_projeto[projeto] = {
                "projeto_id": projeto,
                "quantidade_atrasadas": 0,
                "total_dias_atraso": 0
            }
        gargalos_por_projeto[projeto]["quantidade_atrasadas"] += 1
        gargalos_por_projeto[projeto]["total_dias_atraso"] += dias_atraso
        
        # Tarefas críticas
        if dias_atraso > 7 or tarefa.prioridade == "critica":
            tarefas_criticas.append({
                "id": tarefa.id,
                "titulo": tarefa.titulo,
                "setor": setor,
                "responsavel": responsavel,
                "dias_atraso": dias_atraso,
                "prioridade": tarefa.prioridade,
                "projeto_id": projeto,
                "criado_por": tarefa.criado_por_nome,
                "criado_em": tarefa.criado_em.isoformat() if tarefa.criado_em else None
            })
    
    # Calculate averages
    for setor_data in gargalos_por_setor.values():
        if setor_data["quantidade_atrasadas"] > 0:
            setor_data["media_dias_atraso"] = round(
                setor_data["total_dias_atraso"] / setor_data["quantidade_atrasadas"], 1
            )
    
    # Convert sets to lists
    for resp_data in gargalos_por_responsavel.values():
        resp_data["setores_afetados"] = list(resp_data["setores_afetados"])
    
    # Sort by severity
    setores_ordenados = sorted(
        gargalos_por_setor.values(),
        key=lambda x: x["total_dias_atraso"],
        reverse=True
    )
    
    responsaveis_ordenados = sorted(
        gargalos_por_responsavel.values(),
        key=lambda x: x["quantidade_atrasadas"],
        reverse=True
    )
    
    tarefas_criticas.sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "resumo": {
            "total_tarefas_atrasadas": sum(s["quantidade_atrasadas"] for s in gargalos_por_setor.values()),
            "total_dias_atraso": sum(s["total_dias_atraso"] for s in gargalos_por_setor.values()),
            "setores_com_gargalo": len(gargalos_por_setor),
            "responsaveis_com_atraso": len(gargalos_por_responsavel),
            "tarefas_criticas": len(tarefas_criticas)
        },
        "gargalos_por_setor": setores_ordenados,
        "gargalos_por_responsavel": responsaveis_ordenados[:10],
        "tarefas_criticas": tarefas_criticas[:20],
        "indicadores_cobranca": {
            "setor_mais_critico": setores_ordenados[0] if setores_ordenados else None,
            "responsavel_mais_atrasado": responsaveis_ordenados[0] if responsaveis_ordenados else None
        }
    }


@api_router.get("/relatorio-semanal", response_model=dict)
async def relatorio_semanal(db: AsyncSession = Depends(get_db)):
    """Relatório semanal de produtividade"""
    hoje = datetime.now(timezone.utc)
    inicio_semana = hoje - timedelta(days=7)
    
    result = await db.execute(select(TarefaModel))
    tarefas = result.scalars().all()
    
    criadas_semana = []
    finalizadas_semana = []
    atrasadas_atuais = []
    
    for tarefa in tarefas:
        if tarefa.criado_em and tarefa.criado_em >= inicio_semana:
            criadas_semana.append(tarefa)
        
        if tarefa.finalizada:
            if tarefa.data_finalizacao and tarefa.data_finalizacao >= inicio_semana:
                finalizadas_semana.append(tarefa)
        else:
            dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                tarefa_dict = model_to_dict(tarefa)
                tarefa_dict["dias_atraso"] = dias_atraso
                atrasadas_atuais.append(tarefa_dict)
    
    por_setor = {}
    for tarefa in tarefas:
        setor = tarefa.setor or "Sem setor"
        if setor not in por_setor:
            por_setor[setor] = {"criadas": 0, "finalizadas": 0, "atrasadas": 0}
    
    for t in criadas_semana:
        setor = t.setor or "Sem setor"
        if setor in por_setor:
            por_setor[setor]["criadas"] += 1
    
    for t in finalizadas_semana:
        setor = t.setor or "Sem setor"
        if setor in por_setor:
            por_setor[setor]["finalizadas"] += 1
    
    for t in atrasadas_atuais:
        setor = t.get("setor") or "Sem setor"
        if setor in por_setor:
            por_setor[setor]["atrasadas"] += 1
    
    return {
        "periodo": {
            "inicio": inicio_semana.isoformat(),
            "fim": hoje.isoformat(),
            "tipo": "semanal"
        },
        "resumo": {
            "tarefas_criadas": len(criadas_semana),
            "tarefas_finalizadas": len(finalizadas_semana),
            "tarefas_atrasadas": len(atrasadas_atuais),
            "taxa_conclusao": round(
                (len(finalizadas_semana) / len(criadas_semana) * 100)
                if criadas_semana else 0, 1
            )
        },
        "por_setor": por_setor,
        "detalhes_atrasadas": [
            {
                "id": t["id"],
                "titulo": t["titulo"],
                "setor": t.get("setor"),
                "responsavel": t.get("responsavel_nome"),
                "dias_atraso": t.get("dias_atraso", 0),
                "prioridade": t.get("prioridade")
            }
            for t in sorted(atrasadas_atuais, key=lambda x: x.get("dias_atraso", 0), reverse=True)[:10]
        ],
        "timestamp": hoje.isoformat()
    }


@api_router.get("/relatorio-mensal", response_model=dict)
async def relatorio_mensal(db: AsyncSession = Depends(get_db)):
    """Relatório mensal de produtividade"""
    hoje = datetime.now(timezone.utc)
    inicio_mes = hoje - timedelta(days=30)
    
    result = await db.execute(select(TarefaModel))
    tarefas = result.scalars().all()
    
    criadas_mes = []
    finalizadas_mes = []
    atrasadas_atuais = []
    
    for tarefa in tarefas:
        if tarefa.criado_em and tarefa.criado_em >= inicio_mes:
            criadas_mes.append(tarefa)
        
        if tarefa.finalizada:
            if tarefa.data_finalizacao and tarefa.data_finalizacao >= inicio_mes:
                finalizadas_mes.append(tarefa)
        else:
            dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                tarefa_dict = model_to_dict(tarefa)
                tarefa_dict["dias_atraso"] = dias_atraso
                atrasadas_atuais.append(tarefa_dict)
    
    # Análise por setor
    analise_setor = {}
    for tarefa in tarefas:
        setor = tarefa.setor or "Sem setor"
        if setor not in analise_setor:
            analise_setor[setor] = {
                "total": 0,
                "finalizadas": 0,
                "em_andamento": 0,
                "atrasadas": 0,
                "taxa_conclusao": 0
            }
        analise_setor[setor]["total"] += 1
        if tarefa.finalizada:
            analise_setor[setor]["finalizadas"] += 1
        else:
            analise_setor[setor]["em_andamento"] += 1
    
    for t in atrasadas_atuais:
        setor = t.get("setor") or "Sem setor"
        if setor in analise_setor:
            analise_setor[setor]["atrasadas"] += 1
    
    for setor_data in analise_setor.values():
        if setor_data["total"] > 0:
            setor_data["taxa_conclusao"] = round(
                setor_data["finalizadas"] / setor_data["total"] * 100, 1
            )
    
    # Gargalos críticos para cobrança
    gargalos_cobranca = []
    for t in atrasadas_atuais:
        if t.get("dias_atraso", 0) > 5:
            gargalos_cobranca.append({
                "tarefa": t["titulo"],
                "setor": t.get("setor"),
                "responsavel": t.get("responsavel_nome", "Não atribuído"),
                "dias_atraso": t.get("dias_atraso", 0),
                "prioridade": t.get("prioridade"),
                "acao_sugerida": "Cobrança imediata" if t.get("dias_atraso", 0) > 10 else "Acompanhamento urgente"
            })
    
    gargalos_cobranca.sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    return {
        "periodo": {
            "inicio": inicio_mes.isoformat(),
            "fim": hoje.isoformat(),
            "tipo": "mensal"
        },
        "resumo": {
            "tarefas_criadas": len(criadas_mes),
            "tarefas_finalizadas": len(finalizadas_mes),
            "tarefas_atrasadas": len(atrasadas_atuais),
            "taxa_conclusao": round(
                (len(finalizadas_mes) / len(criadas_mes) * 100)
                if criadas_mes else 0, 1
            ),
            "media_diaria_criadas": round(len(criadas_mes) / 30, 1),
            "media_diaria_finalizadas": round(len(finalizadas_mes) / 30, 1)
        },
        "analise_por_setor": analise_setor,
        "gargalos_para_cobranca": gargalos_cobranca[:15],
        "timestamp": hoje.isoformat()
    }


# ==========================================
# ROUTES - Contratos
# ==========================================

@api_router.get("/contratos", response_model=List[dict])
async def listar_contratos(
    user_role: Optional[str] = None,
    user_id: Optional[str] = None,
    user_setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista contratos respeitando regras de acesso do operador."""
    query = select(ContratoModel)

    if user_role == "operador":
        validar_contexto_usuario_operador(user_id, user_setor)
        _, contratos_ids = await obter_ids_atribuicoes_operador(db, user_id, user_setor)
        if not contratos_ids:
            return []
        query = query.where(ContratoModel.id.in_(contratos_ids))

    result = await db.execute(query.order_by(ContratoModel.criado_em.desc()))
    contratos = result.scalars().all()
    return [model_to_dict(c) for c in contratos]


@api_router.get("/contratos/{contrato_id}", response_model=dict)
async def obter_contrato(
    contrato_id: str,
    user_role: Optional[str] = None,
    user_id: Optional[str] = None,
    user_setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Obtem um contrato especifico com controle de acesso por operador."""
    if user_role == "operador":
        validar_contexto_usuario_operador(user_id, user_setor)
        _, contratos_ids = await obter_ids_atribuicoes_operador(db, user_id, user_setor)
        if contrato_id not in contratos_ids:
            raise HTTPException(status_code=403, detail="Contrato nao atribuido ao operador logado")

    result = await db.execute(
        select(ContratoModel).where(ContratoModel.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()

    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato nao encontrado")

    return model_to_dict(contrato)


@api_router.post("/contratos/{contrato_id}/aditivo", response_model=dict)
async def registrar_aditivo_contrato(
    contrato_id: str,
    input: ContratoAditivoUpdate,
    user_role: str = Query(...),
    user_id: Optional[str] = Query(None),
    user_setor: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Registra data de aditivo e recalcula proporcionalmente as etapas pendentes."""
    if user_role not in ["admin", "gerente", "operador"]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    contrato_result = await db.execute(
        select(ContratoModel).where(ContratoModel.id == contrato_id)
    )
    contrato = contrato_result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato nao encontrado")

    if user_role == "operador":
        validar_contexto_usuario_operador(user_id, user_setor)
        _, contratos_ids = await obter_ids_atribuicoes_operador(db, user_id, user_setor)
        if contrato_id not in contratos_ids:
            raise HTTPException(status_code=403, detail="Contrato nao atribuido ao operador logado")

    return await aplicar_aditivo_contrato(db, contrato, input.data_aditivo)


@api_router.post("/contratos", response_model=dict)
async def criar_contrato(input: ContratoCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo contrato e automaticamente cria o projeto com todas as etapas"""
    # Verificar se template existe
    result = await db.execute(
        select(TemplatePrazosModel).where(TemplatePrazosModel.id == input.template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    # Criar contrato
    contrato_id = str(uuid.uuid4())
    contrato_obj = ContratoModel(
        id=contrato_id,
        cliente=input.cliente,
        faculdade=input.faculdade,
        curso=input.curso,
        numero_contrato=input.numero_contrato,
        valor=input.valor or 0.0,
        pago=input.pago,
        data_inicio=input.data_inicio,
        data_fim=input.data_fim,
        observacao=input.observacao,
        template_id=input.template_id,
        template_nome=template.nome,
        criado_por=input.criado_por,
        status="Em Andamento",
    )
    
    db.add(contrato_obj)
    
    # Calcular data fim prevista
    try:
        data_inicio_dt = datetime.fromisoformat(input.data_inicio).date()
    except:
        data_inicio_dt = datetime.now(timezone.utc).date()
    
    prazo_total = template.prazo_total_dias or 134
    data_fim_prevista = (data_inicio_dt + timedelta(days=prazo_total)).isoformat()
    
    # Criar projeto automaticamente
    projeto_id = str(uuid.uuid4())
    etapas = template.etapas or []
    etapa_atual = etapas[0].get("etapa_nome", "Início") if etapas else "Início"
    
    projeto_obj = ProjetoModel(
        id=projeto_id,
        contrato_id=contrato_id,
        cliente=input.cliente,
        etapa_atual=etapa_atual,
        etapa_atual_ordem=1,
        progresso=0.0,
        risco="baixo",
        dias_restantes=prazo_total,
        data_inicio=input.data_inicio,
        data_fim_prevista=data_fim_prevista,
        template_id=input.template_id,
        template_nome=template.nome,
        criado_por=input.criado_por
    )
    
    db.add(projeto_obj)
    
    # Atualizar contrato com projeto_id
    contrato_obj.projeto_id = projeto_id
    
    # Resolver responsÃ¡veis iniciais (atendimento / criaÃ§Ã£o)
    def normalizar_setor(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        value_norm = value.lower().replace("-", "").replace("_", "").replace(" ", "")
        setor_map = {
            "atendimento": "atendimento",
            "criacao": "criacao",
            "criaÃ§Ã£o": "criacao",
            "preproducao": "pre-producao",
            "prÃ©producao": "pre-producao",
            "preproduÃ§Ã£o": "pre-producao",
            "producao": "producao",
            "produÃ§Ã£o": "producao",
        }
        return setor_map.get(value_norm, value)

    responsavel_atendimento = None
    responsavel_criacao = None

    if input.atribuir_operadores:
        if input.responsavel_atendimento_id:
            result = await db.execute(
                select(UserModel).where(UserModel.id == input.responsavel_atendimento_id)
            )
            responsavel_atendimento = result.scalar_one_or_none()
            if responsavel_atendimento and not (responsavel_atendimento.ativo and responsavel_atendimento.aprovado):
                responsavel_atendimento = None
            if responsavel_atendimento and normalizar_setor(responsavel_atendimento.setor) != "atendimento":
                responsavel_atendimento = None

        if input.responsavel_criacao_id:
            result = await db.execute(
                select(UserModel).where(UserModel.id == input.responsavel_criacao_id)
            )
            responsavel_criacao = result.scalar_one_or_none()
            if responsavel_criacao and not (responsavel_criacao.ativo and responsavel_criacao.aprovado):
                responsavel_criacao = None
            if responsavel_criacao and normalizar_setor(responsavel_criacao.setor) != "criacao":
                responsavel_criacao = None

    # Criar todas as tarefas (etapas) do template
    status_list = await get_status_padrao(db)
    status_pendente = status_list[0] if status_list else {"id": str(uuid.uuid4()), "nome": "Pendente"}
    
    data_atual = data_inicio_dt
    tarefas_criadas = []
    
    for etapa in etapas:
        prazo_dias = etapa.get("prazo_dias", 1)
        data_fim_etapa = data_atual + timedelta(days=prazo_dias)
        
        tarefa_id = str(uuid.uuid4())
        historico = [{
            "id": str(uuid.uuid4()),
            "acao": "criada",
            "usuario_id": input.criado_por,
            "usuario_nome": input.criado_por,
            "setor": "sistema",
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": f"Etapa criada automaticamente do template {template.nome}"
        }]
        
        responsavel_id = None
        responsavel_nome = None
        setor_norm = normalizar_setor(etapa.get("departamento", "atendimento"))
        if responsavel_atendimento and setor_norm == "atendimento":
            responsavel_id = responsavel_atendimento.id
            responsavel_nome = responsavel_atendimento.nome
        if responsavel_criacao and setor_norm == "criacao":
            responsavel_id = responsavel_criacao.id
            responsavel_nome = responsavel_criacao.nome

        if responsavel_nome:
            historico.append({
                "id": str(uuid.uuid4()),
                "acao": "atribuida",
                "usuario_id": "sistema",
                "usuario_nome": "Sistema",
                "setor": "sistema",
                "data": datetime.now(timezone.utc).isoformat(),
                "detalhes": f"ResponsÃ¡vel inicial definido: {responsavel_nome}"
            })

        tarefa_obj = TarefaModel(
            id=tarefa_id,
            titulo=etapa.get("etapa_nome"),
            descricao=etapa.get("descricao", ""),
            projeto_id=projeto_id,
            contrato_id=contrato_id,
            setor=etapa.get("departamento", "atendimento"),
            responsavel_id=responsavel_id,
            responsavel_nome=responsavel_nome,
            status_id=status_pendente["id"],
            status_nome="Pendente",
            prazo=data_fim_etapa.isoformat(),
            prazo_original=data_fim_etapa.isoformat(),
            prioridade="media",
            criado_por_id=input.criado_por,
            criado_por_nome=input.criado_por,
            criado_por_setor="sistema",
            historico=historico
        )
        
        db.add(tarefa_obj)
        tarefas_criadas.append(tarefa_id)
        
        data_atual = data_fim_etapa
    
    await db.commit()
    await db.refresh(contrato_obj)
    await db.refresh(projeto_obj)
    
    logger.info(f"Contrato criado: {contrato_id}, Projeto criado: {projeto_id}, {len(tarefas_criadas)} tarefas criadas")
    
    return {
        "contrato": model_to_dict(contrato_obj),
        "projeto": model_to_dict(projeto_obj),
        "tarefas_criadas": len(tarefas_criadas),
        "message": f"Contrato, projeto e {len(tarefas_criadas)} etapas criados com sucesso!"
    }


@api_router.put("/contratos/{contrato_id}", response_model=dict)
async def atualizar_contrato(
    contrato_id: str,
    input: ContratoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um contrato"""
    result = await db.execute(
        select(ContratoModel).where(ContratoModel.id == contrato_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    for key, value in update_data.items():
        setattr(existing, key, value)
    existing.atualizado_em = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(existing)
    
    return model_to_dict(existing)


@api_router.delete("/contratos/{contrato_id}")
async def deletar_contrato(
    contrato_id: str,
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta um contrato (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar contratos")
    
    result = await db.execute(
        select(ContratoModel).where(ContratoModel.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    # Deletar projeto relacionado se existir
    if contrato.projeto_id:
        # Deletar tarefas do projeto
        await db.execute(
            delete(TarefaModel).where(TarefaModel.projeto_id == contrato.projeto_id)
        )
        # Deletar projeto
        await db.execute(
            delete(ProjetoModel).where(ProjetoModel.id == contrato.projeto_id)
        )
    
    await db.delete(contrato)
    await db.commit()
    
    return {"message": "Contrato deletado com sucesso"}


# ==========================================
# ROUTES - Projetos
# ==========================================

@api_router.get("/projetos", response_model=List[dict])
async def listar_projetos(
    user_role: str = Query(...),
    user_id: Optional[str] = None,
    user_setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista projetos conforme role e atribuicoes do operador."""
    if user_role not in ["admin", "gerente", "operador"]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    if user_role == "operador":
        validar_contexto_usuario_operador(user_id, user_setor)
        projetos_ids_operador, _ = await obter_ids_atribuicoes_operador(db, user_id, user_setor)
        if not projetos_ids_operador:
            return []
        query = select(ProjetoModel).where(ProjetoModel.id.in_(projetos_ids_operador))
    else:
        query = select(ProjetoModel)

    result = await db.execute(query.order_by(ProjetoModel.criado_em.desc()))
    projetos = result.scalars().all()

    result_list = []
    for projeto in projetos:
        projeto_dict = model_to_dict(projeto)

        contrato_result = await db.execute(
            select(ContratoModel).where(ContratoModel.id == projeto.contrato_id)
        )
        contrato = contrato_result.scalar_one_or_none()
        if contrato:
            contrato_dict = model_to_dict(contrato)
            projeto_dict["contrato"] = contrato_dict
            projeto_dict["contratos"] = [{
                "id": contrato.id,
                "numero_contrato": contrato.numero_contrato,
                "cliente": contrato.cliente,
                "status": contrato.status,
                "faculdade": contrato.faculdade,
                "curso": contrato.curso,
                "data_inicio": contrato.data_inicio,
                "data_fim": contrato.data_fim,
                "data_aditivo": contrato.data_aditivo,
            }]
        else:
            projeto_dict["contrato"] = None
            projeto_dict["contratos"] = []

        tarefas_result = await db.execute(
            select(TarefaModel).where(TarefaModel.projeto_id == projeto.id)
        )
        tarefas = tarefas_result.scalars().all()

        if user_role == "operador":
            tarefas = [
                t for t in tarefas
                if tarefa_visivel_para_operador_no_contexto(
                    tarefa_projeto_id=t.projeto_id,
                    tarefa_contrato_id=t.contrato_id,
                    tarefa_operador_id=t.responsavel_id,
                    tarefa_setor=t.setor,
                    usuario_id=user_id,
                    usuario_setor=user_setor,
                    projetos_ids=projetos_ids_operador,
                    contratos_ids={projeto.contrato_id} if projeto.contrato_id else set(),
                )
            ]
            if not tarefas:
                continue

        tarefas = ordenar_tarefas_fluxo(tarefas)
        tarefas_atrasadas = 0
        total_dias_atraso = 0
        tarefas_list = []
        for tarefa in tarefas:
            tarefa_dict = model_to_dict(tarefa)
            finalizada_calc = is_tarefa_efetivamente_finalizada(tarefa)
            tarefa_dict["finalizada"] = finalizada_calc
            if finalizada_calc:
                tarefa_dict["status_nome"] = "Concluído"
                tarefa_dict["dias_atraso"] = 0
                tarefa_dict["atrasada"] = False
            else:
                dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
                tarefa_dict["dias_atraso"] = dias_atraso
                tarefa_dict["atrasada"] = is_atrasada
                if is_atrasada:
                    tarefas_atrasadas += 1
                    total_dias_atraso += dias_atraso
            tarefas_list.append(tarefa_dict)

        tarefas_list = await enriquecer_tarefas_com_contrato(db, tarefas_list)

        resumo_projeto = resumir_status_projeto(tarefas)
        etapa_contexto = obter_contexto_etapa_atual(tarefas)

        projeto_dict["total_tarefas"] = resumo_projeto["total_tarefas"]
        projeto_dict["tarefas_concluidas"] = resumo_projeto["tarefas_concluidas"]
        projeto_dict["tarefas_em_andamento"] = resumo_projeto["tarefas_em_andamento"]
        projeto_dict["tarefas_pendentes"] = resumo_projeto["tarefas_pendentes"]
        projeto_dict["tarefas_atrasadas"] = tarefas_atrasadas
        projeto_dict["progresso"] = resumo_projeto["progresso"]
        projeto_dict["status"] = "Atrasado" if tarefas_atrasadas > 0 else resumo_projeto["status"]

        if tarefas_atrasadas == 0:
            projeto_dict["risco"] = "baixo"
        elif tarefas_atrasadas <= 2 and total_dias_atraso < 7:
            projeto_dict["risco"] = "medio"
        elif tarefas_atrasadas <= 5 or total_dias_atraso < 15:
            projeto_dict["risco"] = "alto"
        else:
            projeto_dict["risco"] = "critico"

        projeto_dict["etapa_atual"] = etapa_contexto["titulo"]
        projeto_dict["etapa_atual_setor"] = etapa_contexto["setor"]
        projeto_dict["setor_atual"] = etapa_contexto["setor"]
        projeto_dict["etapa_atual_ordem"] = etapa_contexto["ordem"]

        if user_role == "operador":
            projeto_dict["tarefas_operador"] = tarefas_list

        result_list.append(projeto_dict)

    return result_list


@api_router.get("/projetos/{projeto_id}", response_model=dict)
async def obter_projeto(
    projeto_id: str,
    user_role: str = Query(...),
    user_id: Optional[str] = None,
    user_setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Obtem um projeto especifico com regras de acesso por operador."""
    if user_role not in ["admin", "gerente", "operador"]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    if user_role == "operador":
        validar_contexto_usuario_operador(user_id, user_setor)
        projetos_ids_operador, _ = await obter_ids_atribuicoes_operador(db, user_id, user_setor)
        if projeto_id not in projetos_ids_operador:
            raise HTTPException(status_code=403, detail="Projeto nao atribuido ao operador logado")

    result = await db.execute(
        select(ProjetoModel).where(ProjetoModel.id == projeto_id)
    )
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")

    projeto_dict = model_to_dict(projeto)

    contrato_result = await db.execute(
        select(ContratoModel).where(ContratoModel.id == projeto.contrato_id)
    )
    contrato = contrato_result.scalar_one_or_none()
    if contrato:
        contrato_dict = model_to_dict(contrato)
        projeto_dict["contrato"] = contrato_dict
        projeto_dict["contratos"] = [{
            "id": contrato.id,
            "numero_contrato": contrato.numero_contrato,
            "cliente": contrato.cliente,
            "status": contrato.status,
            "faculdade": contrato.faculdade,
            "curso": contrato.curso,
            "data_inicio": contrato.data_inicio,
            "data_fim": contrato.data_fim,
            "data_aditivo": contrato.data_aditivo,
        }]
    else:
        projeto_dict["contrato"] = None
        projeto_dict["contratos"] = []

    tarefas_result = await db.execute(
        select(TarefaModel).where(TarefaModel.projeto_id == projeto_id)
    )
    tarefas = tarefas_result.scalars().all()

    if user_role == "operador":
        tarefas = [
            t for t in tarefas
            if tarefa_visivel_para_operador_no_contexto(
                tarefa_projeto_id=t.projeto_id,
                tarefa_contrato_id=t.contrato_id,
                tarefa_operador_id=t.responsavel_id,
                tarefa_setor=t.setor,
                usuario_id=user_id,
                usuario_setor=user_setor,
                projetos_ids={projeto_id},
                contratos_ids={projeto.contrato_id} if projeto.contrato_id else set(),
            )
        ]
        if not tarefas:
            raise HTTPException(status_code=403, detail="Projeto nao possui tarefas atribuidas ao operador")

    tarefas = ordenar_tarefas_fluxo(tarefas)
    tarefas_list = []
    for tarefa in tarefas:
        tarefa_dict = model_to_dict(tarefa)
        finalizada_calc = is_tarefa_efetivamente_finalizada(tarefa)
        tarefa_dict["finalizada"] = finalizada_calc
        if finalizada_calc:
            tarefa_dict["status_nome"] = "Concluído"
            tarefa_dict["dias_atraso"] = 0
            tarefa_dict["atrasada"] = False
        else:
            dias_atraso, atrasada = await calcular_dias_atraso(tarefa.prazo)
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = atrasada
        tarefas_list.append(tarefa_dict)

    tarefas_list = await enriquecer_tarefas_com_contrato(db, tarefas_list)

    projeto_dict["tarefas"] = tarefas_list
    resumo_projeto = resumir_status_projeto(tarefas)
    etapa_contexto = obter_contexto_etapa_atual(tarefas)
    projeto_dict["total_tarefas"] = resumo_projeto["total_tarefas"]
    projeto_dict["tarefas_concluidas"] = resumo_projeto["tarefas_concluidas"]
    projeto_dict["tarefas_em_andamento"] = resumo_projeto["tarefas_em_andamento"]
    projeto_dict["tarefas_pendentes"] = resumo_projeto["tarefas_pendentes"]
    projeto_dict["progresso"] = resumo_projeto["progresso"]
    projeto_dict["status"] = resumo_projeto["status"]
    projeto_dict["etapa_atual"] = etapa_contexto["titulo"]
    projeto_dict["etapa_atual_setor"] = etapa_contexto["setor"]
    projeto_dict["setor_atual"] = etapa_contexto["setor"]
    projeto_dict["etapa_atual_ordem"] = etapa_contexto["ordem"]

    return projeto_dict


@api_router.put("/projetos/{projeto_id}/responsaveis", response_model=dict)
async def atualizar_responsaveis_projeto_route(
    projeto_id: str,
    input: ProjetoResponsaveisUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza em lote os responsáveis de atendimento e criação de um projeto."""
    if input.user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem atualizar responsáveis do projeto")

    projeto_result = await db.execute(
        select(ProjetoModel).where(ProjetoModel.id == projeto_id)
    )
    projeto = projeto_result.scalar_one_or_none()
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")

    resultado = await atualizar_responsaveis_projeto(
        db,
        projeto_id,
        usuario_id=input.user_id or "sistema",
        usuario_nome=input.user_nome or "Sistema",
        usuario_setor=input.user_setor or "geral",
        responsavel_atendimento_id=input.responsavel_atendimento_id,
        responsavel_criacao_id=input.responsavel_criacao_id,
        aplicar_finalizadas=input.aplicar_finalizadas,
    )

    projeto_atualizado = await obter_projeto(
        projeto_id,
        user_role="admin",
        user_id=input.user_id,
        user_setor=input.user_setor,
        db=db,
    )
    return {
        "message": "Responsáveis do projeto atualizados com sucesso",
        "atualizacoes": resultado["atualizacoes"],
        "responsavel_atendimento": resultado["responsavel_atendimento"],
        "responsavel_criacao": resultado["responsavel_criacao"],
        "projeto": projeto_atualizado,
    }


@api_router.put("/projetos/{projeto_id}/prazos", response_model=dict)
async def atualizar_prazos_projeto_route(
    projeto_id: str,
    input: ProjetoPrazosUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Ajusta manualmente os prazos das tarefas de um projeto."""
    if input.user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem ajustar prazos do projeto")

    projeto_result = await db.execute(
        select(ProjetoModel).where(ProjetoModel.id == projeto_id)
    )
    projeto = projeto_result.scalar_one_or_none()
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")

    tarefas_result = await db.execute(
        select(TarefaModel).where(TarefaModel.projeto_id == projeto_id)
    )
    tarefas = {tarefa.id: tarefa for tarefa in tarefas_result.scalars().all()}
    if not tarefas:
        raise HTTPException(status_code=404, detail="Projeto sem tarefas cadastradas")

    now = datetime.now(timezone.utc)
    atualizadas = []

    for item in input.prazos or []:
        tarefa = tarefas.get(item.tarefa_id)
        if not tarefa:
            continue
        if tarefa.finalizada:
            continue
        if not item.prazo or item.prazo == tarefa.prazo:
            continue

        prazo_anterior = tarefa.prazo
        tarefa.prazo = item.prazo
        tarefa.prazo_original = item.prazo
        tarefa.dias_atraso, tarefa.atrasada = await calcular_dias_atraso(item.prazo)
        tarefa.atualizado_em = now

        historico = tarefa.historico or []
        historico.append({
            "id": str(uuid.uuid4()),
            "acao": "prazo_ajustado_lote",
            "usuario_id": input.user_id or "sistema",
            "usuario_nome": input.user_nome or "Sistema",
            "setor": input.user_setor or "geral",
            "data": now.isoformat(),
            "detalhes": f"Prazo ajustado manualmente de {prazo_anterior} para {item.prazo}",
        })
        tarefa.historico = historico

        atualizadas.append({
            "tarefa_id": tarefa.id,
            "titulo": tarefa.titulo,
            "prazo_anterior": prazo_anterior,
            "novo_prazo": item.prazo,
        })

    await db.commit()
    await atualizar_projeto_prazos(db, projeto_id)
    projeto_atualizado = await obter_projeto(
        projeto_id,
        user_role="admin",
        user_id=input.user_id,
        user_setor=input.user_setor,
        db=db,
    )

    return {
        "message": "Prazos do projeto atualizados com sucesso",
        "tarefas_atualizadas": atualizadas,
        "projeto": projeto_atualizado,
    }


@api_router.get("/notificacoes/{usuario_id}", response_model=List[dict])
async def listar_notificacoes(
    usuario_id: str,
    apenas_nao_lidas: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Lista notificações de um usuário"""
    query = select(NotificacaoModel).where(NotificacaoModel.para_usuario_id == usuario_id)
    
    if apenas_nao_lidas:
        query = query.where(NotificacaoModel.lida == False)
    
    query = query.order_by(NotificacaoModel.criado_em.desc())
    
    result = await db.execute(query)
    notificacoes = result.scalars().all()
    
    return [model_to_dict(n) for n in notificacoes]


@api_router.post("/notificacoes", response_model=dict)
async def criar_notificacao(input: NotificacaoCreate, db: AsyncSession = Depends(get_db)):
    """Cria uma nova notificação"""
    notif_obj = NotificacaoModel(
        id=str(uuid.uuid4()),
        tipo=input.tipo,
        titulo=input.titulo,
        mensagem=input.mensagem,
        de_usuario_id=input.de_usuario_id,
        de_usuario_nome=input.de_usuario_nome,
        para_usuario_id=input.para_usuario_id,
        para_usuario_nome=input.para_usuario_nome,
        tarefa_id=input.tarefa_id,
        projeto_id=input.projeto_id
    )
    
    db.add(notif_obj)
    await db.commit()
    await db.refresh(notif_obj)
    
    return model_to_dict(notif_obj)


@api_router.put("/notificacoes/{notificacao_id}/marcar-lida")
async def marcar_notificacao_lida(
    notificacao_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Marca uma notificação como lida"""
    result = await db.execute(
        select(NotificacaoModel).where(NotificacaoModel.id == notificacao_id)
    )
    notif = result.scalar_one_or_none()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    notif.lida = True
    await db.commit()
    
    return {"message": "Notificação marcada como lida"}


@api_router.post("/cobrar-operador")
async def cobrar_operador(
    input: CobrancaOperador,
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Envia cobrança para operador atrasado (apenas gerente/admin)"""
    if user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas gerentes e administradores podem cobrar operadores")
    
    result = await db.execute(
        select(TarefaModel).where(TarefaModel.id == input.tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    notif_obj = NotificacaoModel(
        id=str(uuid.uuid4()),
        tipo="cobranca",
        titulo=f"Cobrança de {input.gerente_nome}",
        mensagem=input.mensagem,
        de_usuario_id=input.gerente_id,
        de_usuario_nome=input.gerente_nome,
        para_usuario_id=input.operador_id,
        para_usuario_nome=input.operador_nome,
        tarefa_id=input.tarefa_id,
        projeto_id=tarefa.projeto_id
    )
    
    db.add(notif_obj)
    await db.commit()
    
    email_enviado = False
    if input.enviar_email:
        subject = f"Cobrança - Tarefa Atrasada: {tarefa.titulo}"
        body = (
            f"Olá {input.operador_nome},\n\n"
            f"{input.mensagem}\n\n"
            f"Tarefa: {tarefa.titulo}\n"
            f"Projeto: {tarefa.projeto_id}\n"
            f"Responsável: {input.operador_nome}\n\n"
            f"Enviado por: {input.gerente_nome}\n"
        )
        email_enviado = send_email(input.operador_email, subject, body)
    
    return {
        "message": "Cobrança enviada com sucesso",
        "notificacao_criada": True,
        "email_enviado": email_enviado
    }


@api_router.post("/cobrancas/responder")
async def responder_cobranca(
    input: RespostaCobranca,
    db: AsyncSession = Depends(get_db)
):
    """Operador responde a uma cobrança (notifica gerente/admin)."""
    result = await db.execute(
        select(NotificacaoModel).where(NotificacaoModel.id == input.notificacao_id)
    )
    notif = result.scalar_one_or_none()

    if not notif:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")

    if notif.tipo != "cobranca":
        raise HTTPException(status_code=400, detail="Notificação não é cobrança")

    resposta_notif = NotificacaoModel(
        id=str(uuid.uuid4()),
        tipo="resposta_cobranca",
        titulo=f"Resposta de cobrança - {input.operador_nome}",
        mensagem=input.resposta,
        de_usuario_id=input.operador_id,
        de_usuario_nome=input.operador_nome,
        para_usuario_id=notif.de_usuario_id,
        para_usuario_nome=notif.de_usuario_nome,
        tarefa_id=notif.tarefa_id,
        projeto_id=notif.projeto_id
    )

    db.add(resposta_notif)
    await db.commit()

    return {"message": "Resposta enviada", "notificacao_criada": True}


# ==========================================
# ROUTES - Dashboard Avançado
# ==========================================

@api_router.get("/dashboard-avancado", response_model=dict)
async def dashboard_avancado(
    user_role: Optional[str] = None,
    user_id: Optional[str] = None,
    user_setor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Dashboard com informações detalhadas para gestores"""
    if not getattr(app.state, "db_ready", True):
        raise HTTPException(
            status_code=503,
            detail="Banco de dados em inicializacao. Tente novamente em alguns segundos."
        )

    projeto_cols_dashboard = (
        ProjetoModel.id,
        ProjetoModel.contrato_id,
        ProjetoModel.cliente,
        ProjetoModel.status,
        ProjetoModel.risco,
        ProjetoModel.data_inicio,
        ProjetoModel.data_fim_prevista,
    )
    tarefa_cols_dashboard = (
        TarefaModel.id,
        TarefaModel.titulo,
        TarefaModel.projeto_id,
        TarefaModel.contrato_id,
        TarefaModel.setor,
        TarefaModel.responsavel_id,
        TarefaModel.responsavel_nome,
        TarefaModel.status_nome,
        TarefaModel.prazo,
        TarefaModel.prazo_original,
        TarefaModel.prioridade,
        TarefaModel.finalizada,
        TarefaModel.data_finalizacao,
        TarefaModel.criado_em,
    )
    contrato_cols_dashboard = (
        ContratoModel.id,
        ContratoModel.numero_contrato,
        ContratoModel.cliente,
        ContratoModel.faculdade,
        ContratoModel.curso,
        ContratoModel.data_fim,
        ContratoModel.data_aditivo,
    )

    if user_role == "operador":
        validar_contexto_usuario_operador(user_id, user_setor)
        projetos_ids_operador, contratos_ids_operador = await obter_ids_atribuicoes_operador(db, user_id, user_setor)
        if projetos_ids_operador:
            projetos_result = await db.execute(
                select(ProjetoModel)
                .options(load_only(*projeto_cols_dashboard))
                .where(ProjetoModel.id.in_(projetos_ids_operador))
            )
            tarefas_result = await db.execute(
                select(TarefaModel)
                .options(load_only(*tarefa_cols_dashboard))
                .where(
                    filtro_tarefas_no_escopo_operador(
                        projetos_ids=projetos_ids_operador,
                        contratos_ids=contratos_ids_operador,
                    )
                )
            )
            projetos = projetos_result.scalars().all()
            tarefas = tarefas_result.scalars().all()
        else:
            projetos = []
            tarefas = []
            contratos_ids_operador = set()
    else:
        projetos_result = await db.execute(
            select(ProjetoModel).options(load_only(*projeto_cols_dashboard))
        )
        projetos = projetos_result.scalars().all()
        
        tarefas_result = await db.execute(
            select(TarefaModel).options(load_only(*tarefa_cols_dashboard))
        )
        tarefas = tarefas_result.scalars().all()
        projetos_ids_operador = set()
        contratos_ids_operador = set()

    contrato_ids = {
        contrato_id
        for contrato_id in [*(projeto.contrato_id for projeto in projetos), *(tarefa.contrato_id for tarefa in tarefas)]
        if contrato_id
    }
    contratos_map = {}
    if contrato_ids:
        contratos_result = await db.execute(
            select(ContratoModel)
            .options(load_only(*contrato_cols_dashboard))
            .where(ContratoModel.id.in_(contrato_ids))
        )
        contratos_map = {
            contrato.id: contrato
            for contrato in contratos_result.scalars().all()
        }
    
    total_projetos = len(projetos)
    carga_por_responsavel = {}
    alertas_atrasos = []
    tarefas_visiveis = []
    tarefas_por_projeto = {}
    metricas_por_setor = {}
    
    for tarefa in tarefas:
        if user_role == "operador":
            if not tarefa_visivel_para_operador_no_contexto(
                tarefa_projeto_id=tarefa.projeto_id,
                tarefa_contrato_id=tarefa.contrato_id,
                tarefa_operador_id=tarefa.responsavel_id,
                tarefa_setor=tarefa.setor,
                usuario_id=user_id,
                usuario_setor=user_setor,
                projetos_ids=projetos_ids_operador,
                contratos_ids=contratos_ids_operador,
            ):
                continue
        
        responsavel = tarefa.responsavel_nome or "Não atribuído"
        tarefas_visiveis.append(tarefa)
        tarefas_por_projeto.setdefault(tarefa.projeto_id, []).append(tarefa)

        setor = tarefa.setor or "Sem setor"
        metricas_setor = metricas_por_setor.setdefault(setor, {
            "setor": setor,
            "total_tarefas": 0,
            "tarefas_finalizadas": 0,
            "tarefas_abertas": 0,
            "tarefas_atrasadas": 0,
            "total_dias_atraso": 0,
        })
        metricas_setor["total_tarefas"] += 1

        finalizada_calc = is_tarefa_efetivamente_finalizada(tarefa)
        dias_atraso = 0
        is_atrasada = False
        if finalizada_calc:
            metricas_setor["tarefas_finalizadas"] += 1
        else:
            metricas_setor["tarefas_abertas"] += 1
            dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                metricas_setor["tarefas_atrasadas"] += 1
                metricas_setor["total_dias_atraso"] += dias_atraso
        
        if responsavel not in carga_por_responsavel:
            carga_por_responsavel[responsavel] = {
                "responsavel": responsavel,
                "total_tarefas": 0,
                "tarefas_atrasadas": 0,
                "total_dias_atraso": 0,
                "tarefas": []
            }
        
        if finalizada_calc:
            continue

        carga_por_responsavel[responsavel]["total_tarefas"] += 1
        
        if is_atrasada:
            contrato_tarefa = contratos_map.get(tarefa.contrato_id)
            carga_por_responsavel[responsavel]["tarefas_atrasadas"] += 1
            carga_por_responsavel[responsavel]["total_dias_atraso"] += dias_atraso
            carga_por_responsavel[responsavel]["tarefas"].append({
                "id": tarefa.id,
                "titulo": tarefa.titulo,
                "dias_atraso": dias_atraso,
                "projeto_id": tarefa.projeto_id,
                "setor": tarefa.setor,
                "contrato_numero": contrato_tarefa.numero_contrato if contrato_tarefa else None,
            })
            
            alertas_atrasos.append({
                "tarefa_id": tarefa.id,
                "titulo": tarefa.titulo,
                "responsavel": responsavel,
                "responsavel_id": tarefa.responsavel_id,
                "dias_atraso": dias_atraso,
                "setor": tarefa.setor,
                "projeto_id": tarefa.projeto_id,
                "prioridade": tarefa.prioridade,
                "contrato_numero": contrato_tarefa.numero_contrato if contrato_tarefa else None,
            })
    
    alertas_atrasos.sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    carga_lista = sorted(
        carga_por_responsavel.values(),
        key=lambda x: x["tarefas_atrasadas"],
        reverse=True
    )

    projetos_finalizados = 0
    for projeto in projetos:
        tarefas_projeto = tarefas_por_projeto.get(projeto.id, [])
        if tarefas_projeto:
            resumo_projeto = resumir_status_projeto(tarefas_projeto)
            if (
                resumo_projeto["total_tarefas"] > 0
                and resumo_projeto["tarefas_concluidas"] == resumo_projeto["total_tarefas"]
            ):
                projetos_finalizados += 1
        else:
            status_norm = normalize_text(getattr(projeto, "status", ""))
            if any(termo in status_norm for termo in ("concluido", "finalizado", "entregue")):
                projetos_finalizados += 1

    projetos_em_andamento = max(total_projetos - projetos_finalizados, 0)

    setores_maior_volume_entregas = sorted(
        (
            {
                "setor": dados["setor"],
                "total_entregas": dados["tarefas_finalizadas"],
                "total_tarefas": dados["total_tarefas"],
                "percentual_entregas": round(
                    (dados["tarefas_finalizadas"] / dados["total_tarefas"] * 100)
                    if dados["total_tarefas"] > 0 else 0,
                    1,
                ),
            }
            for dados in metricas_por_setor.values()
            if dados["tarefas_finalizadas"] > 0
        ),
        key=lambda item: (item["total_entregas"], item["percentual_entregas"]),
        reverse=True,
    )

    setores_maior_indice_atrasos = sorted(
        (
            {
                "setor": dados["setor"],
                "indice_atraso": round(
                    (dados["tarefas_atrasadas"] / dados["tarefas_abertas"] * 100)
                    if dados["tarefas_abertas"] > 0 else 0,
                    1,
                ),
                "total_atrasadas": dados["tarefas_atrasadas"],
                "total_abertas": dados["tarefas_abertas"],
                "total_tarefas": dados["total_tarefas"],
                "total_dias_atraso": dados["total_dias_atraso"],
            }
            for dados in metricas_por_setor.values()
            if dados["tarefas_abertas"] > 0
        ),
        key=lambda item: (item["indice_atraso"], item["total_atrasadas"], item["total_dias_atraso"]),
        reverse=True,
    )
    
    projetos_detalhados = []
    for projeto in projetos:
        tarefas_projeto = ordenar_tarefas_fluxo(tarefas_por_projeto.get(projeto.id, []))
        resumo_projeto = resumir_status_projeto(tarefas_projeto)
        if resumo_projeto["status"] == "Concluído":
            continue
        
        contrato = contratos_map.get(projeto.contrato_id)
        etapa_contexto = obter_contexto_etapa_atual(tarefas_projeto)
        total = len(tarefas_projeto)
        concluidas = resumo_projeto["tarefas_concluidas"]
        
        atrasadas = 0
        for t in tarefas_projeto:
            if not is_tarefa_efetivamente_finalizada(t):
                _, is_atrasada = await calcular_dias_atraso(t.prazo)
                if is_atrasada:
                    atrasadas += 1
        
        projetos_detalhados.append({
            "id": projeto.id,
            "cliente": projeto.cliente,
            "contrato_id": projeto.contrato_id,
            "contrato_numero": contrato.numero_contrato if contrato else None,
            "contrato_cliente": contrato.cliente if contrato else projeto.cliente,
            "contrato_faculdade": contrato.faculdade if contrato else None,
            "contrato_curso": contrato.curso if contrato else None,
            "contrato_data_fim": contrato.data_fim if contrato else None,
            "contrato_data_aditivo": contrato.data_aditivo if contrato else None,
            "contrato_data_termino_referencia": (
                contrato.data_aditivo if contrato and contrato.data_aditivo
                else contrato.data_fim if contrato and contrato.data_fim
                else projeto.data_fim_prevista
            ),
            "etapa_atual": etapa_contexto["titulo"],
            "etapa_atual_setor": etapa_contexto["setor"],
            "setor_atual": etapa_contexto["setor"],
            "progresso": round((concluidas / total * 100) if total > 0 else 0, 1),
            "total_tarefas": total,
            "tarefas_concluidas": concluidas,
            "tarefas_atrasadas": atrasadas,
            "risco": projeto.risco,
            "data_inicio": projeto.data_inicio,
            "data_fim_prevista": projeto.data_fim_prevista
        })

    projetos_detalhados.sort(
        key=lambda projeto: (
            parse_iso_date(projeto.get("contrato_data_termino_referencia")) or date.max,
            (projeto.get("contrato_numero") or projeto.get("id") or ""),
        )
    )
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "resumo": {
            "total_projetos": total_projetos,
            "projetos_em_andamento": projetos_em_andamento,
            "projetos_finalizados": projetos_finalizados,
            "total_tarefas_atrasadas": len(alertas_atrasos),
            "responsaveis_com_atraso": len([c for c in carga_lista if c["tarefas_atrasadas"] > 0])
        },
        "indicadores_estrategicos": {
            "projetos_finalizados": projetos_finalizados,
            "setores_maior_volume_entregas": setores_maior_volume_entregas[:3],
            "setores_maior_indice_atrasos": setores_maior_indice_atrasos[:3],
        },
        "projetos_em_andamento": projetos_detalhados,
        "alertas_atrasos": alertas_atrasos[:20],
        "carga_por_responsavel": carga_lista
    }


# ==========================================
# ROUTES - Template Padrão
# ==========================================

@api_router.post("/templates-prazos/criar-padrao")
async def criar_template_padrao(
    user_id: str = Query(...),
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Cria o template padrão de prazos baseado nas etapas do sistema - Versão 2026.01"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar templates")
    
    etapas_padrao = [
        # ATENDIMENTO
        {"etapa_id": 1, "etapa_nome": "Informar que recebeu o contrato", "departamento": "atendimento", "prazo_dias": 0, "descricao": "No mesmo dia que receber"},
        {"etapa_id": 2, "etapa_nome": "Ativar contrato no site", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após receber o contrato"},
        {"etapa_id": 3, "etapa_nome": "1º contato com a comissão", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após receber o contrato"},
        {"etapa_id": 4, "etapa_nome": "Reunião de atendimento", "departamento": "atendimento", "prazo_dias": 15, "descricao": "15 dias após o primeiro contato"},
        {"etapa_id": 5, "etapa_nome": "Envio do questionário de criação à comissão", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após a reunião"},
        {"etapa_id": 6, "etapa_nome": "Recebimento do questionário preenchido", "departamento": "atendimento", "prazo_dias": 60, "descricao": "2 meses - Lembretes automáticos"},
        {"etapa_id": 7, "etapa_nome": "Envio do e-mail de layout de fotos", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após reunião"},
        {"etapa_id": 8, "etapa_nome": "Enviar layout para a comissão", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após receber da Criação"},
        {"etapa_id": 9, "etapa_nome": "Agendar reunião de criação", "departamento": "atendimento", "prazo_dias": 10, "descricao": "10 dias antes da entrega de textos/fotos"},
        {"etapa_id": 10, "etapa_nome": "Liberação das fotos para pré produção", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após recebimento"},
        {"etapa_id": 11, "etapa_nome": "Cadastro de textos / REV1", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após cadastro"},
        {"etapa_id": 12, "etapa_nome": "Acompanhar aprovação e fazer cobrança", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia antes do site fechar"},
        {"etapa_id": 13, "etapa_nome": "Aditivo contratual (se prazo perdido)", "departamento": "atendimento", "prazo_dias": 0, "descricao": "No mesmo dia que vencer"},
        {"etapa_id": 14, "etapa_nome": "Cobrança e direcionamento para diretoria", "departamento": "atendimento", "prazo_dias": 7, "descricao": "1 semana sem movimentação"},
        {"etapa_id": 15, "etapa_nome": "Envio do e-mail de conferência de lista", "departamento": "atendimento", "prazo_dias": 1, "descricao": "1 dia após apresentação"},
        {"etapa_id": 16, "etapa_nome": "Liberação do envelope de saída", "departamento": "atendimento", "prazo_dias": 2, "descricao": "2 dias"},
        {"etapa_id": 17, "etapa_nome": "Atualização da planilha geral e relatório", "departamento": "atendimento", "prazo_dias": 7, "descricao": "Semanal - Quinta até 17h"},
        # CRIAÇÃO
        {"etapa_id": 18, "etapa_nome": "RC - Reunião de criação", "departamento": "criacao", "prazo_dias": 1, "descricao": "Confirmar 1 dia antes"},
        {"etapa_id": 19, "etapa_nome": "Envio do briefing para atendimento", "departamento": "criacao", "prazo_dias": 2, "descricao": "2 dias"},
        {"etapa_id": 20, "etapa_nome": "Layout de Fotos", "departamento": "criacao", "prazo_dias": 3, "descricao": "3 dias após e-mail"},
        {"etapa_id": 21, "etapa_nome": "Arte da Camisa (quando aplicável)", "departamento": "criacao", "prazo_dias": 3, "descricao": "3 dias após e-mail"},
        {"etapa_id": 22, "etapa_nome": "Textos cadastrados - ciente", "departamento": "criacao", "prazo_dias": 0, "descricao": "Campo de confirmação"},
        {"etapa_id": 23, "etapa_nome": "Recebimento das fotos da pré-produção", "departamento": "criacao", "prazo_dias": 0, "descricao": "Campo de confirmação"},
        {"etapa_id": 24, "etapa_nome": "Início da criação do convite", "departamento": "criacao", "prazo_dias": 10, "descricao": "10 dias após textos/fotos"},
        {"etapa_id": 25, "etapa_nome": "Dias de criação do convite", "departamento": "criacao", "prazo_dias": 3, "descricao": "3 dias de criação"},
        {"etapa_id": 26, "etapa_nome": "Correções (ajustes de layout)", "departamento": "criacao", "prazo_dias": 3, "descricao": "3 dias após liberar site"},
        {"etapa_id": 27, "etapa_nome": "Liberar demais peças para aprovação", "departamento": "criacao", "prazo_dias": 0, "descricao": "No mesmo dia"},
        {"etapa_id": 28, "etapa_nome": "Informar miolo aprovado", "departamento": "criacao", "prazo_dias": 1, "descricao": "1 dia"},
        {"etapa_id": 29, "etapa_nome": "Informar capa aprovada", "departamento": "criacao", "prazo_dias": 1, "descricao": "1 dia"},
        {"etapa_id": 30, "etapa_nome": "Demais Peças (caixas, tags, folders)", "departamento": "criacao", "prazo_dias": 3, "descricao": "3 dias"},
        {"etapa_id": 31, "etapa_nome": "Aprovação das páginas individuais", "departamento": "criacao", "prazo_dias": 0, "descricao": "Depende da CDC"},
        {"etapa_id": 32, "etapa_nome": "Revisão - REV (verificação final)", "departamento": "criacao", "prazo_dias": 1, "descricao": "1 dia após miolo aprovado"},
        {"etapa_id": 33, "etapa_nome": "Saída - Finalização e envio", "departamento": "criacao", "prazo_dias": 3, "descricao": "3 dias após aprovação total"},
        # PRÉ-PRODUÇÃO
        {"etapa_id": 34, "etapa_nome": "Recorte e tratamento das fotos", "departamento": "pre-producao", "prazo_dias": 10, "descricao": "10 dias"},
        {"etapa_id": 35, "etapa_nome": "Recebimento do envelope de saída", "departamento": "pre-producao", "prazo_dias": 5, "descricao": "5 dias para finalizar"},
        {"etapa_id": 36, "etapa_nome": "Conferir textos e revisão ortográfica", "departamento": "pre-producao", "prazo_dias": 2, "descricao": "Após receber envelope"},
        {"etapa_id": 37, "etapa_nome": "Envio dos arquivos para gráfica", "departamento": "pre-producao", "prazo_dias": 1, "descricao": "Campo de justificativa"},
        {"etapa_id": 38, "etapa_nome": "Conferência de xerox", "departamento": "pre-producao", "prazo_dias": 2, "descricao": "Impressão externa"},
        {"etapa_id": 39, "etapa_nome": "Controle de impressões internas", "departamento": "pre-producao", "prazo_dias": 1, "descricao": "Campo de justificativa"},
        # PRODUÇÃO
        {"etapa_id": 40, "etapa_nome": "Triagem de materiais", "departamento": "producao", "prazo_dias": 3, "descricao": "3 dias"},
        {"etapa_id": 41, "etapa_nome": "Orçamentos nos fornecedores", "departamento": "producao", "prazo_dias": 2, "descricao": "Campo de justificativa"},
        {"etapa_id": 42, "etapa_nome": "Envio do arquivo à gráfica", "departamento": "producao", "prazo_dias": 1, "descricao": "Depende da Pré-produção"},
        {"etapa_id": 43, "etapa_nome": "Ordem de produção", "departamento": "producao", "prazo_dias": 1, "descricao": "Gerar ordem"},
        {"etapa_id": 44, "etapa_nome": "Alinhar prazos com prestadores", "departamento": "producao", "prazo_dias": 2, "descricao": "Alinhamento"},
        {"etapa_id": 45, "etapa_nome": "Costura e acabamento interno", "departamento": "producao", "prazo_dias": 5, "descricao": "Processo de acabamento"},
        {"etapa_id": 46, "etapa_nome": "Conferência final de qualidade", "departamento": "producao", "prazo_dias": 1, "descricao": "Verificação final"},
        {"etapa_id": 47, "etapa_nome": "Solicitar liberação ao financeiro", "departamento": "producao", "prazo_dias": 1, "descricao": "Solicitar liberação"},
        {"etapa_id": 48, "etapa_nome": "Cotar fretes", "departamento": "producao", "prazo_dias": 2, "descricao": "Custos e prazos"},
        {"etapa_id": 49, "etapa_nome": "Enviar convites e informar rastreio", "departamento": "producao", "prazo_dias": 1, "descricao": "Informar diretoria/atendimento"},
        {"etapa_id": 50, "etapa_nome": "Entrega dos convites à comissão", "departamento": "producao", "prazo_dias": 3, "descricao": "Entrega final"},
        {"etapa_id": 51, "etapa_nome": "Pós entrega (correções/extras)", "departamento": "producao", "prazo_dias": 5, "descricao": "Campo de justificativa"},
    ]
    
    prazo_total = sum(e["prazo_dias"] for e in etapas_padrao)
    
    template = TemplatePrazosModel(
        id=str(uuid.uuid4()),
        nome="Template Padrão IDEIABH - v2026.01",
        descricao=f"Template completo com todas as {len(etapas_padrao)} etapas do processo de formaturas - Versão 2026.01",
        etapas=etapas_padrao,
        prazo_total_dias=prazo_total,
        ativo=True,
        criado_por=user_id
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    return {
        "message": f"Template padrão criado com sucesso ({prazo_total} dias, {len(etapas_padrao)} etapas)",
        "template": model_to_dict(template)
    }


# ==========================================
# ROUTES - Status Check (Legacy)
# ==========================================

class StatusCheckPydantic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreatePydantic(BaseModel):
    client_name: str


@api_router.post("/status", response_model=StatusCheckPydantic)
async def create_status_check(
    input: StatusCheckCreatePydantic,
    db: AsyncSession = Depends(get_db)
):
    status_obj = StatusCheckModel(
        id=str(uuid.uuid4()),
        client_name=input.client_name
    )
    
    db.add(status_obj)
    await db.commit()
    await db.refresh(status_obj)
    
    return StatusCheckPydantic(
        id=status_obj.id,
        client_name=status_obj.client_name,
        timestamp=status_obj.timestamp
    )


@api_router.get("/status", response_model=List[StatusCheckPydantic])
async def get_status_checks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StatusCheckModel))
    status_checks = result.scalars().all()
    
    return [
        StatusCheckPydantic(
            id=s.id,
            client_name=s.client_name,
            timestamp=s.timestamp
        )
        for s in status_checks
    ]


# Include the router in the main app
app.include_router(api_router)


# ==========================================
# ROUTES - Relatórios Avançados
# ==========================================

class KPIItem(BaseModel):
    label: str
    value: float | int | str
    delta: Optional[float] = None
    hint: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class SeriesPoint(BaseModel):
    date: str
    value: int
    label: Optional[str] = None


class DepartmentOverdue(BaseModel):
    department: str
    department_label: str
    overdue: int
    total: int
    percentage: float


class RiskItem(BaseModel):
    risk: str
    risk_label: str
    count: int
    color: str


class AssigneeOverdue(BaseModel):
    assignee_id: Optional[str]
    name: str
    setor: Optional[str]
    overdue: int
    total_tasks: int
    avg_delay_days: float


class ProjectBottleneck(BaseModel):
    project_id: str
    project_name: str
    cliente: str
    overdue: int
    total_tasks: int
    progress: float
    risk: str


class SectorPerformance(BaseModel):
    setor: str
    setor_label: str
    total_tasks: int
    completed: int
    overdue: int
    on_time: int
    completion_rate: float
    on_time_rate: float
    avg_completion_days: float


class ReportsOverviewResponse(BaseModel):
    as_of: str
    periodo: dict
    kpis: List[KPIItem]
    overdue_by_department: List[DepartmentOverdue]
    risk_distribution: List[RiskItem]
    throughput_7d: List[SeriesPoint]
    throughput_30d: List[SeriesPoint]
    top_overdue_assignees: List[AssigneeOverdue]
    bottlenecks: List[ProjectBottleneck]
    sector_performance: List[SectorPerformance]
    weekly_comparison: dict
    monthly_trend: List[dict]


# Router separado para relatórios
reports_router = APIRouter(prefix="/api/reports", tags=["Reports"])


def get_setor_label(setor: str) -> str:
    """Retorna label amigável para o setor"""
    labels = {
        "atendimento": "Atendimento",
        "criacao": "Criação",
        "pre-producao": "Pré-Produção",
        "producao": "Produção",
    }
    return labels.get(setor, setor.title() if setor else "Sem setor")


def get_risk_color(risk: str) -> str:
    """Retorna cor para o nível de risco"""
    colors = {
        "baixo": "#10b981",
        "medio": "#f59e0b",
        "alto": "#f97316",
        "critico": "#ef4444",
    }
    return colors.get(risk, "#6b7280")


def get_risk_label(risk: str) -> str:
    """Retorna label para o nível de risco"""
    labels = {
        "baixo": "Baixo",
        "medio": "Médio",
        "alto": "Alto",
        "critico": "Crítico",
    }
    return labels.get(risk, risk.title() if risk else "Desconhecido")


@reports_router.get("/overview", response_model=ReportsOverviewResponse)
async def reports_overview(
    days_lookback: int = Query(default=30, ge=7, le=180),
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint principal de relatórios - Visão geral completa para gestores.
    Retorna KPIs, gráficos e tabelas prontos para o frontend.
    """
    # Verificar permissão
    if user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Acesso restrito a Admin/Gerente")
    
    now = datetime.now(timezone.utc)
    start_lookback = now - timedelta(days=days_lookback)
    start_7d = now - timedelta(days=7)
    start_30d = now - timedelta(days=30)
    
    # ===== BUSCAR DADOS BASE =====
    
    # Projetos
    projetos_result = await db.execute(select(ProjetoModel))
    projetos = projetos_result.scalars().all()
    
    # Tarefas
    tarefas_result = await db.execute(select(TarefaModel))
    tarefas = tarefas_result.scalars().all()
    
    # Contratos
    contratos_result = await db.execute(select(ContratoModel))
    contratos = contratos_result.scalars().all()
    
    # Usuários
    users_result = await db.execute(select(UserModel))
    users = users_result.scalars().all()
    users_dict = {u.id: u for u in users}
    
    # ===== CALCULAR MÉTRICAS =====
    
    total_projetos = len(projetos)
    projetos_em_andamento = sum(1 for p in projetos if p.status == "Em Andamento")
    projetos_finalizados = sum(1 for p in projetos if p.status in ["Finalizado", "Entregue"])
    
    total_tarefas = len(tarefas)
    tarefas_finalizadas = sum(1 for t in tarefas if t.finalizada)
    tarefas_em_andamento = total_tarefas - tarefas_finalizadas
    
    # Calcular atrasos
    tarefas_atrasadas = []
    for tarefa in tarefas:
        if not tarefa.finalizada and tarefa.prazo:
            try:
                prazo = datetime.fromisoformat(tarefa.prazo).date()
                if now.date() > prazo:
                    dias_atraso = (now.date() - prazo).days
                    tarefas_atrasadas.append({
                        "tarefa": tarefa,
                        "dias_atraso": dias_atraso
                    })
            except:
                pass
    
    total_atrasadas = len(tarefas_atrasadas)
    
    # SLA - Tarefas concluídas no prazo (últimos 30 dias)
    tarefas_concluidas_30d = [t for t in tarefas if t.finalizada and t.data_finalizacao and t.data_finalizacao >= start_30d]
    tarefas_no_prazo_30d = 0
    for t in tarefas_concluidas_30d:
        if t.prazo_original:
            try:
                prazo_original = datetime.fromisoformat(t.prazo_original).date()
                data_fin = t.data_finalizacao.date() if isinstance(t.data_finalizacao, datetime) else datetime.fromisoformat(str(t.data_finalizacao)).date()
                if data_fin <= prazo_original:
                    tarefas_no_prazo_30d += 1
            except:
                pass
    
    sla_30d = (tarefas_no_prazo_30d / len(tarefas_concluidas_30d) * 100) if tarefas_concluidas_30d else 0
    
    # Tempo médio de conclusão
    tempos_conclusao = []
    for t in tarefas:
        if t.finalizada and t.data_finalizacao and t.criado_em:
            try:
                inicio = t.criado_em if isinstance(t.criado_em, datetime) else datetime.fromisoformat(str(t.criado_em))
                fim = t.data_finalizacao if isinstance(t.data_finalizacao, datetime) else datetime.fromisoformat(str(t.data_finalizacao))
                dias = (fim - inicio).days
                if dias >= 0:
                    tempos_conclusao.append(dias)
            except:
                pass
    
    tempo_medio_conclusao = sum(tempos_conclusao) / len(tempos_conclusao) if tempos_conclusao else 0
    
    # ===== KPIs =====
    
    kpis = [
        KPIItem(
            label="Total de Projetos",
            value=total_projetos,
            icon="folder",
            color="#3b82f6"
        ),
        KPIItem(
            label="Projetos em Andamento",
            value=projetos_em_andamento,
            icon="play",
            color="#8b5cf6"
        ),
        KPIItem(
            label="Tarefas Atrasadas",
            value=total_atrasadas,
            hint=f"De {tarefas_em_andamento} em andamento",
            icon="alert-triangle",
            color="#ef4444"
        ),
        KPIItem(
            label="SLA (30d)",
            value=f"{round(sla_30d, 1)}%",
            hint="Tarefas concluídas no prazo",
            icon="check-circle",
            color="#10b981"
        ),
        KPIItem(
            label="Tempo Médio",
            value=f"{round(tempo_medio_conclusao, 1)} dias",
            hint="Média de conclusão de tarefas",
            icon="clock",
            color="#f59e0b"
        ),
    ]
    
    # ===== ATRASOS POR DEPARTAMENTO =====
    
    setores = ["atendimento", "criacao", "pre-producao", "producao"]
    overdue_by_department = []
    
    for setor in setores:
        tarefas_setor = [t for t in tarefas if t.setor == setor and not t.finalizada]
        atrasadas_setor = [a for a in tarefas_atrasadas if a["tarefa"].setor == setor]
        
        total_setor = len(tarefas_setor)
        overdue_setor = len(atrasadas_setor)
        percentage = (overdue_setor / total_setor * 100) if total_setor > 0 else 0
        
        overdue_by_department.append(DepartmentOverdue(
            department=setor,
            department_label=get_setor_label(setor),
            overdue=overdue_setor,
            total=total_setor,
            percentage=round(percentage, 1)
        ))
    
    # ===== DISTRIBUIÇÃO DE RISCO =====
    
    risk_counts = {"baixo": 0, "medio": 0, "alto": 0, "critico": 0}
    for projeto in projetos:
        risk = projeto.risco or "baixo"
        if risk in risk_counts:
            risk_counts[risk] += 1
    
    risk_distribution = [
        RiskItem(
            risk=risk,
            risk_label=get_risk_label(risk),
            count=count,
            color=get_risk_color(risk)
        )
        for risk, count in risk_counts.items()
    ]
    
    # ===== THROUGHPUT (Produtividade) =====
    
    def calculate_throughput(days: int) -> List[SeriesPoint]:
        start = now - timedelta(days=days)
        throughput_data = {}
        
        for t in tarefas:
            if t.finalizada and t.data_finalizacao:
                try:
                    data_fin = t.data_finalizacao if isinstance(t.data_finalizacao, datetime) else datetime.fromisoformat(str(t.data_finalizacao))
                    if data_fin >= start:
                        date_str = data_fin.date().isoformat()
                        throughput_data[date_str] = throughput_data.get(date_str, 0) + 1
                except:
                    pass
        
        # Preencher dias faltantes
        result = []
        for i in range(days):
            d = (start + timedelta(days=i)).date().isoformat()
            result.append(SeriesPoint(
                date=d,
                value=throughput_data.get(d, 0),
                label=datetime.fromisoformat(d).strftime("%d/%m")
            ))
        
        return result
    
    throughput_7d = calculate_throughput(7)
    throughput_30d = calculate_throughput(30)
    
    # ===== TOP RESPONSÁVEIS COM ATRASO =====
    
    assignee_overdue = {}
    for item in tarefas_atrasadas:
        tarefa = item["tarefa"]
        dias = item["dias_atraso"]
        resp_id = tarefa.responsavel_id or "sem_responsavel"
        resp_nome = tarefa.responsavel_nome or "Não atribuído"
        
        if resp_id not in assignee_overdue:
            user = users_dict.get(resp_id)
            assignee_overdue[resp_id] = {
                "name": resp_nome,
                "setor": user.setor if user else tarefa.setor,
                "overdue": 0,
                "total_delay_days": 0,
                "total_tasks": 0
            }
        
        assignee_overdue[resp_id]["overdue"] += 1
        assignee_overdue[resp_id]["total_delay_days"] += dias
    
    # Contar total de tarefas por responsável
    for tarefa in tarefas:
        if not tarefa.finalizada:
            resp_id = tarefa.responsavel_id or "sem_responsavel"
            if resp_id in assignee_overdue:
                assignee_overdue[resp_id]["total_tasks"] += 1
    
    top_overdue_assignees = []
    for resp_id, data in sorted(assignee_overdue.items(), key=lambda x: x[1]["overdue"], reverse=True)[:10]:
        avg_delay = data["total_delay_days"] / data["overdue"] if data["overdue"] > 0 else 0
        top_overdue_assignees.append(AssigneeOverdue(
            assignee_id=resp_id if resp_id != "sem_responsavel" else None,
            name=data["name"],
            setor=data["setor"],
            overdue=data["overdue"],
            total_tasks=max(data["total_tasks"], data["overdue"]),
            avg_delay_days=round(avg_delay, 1)
        ))
    
    # ===== GARGALOS (Projetos mais travados) =====
    
    project_overdue = {}
    for item in tarefas_atrasadas:
        tarefa = item["tarefa"]
        proj_id = tarefa.projeto_id
        if proj_id:
            if proj_id not in project_overdue:
                projeto = next((p for p in projetos if p.id == proj_id), None)
                if projeto:
                    project_overdue[proj_id] = {
                        "project_name": projeto.etapa_atual or "Projeto",
                        "cliente": projeto.cliente,
                        "overdue": 0,
                        "total_tasks": 0,
                        "progress": projeto.progresso or 0,
                        "risk": projeto.risco or "baixo"
                    }
            if proj_id in project_overdue:
                project_overdue[proj_id]["overdue"] += 1
    
    # Contar total de tarefas por projeto
    for tarefa in tarefas:
        if tarefa.projeto_id in project_overdue:
            project_overdue[tarefa.projeto_id]["total_tasks"] += 1
    
    bottlenecks = []
    for proj_id, data in sorted(project_overdue.items(), key=lambda x: x[1]["overdue"], reverse=True)[:10]:
        bottlenecks.append(ProjectBottleneck(
            project_id=proj_id,
            project_name=data["project_name"],
            cliente=data["cliente"],
            overdue=data["overdue"],
            total_tasks=data["total_tasks"],
            progress=data["progress"],
            risk=data["risk"]
        ))
    
    # ===== PERFORMANCE POR SETOR =====
    
    sector_performance = []
    for setor in setores:
        tarefas_setor = [t for t in tarefas if t.setor == setor]
        total = len(tarefas_setor)
        completed = sum(1 for t in tarefas_setor if t.finalizada)
        overdue = len([a for a in tarefas_atrasadas if a["tarefa"].setor == setor])
        
        # Calcular no prazo (concluídas antes do prazo)
        on_time = 0
        completion_days = []
        for t in tarefas_setor:
            if t.finalizada and t.prazo_original and t.data_finalizacao:
                try:
                    prazo = datetime.fromisoformat(t.prazo_original).date()
                    data_fin = t.data_finalizacao.date() if isinstance(t.data_finalizacao, datetime) else datetime.fromisoformat(str(t.data_finalizacao)).date()
                    if data_fin <= prazo:
                        on_time += 1
                    if t.criado_em:
                        inicio = t.criado_em if isinstance(t.criado_em, datetime) else datetime.fromisoformat(str(t.criado_em))
                        fim = t.data_finalizacao if isinstance(t.data_finalizacao, datetime) else datetime.fromisoformat(str(t.data_finalizacao))
                        completion_days.append((fim - inicio).days)
                except:
                    pass
        
        avg_days = sum(completion_days) / len(completion_days) if completion_days else 0
        
        sector_performance.append(SectorPerformance(
            setor=setor,
            setor_label=get_setor_label(setor),
            total_tasks=total,
            completed=completed,
            overdue=overdue,
            on_time=on_time,
            completion_rate=round((completed / total * 100) if total > 0 else 0, 1),
            on_time_rate=round((on_time / completed * 100) if completed > 0 else 0, 1),
            avg_completion_days=round(avg_days, 1)
        ))
    
    # ===== COMPARAÇÃO SEMANAL =====
    
    start_this_week = now - timedelta(days=7)
    start_last_week = now - timedelta(days=14)
    
    criadas_this_week = sum(1 for t in tarefas if t.criado_em and t.criado_em >= start_this_week)
    criadas_last_week = sum(1 for t in tarefas if t.criado_em and start_last_week <= t.criado_em < start_this_week)
    
    finalizadas_this_week = sum(1 for t in tarefas if t.finalizada and t.data_finalizacao and t.data_finalizacao >= start_this_week)
    finalizadas_last_week = sum(1 for t in tarefas if t.finalizada and t.data_finalizacao and start_last_week <= t.data_finalizacao < start_this_week)
    
    weekly_comparison = {
        "this_week": {
            "criadas": criadas_this_week,
            "finalizadas": finalizadas_this_week,
            "atrasadas": total_atrasadas
        },
        "last_week": {
            "criadas": criadas_last_week,
            "finalizadas": finalizadas_last_week
        },
        "delta_criadas": criadas_this_week - criadas_last_week,
        "delta_finalizadas": finalizadas_this_week - finalizadas_last_week
    }
    
    # ===== TENDÊNCIA MENSAL (últimos 6 meses) =====
    
    monthly_trend = []
    for i in range(6):
        month_start = now - timedelta(days=30 * (i + 1))
        month_end = now - timedelta(days=30 * i)
        
        criadas = sum(1 for t in tarefas if t.criado_em and month_start <= t.criado_em < month_end)
        finalizadas = sum(1 for t in tarefas if t.finalizada and t.data_finalizacao and month_start <= t.data_finalizacao < month_end)
        
        monthly_trend.insert(0, {
            "month": month_start.strftime("%b/%y"),
            "criadas": criadas,
            "finalizadas": finalizadas
        })
    
    return ReportsOverviewResponse(
        as_of=now.isoformat(),
        periodo={
            "inicio": start_lookback.isoformat(),
            "fim": now.isoformat(),
            "dias": days_lookback
        },
        kpis=kpis,
        overdue_by_department=overdue_by_department,
        risk_distribution=risk_distribution,
        throughput_7d=throughput_7d,
        throughput_30d=throughput_30d,
        top_overdue_assignees=top_overdue_assignees,
        bottlenecks=bottlenecks,
        sector_performance=sector_performance,
        weekly_comparison=weekly_comparison,
        monthly_trend=monthly_trend
    )


@reports_router.get("/export/csv")
async def export_reports_csv(
    report_type: str = Query(..., description="Tipo: tarefas_atrasadas, performance_setor, gargalos"),
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Exporta relatórios em formato CSV"""
    if user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    now = datetime.now(timezone.utc)
    
    if report_type == "tarefas_atrasadas":
        tarefas_result = await db.execute(
            select(TarefaModel).where(TarefaModel.finalizada == False)
        )
        tarefas = tarefas_result.scalars().all()
        
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Título", "Setor", "Responsável", "Prazo", "Dias Atraso", "Prioridade", "Status"])
        
        for t in tarefas:
            if t.prazo:
                try:
                    prazo = datetime.fromisoformat(t.prazo).date()
                    if now.date() > prazo:
                        dias = (now.date() - prazo).days
                        writer.writerow([
                            t.id, t.titulo, t.setor, t.responsavel_nome or "N/A",
                            t.prazo, dias, t.prioridade, t.status_nome
                        ])
                except:
                    pass
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=tarefas_atrasadas_{now.strftime('%Y%m%d')}.csv"}
        )
    
    raise HTTPException(status_code=400, detail="Tipo de relatório inválido")


# Registrar router de relatórios
app.include_router(reports_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def initialize_database_background():
    retry_seconds = int(os.getenv("DB_INIT_RETRY_SECONDS", "5"))
    attempt = 0

    while True:
        attempt += 1
        try:
            await init_db()
            async with async_session() as db:
                await get_status_padrao(db)

            set_database_state(True, None)
            app.state.db_ready = True
            app.state.db_init_error = None
            logger.info("Database initialization completed")
            return
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            error_message = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__
            set_database_state(False, error_message)
            app.state.db_ready = False
            app.state.db_init_error = error_message
            logger.exception("Database initialization attempt %s failed", attempt)
            await asyncio.sleep(retry_seconds)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    logger.info("Starting IDEIABH API with PostgreSQL...")
    set_database_state(False, "Database initialization pending")
    app.state.db_ready = False
    app.state.db_init_error = "Database initialization pending"
    app.state.db_init_task = asyncio.create_task(initialize_database_background())
    logger.info("Database initialization running in background")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    db_init_task = getattr(app.state, "db_init_task", None)
    if db_init_task and not db_init_task.done():
        db_init_task.cancel()
        with suppress(asyncio.CancelledError):
            await db_init_task
    await close_db()
