import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Loader2,
  Target,
  Activity,
  Eye,
  Filter,
} from 'lucide-react';
import {
  getProjeto,
  deletarTarefa,
  getStatusTarefas,
  alterarStatusTarefa,
} from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import TarefaDetalhesModal from '../components/TarefaDetalhesModal';
import EditarTarefaModal from '../components/EditarTarefaModal';
import FinalizarTarefaModal from '../components/FinalizarTarefaModal';
import AtribuirTarefaModal from '../components/AtribuirTarefaModal';

const statusFiltroDaTarefa = (tarefa) => {
  if (tarefa?.finalizada) return 'concluida';
  const status = (tarefa?.status_nome || '').toLowerCase();
  if (status.includes('andamento')) return 'em_andamento';
  return 'pendente';
};

const prioridadeDaTarefa = (tarefa) => (tarefa?.prioridade || 'media').toLowerCase();

const ProjetoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdminOrGerente } = useAuth();
  const [projeto, setProjeto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusList, setStatusList] = useState([]);
  const [atualizandoStatusId, setAtualizandoStatusId] = useState(null);

  const [filtroContrato, setFiltroContrato] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroData, setFiltroData] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');

  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showAtribuirModal, setShowAtribuirModal] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState(null);
  const [tarefaParaAtribuir, setTarefaParaAtribuir] = useState(null);

  useEffect(() => {
    loadProjeto();
  }, [id, user?.role, user?.id, user?.setor]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getStatusTarefas();
      setStatusList(data || []);
    } catch (error) {
      setStatusList([]);
    }
  };

  const loadProjeto = async () => {
    try {
      setLoading(true);
      const data = await getProjeto(
        id,
        user?.role || 'operador',
        user?.id || null,
        user?.setor || null
      );
      setProjeto(data);

      const contratos = data?.contratos || [];
      const contratoExiste = contratos.some((c) => c.id === filtroContrato);
      if (filtroContrato !== 'todos' && !contratoExiste) {
        setFiltroContrato('todos');
      }
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      const detail = error?.response?.data?.detail;
      if (error?.response?.status === 403) {
        toast.error(detail || 'Acesso negado a este projeto');
      } else {
        toast.error(detail || 'Erro ao carregar detalhes do projeto');
      }
      setProjeto(null);
    } finally {
      setLoading(false);
    }
  };

  const contratosProjeto = useMemo(() => {
    if (!projeto) return [];
    if (Array.isArray(projeto.contratos) && projeto.contratos.length > 0) {
      return projeto.contratos;
    }

    const mapa = new Map();
    (projeto.tarefas || []).forEach((tarefa) => {
      if (!tarefa?.contrato_id) return;
      if (!mapa.has(tarefa.contrato_id)) {
        mapa.set(tarefa.contrato_id, {
          id: tarefa.contrato_id,
          numero_contrato: tarefa.contrato_id,
          cliente: projeto.cliente,
          status: 'Em andamento',
        });
      }
    });

    return Array.from(mapa.values());
  }, [projeto]);

  const tarefasFiltradas = useMemo(() => {
    const base = projeto?.tarefas || [];

    return base.filter((tarefa) => {
      if (filtroContrato !== 'todos' && tarefa.contrato_id !== filtroContrato) {
        return false;
      }

      if (filtroStatus !== 'todos' && statusFiltroDaTarefa(tarefa) !== filtroStatus) {
        return false;
      }

      if (filtroData) {
        const dataPrazo = tarefa?.prazo ? new Date(tarefa.prazo).toISOString().slice(0, 10) : '';
        if (dataPrazo !== filtroData) {
          return false;
        }
      }

      if (filtroPrioridade !== 'todos' && prioridadeDaTarefa(tarefa) !== filtroPrioridade) {
        return false;
      }

      return true;
    });
  }, [projeto, filtroContrato, filtroStatus, filtroData, filtroPrioridade]);

  const sortKey = (tarefa) => {
    const candidates = [tarefa.prazo_original, tarefa.prazo, tarefa.criado_em];
    for (const value of candidates) {
      if (!value) continue;
      const dt = new Date(value);
      if (!Number.isNaN(dt.getTime())) {
        return dt.getTime();
      }
    }
    return 0;
  };

  const tarefasPorSetor = useMemo(() => {
    const grouped = tarefasFiltradas.reduce((acc, tarefa) => {
      const setor = tarefa.setor || 'outros';
      if (!acc[setor]) {
        acc[setor] = [];
      }
      acc[setor].push(tarefa);
      return acc;
    }, {});

    Object.keys(grouped).forEach((setor) => {
      grouped[setor] = grouped[setor].sort((a, b) => {
        const diff = sortKey(a) - sortKey(b);
        if (diff !== 0) return diff;
        const ta = (a.titulo || '').localeCompare(b.titulo || '');
        if (ta !== 0) return ta;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
    });

    return grouped;
  }, [tarefasFiltradas]);

  const setorOrder = [
    'atendimento',
    'criacao',
    'pre-producao',
    'producao',
  ];

  const setoresOrdenados = useMemo(() => {
    return Object.keys(tarefasPorSetor).sort((a, b) => {
      const ai = setorOrder.indexOf(a);
      const bi = setorOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [tarefasPorSetor]);

  const resumoFiltrado = useMemo(() => {
    const total = tarefasFiltradas.length;
    const concluidas = tarefasFiltradas.filter((t) => t.finalizada).length;
    const emAndamento = tarefasFiltradas.filter((t) => !t.finalizada && (t.status_nome || '').toLowerCase() === 'em andamento').length;
    const pendentes = total - concluidas - emAndamento;
    return { total, concluidas, emAndamento, pendentes };
  }, [tarefasFiltradas]);

  const handleTarefaClick = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowDetalhesModal(true);
  };

  const handleEditar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowEditarModal(true);
  };

  const handleFinalizar = (tarefa) => {
    if (user?.role === 'operador') {
      const userSetor = (user?.setor || '').toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      const tarefaSetor = (tarefa.setor || '').toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      if (userSetor !== tarefaSetor) {
        toast.error(`Voce so pode finalizar tarefas do seu setor (${user?.setor}).`);
        return;
      }
      if (tarefa.responsavel_id && tarefa.responsavel_id !== user?.id) {
        toast.error('Apenas o operador responsavel pode finalizar esta tarefa.');
        return;
      }
    }

    if (filtroContrato !== 'todos' && tarefa.contrato_id !== filtroContrato) {
      toast.error('A tarefa nao pertence ao contrato selecionado.');
      return;
    }

    setSelectedTarefa(tarefa);
    setShowFinalizarModal(true);
  };

  const handleAtribuir = (tarefa) => {
    if (!['admin', 'gerente'].includes(user?.role)) {
      toast.error('Apenas administradores e gerentes podem atribuir tarefas');
      return;
    }

    if (user?.role === 'gerente') {
      const userSetor = (user?.setor || '').toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      const tarefaSetor = (tarefa.setor || '').toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      if (userSetor !== tarefaSetor) {
        toast.error(`Gerentes so podem atribuir tarefas de seu setor (${user?.setor})`);
        return;
      }
    }

    setTarefaParaAtribuir(tarefa);
    setShowAtribuirModal(true);
  };

  const handleExcluir = async (tarefa) => {
    const canManage = isAdminOrGerente ? isAdminOrGerente() : false;
    if (!canManage) {
      toast.error('Apenas administradores e gerentes podem excluir tarefas');
      return;
    }
    try {
      await deletarTarefa(tarefa.id, user?.role || 'admin', user?.id || 'unknown');
      toast.success('Tarefa excluida com sucesso');
      loadProjeto();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir tarefa');
    }
  };

  const handleAlterarStatus = async (tarefa, novoStatusId) => {
    if (!novoStatusId || novoStatusId === tarefa.status_id) return;

    try {
      setAtualizandoStatusId(tarefa.id);
      await alterarStatusTarefa(tarefa.id, {
        status_id: novoStatusId,
        usuario_id: user?.id || 'unknown',
        usuario_nome: user?.nome || user?.username || 'Operador',
        usuario_setor: user?.setor || 'desconhecido',
        usuario_role: user?.role || 'operador',
        contrato_id_selecionado: filtroContrato !== 'todos' ? filtroContrato : tarefa.contrato_id,
        observacao: `Status atualizado por ${user?.nome || user?.username || 'Usuario'}`,
      });
      toast.success('Status atualizado com sucesso');
      await loadProjeto();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || 'Erro ao atualizar status da tarefa');
    } finally {
      setAtualizandoStatusId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getRiscoColor = (risco) => {
    const colors = {
      baixo: { bg: '#dcfce7', color: '#15803d' },
      medio: { bg: '#fef3c7', color: '#b45309' },
      alto: { bg: '#fed7aa', color: '#c2410c' },
      critico: { bg: '#fecaca', color: '#dc2626' },
    };
    return colors[risco] || colors.baixo;
  };

  const getStatusBadge = (tarefa) => {
    if (tarefa.finalizada) {
      return { label: 'Concluida', color: 'bg-green-100 text-green-800' };
    }
    if (tarefa.atrasada) {
      return { label: `Atrasada (${tarefa.dias_atraso || 0}d)`, color: 'bg-red-100 text-red-800' };
    }
    if (tarefa.status_nome === 'Em Andamento') {
      return { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' };
    }
    return { label: 'Pendente', color: 'bg-gray-100 text-gray-800' };
  };

  const statusAtualizaveis = statusList.filter((s) => s.nome !== 'Concluído');

  if (loading) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin" size={48} />
        </div>
      </LayoutNovo>
    );
  }

  if (!projeto) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Projeto nao encontrado ou sem permissao</p>
            <Button onClick={() => navigate('/projetos')} className="mt-4">
              Voltar para Projetos
            </Button>
          </div>
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/projetos')} className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Voltar para Projetos
          </Button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{projeto.cliente}</h1>
              <div className="flex items-center gap-4 text-gray-600 flex-wrap">
                <div className="flex items-center">
                  <Building2 size={16} className="mr-1.5" />
                  <span>Projeto: {projeto.id}</span>
                </div>
                <div className="flex items-center">
                  <Calendar size={16} className="mr-1.5" />
                  <span>Inicio: {formatDate(projeto.data_inicio)}</span>
                </div>
                <div className="flex items-center">
                  <Target size={16} className="mr-1.5" />
                  <span>Termino: {formatDate(projeto.data_fim_prevista)}</span>
                </div>
              </div>
            </div>

            <Badge
              style={{
                backgroundColor: getRiscoColor(projeto.risco).bg,
                color: getRiscoColor(projeto.risco).color,
              }}
              className="text-sm px-4 py-2"
            >
              Risco {projeto.risco}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Progresso</p>
                  <p className="text-3xl font-bold text-blue-600">{projeto.progresso || 0}%</p>
                </div>
                <Activity size={40} className="text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tarefas (filtro)</p>
                  <p className="text-3xl font-bold">{resumoFiltrado.total}</p>
                </div>
                <FileText size={40} className="text-gray-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Concluidas</p>
                  <p className="text-3xl font-bold text-green-600">{resumoFiltrado.concluidas}</p>
                </div>
                <CheckCircle2 size={40} className="text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendentes</p>
                  <p className="text-3xl font-bold text-amber-600">{resumoFiltrado.pendentes}</p>
                </div>
                <Clock size={40} className="text-amber-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              Etapa Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">{projeto.etapa_atual}</h3>
              <Progress value={projeto.progresso || 0} className="h-3 mb-2" />
              <p className="text-sm text-blue-800">
                {projeto.tarefas_concluidas || 0} de {projeto.total_tarefas || 0} tarefas concluidas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contratos associados</CardTitle>
          </CardHeader>
          <CardContent>
            {contratosProjeto.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum contrato associado</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contratosProjeto.map((contrato) => (
                  <Badge key={contrato.id} variant="outline" className="bg-white">
                    {contrato.numero_contrato || contrato.id} - {contrato.status || 'Ativo'}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter size={18} />
              Filtros essenciais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contrato</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {contratosProjeto.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato || contrato.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Data</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Prioridade</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={filtroPrioridade}
                  onChange={(e) => setFiltroPrioridade(e.target.value)}
                >
                  <option value="todos">Todas</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Tarefas no contexto selecionado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {setoresOrdenados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle size={40} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma tarefa encontrada para os filtros selecionados.</p>
              </div>
            ) : (
              <Tabs defaultValue={setoresOrdenados[0]}>
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  {setoresOrdenados.map((setor) => (
                    <TabsTrigger key={setor} value={setor} className="capitalize">
                      {setor}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {setoresOrdenados.map((setor) => (
                  <TabsContent key={setor} value={setor}>
                    <div className="space-y-3">
                      {(tarefasPorSetor[setor] || []).map((tarefa, index) => {
                        const statusBadge = getStatusBadge(tarefa);

                        return (
                          <div
                            key={tarefa.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-400 ${
                              tarefa.atrasada ? 'bg-red-50 border-red-200' : 'bg-white'
                            }`}
                            onClick={() => handleTarefaClick(tarefa)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="flex items-start justify-between mb-2 gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                                  <h4 className="font-semibold text-gray-900">{tarefa.titulo}</h4>
                                </div>
                                {tarefa.descricao && (
                                  <p className="text-sm text-gray-600 mb-2">{tarefa.descricao}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                                <Eye size={18} className="text-gray-400" />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <FileText size={14} className="mr-1" />
                                Contrato: {tarefa.contrato_id}
                              </div>
                              {tarefa.responsavel_nome && (
                                <div className="flex items-center">
                                  <User size={14} className="mr-1" />
                                  {tarefa.responsavel_nome}
                                </div>
                              )}
                              {tarefa.prazo && (
                                <div className="flex items-center">
                                  <Calendar size={14} className="mr-1" />
                                  Prazo: {formatDate(tarefa.prazo)}
                                </div>
                              )}
                              {tarefa.finalizada && tarefa.data_finalizacao && (
                                <div className="flex items-center text-green-600">
                                  <CheckCircle2 size={14} className="mr-1" />
                                  Finalizada em: {formatDate(tarefa.data_finalizacao)}
                                </div>
                              )}
                            </div>

                            {!tarefa.finalizada && (
                              <div
                                className="mt-3 pt-3 border-t flex flex-col md:flex-row gap-2 md:items-center md:justify-between"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-gray-500">Atualizar status:</span>
                                  <select
                                    className="border rounded-md px-2 py-1 text-sm bg-white"
                                    value={tarefa.status_id || ''}
                                    disabled={atualizandoStatusId === tarefa.id}
                                    onChange={(e) => handleAlterarStatus(tarefa, e.target.value)}
                                  >
                                    <option value="" disabled>
                                      Selecione
                                    </option>
                                    {statusAtualizaveis.map((status) => (
                                      <option key={status.id} value={status.id}>
                                        {status.nome}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFinalizar(tarefa);
                                  }}
                                >
                                  <CheckCircle2 size={14} className="mr-2" />
                                  Finalizar
                                </Button>
                              </div>
                            )}

                            {tarefa.historico && tarefa.historico.length > 0 && (
                              <div className="mt-2 tarefa-historico-inline">
                                <div className="tarefa-historico-inline-row">
                                  <Clock size={12} />
                                  <span>
                                    Editado em: {new Date(tarefa.historico[tarefa.historico.length - 1].data).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <TarefaDetalhesModal
        isOpen={showDetalhesModal}
        onClose={() => {
          setShowDetalhesModal(false);
        }}
        tarefa={selectedTarefa}
        onEditar={handleEditar}
        onExcluir={handleExcluir}
        onFinalizar={handleFinalizar}
        onAtribuir={handleAtribuir}
      />

      <EditarTarefaModal
        isOpen={showEditarModal}
        onClose={() => {
          setShowEditarModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
        onSuccess={loadProjeto}
      />

      <FinalizarTarefaModal
        isOpen={showFinalizarModal}
        onClose={() => {
          setShowFinalizarModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
        onSuccess={loadProjeto}
        contratoSelecionadoId={
          filtroContrato !== 'todos' ? filtroContrato : selectedTarefa?.contrato_id || null
        }
      />

      <AtribuirTarefaModal
        isOpen={showAtribuirModal}
        onClose={() => {
          setShowAtribuirModal(false);
          setTarefaParaAtribuir(null);
        }}
        tarefa={tarefaParaAtribuir}
        onSuccess={loadProjeto}
      />
    </LayoutNovo>
  );
};

export default ProjetoDetalhes;
