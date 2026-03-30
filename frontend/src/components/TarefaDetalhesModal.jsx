import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  Paperclip,
  Upload,
  Download,
  Loader2
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
import {
  API_BASE_URL,
  getTarefa,
  reabrirTarefa,
  removerAnexoTarefa,
  uploadAnexoTarefa,
} from '../services/api';
import { toast } from 'sonner';

const normalizeSetor = (setor) => (
  String(setor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
);

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
  onAtribuir,
  onAtualizar
}) => {
  const { user, isAdminOrGerente } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('detalhes');
  const [taskData, setTaskData] = useState(tarefa);
  const [loadingTask, setLoadingTask] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAnexoId, setRemovingAnexoId] = useState(null);
  const [reabrindo, setReabrindo] = useState(false);
  
  const canManage = isAdminOrGerente();
  
  useEffect(() => {
    setTaskData(tarefa || null);
  }, [tarefa]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('detalhes');
    setShowDeleteConfirm(false);
  }, [isOpen, tarefa?.id]);

  useEffect(() => {
    if (!isOpen || !tarefa?.id) return undefined;

    let cancelled = false;

    const carregarTarefa = async () => {
      try {
        setLoadingTask(true);
        const data = await getTarefa(tarefa.id, {
          usuario_role: user?.role,
          usuario_setor: user?.setor,
          usuario_id: user?.id,
        });
        if (!cancelled) {
          setTaskData(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar detalhes da tarefa:', error);
          toast.error('Erro ao carregar anexos e detalhes atualizados da tarefa');
        }
      } finally {
        if (!cancelled) {
          setLoadingTask(false);
        }
      }
    };

    carregarTarefa();

    return () => {
      cancelled = true;
    };
  }, [isOpen, tarefa?.id, user?.id, user?.role, user?.setor]);

  const currentTask = taskData || tarefa;

  if (!currentTask) return null;
  
  const prioridade = PRIORIDADE_CONFIG[currentTask.prioridade] || PRIORIDADE_CONFIG.media;
  const operadorDiretoDaTarefa = (
    user?.role === 'operador'
    && currentTask?.responsavel_id
    && String(currentTask.responsavel_id) === String(user?.id || '')
    && normalizeSetor(currentTask.setor) === normalizeSetor(user?.setor)
  );
  const canOperateTask = canManage || operadorDiretoDaTarefa;
  
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

  const formatFileSize = (sizeBytes) => {
    const size = Number(sizeBytes || 0);
    if (!size) return '0 KB';
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
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
    onExcluir?.(currentTask);
    setShowDeleteConfirm(false);
    onClose();
  };

  const contratoNumero = currentTask.contrato_numero || currentTask.contrato_id || 'Sem contrato';
  const contratoCliente = currentTask.contrato_cliente || 'Cliente nao informado';
  const contratoFaculdade = currentTask.contrato_faculdade || 'Faculdade nao informada';
  const contratoCurso = currentTask.contrato_curso || null;
  const historico = currentTask.historico || [];
  const anexos = currentTask.anexos || [];

  const resolveHistoricoAnexo = (item) => {
    if (!item) return null;
    if (item.anexo?.url) return item.anexo;
    if (item.acao !== 'anexo_adicionado') return null;

    const nomeArquivo = String(item.detalhes || '').replace(/^Anexo enviado:\s*/i, '').trim();
    if (!nomeArquivo) return null;

    const candidatos = anexos.filter((anexo) => (
      (anexo.nome_original || anexo.arquivo_nome) === nomeArquivo
    ));
    if (candidatos.length === 0) return null;
    if (candidatos.length === 1 || !item.data) return candidatos[0];

    const referencia = new Date(item.data).getTime();
    return candidatos.reduce((maisProximo, atual) => {
      const distanciaAtual = Math.abs(new Date(atual.created_at || 0).getTime() - referencia);
      const distanciaMelhor = Math.abs(new Date(maisProximo.created_at || 0).getTime() - referencia);
      return distanciaAtual < distanciaMelhor ? atual : maisProximo;
    });
  };

  const uploadContext = {
    user_role: user?.role,
    user_id: user?.id,
    user_setor: user?.setor,
    user_name: user?.nome || user?.username,
  };

  const handleUploadAnexos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length || !currentTask?.id || !canOperateTask) return;

    try {
      setUploading(true);
      let tarefaAtualizada = currentTask;

      for (const file of files) {
        const response = await uploadAnexoTarefa(currentTask.id, file, uploadContext);
        tarefaAtualizada = response?.tarefa || tarefaAtualizada;
      }

      setTaskData(tarefaAtualizada);
      toast.success(files.length === 1 ? 'Anexo enviado com sucesso' : 'Anexos enviados com sucesso');
    } catch (error) {
      console.error('Erro ao enviar anexo:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao enviar anexo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoverAnexo = async (anexoId) => {
    if (!currentTask?.id || !anexoId || !canOperateTask) return;

    try {
      setRemovingAnexoId(anexoId);
      const response = await removerAnexoTarefa(currentTask.id, anexoId, uploadContext);
      setTaskData(response?.tarefa || currentTask);
      toast.success('Anexo removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao remover anexo');
    } finally {
      setRemovingAnexoId(null);
    }
  };

  const handleReabrir = async () => {
    if (!currentTask?.id || !canManage) return;

    try {
      setReabrindo(true);
      const tarefaAtualizada = await reabrirTarefa(currentTask.id, {
        usuario_id: user?.id || 'unknown',
        usuario_nome: user?.nome || user?.username || 'Sistema',
        usuario_setor: user?.setor || 'geral',
        usuario_role: user?.role || 'admin',
      });
      setTaskData(tarefaAtualizada);
      onAtualizar?.();
      toast.success('Tarefa reaberta para correcao');
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao reabrir tarefa');
    } finally {
      setReabrindo(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[700px] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold pr-8">
                  {currentTask.titulo}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge 
                    style={{ backgroundColor: getStatusColor(currentTask.status_nome) }}
                    className="text-white"
                  >
                    {currentTask.status_nome || 'Pendente'}
                  </Badge>
                  <Badge 
                    style={{ backgroundColor: prioridade.bg, color: prioridade.cor }}
                  >
                    {prioridade.label}
                  </Badge>
                  {currentTask.atrasada && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {currentTask.dias_atraso} dias de atraso
                    </Badge>
                  )}
                  {currentTask.finalizada && (
                    <Badge className="bg-green-600 text-white flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Finalizada
                    </Badge>
                  )}
                  {loadingTask && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Atualizando
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
                {currentTask.descricao && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 mb-2">Descrição</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {currentTask.descricao}
                    </p>
                  </div>
                )}

                {/* Grid de Informações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Contrato</span>
                      <span className="font-medium">{contratoNumero}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Faculdade</span>
                      <span className="font-medium">{contratoFaculdade}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Cliente</span>
                      <span className="font-medium">{contratoCliente}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Setor</span>
                      <span className="font-medium">{currentTask.setor || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Responsável</span>
                      <span className="font-medium">{currentTask.responsavel_nome || 'Não atribuído'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Prazo</span>
                      <span className={`font-medium ${currentTask.atrasada ? 'text-red-600' : ''}`}>
                        {formatDateShort(currentTask.prazo)}
                      </span>
                    </div>
                  </div>

                  {contratoCurso && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText size={20} className="text-gray-400" />
                      <div>
                        <span className="text-xs text-gray-500 block">Curso</span>
                        <span className="font-medium">{contratoCurso}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock size={20} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Criado em</span>
                      <span className="font-medium">{formatDateShort(currentTask.criado_em)}</span>
                    </div>
                  </div>
                </div>

                {/* Criador */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600 block mb-1">Criado por</span>
                  <span className="font-medium text-blue-800">
                    {currentTask.criado_por_nome} ({currentTask.criado_por_setor})
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-gray-500">Anexos</h4>
                    {canOperateTask && (
                      <label className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${uploading ? 'cursor-wait bg-gray-100 text-gray-500' : 'cursor-pointer bg-white hover:bg-gray-50'}`}>
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{uploading ? 'Enviando...' : 'Adicionar arquivo'}</span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={handleUploadAnexos}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>

                  {anexos.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                      Nenhum documento anexado a esta tarefa.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {anexos.map((anexo) => (
                        <div key={anexo.id} className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                              <Paperclip size={14} />
                              <span className="truncate">{anexo.nome_original || anexo.arquivo_nome}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatFileSize(anexo.size_bytes)} | enviado por {anexo.uploaded_by_name || 'Sistema'} em {formatDate(anexo.created_at)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`${API_BASE_URL}${anexo.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-white"
                            >
                              <Download size={12} />
                              Baixar
                            </a>
                            {canOperateTask && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={removingAnexoId === anexo.id}
                                onClick={() => handleRemoverAnexo(anexo.id)}
                              >
                                {removingAnexoId === anexo.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observação de Finalização */}
                {currentTask.finalizada && currentTask.observacao_finalizacao && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <span className="font-semibold text-green-800">Observação de Finalização</span>
                    </div>
                    <p className="text-green-700 mb-2">{currentTask.observacao_finalizacao}</p>
                    <span className="text-xs text-green-600">
                      Finalizada em {formatDate(currentTask.data_finalizacao)}
                    </span>
                  </div>
                )}

                {/* Prazo Original vs Atual */}
                {currentTask.prazo_original && currentTask.prazo_original !== currentTask.prazo && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-xs text-amber-600 block mb-1">Prazo Recalculado</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-700 line-through">
                        Original: {formatDateShort(currentTask.prazo_original)}
                      </span>
                      <span className="text-amber-800 font-medium">
                        → Atual: {formatDateShort(currentTask.prazo)}
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
                    {historico.map((item, index) => {
                      const historicoAnexo = resolveHistoricoAnexo(item);
                      return (
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
                          {historicoAnexo && (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                  <Paperclip size={14} />
                                  <span className="truncate">
                                    {historicoAnexo.nome_original || historicoAnexo.arquivo_nome}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {formatFileSize(historicoAnexo.size_bytes)}
                                  {historicoAnexo.content_type ? ` | ${historicoAnexo.content_type}` : ''}
                                </div>
                              </div>
                              <a
                                href={`${API_BASE_URL}${historicoAnexo.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <Download size={12} />
                                Baixar
                              </a>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Por: {item.usuario_nome} ({item.setor})
                          </div>
                        </div>
                      );
                    })}
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
              ) : canOperateTask ? (
                <>
                <span className="hidden">
                  âœ“ VocÃª pode atuar nesta tarefa
                </span>
                <span className="text-green-600">Voce pode atuar nesta tarefa</span>
                </>
              ) : (
                <span>Você pode apenas visualizar esta tarefa</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {!currentTask.finalizada && (
                <>
                  {canManage && onAtribuir && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onAtribuir?.(currentTask);
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
                          onEditar?.(currentTask);
                          onClose();
                        }}
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                    </>
                  )}
                  {canOperateTask && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        onFinalizar?.(currentTask);
                        onClose();
                      }}
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Finalizar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Fechar
                  </Button>
                </>
              )}
              {currentTask.finalizada && (
                <>
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReabrir}
                        disabled={reabrindo}
                        className="action-ghost action-ghost-blue"
                      >
                        {reabrindo ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Clock size={16} className="mr-2" />
                        )}
                        Reabrir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onEditar?.(currentTask);
                          onClose();
                        }}
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Fechar
                  </Button>
                </>
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
              Tem certeza que deseja excluir a tarefa "{currentTask.titulo}"?
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
