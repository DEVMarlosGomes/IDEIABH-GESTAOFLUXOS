import React from 'react';
import { Badge } from './ui/badge';
import {
  AlertTriangle,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './TarefaCard.css';

const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', cor: '#10b981', bg: '#dcfce7' },
  media: { label: 'Média', cor: '#f59e0b', bg: '#fef3c7' },
  alta: { label: 'Alta', cor: '#ef4444', bg: '#fee2e2' },
  critica: { label: 'Crítica', cor: '#7f1d1d', bg: '#fecaca' },
};

const TarefaCard = ({ tarefa, onClick }) => {
  const { isAdminOrGerente } = useAuth();
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;
  const canManage = isAdminOrGerente ? isAdminOrGerente() : false;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendente': '#94a3b8',
      'Em Andamento': '#3b82f6',
      'Aguardando': '#f59e0b',
      'Concluído': '#10b981',
    };
    return colors[status] || '#64748b';
  };

  return (
    <div 
      className={`tarefa-card-wrapper ${tarefa.finalizada ? 'finalizada' : ''} ${tarefa.atrasada ? 'atrasada' : ''}`}
      onClick={() => onClick && onClick(tarefa)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(tarefa)}
    >
      {/* Header */}
      <div className="tarefa-card-header">
        <h3 className="tarefa-card-title">{tarefa.titulo}</h3>
        <Eye size={18} className="tarefa-card-icon" />
      </div>

      {/* Badges */}
      <div className="tarefa-card-badges">
        <Badge style={{ backgroundColor: getStatusColor(tarefa.status_nome) }}>
          {tarefa.status_nome || 'Pendente'}
        </Badge>
        <Badge style={{ backgroundColor: prioridade.bg, color: prioridade.cor }}>
          {prioridade.label}
        </Badge>
        {tarefa.atrasada && (
          <Badge variant="destructive">
            <AlertTriangle size={12} className="mr-1" />
            {tarefa.dias_atraso}d
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="tarefa-card-info">
        <div className="info-row">
          <Building2 size={14} />
          <span>{tarefa.setor || '-'}</span>
        </div>
        {tarefa.responsavel_nome && (
          <div className="info-row">
            <User size={14} />
            <span>{tarefa.responsavel_nome}</span>
          </div>
        )}
        {tarefa.prazo && (
          <div className={`info-row ${tarefa.atrasada ? 'text-red-600' : ''}`}>
            <Calendar size={14} />
            <span>{formatDate(tarefa.prazo)}</span>
          </div>
        )}
      </div>

      {/* Observação Finalização */}
      {tarefa.finalizada && tarefa.observacao_finalizacao && (
        <div className="tarefa-card-obs">
          <CheckCircle2 size={14} className="text-green-600" />
          <span>{tarefa.observacao_finalizacao}</span>
        </div>
      )}

      {/* Footer */}
      <div className="tarefa-card-footer">
        <span>Por: {tarefa.criado_por_nome}</span>
        <span className="click-hint">Clique para {canManage ? 'editar' : 'ver'}</span>
      </div>
    </div>
  );
};

export default TarefaCard;
