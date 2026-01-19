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
    """Atualiza uma tarefa (não permite reverter finalização)"""
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
        update_data["prazo"] = input.prazo
        dias_atraso, atrasada = await calcular_dias_atraso(input.prazo)
        update_data["dias_atraso"] = dias_atraso
        update_data["atrasada"] = atrasada
        detalhes.append(f"Prazo alterado para: {input.prazo}")
    
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
# ROUTES - Legacy (mantidos para compatibilidade)
# ==========================================

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
