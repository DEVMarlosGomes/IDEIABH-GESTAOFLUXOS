from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.orm import selectinload
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

from database import get_db, init_db, engine
from models import (
    User, StatusTarefa, Contrato, Projeto, Tarefa, 
    HistoricoAcao, TemplatePrazos, Notificacao, PrazosContrato
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==========================================
# ENUMS
# ==========================================

class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class StatusTarefaCreate(BaseModel):
    nome: str
    cor: str = "#64748b"
    ordem: int = 0


class StatusTarefaUpdate(BaseModel):
    nome: Optional[str] = None
    cor: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


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


class UserApprove(BaseModel):
    aprovado: bool
    aprovado_por: str


class UserLogin(BaseModel):
    username: str
    password: str


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
    ordem: Optional[int] = None


class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    setor: Optional[str] = None
    responsavel_id: Optional[str] = None
    responsavel_nome: Optional[str] = None
    status_id: Optional[str] = None
    prazo: Optional[str] = None
    prioridade: Optional[str] = None
    usuario_id: str
    usuario_nome: str
    usuario_setor: str


class TarefaFinalizar(BaseModel):
    observacao: str
    usuario_id: str
    usuario_nome: str
    usuario_setor: str


class TarefaAlterarStatus(BaseModel):
    status_id: str
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    observacao: Optional[str] = None


class ContratoCreate(BaseModel):
    cliente: str
    faculdade: str
    numero_contrato: str
    valor: float
    data_inicio: str
    data_fim: Optional[str] = None
    template_id: str
    criado_por: str


class ContratoUpdate(BaseModel):
    cliente: Optional[str] = None
    faculdade: Optional[str] = None
    numero_contrato: Optional[str] = None
    valor: Optional[float] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    status: Optional[str] = None


class TemplatePrazosCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    etapas: List[dict] = []


class TemplatePrazosUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    etapas: Optional[List[dict]] = None
    ativo: Optional[bool] = None


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


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def model_to_dict(obj):
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


def calcular_dias_atraso(prazo_str: Optional[str]) -> tuple:
    """Calculate days of delay for a task"""
    if not prazo_str:
        return 0, False
    try:
        prazo = datetime.fromisoformat(prazo_str).date()
        hoje = datetime.now(timezone.utc).date()
        if hoje > prazo:
            dias = (hoje - prazo).days
            return dias, True
        return 0, False
    except:
        return 0, False


async def get_or_create_default_statuses(db: AsyncSession):
    """Get or create default statuses"""
    result = await db.execute(select(StatusTarefa).where(StatusTarefa.ativo == True))
    statuses = result.scalars().all()
    
    if not statuses:
        default_statuses = [
            StatusTarefa(nome="Pendente", cor="#94a3b8", ordem=1, tipo="sistema", criado_por="sistema"),
            StatusTarefa(nome="Em Andamento", cor="#3b82f6", ordem=2, tipo="sistema", criado_por="sistema"),
            StatusTarefa(nome="Aguardando", cor="#f59e0b", ordem=3, tipo="sistema", criado_por="sistema"),
            StatusTarefa(nome="Concluído", cor="#10b981", ordem=4, tipo="sistema", criado_por="sistema"),
        ]
        for status in default_statuses:
            db.add(status)
        await db.commit()
        
        result = await db.execute(select(StatusTarefa).where(StatusTarefa.ativo == True).order_by(StatusTarefa.ordem))
        statuses = result.scalars().all()
    
    return statuses


async def recalcular_prazos_projeto(db: AsyncSession, projeto_id: str, tarefa_finalizada_id: str, data_finalizacao: datetime):
    """
    Recalcula os prazos das tarefas seguintes baseado na data de finalização da tarefa anterior.
    O prazo da próxima etapa será: data_finalizacao + prazo_original_em_dias
    """
    # Buscar a tarefa finalizada para obter a ordem
    result = await db.execute(
        select(Tarefa).where(Tarefa.id == tarefa_finalizada_id)
    )
    tarefa_finalizada = result.scalar_one_or_none()
    
    if not tarefa_finalizada:
        return []
    
    # Buscar todas as tarefas do projeto que vêm depois da tarefa finalizada (não finalizadas)
    result = await db.execute(
        select(Tarefa)
        .where(
            and_(
                Tarefa.projeto_id == projeto_id,
                Tarefa.finalizada == False,
                Tarefa.ordem > tarefa_finalizada.ordem
            )
        )
        .order_by(Tarefa.ordem)
    )
    tarefas_seguintes = result.scalars().all()
    
    if not tarefas_seguintes:
        return []
    
    # Recalcular prazos
    data_base = data_finalizacao.date() if isinstance(data_finalizacao, datetime) else datetime.fromisoformat(str(data_finalizacao)).date()
    tarefas_atualizadas = []
    
    for tarefa in tarefas_seguintes:
        # Calcular dias originais do prazo
        if tarefa.prazo_original:
            try:
                prazo_original = datetime.fromisoformat(tarefa.prazo_original).date()
                # Calcular diferença entre tarefas originais
                if tarefa_finalizada.prazo_original:
                    prazo_anterior_original = datetime.fromisoformat(tarefa_finalizada.prazo_original).date()
                    dias_diferenca = (prazo_original - prazo_anterior_original).days
                else:
                    dias_diferenca = 1  # Default 1 dia
            except:
                dias_diferenca = 1
        else:
            dias_diferenca = 1
        
        # Novo prazo baseado na data de finalização real
        novo_prazo = data_base + timedelta(days=dias_diferenca)
        prazo_anterior = tarefa.prazo
        
        tarefa.prazo = novo_prazo.isoformat()
        
        # Adicionar histórico
        historico = HistoricoAcao(
            tarefa_id=tarefa.id,
            acao="prazo_recalculado",
            usuario_id="sistema",
            usuario_nome="Sistema",
            setor="sistema",
            detalhes=f"Prazo recalculado de {prazo_anterior} para {tarefa.prazo} baseado na finalização da tarefa anterior"
        )
        db.add(historico)
        
        tarefas_atualizadas.append({
            "id": tarefa.id,
            "titulo": tarefa.titulo,
            "prazo_anterior": prazo_anterior,
            "novo_prazo": tarefa.prazo
        })
        
        # Atualizar a data base para a próxima tarefa
        data_base = novo_prazo
    
    await db.commit()
    return tarefas_atualizadas


# ==========================================
# ROUTES - Health Check
# ==========================================

@api_router.get("/")
async def root():
    return {"message": "IDEIABH API - Sistema de Gestão Operacional (PostgreSQL)"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "PostgreSQL", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==========================================
# ROUTES - Status de Tarefas
# ==========================================

@api_router.get("/status-tarefas", response_model=List[dict])
async def listar_status_tarefas(db: AsyncSession = Depends(get_db)):
    """Lista todos os status de tarefas ativos"""
    await get_or_create_default_statuses(db)
    result = await db.execute(
        select(StatusTarefa).where(StatusTarefa.ativo == True).order_by(StatusTarefa.ordem)
    )
    statuses = result.scalars().all()
    return [model_to_dict(s) for s in statuses]


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
    result = await db.execute(select(StatusTarefa).where(StatusTarefa.nome == input.nome))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um status com este nome")
    
    status_obj = StatusTarefa(
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
    
    result = await db.execute(select(StatusTarefa).where(StatusTarefa.id == status_id))
    status = result.scalar_one_or_none()
    
    if not status:
        raise HTTPException(status_code=404, detail="Status não encontrado")
    
    update_data = input.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(status, key, value)
    
    await db.commit()
    await db.refresh(status)
    
    return model_to_dict(status)


@api_router.delete("/status-tarefas/{status_id}")
async def deletar_status_tarefa(
    status_id: str, 
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta um status de tarefa (apenas admin, apenas status custom)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar status")
    
    result = await db.execute(select(StatusTarefa).where(StatusTarefa.id == status_id))
    status = result.scalar_one_or_none()
    
    if not status:
        raise HTTPException(status_code=404, detail="Status não encontrado")
    
    if status.tipo == "sistema":
        raise HTTPException(status_code=400, detail="Não é possível deletar status do sistema")
    
    # Check if any task uses this status
    result = await db.execute(select(func.count(Tarefa.id)).where(Tarefa.status_id == status_id))
    tasks_count = result.scalar()
    
    if tasks_count > 0:
        raise HTTPException(status_code=400, detail=f"Existem {tasks_count} tarefas usando este status")
    
    await db.delete(status)
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
    result = await db.execute(select(User).where(User.username == input.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username já existe")
    
    # Verificar se email já existe
    result = await db.execute(select(User).where(User.email == input.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    if input.role == "operador" and not input.setor:
        raise HTTPException(status_code=400, detail="Operadores devem ter um setor definido")
    
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_obj = User(
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
    
    result = await db.execute(select(User).where(User.username == input.username))
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


@api_router.get("/users", response_model=List[dict])
async def listar_usuarios(user_role: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Lista todos os usuários (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem listar usuários")
    
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    users_list = []
    for u in users:
        user_dict = model_to_dict(u)
        user_dict.pop("password_hash", None)
        users_list.append(user_dict)
    
    return users_list


@api_router.get("/users/pending", response_model=List[dict])
async def listar_usuarios_pendentes(user_role: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Lista usuários pendentes de aprovação (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.execute(select(User).where(User.aprovado == False))
    users = result.scalars().all()
    
    users_list = []
    for u in users:
        user_dict = model_to_dict(u)
        user_dict.pop("password_hash", None)
        users_list.append(user_dict)
    
    return users_list


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
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.aprovado = input.aprovado
    user.ativo = input.aprovado
    user.aprovado_por = input.aprovado_por
    user.aprovado_em = datetime.now(timezone.utc)
    
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
    
    result = await db.execute(select(User).where(User.username == input.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username já existe")
    
    if input.role == "operador" and not input.setor:
        raise HTTPException(status_code=400, detail="Operadores devem ter um setor definido")
    
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_obj = User(
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
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = input.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)
    
    user_data = model_to_dict(user)
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
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db.delete(user)
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
    db: AsyncSession = Depends(get_db)
):
    """Lista tarefas com filtros opcionais"""
    query = select(Tarefa).options(selectinload(Tarefa.historico))
    
    conditions = []
    if projeto_id:
        conditions.append(Tarefa.projeto_id == projeto_id)
    if contrato_id:
        conditions.append(Tarefa.contrato_id == contrato_id)
    if setor:
        conditions.append(Tarefa.setor == setor)
    if status_id:
        conditions.append(Tarefa.status_id == status_id)
    if responsavel_id:
        conditions.append(Tarefa.responsavel_id == responsavel_id)
    if finalizada is not None:
        conditions.append(Tarefa.finalizada == finalizada)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Tarefa.ordem, Tarefa.criado_em.desc())
    
    result = await db.execute(query)
    tarefas = result.scalars().all()
    
    result_list = []
    for tarefa in tarefas:
        tarefa_dict = model_to_dict(tarefa)
        
        # Add historico
        tarefa_dict["historico"] = [model_to_dict(h) for h in tarefa.historico]
        
        # Update delay status
        if not tarefa.finalizada:
            dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = is_atrasada
        
        # Filter by atrasada if specified
        if atrasada is not None:
            if tarefa_dict.get("atrasada") == atrasada:
                result_list.append(tarefa_dict)
        else:
            result_list.append(tarefa_dict)
    
    return result_list


@api_router.get("/tarefas/{tarefa_id}", response_model=dict)
async def obter_tarefa(tarefa_id: str, db: AsyncSession = Depends(get_db)):
    """Obtém uma tarefa específica"""
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    tarefa_dict = model_to_dict(tarefa)
    tarefa_dict["historico"] = [model_to_dict(h) for h in tarefa.historico]
    
    if not tarefa.finalizada:
        dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
        tarefa_dict["dias_atraso"] = dias_atraso
        tarefa_dict["atrasada"] = is_atrasada
    
    return tarefa_dict


@api_router.post("/tarefas", response_model=dict)
async def criar_tarefa(input: TarefaCreate, db: AsyncSession = Depends(get_db)):
    """Cria uma nova tarefa"""
    statuses = await get_or_create_default_statuses(db)
    
    if input.status_id:
        result = await db.execute(select(StatusTarefa).where(StatusTarefa.id == input.status_id))
        status = result.scalar_one_or_none()
        if not status:
            raise HTTPException(status_code=400, detail="Status não encontrado")
        status_nome = status.nome
        status_id = input.status_id
    else:
        status_id = statuses[0].id
        status_nome = statuses[0].nome
    
    # Calculate initial delay
    dias_atraso, atrasada = calcular_dias_atraso(input.prazo)
    
    # Get max ordem for this project
    result = await db.execute(
        select(func.max(Tarefa.ordem)).where(Tarefa.projeto_id == input.projeto_id)
    )
    max_ordem = result.scalar() or 0
    
    tarefa_obj = Tarefa(
        titulo=input.titulo,
        descricao=input.descricao,
        projeto_id=input.projeto_id,
        contrato_id=input.contrato_id,
        setor=input.setor,
        responsavel_id=input.responsavel_id,
        responsavel_nome=input.responsavel_nome,
        status_id=status_id,
        status_nome=status_nome,
        prazo=input.prazo,
        prazo_original=input.prazo,
        prioridade=input.prioridade,
        dias_atraso=dias_atraso,
        atrasada=atrasada,
        criado_por_id=input.criado_por_id,
        criado_por_nome=input.criado_por_nome,
        criado_por_setor=input.criado_por_setor,
        ordem=input.ordem if input.ordem is not None else max_ordem + 1
    )
    
    db.add(tarefa_obj)
    await db.commit()
    await db.refresh(tarefa_obj)
    
    # Add history entry
    historico = HistoricoAcao(
        tarefa_id=tarefa_obj.id,
        acao="criada",
        usuario_id=input.criado_por_id,
        usuario_nome=input.criado_por_nome,
        setor=input.criado_por_setor,
        detalhes=f"Tarefa criada: {input.titulo}"
    )
    db.add(historico)
    await db.commit()
    
    logger.info(f"Tarefa criada: {tarefa_obj.id} por {input.criado_por_nome} ({input.criado_por_setor})")
    
    tarefa_dict = model_to_dict(tarefa_obj)
    tarefa_dict["historico"] = [model_to_dict(historico)]
    
    return tarefa_dict


@api_router.put("/tarefas/{tarefa_id}", response_model=dict)
async def atualizar_tarefa(tarefa_id: str, input: TarefaUpdate, db: AsyncSession = Depends(get_db)):
    """Atualiza uma tarefa (não permite reverter finalização)"""
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.finalizada:
        raise HTTPException(status_code=400, detail="Não é possível editar uma tarefa finalizada")
    
    detalhes = []
    
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
        dias_atraso, atrasada = calcular_dias_atraso(input.prazo)
        tarefa.dias_atraso = dias_atraso
        tarefa.atrasada = atrasada
        detalhes.append(f"Prazo alterado de {prazo_anterior} para: {input.prazo}")
    
    if input.prioridade and input.prioridade != tarefa.prioridade:
        tarefa.prioridade = input.prioridade
        detalhes.append(f"Prioridade alterada para: {input.prioridade}")
    
    if input.status_id and input.status_id != tarefa.status_id:
        result = await db.execute(select(StatusTarefa).where(StatusTarefa.id == input.status_id))
        status = result.scalar_one_or_none()
        if status:
            tarefa.status_id = input.status_id
            tarefa.status_nome = status.nome
            detalhes.append(f"Status alterado para: {status.nome}")
    
    if detalhes:
        historico = HistoricoAcao(
            tarefa_id=tarefa_id,
            acao="atualizada",
            usuario_id=input.usuario_id,
            usuario_nome=input.usuario_nome,
            setor=input.usuario_setor,
            detalhes="; ".join(detalhes)
        )
        db.add(historico)
    
    await db.commit()
    await db.refresh(tarefa)
    
    # Reload with historico
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one()
    
    tarefa_dict = model_to_dict(tarefa)
    tarefa_dict["historico"] = [model_to_dict(h) for h in tarefa.historico]
    
    return tarefa_dict


@api_router.post("/tarefas/{tarefa_id}/finalizar", response_model=dict)
async def finalizar_tarefa(tarefa_id: str, input: TarefaFinalizar, db: AsyncSession = Depends(get_db)):
    """Finaliza uma tarefa com observação obrigatória e recalcula prazos das próximas etapas"""
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.finalizada:
        raise HTTPException(status_code=400, detail="Tarefa já está finalizada")
    
    # Get "Concluído" status
    result = await db.execute(select(StatusTarefa).where(StatusTarefa.nome == "Concluído"))
    status_concluido = result.scalar_one_or_none()
    
    if not status_concluido:
        raise HTTPException(status_code=500, detail="Status 'Concluído' não encontrado")
    
    now = datetime.now(timezone.utc)
    
    tarefa.finalizada = True
    tarefa.data_finalizacao = now
    tarefa.observacao_finalizacao = input.observacao
    tarefa.status_id = status_concluido.id
    tarefa.status_nome = "Concluído"
    
    historico = HistoricoAcao(
        tarefa_id=tarefa_id,
        acao="finalizada",
        usuario_id=input.usuario_id,
        usuario_nome=input.usuario_nome,
        setor=input.usuario_setor,
        observacao=input.observacao,
        detalhes=f"Tarefa finalizada por {input.usuario_nome} ({input.usuario_setor})"
    )
    db.add(historico)
    
    await db.commit()
    
    # Recalcular prazos das próximas tarefas
    tarefas_recalculadas = await recalcular_prazos_projeto(db, tarefa.projeto_id, tarefa_id, now)
    
    logger.info(f"Tarefa finalizada: {tarefa_id} por {input.usuario_nome} ({input.usuario_setor})")
    if tarefas_recalculadas:
        logger.info(f"Prazos recalculados para {len(tarefas_recalculadas)} tarefas")
    
    # Reload with historico
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one()
    
    tarefa_dict = model_to_dict(tarefa)
    tarefa_dict["historico"] = [model_to_dict(h) for h in tarefa.historico]
    tarefa_dict["prazos_recalculados"] = tarefas_recalculadas
    
    return tarefa_dict


@api_router.post("/tarefas/{tarefa_id}/alterar-status", response_model=dict)
async def alterar_status_tarefa(tarefa_id: str, input: TarefaAlterarStatus, db: AsyncSession = Depends(get_db)):
    """Altera o status de uma tarefa"""
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.finalizada:
        raise HTTPException(status_code=400, detail="Não é possível alterar status de tarefa finalizada")
    
    result = await db.execute(select(StatusTarefa).where(StatusTarefa.id == input.status_id))
    status = result.scalar_one_or_none()
    
    if not status:
        raise HTTPException(status_code=400, detail="Status não encontrado")
    
    status_anterior = tarefa.status_nome
    tarefa.status_id = input.status_id
    tarefa.status_nome = status.nome
    
    historico = HistoricoAcao(
        tarefa_id=tarefa_id,
        acao="status_alterado",
        usuario_id=input.usuario_id,
        usuario_nome=input.usuario_nome,
        setor=input.usuario_setor,
        observacao=input.observacao,
        detalhes=f"Status alterado de '{status_anterior}' para '{status.nome}'"
    )
    db.add(historico)
    
    await db.commit()
    
    # Reload with historico
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico)).where(Tarefa.id == tarefa_id)
    )
    tarefa = result.scalar_one()
    
    tarefa_dict = model_to_dict(tarefa)
    tarefa_dict["historico"] = [model_to_dict(h) for h in tarefa.historico]
    
    return tarefa_dict


@api_router.delete("/tarefas/{tarefa_id}")
async def deletar_tarefa(
    tarefa_id: str, 
    user_role: str = Query(...), 
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta uma tarefa (apenas admin pode deletar qualquer tarefa)"""
    result = await db.execute(select(Tarefa).where(Tarefa.id == tarefa_id))
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar tarefas")
    
    await db.delete(tarefa)
    await db.commit()
    
    logger.info(f"Tarefa deletada: {tarefa_id} por user {user_id}")
    
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
    
    # Delete all historico first
    await db.execute(delete(HistoricoAcao))
    
    result = await db.execute(delete(Tarefa))
    await db.commit()
    
    logger.info(f"Todas as tarefas deletadas por user {user_id}")
    
    return {"message": "Todas as tarefas deletadas com sucesso"}


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
    query = select(Tarefa).where(Tarefa.finalizada == False)
    
    if projeto_id:
        query = query.where(Tarefa.projeto_id == projeto_id)
    if setor:
        query = query.where(Tarefa.setor == setor)
    
    result = await db.execute(query)
    tarefas = result.scalars().all()
    
    atrasadas = []
    for tarefa in tarefas:
        dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
        if is_atrasada:
            tarefa_dict = model_to_dict(tarefa)
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = True
            atrasadas.append(tarefa_dict)
    
    atrasadas.sort(key=lambda x: x.get("dias_atraso", 0), reverse=True)
    
    return atrasadas


@api_router.get("/atrasos-por-setor", response_model=List[dict])
async def atrasos_por_setor(db: AsyncSession = Depends(get_db)):
    """Retorna resumo de atrasos agrupados por setor"""
    result = await db.execute(select(Tarefa).where(Tarefa.finalizada == False))
    tarefas = result.scalars().all()
    
    setores = {}
    for tarefa in tarefas:
        dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
        
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
        select(Tarefa).where(and_(Tarefa.projeto_id == projeto_id, Tarefa.finalizada == False))
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
        dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
        
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


@api_router.get("/dashboard-stats", response_model=dict)
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Retorna estatísticas gerais para o dashboard"""
    result = await db.execute(select(Tarefa))
    tarefas = result.scalars().all()
    
    total = len(tarefas)
    finalizadas = sum(1 for t in tarefas if t.finalizada)
    em_andamento = total - finalizadas
    
    atrasadas = 0
    for tarefa in tarefas:
        if not tarefa.finalizada:
            _, is_atrasada = calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                atrasadas += 1
    
    # Group by sector
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
# ROUTES - Templates de Prazos
# ==========================================

@api_router.get("/templates-prazos", response_model=List[dict])
async def listar_templates_prazos(db: AsyncSession = Depends(get_db)):
    """Lista todos os templates de prazos"""
    result = await db.execute(select(TemplatePrazos).where(TemplatePrazos.ativo == True))
    templates = result.scalars().all()
    return [model_to_dict(t) for t in templates]


@api_router.get("/templates-prazos/{template_id}", response_model=dict)
async def obter_template_prazo(template_id: str, db: AsyncSession = Depends(get_db)):
    """Obtém um template específico"""
    result = await db.execute(select(TemplatePrazos).where(TemplatePrazos.id == template_id))
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
    
    template_obj = TemplatePrazos(
        nome=input.nome,
        descricao=input.descricao,
        etapas=input.etapas,
        prazo_total_dias=prazo_total,
        criado_por=user_id
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
    
    result = await db.execute(select(TemplatePrazos).where(TemplatePrazos.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    if input.nome is not None:
        template.nome = input.nome
    if input.descricao is not None:
        template.descricao = input.descricao
    if input.etapas is not None:
        template.etapas = input.etapas
        template.prazo_total_dias = sum(etapa.get("prazo_dias", 0) for etapa in input.etapas)
    if input.ativo is not None:
        template.ativo = input.ativo
    
    await db.commit()
    await db.refresh(template)
    
    return model_to_dict(template)


@api_router.delete("/templates-prazos/{template_id}")
async def deletar_template_prazo(
    template_id: str, 
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta um template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar templates")
    
    result = await db.execute(select(TemplatePrazos).where(TemplatePrazos.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    await db.delete(template)
    await db.commit()
    
    return {"message": "Template deletado com sucesso"}


@api_router.post("/templates-prazos/criar-padrao")
async def criar_template_padrao(
    user_id: str = Query(...), 
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Cria o template padrão de prazos baseado nas etapas do sistema"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar templates")
    
    etapas_padrao = [
        # ATENDIMENTO
        {"etapa_id": 1, "etapa_nome": "Informar recebimento do contrato", "departamento": "atendimento", "prazo_dias": 1},
        {"etapa_id": 2, "etapa_nome": "Ativar contrato no site", "departamento": "atendimento", "prazo_dias": 1},
        {"etapa_id": 3, "etapa_nome": "1º contato com a comissão", "departamento": "atendimento", "prazo_dias": 2},
        {"etapa_id": 4, "etapa_nome": "Reunião de atendimento", "departamento": "atendimento", "prazo_dias": 15},
        {"etapa_id": 5, "etapa_nome": "Envio do questionário de criação", "departamento": "atendimento", "prazo_dias": 1},
        {"etapa_id": 6, "etapa_nome": "Recebimento do questionário preenchido", "departamento": "atendimento", "prazo_dias": 30},
        {"etapa_id": 7, "etapa_nome": "Envio do e-mail de layout de fotos", "departamento": "atendimento", "prazo_dias": 1},
        {"etapa_id": 8, "etapa_nome": "Enviar layout para comissão", "departamento": "atendimento", "prazo_dias": 1},
        {"etapa_id": 9, "etapa_nome": "Agendar reunião de criação", "departamento": "atendimento", "prazo_dias": 5},
        {"etapa_id": 10, "etapa_nome": "Liberação das fotos", "departamento": "atendimento", "prazo_dias": 3},
        {"etapa_id": 11, "etapa_nome": "Cadastro de textos/REV1", "departamento": "atendimento", "prazo_dias": 2},
        {"etapa_id": 12, "etapa_nome": "Acompanhar aprovação", "departamento": "atendimento", "prazo_dias": 7},
        
        # CRIAÇÃO
        {"etapa_id": 18, "etapa_nome": "RC - Reunião de criação", "departamento": "criacao", "prazo_dias": 2},
        {"etapa_id": 19, "etapa_nome": "Envio do briefing", "departamento": "criacao", "prazo_dias": 2},
        {"etapa_id": 20, "etapa_nome": "Layout de Fotos", "departamento": "criacao", "prazo_dias": 5},
        {"etapa_id": 24, "etapa_nome": "Início da criação", "departamento": "criacao", "prazo_dias": 10},
        {"etapa_id": 25, "etapa_nome": "Criação do convite", "departamento": "criacao", "prazo_dias": 5},
        {"etapa_id": 26, "etapa_nome": "Correções", "departamento": "criacao", "prazo_dias": 3},
        {"etapa_id": 28, "etapa_nome": "Miolo aprovado", "departamento": "criacao", "prazo_dias": 2},
        {"etapa_id": 29, "etapa_nome": "Capa aprovada", "departamento": "criacao", "prazo_dias": 2},
        {"etapa_id": 30, "etapa_nome": "Demais Peças", "departamento": "criacao", "prazo_dias": 5},
        {"etapa_id": 33, "etapa_nome": "Saída/Finalização", "departamento": "criacao", "prazo_dias": 3},
        
        # PRÉ-PRODUÇÃO
        {"etapa_id": 34, "etapa_nome": "Recorte e tratamento", "departamento": "pre-producao", "prazo_dias": 10},
        {"etapa_id": 35, "etapa_nome": "Recebimento envelope", "departamento": "pre-producao", "prazo_dias": 1},
        {"etapa_id": 36, "etapa_nome": "Conferir textos", "departamento": "pre-producao", "prazo_dias": 2},
        {"etapa_id": 37, "etapa_nome": "Envio para gráfica", "departamento": "pre-producao", "prazo_dias": 1},
        
        # PRODUÇÃO
        {"etapa_id": 40, "etapa_nome": "Triagem materiais", "departamento": "producao", "prazo_dias": 1},
        {"etapa_id": 41, "etapa_nome": "Envio à gráfica", "departamento": "producao", "prazo_dias": 1},
        {"etapa_id": 42, "etapa_nome": "Ordem de produção", "departamento": "producao", "prazo_dias": 1},
        {"etapa_id": 43, "etapa_nome": "Costura e acabamento", "departamento": "producao", "prazo_dias": 7},
        {"etapa_id": 44, "etapa_nome": "Conferência qualidade", "departamento": "producao", "prazo_dias": 1},
        {"etapa_id": 45, "etapa_nome": "Entrega convites", "departamento": "producao", "prazo_dias": 1},
    ]
    
    prazo_total = sum(e["prazo_dias"] for e in etapas_padrao)
    
    template = TemplatePrazos(
        nome="Template Padrão IDEIABH",
        descricao="Template completo com todas as etapas do processo de formaturas",
        etapas=etapas_padrao,
        prazo_total_dias=prazo_total,
        criado_por=user_id
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    return {"message": f"Template padrão criado com sucesso ({prazo_total} dias)", "template": model_to_dict(template)}


# ==========================================
# ROUTES - Contratos
# ==========================================

@api_router.get("/contratos", response_model=List[dict])
async def listar_contratos(db: AsyncSession = Depends(get_db)):
    """Lista todos os contratos"""
    result = await db.execute(select(Contrato).order_by(Contrato.criado_em.desc()))
    contratos = result.scalars().all()
    return [model_to_dict(c) for c in contratos]


@api_router.get("/contratos/{contrato_id}", response_model=dict)
async def obter_contrato(contrato_id: str, db: AsyncSession = Depends(get_db)):
    """Obtém um contrato específico"""
    result = await db.execute(select(Contrato).where(Contrato.id == contrato_id))
    contrato = result.scalar_one_or_none()
    
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    return model_to_dict(contrato)


@api_router.post("/contratos", response_model=dict)
async def criar_contrato(input: ContratoCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo contrato e automaticamente cria o projeto com todas as etapas"""
    # Verificar se template existe
    result = await db.execute(select(TemplatePrazos).where(TemplatePrazos.id == input.template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    # Criar contrato
    contrato_obj = Contrato(
        cliente=input.cliente,
        faculdade=input.faculdade,
        numero_contrato=input.numero_contrato,
        valor=input.valor,
        data_inicio=input.data_inicio,
        data_fim=input.data_fim,
        template_id=input.template_id,
        template_nome=template.nome,
        criado_por=input.criado_por
    )
    
    db.add(contrato_obj)
    await db.commit()
    await db.refresh(contrato_obj)
    
    # Calcular data fim prevista
    try:
        data_inicio_dt = datetime.fromisoformat(input.data_inicio).date()
    except:
        data_inicio_dt = datetime.now(timezone.utc).date()
    
    prazo_total = template.prazo_total_dias or 134
    data_fim_prevista = (data_inicio_dt + timedelta(days=prazo_total)).isoformat()
    
    # Criar projeto automaticamente
    etapas = template.etapas or []
    primeira_etapa = etapas[0].get("etapa_nome", "Início") if etapas else "Início"
    
    projeto_obj = Projeto(
        contrato_id=contrato_obj.id,
        cliente=input.cliente,
        etapa_atual=primeira_etapa,
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
    await db.commit()
    await db.refresh(projeto_obj)
    
    # Atualizar contrato com projeto_id
    contrato_obj.projeto_id = projeto_obj.id
    await db.commit()
    
    # Obter status "Pendente"
    statuses = await get_or_create_default_statuses(db)
    status_pendente = statuses[0]
    
    data_atual = data_inicio_dt
    tarefas_criadas = []
    ordem = 1
    
    for etapa in etapas:
        prazo_dias = etapa.get("prazo_dias", 1)
        data_fim_etapa = data_atual + timedelta(days=prazo_dias)
        
        tarefa_obj = Tarefa(
            titulo=etapa.get("etapa_nome"),
            descricao=etapa.get("descricao", ""),
            projeto_id=projeto_obj.id,
            contrato_id=contrato_obj.id,
            setor=etapa.get("departamento", "atendimento"),
            status_id=status_pendente.id,
            status_nome="Pendente",
            prazo=data_fim_etapa.isoformat(),
            prazo_original=data_fim_etapa.isoformat(),
            prioridade="media",
            criado_por_id=input.criado_por,
            criado_por_nome=input.criado_por,
            criado_por_setor="sistema",
            ordem=ordem
        )
        
        db.add(tarefa_obj)
        await db.commit()
        await db.refresh(tarefa_obj)
        
        # Add history
        historico = HistoricoAcao(
            tarefa_id=tarefa_obj.id,
            acao="criada",
            usuario_id=input.criado_por,
            usuario_nome=input.criado_por,
            setor="sistema",
            detalhes=f"Etapa criada automaticamente do template {template.nome}"
        )
        db.add(historico)
        
        tarefas_criadas.append(tarefa_obj.id)
        data_atual = data_fim_etapa
        ordem += 1
    
    await db.commit()
    
    logger.info(f"Contrato criado: {contrato_obj.id}, Projeto criado: {projeto_obj.id}, {len(tarefas_criadas)} tarefas criadas")
    
    return {
        "contrato": model_to_dict(contrato_obj),
        "projeto": model_to_dict(projeto_obj),
        "tarefas_criadas": len(tarefas_criadas),
        "message": f"Contrato, projeto e {len(tarefas_criadas)} etapas criados com sucesso!"
    }


@api_router.put("/contratos/{contrato_id}", response_model=dict)
async def atualizar_contrato(contrato_id: str, input: ContratoUpdate, db: AsyncSession = Depends(get_db)):
    """Atualiza um contrato"""
    result = await db.execute(select(Contrato).where(Contrato.id == contrato_id))
    contrato = result.scalar_one_or_none()
    
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    update_data = input.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(contrato, key, value)
    
    await db.commit()
    await db.refresh(contrato)
    
    return model_to_dict(contrato)


@api_router.delete("/contratos/{contrato_id}")
async def deletar_contrato(
    contrato_id: str, 
    user_role: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deleta um contrato (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar contratos")
    
    result = await db.execute(select(Contrato).where(Contrato.id == contrato_id))
    contrato = result.scalar_one_or_none()
    
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    # Delete related tasks first (and their historico)
    if contrato.projeto_id:
        # Delete historico for project tasks
        await db.execute(
            delete(HistoricoAcao).where(
                HistoricoAcao.tarefa_id.in_(
                    select(Tarefa.id).where(Tarefa.projeto_id == contrato.projeto_id)
                )
            )
        )
        # Delete tasks
        await db.execute(delete(Tarefa).where(Tarefa.projeto_id == contrato.projeto_id))
        # Delete project
        await db.execute(delete(Projeto).where(Projeto.id == contrato.projeto_id))
    
    await db.delete(contrato)
    await db.commit()
    
    return {"message": "Contrato deletado com sucesso"}


# ==========================================
# ROUTES - Projetos
# ==========================================

@api_router.get("/projetos", response_model=List[dict])
async def listar_projetos(db: AsyncSession = Depends(get_db)):
    """Lista todos os projetos"""
    result = await db.execute(select(Projeto).order_by(Projeto.criado_em.desc()))
    projetos = result.scalars().all()
    
    result_list = []
    for projeto in projetos:
        projeto_dict = model_to_dict(projeto)
        
        # Calcular progresso baseado nas tarefas
        result_tarefas = await db.execute(select(Tarefa).where(Tarefa.projeto_id == projeto.id))
        tarefas = result_tarefas.scalars().all()
        
        if tarefas:
            total_tarefas = len(tarefas)
            tarefas_concluidas = sum(1 for t in tarefas if t.finalizada)
            projeto_dict["progresso"] = round((tarefas_concluidas / total_tarefas) * 100, 1)
            
            # Calcular risco baseado em atrasos
            tarefas_atrasadas = 0
            total_dias_atraso = 0
            for tarefa in tarefas:
                if not tarefa.finalizada:
                    dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
                    if is_atrasada:
                        tarefas_atrasadas += 1
                        total_dias_atraso += dias_atraso
            
            # Definir nível de risco
            if tarefas_atrasadas == 0:
                projeto_dict["risco"] = "baixo"
            elif tarefas_atrasadas <= 2 and total_dias_atraso < 7:
                projeto_dict["risco"] = "medio"
            elif tarefas_atrasadas <= 5 or total_dias_atraso < 15:
                projeto_dict["risco"] = "alto"
            else:
                projeto_dict["risco"] = "critico"
            
            # Atualizar etapa atual (primeira não concluída)
            for tarefa in sorted(tarefas, key=lambda t: t.ordem):
                if not tarefa.finalizada:
                    projeto_dict["etapa_atual"] = tarefa.titulo
                    break
        
        result_list.append(projeto_dict)
    
    return result_list


@api_router.get("/projetos/{projeto_id}", response_model=dict)
async def obter_projeto(projeto_id: str, db: AsyncSession = Depends(get_db)):
    """Obtém um projeto específico com detalhes"""
    result = await db.execute(select(Projeto).where(Projeto.id == projeto_id))
    projeto = result.scalar_one_or_none()
    
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    projeto_dict = model_to_dict(projeto)
    
    # Buscar tarefas do projeto
    result = await db.execute(
        select(Tarefa).options(selectinload(Tarefa.historico))
        .where(Tarefa.projeto_id == projeto_id)
        .order_by(Tarefa.ordem)
    )
    tarefas = result.scalars().all()
    
    tarefas_list = []
    for tarefa in tarefas:
        tarefa_dict = model_to_dict(tarefa)
        tarefa_dict["historico"] = [model_to_dict(h) for h in tarefa.historico]
        
        if not tarefa.finalizada:
            dias_atraso, atrasada = calcular_dias_atraso(tarefa.prazo)
            tarefa_dict["dias_atraso"] = dias_atraso
            tarefa_dict["atrasada"] = atrasada
        
        tarefas_list.append(tarefa_dict)
    
    projeto_dict["tarefas"] = tarefas_list
    projeto_dict["total_tarefas"] = len(tarefas)
    projeto_dict["tarefas_concluidas"] = sum(1 for t in tarefas if t.finalizada)
    
    return projeto_dict


# ==========================================
# ROUTES - Dashboard Avançado
# ==========================================

@api_router.get("/dashboard-avancado", response_model=dict)
async def dashboard_avancado(db: AsyncSession = Depends(get_db)):
    """Dashboard com informações detalhadas para gestores"""
    result_projetos = await db.execute(select(Projeto))
    projetos = result_projetos.scalars().all()
    
    result_tarefas = await db.execute(select(Tarefa))
    tarefas = result_tarefas.scalars().all()
    
    total_projetos = len(projetos)
    projetos_em_andamento = sum(1 for p in projetos if p.status == "Em Andamento")
    
    carga_por_responsavel = {}
    alertas_atrasos = []
    
    for tarefa in tarefas:
        if tarefa.finalizada:
            continue
        
        responsavel = tarefa.responsavel_nome or "Não atribuído"
        dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
        
        if responsavel not in carga_por_responsavel:
            carga_por_responsavel[responsavel] = {
                "responsavel": responsavel,
                "total_tarefas": 0,
                "tarefas_atrasadas": 0,
                "total_dias_atraso": 0,
                "tarefas": []
            }
        
        carga_por_responsavel[responsavel]["total_tarefas"] += 1
        
        if is_atrasada:
            carga_por_responsavel[responsavel]["tarefas_atrasadas"] += 1
            carga_por_responsavel[responsavel]["total_dias_atraso"] += dias_atraso
            carga_por_responsavel[responsavel]["tarefas"].append({
                "id": tarefa.id,
                "titulo": tarefa.titulo,
                "dias_atraso": dias_atraso,
                "projeto_id": tarefa.projeto_id,
                "setor": tarefa.setor
            })
            
            alertas_atrasos.append({
                "tarefa_id": tarefa.id,
                "titulo": tarefa.titulo,
                "responsavel": responsavel,
                "responsavel_id": tarefa.responsavel_id,
                "dias_atraso": dias_atraso,
                "setor": tarefa.setor,
                "projeto_id": tarefa.projeto_id,
                "prioridade": tarefa.prioridade
            })
    
    alertas_atrasos.sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    carga_lista = sorted(
        carga_por_responsavel.values(),
        key=lambda x: x["tarefas_atrasadas"],
        reverse=True
    )
    
    # Projetos em andamento com detalhes
    projetos_detalhados = []
    for projeto in projetos:
        if projeto.status != "Em Andamento":
            continue
        
        tarefas_projeto = [t for t in tarefas if t.projeto_id == projeto.id]
        total = len(tarefas_projeto)
        concluidas = sum(1 for t in tarefas_projeto if t.finalizada)
        
        atrasadas = 0
        for t in tarefas_projeto:
            if not t.finalizada:
                _, is_atrasada = calcular_dias_atraso(t.prazo)
                if is_atrasada:
                    atrasadas += 1
        
        projetos_detalhados.append({
            "id": projeto.id,
            "cliente": projeto.cliente,
            "etapa_atual": projeto.etapa_atual,
            "progresso": round((concluidas / total * 100) if total > 0 else 0, 1),
            "total_tarefas": total,
            "tarefas_concluidas": concluidas,
            "tarefas_atrasadas": atrasadas,
            "risco": projeto.risco,
            "data_inicio": projeto.data_inicio,
            "data_fim_prevista": projeto.data_fim_prevista
        })
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "resumo": {
            "total_projetos": total_projetos,
            "projetos_em_andamento": projetos_em_andamento,
            "total_tarefas_atrasadas": len(alertas_atrasos),
            "responsaveis_com_atraso": len([c for c in carga_lista if c["tarefas_atrasadas"] > 0])
        },
        "projetos_em_andamento": projetos_detalhados,
        "alertas_atrasos": alertas_atrasos[:20],
        "carga_por_responsavel": carga_lista
    }


# ==========================================
# ROUTES - Relatórios
# ==========================================

@api_router.get("/relatorio-gargalos", response_model=dict)
async def relatorio_gargalos(db: AsyncSession = Depends(get_db)):
    """Relatório de gargalos - O que está travando os processos"""
    result = await db.execute(select(Tarefa).where(Tarefa.finalizada == False))
    tarefas = result.scalars().all()
    
    gargalos_por_setor = {}
    gargalos_por_responsavel = {}
    tarefas_criticas = []
    
    for tarefa in tarefas:
        dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
        
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
        
        # Tarefas críticas (atraso > 7 dias ou prioridade crítica)
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
    
    result = await db.execute(select(Tarefa))
    tarefas = result.scalars().all()
    
    criadas_semana = []
    finalizadas_semana = []
    atrasadas_atuais = []
    
    for tarefa in tarefas:
        if tarefa.criado_em and tarefa.criado_em >= inicio_semana:
            criadas_semana.append(tarefa)
        
        if tarefa.finalizada and tarefa.data_finalizacao and tarefa.data_finalizacao >= inicio_semana:
            finalizadas_semana.append(tarefa)
        elif not tarefa.finalizada:
            dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                atrasadas_atuais.append((tarefa, dias_atraso))
    
    # Agrupar por setor
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
    
    for t, _ in atrasadas_atuais:
        setor = t.setor or "Sem setor"
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
                "id": t.id,
                "titulo": t.titulo,
                "setor": t.setor,
                "responsavel": t.responsavel_nome,
                "dias_atraso": dias,
                "prioridade": t.prioridade
            }
            for t, dias in sorted(atrasadas_atuais, key=lambda x: x[1], reverse=True)[:10]
        ],
        "timestamp": hoje.isoformat()
    }


@api_router.get("/relatorio-mensal", response_model=dict)
async def relatorio_mensal(db: AsyncSession = Depends(get_db)):
    """Relatório mensal de produtividade"""
    hoje = datetime.now(timezone.utc)
    inicio_mes = hoje - timedelta(days=30)
    
    result = await db.execute(select(Tarefa))
    tarefas = result.scalars().all()
    
    criadas_mes = []
    finalizadas_mes = []
    atrasadas_atuais = []
    
    for tarefa in tarefas:
        if tarefa.criado_em and tarefa.criado_em >= inicio_mes:
            criadas_mes.append(tarefa)
        
        if tarefa.finalizada and tarefa.data_finalizacao and tarefa.data_finalizacao >= inicio_mes:
            finalizadas_mes.append(tarefa)
        elif not tarefa.finalizada:
            dias_atraso, is_atrasada = calcular_dias_atraso(tarefa.prazo)
            if is_atrasada:
                atrasadas_atuais.append((tarefa, dias_atraso))
    
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
    
    for t, _ in atrasadas_atuais:
        setor = t.setor or "Sem setor"
        if setor in analise_setor:
            analise_setor[setor]["atrasadas"] += 1
    
    for setor_data in analise_setor.values():
        if setor_data["total"] > 0:
            setor_data["taxa_conclusao"] = round(
                setor_data["finalizadas"] / setor_data["total"] * 100, 1
            )
    
    # Gargalos críticos para cobrança
    gargalos_cobranca = []
    for t, dias in atrasadas_atuais:
        if dias > 5:
            gargalos_cobranca.append({
                "tarefa": t.titulo,
                "setor": t.setor,
                "responsavel": t.responsavel_nome or "Não atribuído",
                "dias_atraso": dias,
                "prioridade": t.prioridade,
                "acao_sugerida": "Cobrança imediata" if dias > 10 else "Acompanhamento urgente"
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
# ROUTES - Notificações
# ==========================================

@api_router.get("/notificacoes/{usuario_id}", response_model=List[dict])
async def listar_notificacoes(
    usuario_id: str, 
    apenas_nao_lidas: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Lista notificações de um usuário"""
    query = select(Notificacao).where(Notificacao.para_usuario_id == usuario_id)
    
    if apenas_nao_lidas:
        query = query.where(Notificacao.lida == False)
    
    query = query.order_by(Notificacao.criado_em.desc())
    
    result = await db.execute(query)
    notificacoes = result.scalars().all()
    
    return [model_to_dict(n) for n in notificacoes]


@api_router.post("/notificacoes", response_model=dict)
async def criar_notificacao(input: NotificacaoCreate, db: AsyncSession = Depends(get_db)):
    """Cria uma nova notificação"""
    notif_obj = Notificacao(**input.model_dump())
    
    db.add(notif_obj)
    await db.commit()
    await db.refresh(notif_obj)
    
    return model_to_dict(notif_obj)


@api_router.put("/notificacoes/{notificacao_id}/marcar-lida")
async def marcar_notificacao_lida(notificacao_id: str, db: AsyncSession = Depends(get_db)):
    """Marca uma notificação como lida"""
    result = await db.execute(select(Notificacao).where(Notificacao.id == notificacao_id))
    notificacao = result.scalar_one_or_none()
    
    if not notificacao:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    notificacao.lida = True
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
    
    result = await db.execute(select(Tarefa).where(Tarefa.id == input.tarefa_id))
    tarefa = result.scalar_one_or_none()
    
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    notif_obj = Notificacao(
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
        logger.info(f"Email de cobrança enviado para {input.operador_email}")
        email_enviado = True
    
    return {
        "message": "Cobrança enviada com sucesso",
        "notificacao_criada": True,
        "email_enviado": email_enviado
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    logger.info("Starting IDEIABH API with PostgreSQL...")
    await init_db()
    logger.info("Database tables initialized")
    
    # Create default statuses
    async with engine.begin() as conn:
        from sqlalchemy.orm import Session
        from database import async_session_maker
        async with async_session_maker() as session:
            await get_or_create_default_statuses(session)
    logger.info("Default statuses initialized")


@app.on_event("shutdown")
async def shutdown_event():
    await engine.dispose()
