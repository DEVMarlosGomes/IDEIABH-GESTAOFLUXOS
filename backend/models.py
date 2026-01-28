from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class StatusTarefa(Base):
    __tablename__ = "status_tarefas"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    nome = Column(String(100), nullable=False, unique=True)
    cor = Column(String(20), default="#64748b")
    ordem = Column(Integer, default=0)
    tipo = Column(String(20), default="custom")  # "sistema" ou "custom"
    ativo = Column(Boolean, default=True)
    criado_por = Column(String(100))
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    nome = Column(String(255), nullable=False)
    role = Column(String(50), default="operador")  # admin, gerente, operador
    setor = Column(String(100), nullable=True)  # atendimento, criacao, pre-producao, producao
    ativo = Column(Boolean, default=False)
    aprovado = Column(Boolean, default=False)
    aprovado_por = Column(String(100), nullable=True)
    aprovado_em = Column(DateTime(timezone=True), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Tarefa(Base):
    __tablename__ = "tarefas"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    titulo = Column(String(500), nullable=False)
    descricao = Column(Text, nullable=True)
    projeto_id = Column(String(36), ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False)
    contrato_id = Column(String(36), ForeignKey("contratos.id", ondelete="CASCADE"), nullable=False)
    setor = Column(String(100), nullable=False)
    responsavel_id = Column(String(36), nullable=True)
    responsavel_nome = Column(String(255), nullable=True)
    status_id = Column(String(36), ForeignKey("status_tarefas.id"), nullable=False)
    status_nome = Column(String(100))
    prazo = Column(String(50), nullable=True)  # ISO date string
    prazo_original = Column(String(50), nullable=True)
    prioridade = Column(String(20), default="media")  # baixa, media, alta, critica
    
    # Controle de atraso
    dias_atraso = Column(Integer, default=0)
    atrasada = Column(Boolean, default=False)
    
    # Controle de finalização
    finalizada = Column(Boolean, default=False)
    data_finalizacao = Column(DateTime(timezone=True), nullable=True)
    observacao_finalizacao = Column(Text, nullable=True)
    
    # Controle de criação
    criado_por_id = Column(String(36), nullable=False)
    criado_por_nome = Column(String(255), nullable=False)
    criado_por_setor = Column(String(100), nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Histórico de ações (JSON)
    historico = Column(JSON, default=list)
    
    # Metadados
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Contrato(Base):
    __tablename__ = "contratos"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    cliente = Column(String(255), nullable=False)
    faculdade = Column(String(255), nullable=False)
    numero_contrato = Column(String(100), nullable=False)
    valor = Column(Float, nullable=False)
    data_inicio = Column(String(50), nullable=False)  # ISO date string
    data_fim = Column(String(50), nullable=True)
    status = Column(String(50), default="Ativo")  # Ativo, Em Andamento, Em Produção, Finalizado, Entregue
    template_id = Column(String(36), nullable=True)
    template_nome = Column(String(255), nullable=True)
    projeto_id = Column(String(36), nullable=True)
    criado_por = Column(String(100), nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Projeto(Base):
    __tablename__ = "projetos"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    contrato_id = Column(String(36), nullable=False)
    cliente = Column(String(255), nullable=False)
    etapa_atual = Column(String(255), default="Informar recebimento do contrato")
    etapa_atual_ordem = Column(Integer, default=1)
    progresso = Column(Float, default=0.0)
    risco = Column(String(20), default="baixo")  # baixo, medio, alto, critico
    dias_restantes = Column(Integer, default=134)
    data_inicio = Column(String(50), nullable=False)
    data_fim_prevista = Column(String(50), nullable=False)
    template_id = Column(String(36), nullable=False)
    template_nome = Column(String(255), nullable=False)
    status = Column(String(50), default="Em Andamento")
    criado_por = Column(String(100), nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Notificacao(Base):
    __tablename__ = "notificacoes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tipo = Column(String(50), nullable=False)  # "cobranca", "atraso", "finalizacao", "atribuicao"
    titulo = Column(String(255), nullable=False)
    mensagem = Column(Text, nullable=False)
    de_usuario_id = Column(String(36), nullable=False)
    de_usuario_nome = Column(String(255), nullable=False)
    para_usuario_id = Column(String(36), nullable=False)
    para_usuario_nome = Column(String(255), nullable=False)
    tarefa_id = Column(String(36), nullable=True)
    projeto_id = Column(String(36), nullable=True)
    lida = Column(Boolean, default=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TemplatePrazos(Base):
    __tablename__ = "templates_prazos"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    etapas = Column(JSON, default=list)  # Lista de etapas
    prazo_total_dias = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    criado_por = Column(String(100), nullable=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PrazoContrato(Base):
    __tablename__ = "prazos_contratos"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    contrato_id = Column(String(36), ForeignKey("contratos.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(String(36), nullable=False)
    template_nome = Column(String(255), nullable=False)
    data_inicio = Column(String(50), nullable=False)
    data_fim_prevista = Column(String(50), nullable=False)
    prazo_total_dias = Column(Integer, default=0)
    etapas = Column(JSON, default=list)  # Lista de etapas com datas
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StatusCheck(Base):
    __tablename__ = "status_checks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_name = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
