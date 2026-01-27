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
  Edit,
  Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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
  onFinalizar, 
  onDelete, 
  onVerHistorico,
  onEditar,
  compact = false 
}) => {
  const { user, isAdminOrGerente } = useAuth();
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;
  
  // Verificar permissão diretamente do contexto
  const canEdit = isAdminOrGerente();
  const isAdmin = user?.role === 'admin';
  
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
    <Card className={`tarefa-card ${tarefa.finalizada ? 'finalizada' : ''} ${tarefa.atrasada ? 'atrasada' : ''} ${compact ? 'compact' : ''}`}>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="tarefa-menu-btn">
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

        {/* Description */}
        {tarefa.descricao && (
          <p className="tarefa-descricao">{tarefa.descricao}</p>
        )}

        {/* Info Grid */}
        <div className="tarefa-info-grid">
          <div className="tarefa-info-item">
            <Building2 size={14} />
            <div>
              <span className="info-label">Setor</span>
              <span className="info-value">{tarefa.setor || '-'}</span>
            </div>
          </div>

          {tarefa.responsavel_nome && (
            <div className="tarefa-info-item">
              <User size={14} />
              <div>
                <span className="info-label">Responsável</span>
                <span className="info-value">{tarefa.responsavel_nome}</span>
              </div>
            </div>
          )}

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

        {/* Botões de Ação - SEMPRE VISÍVEIS PARA ADMIN/GERENTE */}
        {!tarefa.finalizada && (
          <div className="tarefa-actions">
            {canEdit && onEditar && (
              <Button 
                onClick={() => onEditar(tarefa)}
                variant="outline"
                size="sm"
                className="btn-editar"
              >
                <Pencil size={16} className="mr-2" />
                Editar
              </Button>
            )}
            {onFinalizar && (
              <Button 
                onClick={() => onFinalizar(tarefa)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Finalizar com Observação
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TarefaCard;
