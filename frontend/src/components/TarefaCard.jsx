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
  MoreVertical,
  Trash2,
  History,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import './TarefaCard.css';

const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', cor: '#10b981', bg: '#dcfce7' },
  media: { label: 'Média', cor: '#f59e0b', bg: '#fef3c7' },
  alta: { label: 'Alta', cor: '#ef4444', bg: '#fee2e2' },
  critica: { label: 'Crítica', cor: '#7f1d1d', bg: '#fecaca' },
};

const TarefaCard = ({ 
  tarefa, 
  onFinalizar, 
  onDelete, 
  onVerHistorico,
  onEditar,
  isAdmin = false,
  isGerente = false,
  compact = false 
}) => {
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;
  const canEdit = isAdmin || isGerente;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (compact) {
    return (
      <div className="tarefa-card-compact">
        <div className="tarefa-compact-header">
          <span 
            className="tarefa-status-dot" 
            style={{ backgroundColor: tarefa.status_nome === 'Concluído' ? '#10b981' : '#3b82f6' }}
          />
          <span className="tarefa-titulo-compact">{tarefa.titulo}</span>
          {tarefa.atrasada && (
            <Badge variant="destructive" className="tarefa-atraso-badge">
              <AlertTriangle size={12} />
              {tarefa.dias_atraso}d
            </Badge>
          )}
        </div>
        <div className="tarefa-compact-info">
          <span className="text-xs text-gray-500">
            {tarefa.criado_por_nome} • {tarefa.setor}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={`tarefa-card ${tarefa.finalizada ? 'tarefa-finalizada' : ''} ${tarefa.atrasada ? 'tarefa-atrasada' : ''}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="tarefa-header">
          <div className="tarefa-title-section">
            <h4 className="tarefa-titulo">{tarefa.titulo}</h4>
            <div className="tarefa-badges">
              <Badge 
                style={{ 
                  backgroundColor: tarefa.finalizada ? '#dcfce7' : '#dbeafe',
                  color: tarefa.finalizada ? '#15803d' : '#1d4ed8',
                }}
              >
                {tarefa.status_nome}
              </Badge>
              <Badge 
                style={{ 
                  backgroundColor: prioridade.bg,
                  color: prioridade.cor,
                }}
              >
                {prioridade.label}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onVerHistorico && (
                <DropdownMenuItem onClick={() => onVerHistorico(tarefa)}>
                  <History size={14} className="mr-2" />
                  Ver Histórico
                </DropdownMenuItem>
              )}
              {!tarefa.finalizada && canEdit && onEditar && (
                <DropdownMenuItem onClick={() => onEditar(tarefa)}>
                  <Edit size={14} className="mr-2" />
                  Editar Tarefa
                </DropdownMenuItem>
              )}
              {!tarefa.finalizada && onFinalizar && (
                <DropdownMenuItem onClick={() => onFinalizar(tarefa)}>
                  <CheckCircle2 size={14} className="mr-2" />
                  Finalizar
                </DropdownMenuItem>
              )}
              {isAdmin && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(tarefa)}
                    className="text-red-600"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Descrição */}
        {tarefa.descricao && (
          <p className="tarefa-descricao">{tarefa.descricao}</p>
        )}

        {/* Atraso Alert */}
        {tarefa.atrasada && !tarefa.finalizada && (
          <div className="tarefa-atraso-alert">
            <AlertTriangle size={16} />
            <span>{tarefa.dias_atraso} dias de atraso</span>
          </div>
        )}

        {/* Info Grid */}
        <div className="tarefa-info-grid">
          <div className="tarefa-info-item">
            <Building2 size={14} />
            <div>
              <span className="info-label">Setor</span>
              <span className="info-value">{tarefa.setor}</span>
            </div>
          </div>
          
          <div className="tarefa-info-item">
            <User size={14} />
            <div>
              <span className="info-label">Responsável</span>
              <span className="info-value">{tarefa.responsavel_nome || 'Não definido'}</span>
            </div>
          </div>

          {tarefa.prazo && (
            <div className="tarefa-info-item">
              <Calendar size={14} />
              <div>
                <span className="info-label">Prazo</span>
                <span className={`info-value ${tarefa.atrasada ? 'text-red-600' : ''}`}>
                  {formatDate(tarefa.prazo)}
                </span>
              </div>
            </div>
          )}

          <div className="tarefa-info-item">
            <Clock size={14} />
            <div>
              <span className="info-label">Criado em</span>
              <span className="info-value">{formatDate(tarefa.criado_em)}</span>
            </div>
          </div>
        </div>

        {/* Criador Info */}
        <div className="tarefa-criador">
          <span className="text-xs text-gray-500">
            Criado por: <strong>{tarefa.criado_por_nome}</strong> ({tarefa.criado_por_setor})
          </span>
        </div>

        {/* Observação de Finalização */}
        {tarefa.finalizada && tarefa.observacao_finalizacao && (
          <div className="tarefa-finalizacao">
            <CheckCircle2 size={14} className="text-green-600" />
            <div>
              <span className="text-xs text-gray-500">
                Finalizada em {formatDate(tarefa.data_finalizacao)}
              </span>
              <p className="text-sm text-gray-700 mt-1">
                {tarefa.observacao_finalizacao}
              </p>
            </div>
          </div>
        )}

        {/* Botão Finalizar */}
        {!tarefa.finalizada && onFinalizar && (
          <div className="tarefa-actions">
            <Button 
              onClick={() => onFinalizar(tarefa)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle2 size={16} className="mr-2" />
              Finalizar com Observação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TarefaCard;
