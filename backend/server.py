from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'ideiabh')]

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

class UserRole(str, Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"


# ==========================================
# MODELS - Status Personalizados
# ==========================================

class StatusTarefa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cor: str = "#64748b"
    ordem: int = 0
    tipo: str = "custom"  # "sistema" ou "custom"
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
# MODELS - User Management
# ==========================================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    nome: str
    role: str = "operador"  # admin, gerente, operador
    setor: Optional[str] = None  # Para operadores: atendimento, criacao, pre-producao, producao
    ativo: bool = False  # Novo usuário precisa aprovação do admin
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


class UserApprove(BaseModel):
    aprovado: bool
    aprovado_por: str


class UserLogin(BaseModel):
    username: str
    password: str


# ==========================================
# MODELS - Tarefas
# ==========================================

class HistoricoAcao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    acao: str  # "criada", "atualizada", "finalizada", "status_alterado"
    usuario_id: str
    usuario_nome: str
    setor: str
    data: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    detalhes: Optional[str] = None
    observacao: Optional[str] = None


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
    prazo: Optional[str] = None  # ISO date string
    prazo_original: Optional[str] = None
    prioridade: str = "media"  # baixa, media, alta, critica
    
    # Controle de atraso
    dias_atraso: int = 0
    atrasada: bool = False
    
    # Controle de finalização
    finalizada: bool = False
    data_finalizacao: Optional[datetime] = None
    observacao_finalizacao: Optional[str] = None
    
    # Controle de criação
    criado_por_id: str
    criado_por_nome: str
    criado_por_setor: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Histórico de ações
    historico: List[HistoricoAcao] = []
    
    # Metadados
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
    usuario_id: str
    usuario_nome: str
    usuario_setor: str
    usuario_role: str = "operador"  # Para verificar permissão de edição


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


# ==========================================
# MODELS - Projetos e Contratos
# ==========================================

class Contrato(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente: str
    faculdade: str
    numero_contrato: str
    valor: float
    data_inicio: str  # ISO date string
    data_fim: Optional[str] = None
    status: str = "Ativo"  # Ativo, Em Andamento, Em Produção, Finalizado, Entregue
    template_id: Optional[str] = None
    template_nome: Optional[str] = None
    projeto_id: Optional[str] = None
    criado_por: str
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContratoCreate(BaseModel):
    cliente: str
    faculdade: str
    numero_contrato: str
    valor: float
    data_inicio: str
    data_fim: Optional[str] = None
    template_id: str  # ID do template a ser usado
    criado_por: str


class ContratoUpdate(BaseModel):
    cliente: Optional[str] = None
    faculdade: Optional[str] = None
    numero_contrato: Optional[str] = None
    valor: Optional[float] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    status: Optional[str] = None


class Projeto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contrato_id: str
    cliente: str
    etapa_atual: str = "Informar recebimento do contrato"
    etapa_atual_ordem: int = 1
    progresso: float = 0.0
    risco: str = "baixo"  # baixo, medio, alto, critico
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
    tipo: str  # "cobranca", "atraso", "finalizacao", "atribuicao"
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


class ProjetoAtraso(BaseModel):
    projeto_id: str
    cliente: str
    setor: str
    etapa_nome: str
    dias_atraso: int
    responsavel: Optional[str] = None


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def serialize_datetime(obj):
    """Convert datetime objects to ISO string for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def serialize_doc(doc: dict) -> dict:
    """Serialize a document for MongoDB storage"""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else serialize_datetime(item) for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result


def deserialize_datetime(value):
    """Convert ISO string back to datetime"""
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except:
            return value
    return value


def deserialize_doc(doc: dict) -> dict:
    """Deserialize a document from MongoDB"""
    if not doc:
        return doc
    result = {}
    for key, value in doc.items():
        if key == '_id':
            continue
        if key in ['criado_em', 'atualizado_em', 'data_finalizacao', 'data', 'timestamp']:
            result[key] = deserialize_datetime(value)
        elif isinstance(value, list):
            result[key] = [deserialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            result[key] = deserialize_doc(value)
        else:
            result[key] = value
    return result


async def calcular_dias_atraso(prazo_str: Optional[str]) -> tuple:
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


async def get_status_padrao():
    """Get or create default statuses"""
    status_count = await db.status_tarefas.count_documents({})
    
    if status_count == 0:
        # Create default statuses
        default_statuses = [
            {"id": str(uuid.uuid4()), "nome": "Pendente", "cor": "#94a3b8", "ordem": 1, "tipo": "sistema", "ativo": True, "criado_por": "sistema", "criado_em": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "nome": "Em Andamento", "cor": "#3b82f6", "ordem": 2, "tipo": "sistema", "ativo": True, "criado_por": "sistema", "criado_em": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "nome": "Aguardando", "cor": "#f59e0b", "ordem": 3, "tipo": "sistema", "ativo": True, "criado_por": "sistema", "criado_em": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "nome": "Concluído", "cor": "#10b981", "ordem": 4, "tipo": "sistema", "ativo": True, "criado_por": "sistema", "criado_em": datetime.now(timezone.utc).isoformat()},
        ]
        await db.status_tarefas.insert_many(default_statuses)
        return default_statuses
    
    return await db.status_tarefas.find({"ativo": True}, {"_id": 0}).sort("ordem", 1).to_list(100)


async def recalcular_prazos_projeto(projeto_id: str, tarefa_finalizada_id: str, data_finalizacao: datetime):
    """
    Recalcula os prazos das tarefas seguintes baseado na data de finalização da tarefa anterior.
    O prazo da próxima etapa será: data_finalizacao + diferença_dias_original
    """
    from datetime import timedelta
    
    # Buscar a tarefa finalizada para obter a ordem
    tarefa_finalizada = await db.tarefas.find_one({"id": tarefa_finalizada_id}, {"_id": 0})
    
    if not tarefa_finalizada:
        return []
    
    # Buscar todas as tarefas do projeto ordenadas por prazo original
    tarefas_projeto = await db.tarefas.find(
        {"projeto_id": projeto_id, "finalizada": False}
    ).sort("prazo_original", 1).to_list(1000)
    
    if not tarefas_projeto:
        return []
    
    # Data base é a data de finalização real
    data_base = data_finalizacao.date() if isinstance(data_finalizacao, datetime) else datetime.fromisoformat(str(data_finalizacao)).date()
    prazo_anterior = tarefa_finalizada.get("prazo_original") or tarefa_finalizada.get("prazo")
    
    tarefas_atualizadas = []
    
    for tarefa in tarefas_projeto:
        # Calcular diferença de dias original entre esta tarefa e a anterior
        if tarefa.get("prazo_original") and prazo_anterior:
            try:
                prazo_original_tarefa = datetime.fromisoformat(tarefa["prazo_original"]).date()
                prazo_original_anterior = datetime.fromisoformat(prazo_anterior).date()
                dias_diferenca = (prazo_original_tarefa - prazo_original_anterior).days
                if dias_diferenca < 0:
                    dias_diferenca = 1  # Mínimo 1 dia
            except:
                dias_diferenca = 1
        else:
            dias_diferenca = 1
        
        # Novo prazo baseado na data de finalização real + diferença
        novo_prazo = data_base + timedelta(days=max(dias_diferenca, 1))
        prazo_antigo = tarefa.get("prazo")
        
        # Atualizar tarefa
        historico_entry = {
            "id": str(uuid.uuid4()),
            "acao": "prazo_recalculado",
            "usuario_id": "sistema",
            "usuario_nome": "Sistema",
            "setor": "sistema",
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": f"Prazo recalculado de {prazo_antigo} para {novo_prazo.isoformat()} (baseado na entrega anterior)"
        }
        
        await db.tarefas.update_one(
            {"id": tarefa["id"]},
            {
                "$set": {
                    "prazo": novo_prazo.isoformat(),
                    "atualizado_em": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"historico": historico_entry}
            }
        )
        
        tarefas_atualizadas.append({
            "id": tarefa["id"],
            "titulo": tarefa["titulo"],
            "prazo_anterior": prazo_antigo,
            "novo_prazo": novo_prazo.isoformat()
        })
        
        # Atualizar referências para próxima iteração
        data_base = novo_prazo
        prazo_anterior = tarefa.get("prazo_original")
    
    return tarefas_atualizadas


# ==========================================
# ROUTES - Health Check
# ==========================================

@api_router.get("/")
async def root():
    return {"message": "IDEIABH API - Sistema de Gestão Operacional"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==========================================
# ROUTES - Status de Tarefas
# ==========================================

@api_router.get("/status-tarefas", response_model=List[dict])
async def listar_status_tarefas():
    """Lista todos os status de tarefas ativos"""
    await get_status_padrao()  # Ensure default statuses exist
    status_list = await db.status_tarefas.find({"ativo": True}, {"_id": 0}).sort("ordem", 1).to_list(100)
    return [deserialize_doc(s) for s in status_list]


@api_router.post("/status-tarefas", response_model=dict)
async def criar_status_tarefa(input: StatusTarefaCreate, user_role: str = Query(...), user_id: str = Query(...)):
    """Cria um novo status de tarefa (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar status")
    
    # Check if status with same name exists
    existing = await db.status_tarefas.find_one({"nome": input.nome})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um status com este nome")
    
    status_obj = StatusTarefa(
        nome=input.nome,
        cor=input.cor,
        ordem=input.ordem,
        tipo="custom",
        criado_por=user_id
    )
    
    doc = serialize_doc(status_obj.model_dump())
    await db.status_tarefas.insert_one(doc)
    
    return deserialize_doc(doc)


@api_router.put("/status-tarefas/{status_id}", response_model=dict)
async def atualizar_status_tarefa(status_id: str, input: StatusTarefaUpdate, user_role: str = Query(...)):
    """Atualiza um status de tarefa (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar status")
    
    existing = await db.status_tarefas.find_one({"id": status_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Status não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.status_tarefas.update_one({"id": status_id}, {"$set": update_data})
    
    updated = await db.status_tarefas.find_one({"id": status_id}, {"_id": 0})
    return deserialize_doc(updated)


@api_router.delete("/status-tarefas/{status_id}")
async def deletar_status_tarefa(status_id: str, user_role: str = Query(...)):
    """Deleta um status de tarefa (apenas admin, apenas status custom)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar status")
    
    existing = await db.status_tarefas.find_one({"id": status_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Status não encontrado")
    
    if existing.get("tipo") == "sistema":
        raise HTTPException(status_code=400, detail="Não é possível deletar status do sistema")
    
    # Check if any task uses this status
    tasks_with_status = await db.tarefas.count_documents({"status_id": status_id})
    if tasks_with_status > 0:
        raise HTTPException(status_code=400, detail=f"Existem {tasks_with_status} tarefas usando este status")
    
    await db.status_tarefas.delete_one({"id": status_id})
    return {"message": "Status deletado com sucesso"}


# ==========================================
# ROUTES - Users
# ==========================================

@api_router.post("/auth/register", response_model=dict)
async def register_user(input: UserCreate):
    """Registra novo usuário (aguarda aprovação do admin)"""
    import bcrypt
    
    # Verificar se username já existe
    existing = await db.users.find_one({"username": input.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username já existe")
    
    # Verificar se email já existe
    existing_email = await db.users.find_one({"email": input.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Validar setor para operadores
    if input.role == "operador" and not input.setor:
        raise HTTPException(status_code=400, detail="Operadores devem ter um setor definido")
    
    # Hash da senha
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Criar usuário
    user_obj = User(
        username=input.username,
        email=input.email,
        password_hash=password_hash,
        nome=input.nome,
        role=input.role,
        setor=input.setor,
        ativo=False,  # Precisa aprovação
        aprovado=False
    )
    
    user_doc = serialize_doc(user_obj.model_dump())
    await db.users.insert_one(user_doc)
    
    logger.info(f"Novo usuário registrado: {input.username} (aguardando aprovação)")
    
    return {
        "message": "Usuário registrado com sucesso! Aguarde aprovação do administrador.",
        "username": input.username,
        "aprovado": False
    }


@api_router.post("/auth/login", response_model=dict)
async def login_user(input: UserLogin):
    """Login de usuário"""
    import bcrypt
    
    # Buscar usuário
    user = await db.users.find_one({"username": input.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    
    # Verificar se está aprovado
    if not user.get("aprovado"):
        raise HTTPException(status_code=403, detail="Usuário ainda não foi aprovado pelo administrador")
    
    # Verificar se está ativo
    if not user.get("ativo"):
        raise HTTPException(status_code=403, detail="Usuário desativado")
    
    # Verificar senha
    if not bcrypt.checkpw(input.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    
    # Remover senha do retorno
    user_data = deserialize_doc(user)
    user_data.pop("password_hash", None)
    
    return {
        "message": "Login realizado com sucesso",
        "user": user_data
    }


@api_router.get("/users", response_model=List[dict])
async def listar_usuarios(user_role: str = Query(...)):
    """Lista todos os usuários (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem listar usuários")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [deserialize_doc(u) for u in users]


@api_router.get("/users/pending", response_model=List[dict])
async def listar_usuarios_pendentes(user_role: str = Query(...)):
    """Lista usuários pendentes de aprovação (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    users = await db.users.find({"aprovado": False}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [deserialize_doc(u) for u in users]


@api_router.post("/users/{user_id}/approve", response_model=dict)
async def aprovar_usuario(user_id: str, input: UserApprove, admin_role: str = Query(...)):
    """Aprova ou rejeita usuário (apenas admin)"""
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem aprovar usuários")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = {
        "aprovado": input.aprovado,
        "ativo": input.aprovado,  # Se aprovado, ativa automaticamente
        "aprovado_por": input.aprovado_por,
        "aprovado_em": datetime.now(timezone.utc).isoformat(),
        "atualizado_em": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    status = "aprovado" if input.aprovado else "rejeitado"
    logger.info(f"Usuário {user['username']} {status} por {input.aprovado_por}")
    
    return {
        "message": f"Usuário {status} com sucesso",
        "user": deserialize_doc(updated)
    }


@api_router.post("/users", response_model=dict)
async def criar_usuario(input: UserCreate, admin_role: str = Query(...)):
    """Cria usuário diretamente (apenas admin) - já aprovado"""
    import bcrypt
    
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar usuários")
    
    # Verificar se username já existe
    existing = await db.users.find_one({"username": input.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username já existe")
    
    # Validar setor para operadores
    if input.role == "operador" and not input.setor:
        raise HTTPException(status_code=400, detail="Operadores devem ter um setor definido")
    
    # Hash da senha
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Criar usuário (já aprovado quando criado por admin)
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
    
    user_doc = serialize_doc(user_obj.model_dump())
    await db.users.insert_one(user_doc)
    
    user_data = deserialize_doc(user_doc)
    user_data.pop("password_hash", None)
    
    return {
        "message": "Usuário criado com sucesso",
        "user": user_data
    }


@api_router.put("/users/{user_id}", response_model=dict)
async def atualizar_usuario(user_id: str, input: UserUpdate, admin_role: str = Query(...)):
    """Atualiza usuário (apenas admin)"""
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        update_data["atualizado_em"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return deserialize_doc(updated)


@api_router.delete("/users/{user_id}")
async def deletar_usuario(user_id: str, admin_role: str = Query(...)):
    """Deleta usuário (apenas admin)"""
    if admin_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
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
    atrasada: Optional[bool] = None
):
    """Lista tarefas com filtros opcionais"""
    query = {}
    
    if projeto_id:
        query["projeto_id"] = projeto_id
    if contrato_id:
        query["contrato_id"] = contrato_id
    if setor:
        query["setor"] = setor
    if status_id:
        query["status_id"] = status_id
    if responsavel_id:
        query["responsavel_id"] = responsavel_id
    if finalizada is not None:
        query["finalizada"] = finalizada
    if atrasada is not None:
        query["atrasada"] = atrasada
    
    tarefas = await db.tarefas.find(query, {"_id": 0}).sort("criado_em", -1).to_list(1000)
    
    # Update delay status for each task
    result = []
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        if not tarefa.get("finalizada"):
            dias_atraso, atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
            tarefa["dias_atraso"] = dias_atraso
            tarefa["atrasada"] = atrasada
        result.append(tarefa)
    
    return result


@api_router.get("/tarefas/{tarefa_id}", response_model=dict)
async def obter_tarefa(tarefa_id: str):
    """Obtém uma tarefa específica"""
    tarefa = await db.tarefas.find_one({"id": tarefa_id}, {"_id": 0})
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    tarefa = deserialize_doc(tarefa)
    if not tarefa.get("finalizada"):
        dias_atraso, atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
        tarefa["dias_atraso"] = dias_atraso
        tarefa["atrasada"] = atrasada
    
    return tarefa


@api_router.post("/tarefas", response_model=dict)
async def criar_tarefa(input: TarefaCreate):
    """Cria uma nova tarefa"""
    # Get default status if not provided
    status_list = await get_status_padrao()
    
    if input.status_id:
        status = await db.status_tarefas.find_one({"id": input.status_id})
        if not status:
            raise HTTPException(status_code=400, detail="Status não encontrado")
        status_nome = status["nome"]
    else:
        # Use first status (Pendente)
        input.status_id = status_list[0]["id"]
        status_nome = status_list[0]["nome"]
    
    # Calculate initial delay
    dias_atraso, atrasada = await calcular_dias_atraso(input.prazo)
    
    tarefa_obj = Tarefa(
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
        historico=[
            HistoricoAcao(
                acao="criada",
                usuario_id=input.criado_por_id,
                usuario_nome=input.criado_por_nome,
                setor=input.criado_por_setor,
                detalhes=f"Tarefa criada: {input.titulo}"
            )
        ]
    )
    
    doc = serialize_doc(tarefa_obj.model_dump())
    await db.tarefas.insert_one(doc)
    
    logger.info(f"Tarefa criada: {tarefa_obj.id} por {input.criado_por_nome} ({input.criado_por_setor})")
    
    return deserialize_doc(doc)


@api_router.put("/tarefas/{tarefa_id}", response_model=dict)
async def atualizar_tarefa(tarefa_id: str, input: TarefaUpdate):
    """Atualiza uma tarefa (apenas admin ou gerente podem editar)"""
    # Verificar permissão - apenas admin e gerente podem editar
    if input.usuario_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem editar tarefas")
    
    tarefa = await db.tarefas.find_one({"id": tarefa_id})
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.get("finalizada"):
        raise HTTPException(status_code=400, detail="Não é possível editar uma tarefa finalizada")
    
    update_data = {}
    detalhes = []
    
    if input.titulo and input.titulo != tarefa.get("titulo"):
        update_data["titulo"] = input.titulo
        detalhes.append(f"Título alterado para: {input.titulo}")
    
    if input.descricao is not None:
        update_data["descricao"] = input.descricao
    
    if input.setor and input.setor != tarefa.get("setor"):
        update_data["setor"] = input.setor
        detalhes.append(f"Setor alterado para: {input.setor}")
    
    if input.responsavel_id is not None:
        update_data["responsavel_id"] = input.responsavel_id
        update_data["responsavel_nome"] = input.responsavel_nome
        if input.responsavel_nome:
            detalhes.append(f"Responsável alterado para: {input.responsavel_nome}")
    
    if input.prazo and input.prazo != tarefa.get("prazo"):
        prazo_anterior = tarefa.get("prazo")
        update_data["prazo"] = input.prazo
        dias_atraso, atrasada = await calcular_dias_atraso(input.prazo)
        update_data["dias_atraso"] = dias_atraso
        update_data["atrasada"] = atrasada
        detalhes.append(f"Prazo alterado de {prazo_anterior} para: {input.prazo}")
    
    if input.prioridade and input.prioridade != tarefa.get("prioridade"):
        update_data["prioridade"] = input.prioridade
        detalhes.append(f"Prioridade alterada para: {input.prioridade}")
    
    if update_data:
        update_data["atualizado_em"] = datetime.now(timezone.utc).isoformat()
        
        # Add to history
        historico_entry = {
            "id": str(uuid.uuid4()),
            "acao": "atualizada",
            "usuario_id": input.usuario_id,
            "usuario_nome": input.usuario_nome,
            "setor": input.usuario_setor,
            "data": datetime.now(timezone.utc).isoformat(),
            "detalhes": "; ".join(detalhes) if detalhes else "Tarefa atualizada"
        }
        
        await db.tarefas.update_one(
            {"id": tarefa_id},
            {
                "$set": update_data,
                "$push": {"historico": historico_entry}
            }
        )
    
    updated = await db.tarefas.find_one({"id": tarefa_id}, {"_id": 0})
    return deserialize_doc(updated)


@api_router.post("/tarefas/{tarefa_id}/finalizar", response_model=dict)
async def finalizar_tarefa(tarefa_id: str, input: TarefaFinalizar):
    """Finaliza uma tarefa com observação obrigatória"""
    tarefa = await db.tarefas.find_one({"id": tarefa_id})
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.get("finalizada"):
        raise HTTPException(status_code=400, detail="Tarefa já está finalizada")
    
    # Get "Concluído" status
    status_concluido = await db.status_tarefas.find_one({"nome": "Concluído"})
    if not status_concluido:
        raise HTTPException(status_code=500, detail="Status 'Concluído' não encontrado")
    
    now = datetime.now(timezone.utc)
    
    historico_entry = {
        "id": str(uuid.uuid4()),
        "acao": "finalizada",
        "usuario_id": input.usuario_id,
        "usuario_nome": input.usuario_nome,
        "setor": input.usuario_setor,
        "data": now.isoformat(),
        "observacao": input.observacao,
        "detalhes": f"Tarefa finalizada por {input.usuario_nome} ({input.usuario_setor})"
    }
    
    await db.tarefas.update_one(
        {"id": tarefa_id},
        {
            "$set": {
                "finalizada": True,
                "data_finalizacao": now.isoformat(),
                "observacao_finalizacao": input.observacao,
                "status_id": status_concluido["id"],
                "status_nome": "Concluído",
                "atualizado_em": now.isoformat()
            },
            "$push": {"historico": historico_entry}
        }
    )
    
    logger.info(f"Tarefa finalizada: {tarefa_id} por {input.usuario_nome} ({input.usuario_setor})")
    
    updated = await db.tarefas.find_one({"id": tarefa_id}, {"_id": 0})
    return deserialize_doc(updated)


@api_router.post("/tarefas/{tarefa_id}/alterar-status", response_model=dict)
async def alterar_status_tarefa(tarefa_id: str, input: TarefaAlterarStatus):
    """Altera o status de uma tarefa"""
    tarefa = await db.tarefas.find_one({"id": tarefa_id})
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if tarefa.get("finalizada"):
        raise HTTPException(status_code=400, detail="Não é possível alterar status de tarefa finalizada")
    
    status = await db.status_tarefas.find_one({"id": input.status_id})
    if not status:
        raise HTTPException(status_code=400, detail="Status não encontrado")
    
    now = datetime.now(timezone.utc)
    
    historico_entry = {
        "id": str(uuid.uuid4()),
        "acao": "status_alterado",
        "usuario_id": input.usuario_id,
        "usuario_nome": input.usuario_nome,
        "setor": input.usuario_setor,
        "data": now.isoformat(),
        "observacao": input.observacao,
        "detalhes": f"Status alterado de '{tarefa.get('status_nome')}' para '{status['nome']}'"
    }
    
    await db.tarefas.update_one(
        {"id": tarefa_id},
        {
            "$set": {
                "status_id": input.status_id,
                "status_nome": status["nome"],
                "atualizado_em": now.isoformat()
            },
            "$push": {"historico": historico_entry}
        }
    )
    
    updated = await db.tarefas.find_one({"id": tarefa_id}, {"_id": 0})
    return deserialize_doc(updated)


@api_router.delete("/tarefas/{tarefa_id}")
async def deletar_tarefa(tarefa_id: str, user_role: str = Query(...), user_id: str = Query(...)):
    """Deleta uma tarefa (apenas admin pode deletar qualquer tarefa)"""
    tarefa = await db.tarefas.find_one({"id": tarefa_id})
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    # Only admin can delete any task
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar tarefas")
    
    await db.tarefas.delete_one({"id": tarefa_id})
    logger.info(f"Tarefa deletada: {tarefa_id} por user {user_id}")
    
    return {"message": "Tarefa deletada com sucesso"}


@api_router.delete("/tarefas")
async def deletar_todas_tarefas(user_role: str = Query(...), user_id: str = Query(...)):
    """Deleta todas as tarefas (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar todas as tarefas")
    
    result = await db.tarefas.delete_many({})
    logger.info(f"Todas as tarefas deletadas ({result.deleted_count}) por user {user_id}")
    
    return {"message": f"{result.deleted_count} tarefas deletadas com sucesso"}


# ==========================================
# ROUTES - Atrasos e Relatórios
# ==========================================

@api_router.get("/tarefas-atrasadas", response_model=List[dict])
async def listar_tarefas_atrasadas(
    projeto_id: Optional[str] = None,
    setor: Optional[str] = None
):
    """Lista todas as tarefas atrasadas"""
    query = {"finalizada": False}
    
    if projeto_id:
        query["projeto_id"] = projeto_id
    if setor:
        query["setor"] = setor
    
    tarefas = await db.tarefas.find(query, {"_id": 0}).to_list(1000)
    
    atrasadas = []
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
        if is_atrasada:
            tarefa["dias_atraso"] = dias_atraso
            tarefa["atrasada"] = True
            atrasadas.append(tarefa)
    
    # Sort by days of delay (descending)
    atrasadas.sort(key=lambda x: x.get("dias_atraso", 0), reverse=True)
    
    return atrasadas


@api_router.get("/atrasos-por-setor", response_model=List[dict])
async def atrasos_por_setor():
    """Retorna resumo de atrasos agrupados por setor"""
    tarefas = await db.tarefas.find({"finalizada": False}, {"_id": 0}).to_list(1000)
    
    setores = {}
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
        
        setor = tarefa.get("setor", "Sem setor")
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
                "id": tarefa["id"],
                "titulo": tarefa["titulo"],
                "dias_atraso": dias_atraso,
                "responsavel": tarefa.get("responsavel_nome"),
                "criado_por": tarefa.get("criado_por_nome")
            })
    
    result = list(setores.values())
    result.sort(key=lambda x: x["tarefas_atrasadas"], reverse=True)
    
    return result


@api_router.get("/atrasos-por-projeto/{projeto_id}", response_model=dict)
async def atrasos_por_projeto(projeto_id: str):
    """Retorna detalhes de atrasos de um projeto específico"""
    tarefas = await db.tarefas.find({"projeto_id": projeto_id, "finalizada": False}, {"_id": 0}).to_list(1000)
    
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
        tarefa = deserialize_doc(tarefa)
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
        
        if is_atrasada:
            resultado["tarefas_atrasadas"] += 1
            resultado["total_dias_atraso"] += dias_atraso
            
            setor = tarefa.get("setor", "Sem setor")
            if setor not in resultado["atrasos_por_setor"]:
                resultado["atrasos_por_setor"][setor] = 0
            resultado["atrasos_por_setor"][setor] += 1
            
            resultado["detalhes_atrasos"].append({
                "tarefa_id": tarefa["id"],
                "titulo": tarefa["titulo"],
                "setor": setor,
                "dias_atraso": dias_atraso,
                "responsavel": tarefa.get("responsavel_nome"),
                "criado_por": tarefa.get("criado_por_nome"),
                "criado_por_setor": tarefa.get("criado_por_setor")
            })
        else:
            resultado["tarefas_em_dia"] += 1
    
    resultado["detalhes_atrasos"].sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    return resultado


# ==========================================
# ROUTES - Dashboard Stats
# ==========================================

@api_router.get("/dashboard-stats", response_model=dict)
async def dashboard_stats():
    """Retorna estatísticas gerais para o dashboard"""
    tarefas = await db.tarefas.find({}, {"_id": 0}).to_list(1000)
    
    total = len(tarefas)
    finalizadas = sum(1 for t in tarefas if t.get("finalizada"))
    em_andamento = total - finalizadas
    
    atrasadas = 0
    for tarefa in tarefas:
        if not tarefa.get("finalizada"):
            _, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
            if is_atrasada:
                atrasadas += 1
    
    # Group by sector
    por_setor = {}
    for tarefa in tarefas:
        setor = tarefa.get("setor", "Sem setor")
        if setor not in por_setor:
            por_setor[setor] = {"total": 0, "finalizadas": 0, "em_andamento": 0}
        por_setor[setor]["total"] += 1
        if tarefa.get("finalizada"):
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
# MODELS - Template de Prazos
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


class TemplatePrazosUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    etapas: Optional[List[dict]] = None
    ativo: Optional[bool] = None


# ==========================================
# ROUTES - Template de Prazos
# ==========================================

@api_router.get("/templates-prazos", response_model=List[dict])
async def listar_templates_prazos():
    """Lista todos os templates de prazos"""
    templates = await db.templates_prazos.find({"ativo": True}, {"_id": 0}).to_list(100)
    return [deserialize_doc(t) for t in templates]


@api_router.get("/templates-prazos/{template_id}", response_model=dict)
async def obter_template_prazo(template_id: str):
    """Obtém um template específico"""
    template = await db.templates_prazos.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return deserialize_doc(template)


@api_router.post("/templates-prazos", response_model=dict)
async def criar_template_prazo(input: TemplatePrazosCreate, user_id: str = Query(...), user_role: str = Query(...)):
    """Cria um novo template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar templates")
    
    # Calculate total days
    prazo_total = sum(etapa.get("prazo_dias", 0) for etapa in input.etapas)
    
    template_obj = TemplatePrazos(
        nome=input.nome,
        descricao=input.descricao,
        etapas=input.etapas,
        prazo_total_dias=prazo_total,
        criado_por=user_id
    )
    
    doc = serialize_doc(template_obj.model_dump())
    await db.templates_prazos.insert_one(doc)
    
    return deserialize_doc(doc)


@api_router.put("/templates-prazos/{template_id}", response_model=dict)
async def atualizar_template_prazo(template_id: str, input: TemplatePrazosUpdate, user_role: str = Query(...)):
    """Atualiza um template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar templates")
    
    existing = await db.templates_prazos.find_one({"id": template_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if "etapas" in update_data:
        update_data["prazo_total_dias"] = sum(etapa.get("prazo_dias", 0) for etapa in update_data["etapas"])
    
    update_data["atualizado_em"] = datetime.now(timezone.utc).isoformat()
    
    await db.templates_prazos.update_one({"id": template_id}, {"$set": update_data})
    
    updated = await db.templates_prazos.find_one({"id": template_id}, {"_id": 0})
    return deserialize_doc(updated)


@api_router.delete("/templates-prazos/{template_id}")
async def deletar_template_prazo(template_id: str, user_role: str = Query(...)):
    """Deleta um template de prazos (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar templates")
    
    existing = await db.templates_prazos.find_one({"id": template_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    await db.templates_prazos.delete_one({"id": template_id})
    return {"message": "Template deletado com sucesso"}


@api_router.post("/contratos/{contrato_id}/aplicar-template/{template_id}", response_model=dict)
async def aplicar_template_contrato(contrato_id: str, template_id: str, data_inicio: str = Query(...)):
    """Aplica um template de prazos a um contrato, gerando as datas de cada etapa"""
    template = await db.templates_prazos.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    from datetime import timedelta
    
    try:
        inicio = datetime.fromisoformat(data_inicio).date()
    except:
        raise HTTPException(status_code=400, detail="Data de início inválida")
    
    prazos_gerados = []
    data_atual = inicio
    
    for etapa in template.get("etapas", []):
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
    
    # Save to contract prazos collection
    prazo_contrato = {
        "id": str(uuid.uuid4()),
        "contrato_id": contrato_id,
        "template_id": template_id,
        "template_nome": template.get("nome"),
        "data_inicio": data_inicio,
        "data_fim_prevista": data_atual.isoformat(),
        "prazo_total_dias": template.get("prazo_total_dias", 0),
        "etapas": prazos_gerados,
        "criado_em": datetime.now(timezone.utc).isoformat()
    }
    
    await db.prazos_contratos.insert_one(prazo_contrato)
    
    return prazo_contrato


@api_router.get("/contratos/{contrato_id}/prazos", response_model=dict)
async def obter_prazos_contrato(contrato_id: str):
    """Obtém os prazos aplicados a um contrato"""
    prazos = await db.prazos_contratos.find_one({"contrato_id": contrato_id}, {"_id": 0})
    if not prazos:
        return {"contrato_id": contrato_id, "prazos": None, "message": "Nenhum template aplicado"}
    return deserialize_doc(prazos)


# ==========================================
# ROUTES - Relatórios de Gargalos e Cobrança
# ==========================================

@api_router.get("/relatorio-gargalos", response_model=dict)
async def relatorio_gargalos():
    """Relatório de gargalos - O que está travando os processos"""
    tarefas = await db.tarefas.find({"finalizada": False}, {"_id": 0}).to_list(1000)
    
    # Análise de gargalos
    gargalos_por_setor = {}
    gargalos_por_responsavel = {}
    gargalos_por_projeto = {}
    tarefas_criticas = []
    
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
        
        if not is_atrasada:
            continue
            
        setor = tarefa.get("setor", "Sem setor")
        responsavel = tarefa.get("responsavel_nome", "Não atribuído")
        projeto = tarefa.get("projeto_id", "Sem projeto")
        
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
            "id": tarefa["id"],
            "titulo": tarefa["titulo"],
            "dias_atraso": dias_atraso,
            "responsavel": responsavel,
            "prioridade": tarefa.get("prioridade", "media")
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
        
        # Tarefas críticas (atraso > 7 dias ou prioridade crítica)
        if dias_atraso > 7 or tarefa.get("prioridade") == "critica":
            tarefas_criticas.append({
                "id": tarefa["id"],
                "titulo": tarefa["titulo"],
                "setor": setor,
                "responsavel": responsavel,
                "dias_atraso": dias_atraso,
                "prioridade": tarefa.get("prioridade", "media"),
                "projeto_id": projeto,
                "criado_por": tarefa.get("criado_por_nome"),
                "criado_em": tarefa.get("criado_em")
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
        "gargalos_por_responsavel": responsaveis_ordenados[:10],  # Top 10
        "tarefas_criticas": tarefas_criticas[:20],  # Top 20
        "indicadores_cobranca": {
            "setor_mais_critico": setores_ordenados[0] if setores_ordenados else None,
            "responsavel_mais_atrasado": responsaveis_ordenados[0] if responsaveis_ordenados else None
        }
    }


@api_router.get("/relatorio-semanal", response_model=dict)
async def relatorio_semanal():
    """Relatório semanal de produtividade"""
    from datetime import timedelta
    
    hoje = datetime.now(timezone.utc)
    inicio_semana = hoje - timedelta(days=7)
    
    # Tarefas criadas na semana
    tarefas = await db.tarefas.find({}, {"_id": 0}).to_list(1000)
    
    criadas_semana = []
    finalizadas_semana = []
    atrasadas_atuais = []
    
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        
        criado_em = tarefa.get("criado_em")
        if isinstance(criado_em, str):
            criado_em = datetime.fromisoformat(criado_em.replace('Z', '+00:00'))
        
        if criado_em and criado_em >= inicio_semana:
            criadas_semana.append(tarefa)
        
        if tarefa.get("finalizada"):
            data_finalizacao = tarefa.get("data_finalizacao")
            if isinstance(data_finalizacao, str):
                data_finalizacao = datetime.fromisoformat(data_finalizacao.replace('Z', '+00:00'))
            if data_finalizacao and data_finalizacao >= inicio_semana:
                finalizadas_semana.append(tarefa)
        else:
            dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
            if is_atrasada:
                tarefa["dias_atraso"] = dias_atraso
                atrasadas_atuais.append(tarefa)
    
    # Agrupar por setor
    por_setor = {}
    for tarefa in tarefas:
        setor = tarefa.get("setor", "Sem setor")
        if setor not in por_setor:
            por_setor[setor] = {"criadas": 0, "finalizadas": 0, "atrasadas": 0}
    
    for t in criadas_semana:
        setor = t.get("setor", "Sem setor")
        if setor in por_setor:
            por_setor[setor]["criadas"] += 1
    
    for t in finalizadas_semana:
        setor = t.get("setor", "Sem setor")
        if setor in por_setor:
            por_setor[setor]["finalizadas"] += 1
    
    for t in atrasadas_atuais:
        setor = t.get("setor", "Sem setor")
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
async def relatorio_mensal():
    """Relatório mensal de produtividade"""
    from datetime import timedelta
    
    hoje = datetime.now(timezone.utc)
    inicio_mes = hoje - timedelta(days=30)
    
    tarefas = await db.tarefas.find({}, {"_id": 0}).to_list(1000)
    
    criadas_mes = []
    finalizadas_mes = []
    atrasadas_atuais = []
    
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        
        criado_em = tarefa.get("criado_em")
        if isinstance(criado_em, str):
            criado_em = datetime.fromisoformat(criado_em.replace('Z', '+00:00'))
        
        if criado_em and criado_em >= inicio_mes:
            criadas_mes.append(tarefa)
        
        if tarefa.get("finalizada"):
            data_finalizacao = tarefa.get("data_finalizacao")
            if isinstance(data_finalizacao, str):
                data_finalizacao = datetime.fromisoformat(data_finalizacao.replace('Z', '+00:00'))
            if data_finalizacao and data_finalizacao >= inicio_mes:
                finalizadas_mes.append(tarefa)
        else:
            dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
            if is_atrasada:
                tarefa["dias_atraso"] = dias_atraso
                atrasadas_atuais.append(tarefa)
    
    # Evolução por semana
    semanas = []
    for i in range(4):
        inicio_semana = hoje - timedelta(days=30 - (i * 7))
        fim_semana = inicio_semana + timedelta(days=7)
        
        criadas = sum(1 for t in criadas_mes 
                     if isinstance(t.get("criado_em"), datetime) 
                     and inicio_semana <= t.get("criado_em") < fim_semana)
        
        finalizadas = sum(1 for t in finalizadas_mes 
                        if isinstance(t.get("data_finalizacao"), datetime)
                        and inicio_semana <= t.get("data_finalizacao") < fim_semana)
        
        semanas.append({
            "semana": i + 1,
            "inicio": inicio_semana.isoformat(),
            "fim": fim_semana.isoformat(),
            "criadas": criadas,
            "finalizadas": finalizadas
        })
    
    # Análise por setor
    analise_setor = {}
    for tarefa in tarefas:
        setor = tarefa.get("setor", "Sem setor")
        if setor not in analise_setor:
            analise_setor[setor] = {
                "total": 0,
                "finalizadas": 0,
                "em_andamento": 0,
                "atrasadas": 0,
                "taxa_conclusao": 0
            }
        analise_setor[setor]["total"] += 1
        if tarefa.get("finalizada"):
            analise_setor[setor]["finalizadas"] += 1
        else:
            analise_setor[setor]["em_andamento"] += 1
    
    for t in atrasadas_atuais:
        setor = t.get("setor", "Sem setor")
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
        "evolucao_semanal": semanas,
        "analise_por_setor": analise_setor,
        "gargalos_para_cobranca": gargalos_cobranca[:15],
        "timestamp": hoje.isoformat()
    }


# ==========================================
# ROUTES - Contratos
# ==========================================

@api_router.get("/contratos", response_model=List[dict])
async def listar_contratos():
    """Lista todos os contratos"""
    contratos = await db.contratos.find({}, {"_id": 0}).sort("criado_em", -1).to_list(1000)
    return [deserialize_doc(c) for c in contratos]


@api_router.get("/contratos/{contrato_id}", response_model=dict)
async def obter_contrato(contrato_id: str):
    """Obtém um contrato específico"""
    contrato = await db.contratos.find_one({"id": contrato_id}, {"_id": 0})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return deserialize_doc(contrato)


@api_router.post("/contratos", response_model=dict)
async def criar_contrato(input: ContratoCreate):
    """Cria um novo contrato e automaticamente cria o projeto com todas as etapas"""
    from datetime import timedelta
    
    # Verificar se template existe
    template = await db.templates_prazos.find_one({"id": input.template_id}, {"_id": 0})
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
        template_nome=template.get("nome"),
        criado_por=input.criado_por
    )
    
    contrato_doc = serialize_doc(contrato_obj.model_dump())
    await db.contratos.insert_one(contrato_doc)
    
    # Calcular data fim prevista
    try:
        data_inicio_dt = datetime.fromisoformat(input.data_inicio).date()
    except:
        data_inicio_dt = datetime.now(timezone.utc).date()
    
    prazo_total = template.get("prazo_total_dias", 134)
    data_fim_prevista = (data_inicio_dt + timedelta(days=prazo_total)).isoformat()
    
    # Criar projeto automaticamente
    projeto_obj = Projeto(
        contrato_id=contrato_obj.id,
        cliente=input.cliente,
        etapa_atual=template.get("etapas", [])[0].get("etapa_nome", "Início") if template.get("etapas") else "Início",
        etapa_atual_ordem=1,
        progresso=0.0,
        risco="baixo",
        dias_restantes=prazo_total,
        data_inicio=input.data_inicio,
        data_fim_prevista=data_fim_prevista,
        template_id=input.template_id,
        template_nome=template.get("nome"),
        criado_por=input.criado_por
    )
    
    projeto_doc = serialize_doc(projeto_obj.model_dump())
    await db.projetos.insert_one(projeto_doc)
    
    # Atualizar contrato com projeto_id
    await db.contratos.update_one(
        {"id": contrato_obj.id},
        {"$set": {"projeto_id": projeto_obj.id}}
    )
    
    # Criar todas as tarefas (etapas) do template
    # Obter status "Pendente"
    status_pendente = await db.status_tarefas.find_one({"nome": "Pendente"})
    if not status_pendente:
        status_pendente = {"id": str(uuid.uuid4()), "nome": "Pendente"}
    
    data_atual = data_inicio_dt
    tarefas_criadas = []
    
    for etapa in template.get("etapas", []):
        prazo_dias = etapa.get("prazo_dias", 1)
        data_fim_etapa = data_atual + timedelta(days=prazo_dias)
        
        tarefa_obj = Tarefa(
            titulo=etapa.get("etapa_nome"),
            descricao=etapa.get("descricao", ""),
            projeto_id=projeto_obj.id,
            contrato_id=contrato_obj.id,
            setor=etapa.get("departamento", "atendimento"),
            responsavel_id=None,
            responsavel_nome=None,
            status_id=status_pendente["id"],
            status_nome="Pendente",
            prazo=data_fim_etapa.isoformat(),
            prazo_original=data_fim_etapa.isoformat(),
            prioridade="media",
            criado_por_id=input.criado_por,
            criado_por_nome=input.criado_por,
            criado_por_setor="sistema",
            historico=[
                HistoricoAcao(
                    acao="criada",
                    usuario_id=input.criado_por,
                    usuario_nome=input.criado_por,
                    setor="sistema",
                    detalhes=f"Etapa criada automaticamente do template {template.get('nome')}"
                )
            ]
        )
        
        tarefa_doc = serialize_doc(tarefa_obj.model_dump())
        await db.tarefas.insert_one(tarefa_doc)
        tarefas_criadas.append(tarefa_obj.id)
        
        data_atual = data_fim_etapa
    
    logger.info(f"Contrato criado: {contrato_obj.id}, Projeto criado: {projeto_obj.id}, {len(tarefas_criadas)} tarefas criadas")
    
    # Buscar contrato atualizado com projeto_id
    contrato_atualizado = await db.contratos.find_one({"id": contrato_obj.id}, {"_id": 0})
    
    return {
        "contrato": deserialize_doc(contrato_atualizado),
        "projeto": deserialize_doc(projeto_doc),
        "tarefas_criadas": len(tarefas_criadas),
        "message": f"Contrato, projeto e {len(tarefas_criadas)} etapas criados com sucesso!"
    }


@api_router.put("/contratos/{contrato_id}", response_model=dict)
async def atualizar_contrato(contrato_id: str, input: ContratoUpdate):
    """Atualiza um contrato"""
    existing = await db.contratos.find_one({"id": contrato_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        update_data["atualizado_em"] = datetime.now(timezone.utc).isoformat()
        await db.contratos.update_one({"id": contrato_id}, {"$set": update_data})
    
    updated = await db.contratos.find_one({"id": contrato_id}, {"_id": 0})
    return deserialize_doc(updated)


@api_router.delete("/contratos/{contrato_id}")
async def deletar_contrato(contrato_id: str, user_role: str = Query(...)):
    """Deleta um contrato (apenas admin)"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar contratos")
    
    contrato = await db.contratos.find_one({"id": contrato_id})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    await db.contratos.delete_one({"id": contrato_id})
    
    # Deletar projeto relacionado se existir
    if contrato.get("projeto_id"):
        await db.projetos.delete_one({"id": contrato["projeto_id"]})
        # Deletar tarefas do projeto
        await db.tarefas.delete_many({"projeto_id": contrato["projeto_id"]})
    
    return {"message": "Contrato deletado com sucesso"}


# ==========================================
# ROUTES - Projetos
# ==========================================

@api_router.get("/projetos", response_model=List[dict])
async def listar_projetos():
    """Lista todos os projetos"""
    projetos = await db.projetos.find({}, {"_id": 0}).sort("criado_em", -1).to_list(1000)
    
    # Atualizar progresso e risco de cada projeto
    result = []
    for projeto in projetos:
        projeto = deserialize_doc(projeto)
        
        # Calcular progresso baseado nas tarefas
        tarefas = await db.tarefas.find({"projeto_id": projeto["id"]}, {"_id": 0}).to_list(1000)
        if tarefas:
            total_tarefas = len(tarefas)
            tarefas_concluidas = sum(1 for t in tarefas if t.get("finalizada"))
            projeto["progresso"] = round((tarefas_concluidas / total_tarefas) * 100, 1)
            
            # Calcular risco baseado em atrasos
            tarefas_atrasadas = 0
            total_dias_atraso = 0
            for tarefa in tarefas:
                if not tarefa.get("finalizada"):
                    dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
                    if is_atrasada:
                        tarefas_atrasadas += 1
                        total_dias_atraso += dias_atraso
            
            # Definir nível de risco
            if tarefas_atrasadas == 0:
                projeto["risco"] = "baixo"
            elif tarefas_atrasadas <= 2 and total_dias_atraso < 7:
                projeto["risco"] = "medio"
            elif tarefas_atrasadas <= 5 or total_dias_atraso < 15:
                projeto["risco"] = "alto"
            else:
                projeto["risco"] = "critico"
            
            # Atualizar etapa atual (primeira não concluída)
            for tarefa in tarefas:
                if not tarefa.get("finalizada"):
                    projeto["etapa_atual"] = tarefa.get("titulo")
                    break
        
        result.append(projeto)
    
    return result


@api_router.get("/projetos/{projeto_id}", response_model=dict)
async def obter_projeto(projeto_id: str):
    """Obtém um projeto específico com detalhes"""
    projeto = await db.projetos.find_one({"id": projeto_id}, {"_id": 0})
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    projeto = deserialize_doc(projeto)
    
    # Buscar tarefas do projeto
    tarefas = await db.tarefas.find({"projeto_id": projeto_id}, {"_id": 0}).to_list(1000)
    tarefas_deserializadas = []
    
    for tarefa in tarefas:
        tarefa = deserialize_doc(tarefa)
        if not tarefa.get("finalizada"):
            dias_atraso, atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
            tarefa["dias_atraso"] = dias_atraso
            tarefa["atrasada"] = atrasada
        tarefas_deserializadas.append(tarefa)
    
    projeto["tarefas"] = tarefas_deserializadas
    projeto["total_tarefas"] = len(tarefas)
    projeto["tarefas_concluidas"] = sum(1 for t in tarefas if t.get("finalizada"))
    
    return projeto


# ==========================================
# ROUTES - Notificações
# ==========================================

@api_router.get("/notificacoes/{usuario_id}", response_model=List[dict])
async def listar_notificacoes(usuario_id: str, apenas_nao_lidas: bool = False):
    """Lista notificações de um usuário"""
    query = {"para_usuario_id": usuario_id}
    if apenas_nao_lidas:
        query["lida"] = False
    
    notificacoes = await db.notificacoes.find(query, {"_id": 0}).sort("criado_em", -1).to_list(100)
    return [deserialize_doc(n) for n in notificacoes]


@api_router.post("/notificacoes", response_model=dict)
async def criar_notificacao(input: NotificacaoCreate):
    """Cria uma nova notificação"""
    notif_obj = Notificacao(**input.model_dump())
    doc = serialize_doc(notif_obj.model_dump())
    await db.notificacoes.insert_one(doc)
    return deserialize_doc(doc)


@api_router.put("/notificacoes/{notificacao_id}/marcar-lida")
async def marcar_notificacao_lida(notificacao_id: str):
    """Marca uma notificação como lida"""
    result = await db.notificacoes.update_one(
        {"id": notificacao_id},
        {"$set": {"lida": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    return {"message": "Notificação marcada como lida"}


@api_router.post("/cobrar-operador")
async def cobrar_operador(input: CobrancaOperador, user_role: str = Query(...)):
    """Envia cobrança para operador atrasado (apenas gerente/admin)"""
    if user_role not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas gerentes e administradores podem cobrar operadores")
    
    # Buscar tarefa
    tarefa = await db.tarefas.find_one({"id": input.tarefa_id}, {"_id": 0})
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    # Criar notificação interna
    notif_obj = Notificacao(
        tipo="cobranca",
        titulo=f"Cobrança de {input.gerente_nome}",
        mensagem=input.mensagem,
        de_usuario_id=input.gerente_id,
        de_usuario_nome=input.gerente_nome,
        para_usuario_id=input.operador_id,
        para_usuario_nome=input.operador_nome,
        tarefa_id=input.tarefa_id,
        projeto_id=tarefa.get("projeto_id")
    )
    
    notif_doc = serialize_doc(notif_obj.model_dump())
    await db.notificacoes.insert_one(notif_doc)
    
    # Se solicitado, enviar email (implementação simplificada - em produção usar serviço de email)
    email_enviado = False
    if input.enviar_email:
        # TODO: Integrar com serviço de email (SendGrid, AWS SES, etc)
        # Por enquanto, apenas log
        logger.info(f"Email de cobrança enviado para {input.operador_email}")
        logger.info(f"De: {input.gerente_nome}")
        logger.info(f"Assunto: Cobrança - Tarefa Atrasada: {tarefa.get('titulo')}")
        logger.info(f"Mensagem: {input.mensagem}")
        email_enviado = True
    
    return {
        "message": "Cobrança enviada com sucesso",
        "notificacao_criada": True,
        "email_enviado": email_enviado
    }


# ==========================================
# ROUTES - Dashboard Avançado
# ==========================================

@api_router.get("/dashboard-avancado", response_model=dict)
async def dashboard_avancado():
    """Dashboard com informações detalhadas para gestores"""
    # Buscar todos os projetos
    projetos = await db.projetos.find({}, {"_id": 0}).to_list(1000)
    tarefas = await db.tarefas.find({}, {"_id": 0}).to_list(1000)
    
    # Estatísticas gerais
    total_projetos = len(projetos)
    projetos_em_andamento = sum(1 for p in projetos if p.get("status") == "Em Andamento")
    
    # Análise de atrasos por responsável
    carga_por_responsavel = {}
    alertas_atrasos = []
    
    for tarefa in tarefas:
        if tarefa.get("finalizada"):
            continue
            
        responsavel = tarefa.get("responsavel_nome", "Não atribuído")
        dias_atraso, is_atrasada = await calcular_dias_atraso(tarefa.get("prazo"))
        
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
                "id": tarefa["id"],
                "titulo": tarefa["titulo"],
                "dias_atraso": dias_atraso,
                "projeto_id": tarefa.get("projeto_id"),
                "setor": tarefa.get("setor")
            })
            
            alertas_atrasos.append({
                "tarefa_id": tarefa["id"],
                "titulo": tarefa["titulo"],
                "responsavel": responsavel,
                "responsavel_id": tarefa.get("responsavel_id"),
                "dias_atraso": dias_atraso,
                "setor": tarefa.get("setor"),
                "projeto_id": tarefa.get("projeto_id"),
                "prioridade": tarefa.get("prioridade")
            })
    
    # Ordenar alertas por dias de atraso
    alertas_atrasos.sort(key=lambda x: x["dias_atraso"], reverse=True)
    
    # Converter carga para lista e ordenar
    carga_lista = sorted(
        carga_por_responsavel.values(),
        key=lambda x: x["tarefas_atrasadas"],
        reverse=True
    )
    
    # Projetos em andamento com detalhes
    projetos_detalhados = []
    for projeto in projetos:
        if projeto.get("status") != "Em Andamento":
            continue
            
        tarefas_projeto = [t for t in tarefas if t.get("projeto_id") == projeto["id"]]
        total = len(tarefas_projeto)
        concluidas = sum(1 for t in tarefas_projeto if t.get("finalizada"))
        
        atrasadas = 0
        for t in tarefas_projeto:
            if not t.get("finalizada"):
                _, is_atrasada = await calcular_dias_atraso(t.get("prazo"))
                if is_atrasada:
                    atrasadas += 1
        
        projetos_detalhados.append({
            "id": projeto["id"],
            "cliente": projeto.get("cliente"),
            "etapa_atual": projeto.get("etapa_atual"),
            "progresso": round((concluidas / total * 100) if total > 0 else 0, 1),
            "total_tarefas": total,
            "tarefas_concluidas": concluidas,
            "tarefas_atrasadas": atrasadas,
            "risco": projeto.get("risco", "baixo"),
            "data_inicio": projeto.get("data_inicio"),
            "data_fim_prevista": projeto.get("data_fim_prevista")
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
        "alertas_atrasos": alertas_atrasos[:20],  # Top 20
        "carga_por_responsavel": carga_lista
    }


# ==========================================
# ROUTES - Template Padrão
# ==========================================

@api_router.post("/templates-prazos/criar-padrao")
async def criar_template_padrao(user_id: str = Query(...), user_role: str = Query(...)):
    """Cria o template padrão de prazos baseado nas etapas do sistema"""
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar templates")
    
    # Template baseado nas etapas do mockNovo.js
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
    
    template = {
        "id": str(uuid.uuid4()),
        "nome": "Template Padrão IDEIABH",
        "descricao": "Template completo com todas as etapas do processo de formaturas",
        "etapas": etapas_padrao,
        "prazo_total_dias": prazo_total,
        "ativo": True,
        "criado_por": user_id,
        "criado_em": datetime.now(timezone.utc).isoformat(),
        "atualizado_em": datetime.now(timezone.utc).isoformat()
    }
    
    await db.templates_prazos.insert_one(template)
    
    # Remove _id before returning
    template.pop("_id", None)
    
    return {"message": f"Template padrão criado com sucesso ({prazo_total} dias)", "template": template}

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


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
    """Initialize default data on startup"""
    logger.info("Starting IDEIABH API...")
    await get_status_padrao()
    logger.info("Default statuses initialized")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
