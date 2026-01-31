import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  History,
  Edit,
  Trash2,
  FileText,
  MessageSquare,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', cor: '#10b981', bg: '#dcfce7' },
  media: { label: 'Média', cor: '#f59e0b', bg: '#fef3c7' },
  alta: { label: 'Alta', cor: '#ef4444', bg: '#fee2e2' },
  critica: { label: 'Crítica', cor: '#7f1d1d', bg: '#fecaca' },
};

const TarefaDetalhesModal = ({ 
  isOpen, 
  onClose, 
  tarefa, 
  onEditar, 
  onExcluir, 
  onFinalizar,
  onAtribuir
}) => {
  const { user, isAdminOrGerente } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('detalhes');
  
  const canManage = isAdminOrGerente();
  
  if (!tarefa) return null;
  
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateStr) => {
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

  const handleExcluir = () => {
    setShowDeleteConfirm(true);
  };

  const confirmExcluir = () => {
    onExcluir?.(tarefa);
    setShowDeleteConfirm(false);
    onClose();
  };

  const historico = tarefa.historico || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[700px] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold pr-8">
                  {tarefa.titulo}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge 
                    style={{ backgroundColor: getStatusColor(tarefa.status_nome) }}
                    className="text-white"
                  >
                    {tarefa.status_nome || 'Pendente'}
                  </Badge>
                  <Badge 
                    style={{ backgroundColor: prioridade.bg, color: prioridade.cor }}
                  >
                    {prioridade.label}
                  </Badge>
                  {tarefa.atrasada && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {tarefa.dias_atraso} dias de atraso
                    </Badge>
                  )}
                  {tarefa.finalizada && (
                    <Badge className="bg-green-600 text-white flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Finalizada
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b px-6 mt-4">
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'detalhes' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('detalhes')}
            >
              <FileText size={16} className="inline mr-2" />
              Detalhes
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'historico' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('historico')}
            >
              <History size={16} className="inline mr-2" />
              Histórico ({historico.length})
            </button>
          </div>

          <ScrollArea className="flex-1 max-h-[400px]">
            {activeTab === 'detalhes' ? (
              <div className="p-6 space-y-6">
                {/* Descrição */}
                {tarefa.descricao && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 mb-2">Descrição</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {tarefa.descricao}
                    </p>
                  </div>
                )}

                {/* Grid de Informações */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Setor</span>
                      <span className="font-medium">{tarefa.setor || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Responsável</span>
                      <span className="font-medium">{tarefa.responsavel_nome || 'Não atribuído'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Prazo</span>
                      <span className={`font-medium ${tarefa.atrasada ? 'text-red-600' : ''}`}>
                        {formatDateShort(tarefa.prazo)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Criado em</span>
                      <span className="font-medium">{formatDateShort(tarefa.criado_em)}</span>
                    </div>
                  </div>
                </div>

                {/* Criador */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600 block mb-1">Criado por</span>
                  <span className="font-medium text-blue-800">
                    {tarefa.criado_por_nome} ({tarefa.criado_por_setor})
                  </span>
                </div>

                {/* Observação de Finalização */}
                {tarefa.finalizada && tarefa.observacao_finalizacao && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <span className="font-semibold text-green-800">Observação de Finalização</span>
                    </div>
                    <p className="text-green-700 mb-2">{tarefa.observacao_finalizacao}</p>
                    <span className="text-xs text-green-600">
                      Finalizada em {formatDate(tarefa.data_finalizacao)}
                    </span>
                  </div>
                )}

                {/* Prazo Original vs Atual */}
                {tarefa.prazo_original && tarefa.prazo_original !== tarefa.prazo && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-xs text-amber-600 block mb-1">Prazo Recalculado</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-700 line-through">
                        Original: {formatDateShort(tarefa.prazo_original)}
                      </span>
                      <span className="text-amber-800 font-medium">
                        → Atual: {formatDateShort(tarefa.prazo)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                {historico.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History size={40} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum histórico disponível</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historico.map((item, index) => (
                      <div 
                        key={item.id || index} 
                        className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm capitalize">
                            {item.acao?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(item.data)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {item.detalhes || item.observacao || '-'}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          Por: {item.usuario_nome} ({item.setor})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer com Ações */}
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {canManage ? (
                <span className="text-blue-600">
                  ✓ Você pode editar e excluir esta tarefa
                </span>
              ) : (
                <span>Você pode apenas visualizar esta tarefa</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {!tarefa.finalizada && (
                <>
                  {canManage && onAtribuir && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onAtribuir?.(tarefa);
                          onClose();
                        }}
                        className="action-ghost action-ghost-blue"
                      >
                        <User size={16} className="mr-2" />
                        Atribuir
                      </Button>
                    </>
                  )}
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExcluir}
                        className="action-ghost action-ghost-red"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Excluir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onEditar?.(tarefa);
                          onClose();
                        }}
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onFinalizar?.(tarefa);
                      onClose();
                    }}
                  >
                    <CheckCircle2 size={16} className="mr-2" />
                    Finalizar
                  </Button>
                </>
              )}
              {tarefa.finalizada && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa "{tarefa.titulo}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmExcluir}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TarefaDetalhesModal;
