from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nome = Column(String(255), nullable=False)
    role = Column(String(50), default="operador")
    setor = Column(String(100), nullable=True)
    ativo = Column(Boolean, default=False)
    aprovado = Column(Boolean, default=False)
    aprovado_por = Column(String, nullable=True)
    aprovado_em = Column(DateTime(timezone=True), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class StatusTarefa(Base):
    __tablename__ = "status_tarefas"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    nome = Column(String(100), unique=True, nullable=False)
    cor = Column(String(20), default="#64748b")
    ordem = Column(Integer, default=0)
    tipo = Column(String(50), default="custom")  # "sistema" ou "custom"
    ativo = Column(Boolean, default=True)
    criado_por = Column(String, nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Contrato(Base):
    __tablename__ = "contratos"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    cliente = Column(String(255), nullable=False)
    faculdade = Column(String(255), nullable=False)
    numero_contrato = Column(String(100), nullable=False, unique=True)
    valor = Column(Float, nullable=False)
    data_inicio = Column(String(20), nullable=False)  # ISO date string
    data_fim = Column(String(20), nullable=True)
    status = Column(String(50), default="Ativo")
    template_id = Column(String, nullable=True)
    template_nome = Column(String(255), nullable=True)
    projeto_id = Column(String, nullable=True)
    criado_por = Column(String, nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    projeto = relationship("Projeto", back_populates="contrato", uselist=False, foreign_keys="Projeto.contrato_id")


class Projeto(Base):
    __tablename__ = "projetos"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    contrato_id = Column(String, ForeignKey("contratos.id"), nullable=False)
    cliente = Column(String(255), nullable=False)
    etapa_atual = Column(String(255), default="Informar recebimento do contrato")
    etapa_atual_ordem = Column(Integer, default=1)
    progresso = Column(Float, default=0.0)
    risco = Column(String(50), default="baixo")
    dias_restantes = Column(Integer, default=134)
    data_inicio = Column(String(20), nullable=False)
    data_fim_prevista = Column(String(20), nullable=False)
    template_id = Column(String, nullable=False)
    template_nome = Column(String(255), nullable=False)
    status = Column(String(50), default="Em Andamento")
    criado_por = Column(String, nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    contrato = relationship("Contrato", back_populates="projeto", foreign_keys=[contrato_id])
    tarefas = relationship("Tarefa", back_populates="projeto")


class Tarefa(Base):
    __tablename__ = "tarefas"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    projeto_id = Column(String, ForeignKey("projetos.id"), nullable=False, index=True)
    contrato_id = Column(String, ForeignKey("contratos.id"), nullable=False, index=True)
    setor = Column(String(100), nullable=False, index=True)
    responsavel_id = Column(String, nullable=True)
    responsavel_nome = Column(String(255), nullable=True)
    status_id = Column(String, ForeignKey("status_tarefas.id"), nullable=False)
    status_nome = Column(String(100), nullable=False)
    prazo = Column(String(20), nullable=True)  # ISO date string
    prazo_original = Column(String(20), nullable=True)
    prioridade = Column(String(50), default="media")
    ordem = Column(Integer, default=0)  # Ordem da tarefa no projeto
    
    # Controle de atraso
    dias_atraso = Column(Integer, default=0)
    atrasada = Column(Boolean, default=False)
    
    # Controle de finalização
    finalizada = Column(Boolean, default=False, index=True)
    data_finalizacao = Column(DateTime(timezone=True), nullable=True)
    observacao_finalizacao = Column(Text, nullable=True)
    
    # Controle de criação
    criado_por_id = Column(String, nullable=False)
    criado_por_nome = Column(String(255), nullable=False)
    criado_por_setor = Column(String(100), nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    projeto = relationship("Projeto", back_populates="tarefas")
    historico = relationship("HistoricoAcao", back_populates="tarefa", cascade="all, delete-orphan")


class HistoricoAcao(Base):
    __tablename__ = "historico_acoes"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tarefa_id = Column(String, ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    acao = Column(String(50), nullable=False)  # "criada", "atualizada", "finalizada", "status_alterado", "prazo_recalculado"
    usuario_id = Column(String, nullable=False)
    usuario_nome = Column(String(255), nullable=False)
    setor = Column(String(100), nullable=False)
    data = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    detalhes = Column(Text, nullable=True)
    observacao = Column(Text, nullable=True)
    
    # Relationships
    tarefa = relationship("Tarefa", back_populates="historico")


class TemplatePrazos(Base):
    __tablename__ = "templates_prazos"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    etapas = Column(JSON, default=list)  # List of etapas
    prazo_total_dias = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    criado_por = Column(String, nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Notificacao(Base):
    __tablename__ = "notificacoes"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tipo = Column(String(50), nullable=False)  # "cobranca", "atraso", "finalizacao", "atribuicao"
    titulo = Column(String(255), nullable=False)
    mensagem = Column(Text, nullable=False)
    de_usuario_id = Column(String, nullable=False)
    de_usuario_nome = Column(String(255), nullable=False)
    para_usuario_id = Column(String, nullable=False, index=True)
    para_usuario_nome = Column(String(255), nullable=False)
    tarefa_id = Column(String, nullable=True)
    projeto_id = Column(String, nullable=True)
    lida = Column(Boolean, default=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PrazosContrato(Base):
    __tablename__ = "prazos_contratos"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    contrato_id = Column(String, ForeignKey("contratos.id"), nullable=False, index=True)
    template_id = Column(String, nullable=False)
    template_nome = Column(String(255), nullable=False)
    data_inicio = Column(String(20), nullable=False)
    data_fim_prevista = Column(String(20), nullable=False)
    prazo_total_dias = Column(Integer, default=0)
    etapas = Column(JSON, default=list)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
