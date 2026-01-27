import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  ChevronRight,
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

const TarefaCard = ({ 
  tarefa, 
  onClick,
  compact = false 
}) => {
  const { isAdminOrGerente } = useAuth();
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;
  const canManage = isAdminOrGerente();
  
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

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('TarefaCard clicado:', tarefa.titulo);
    onClick?.(tarefa);
  };

  return (
    <Card 
      className={`tarefa-card clickable ${tarefa.finalizada ? 'finalizada' : ''} ${tarefa.atrasada ? 'atrasada' : ''} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <CardContent className="tarefa-content">
        {/* Header */}
        <div className="tarefa-header">
          <div className="tarefa-title-area">
            <h3 className="tarefa-title">{tarefa.titulo}</h3>
            <div className="tarefa-badges">
              <Badge 
                style={{ backgroundColor: getStatusColor(tarefa.status_nome) }}
                className="status-badge"
              >
                {tarefa.status_nome || 'Pendente'}
              </Badge>
              <Badge 
                style={{ backgroundColor: prioridade.bg, color: prioridade.cor }}
                className="prioridade-badge"
              >
                {prioridade.label}
              </Badge>
              {tarefa.atrasada && (
                <Badge className="atraso-badge" variant="destructive">
                  <AlertTriangle size={12} className="mr-1" />
                  {tarefa.dias_atraso} dias
                </Badge>
              )}
            </div>
          </div>

          <div className="tarefa-action-hint">
            <Eye size={18} className="text-gray-400" />
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>

        {/* Description Preview */}
        {tarefa.descricao && (
          <p className="tarefa-descricao line-clamp-2">{tarefa.descricao}</p>
        )}

        {/* Info Grid - Compact */}
        <div className="tarefa-info-compact">
          <div className="info-item">
            <Building2 size={14} />
            <span>{tarefa.setor || '-'}</span>
          </div>

          {tarefa.responsavel_nome && (
            <div className="info-item">
              <User size={14} />
              <span>{tarefa.responsavel_nome}</span>
            </div>
          )}

          {tarefa.prazo && (
            <div className={`info-item ${tarefa.atrasada ? 'text-red-600' : ''}`}>
              <Calendar size={14} />
              <span>{formatDate(tarefa.prazo)}</span>
            </div>
          )}
        </div>

        {/* Observação de Finalização Preview */}
        {tarefa.finalizada && tarefa.observacao_finalizacao && (
          <div className="tarefa-finalizacao-preview">
            <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
            <span className="line-clamp-1">{tarefa.observacao_finalizacao}</span>
          </div>
        )}

        {/* Footer */}
        <div className="tarefa-footer">
          <span className="criador-info">
            Por: {tarefa.criado_por_nome}
          </span>
          <span className="click-hint">
            Clique para {canManage ? 'ver/editar' : 'ver detalhes'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TarefaCard;
