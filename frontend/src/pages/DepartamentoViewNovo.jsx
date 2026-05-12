import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Building2,
  ChevronRight,
  Loader2,
  Check,
  Play,
  TrendingUp,
  FileText,
  UserPlus
} from 'lucide-react';
import { DEPARTAMENTOS } from '../data/mockNovo';
import { useAuth } from '../context/AuthContext';
import { 
  getTarefas,
  finalizarTarefa,
  finalizarTarefasLote,
  criarNotificacao,
  listarUsuariosSetor
} from '../services/api';
import AtribuirTarefaModal from '../components/AtribuirTarefaModal';
import { toast } from 'sonner';
import { isTarefaEfetivamenteFinalizada } from '../lib/projetos';
import './DepartamentoView.css';

const DepartamentoViewNovo = ({ departamento }) => {
  const { user } = useAuth();
  
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipeUsuarios, setEquipeUsuarios] = useState([]);
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [atribuirModalAberto, setAtribuirModalAberto] = useState(false);
  const [tarefaParaAtribuir, setTarefaParaAtribuir] = useState(null);
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroContrato, setFiltroContrato] = useState('todos');
  const [abaStatus, setAbaStatus] = useState('abertas');
  const [tarefasSelecionadas, setTarefasSelecionadas] = useState([]);
  const [finalizarLoteModal, setFinalizarLoteModal] = useState(false);
  const [finalizandoLote, setFinalizandoLote] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    observacao: '',
    dificuldades: '',
    tempo_gasto: '',
    qualidade_entrega: '',
    proximos_passos: ''
  });
  const [feedbackFormLote, setFeedbackFormLote] = useState({
    observacao: '',
    dificuldades: '',
    tempo_gasto: '',
    qualidade_entrega: '',
    proximos_passos: ''
  });

  // Info do departamento
  const deptInfo = Object.values(DEPARTAMENTOS).find(d => d.id === departamento) || {
    id: departamento,
    nome: 'Departamento',
    cor: '#3b82f6',
    equipe: [],
    descricao: ''
  };

  const normalizeSetor = (setor) => {
    if (!setor) return '';
    const key = setor.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
    const setorMap = {
      'atendimento': 'atendimento',
      'criacao': 'criacao',
      'criação': 'criacao',
      'preproducao': 'pre-producao',
      'préproducao': 'pre-producao',
      'pre-producao': 'pre-producao',
      'pré-produção': 'pre-producao',
      'producao': 'producao',
      'produção': 'producao',
    };
    return setorMap[key] || setor;
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { 
        setor: departamento,
        usuario_role: user?.role,
        usuario_setor: user?.setor,
        usuario_id: user?.id
      };
      
      const departamentoNorm = (departamento || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (
        user?.role === 'operador' &&
        ['atendimento', 'criacao'].includes(departamentoNorm)
      ) {
        filters.responsavel_id = user?.id;
      }

      const tarefasData = await getTarefas(filters);
      
      // Ordenar por prazo
      const sorted = tarefasData.sort((a, b) => {
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return new Date(a.prazo) - new Date(b.prazo);
      });
      
      setTarefas(sorted);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [departamento, user?.id, user?.role, user?.setor]);

  const loadEquipe = useCallback(async () => {
    if (!user?.role) return;
    try {
      const setor = normalizeSetor(departamento);
      if (!setor) {
        setEquipeUsuarios([]);
        return;
      }
      const usuarios = await listarUsuariosSetor(
        setor,
        user.role,
        user.role === 'gerente' ? normalizeSetor(user.setor) : undefined
      );
      setEquipeUsuarios(usuarios || []);
    } catch (err) {
      setEquipeUsuarios([]);
    }
  }, [departamento, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadEquipe();
  }, [loadEquipe]);

  const contratosDisponiveis = useMemo(() => {
    const mapa = new Map();
    (tarefas || []).forEach((tarefa) => {
      const key = tarefa.contrato_id || tarefa.contrato_numero;
      if (!key || mapa.has(key)) return;
      mapa.set(key, {
        id: tarefa.contrato_id,
        label: tarefa.contrato_resumo || tarefa.contrato_numero || tarefa.contrato_id,
      });
    });
    return Array.from(mapa.values());
  }, [tarefas]);

  const tarefasFiltradas = useMemo(() => (
    (tarefas || []).filter((tarefa) => {
      if (filtroResponsavel !== 'todos' && tarefa.responsavel_id !== filtroResponsavel) {
        return false;
      }
      if (filtroContrato !== 'todos' && tarefa.contrato_id !== filtroContrato) {
        return false;
      }
      return true;
    })
  ), [filtroContrato, filtroResponsavel, tarefas]);

  const tarefasAbertas = useMemo(
    () => tarefasFiltradas.filter((tarefa) => !isTarefaEfetivamenteFinalizada(tarefa)),
    [tarefasFiltradas]
  );

  const tarefasFinalizadas = useMemo(
    () => tarefasFiltradas.filter((tarefa) => isTarefaEfetivamenteFinalizada(tarefa)),
    [tarefasFiltradas]
  );

  const tarefasFinalizadasRecentes = useMemo(
    () => [...tarefasFinalizadas]
      .sort((a, b) => new Date(b.data_finalizacao || 0) - new Date(a.data_finalizacao || 0))
      .slice(0, 5),
    [tarefasFinalizadas]
  );

  const tarefasVisiveis = abaStatus === 'finalizadas' ? tarefasFinalizadas : tarefasAbertas;
  const tarefasSelecionaveis = useMemo(
    () => (user?.role === 'admin' && abaStatus === 'abertas' ? tarefasVisiveis : []),
    [abaStatus, tarefasVisiveis, user?.role]
  );
  const tarefasSelecionadasVisiveis = useMemo(
    () => tarefasSelecionaveis.filter((tarefa) => tarefasSelecionadas.includes(tarefa.id)),
    [tarefasSelecionadas, tarefasSelecionaveis]
  );
  const todasSelecionadas = tarefasSelecionaveis.length > 0 && tarefasSelecionadasVisiveis.length === tarefasSelecionaveis.length;

  useEffect(() => {
    const idsVisiveis = new Set(tarefasSelecionaveis.map((tarefa) => tarefa.id));
    setTarefasSelecionadas((current) => current.filter((id) => idsVisiveis.has(id)));
  }, [tarefasSelecionaveis]);

  // Estatísticas
  const stats = {
    total: tarefasVisiveis.length,
    pendentes: tarefasVisiveis.filter(t => t.status_nome === 'Pendente').length,
    emAndamento: tarefasVisiveis.filter(t => t.status_nome === 'Em Andamento').length,
    atrasadas: tarefasVisiveis.filter(t => t.atrasada).length,
    finalizadas: tarefasFinalizadas.length,
    prazoMedio: Math.round(
      tarefasVisiveis.reduce((acc, t) => {
        if (t.prazo) {
          const dias = Math.ceil((new Date(t.prazo) - new Date()) / (1000 * 60 * 60 * 24));
          return acc + dias;
        }
        return acc;
      }, 0) / (tarefasVisiveis.length || 1)
    )
  };

  const buildFinalizacaoObservacao = (form) => {
    const observacao = form.observacao.trim();
    const dificuldades = form.dificuldades.trim();
    const tempoGasto = form.tempo_gasto.trim();
    const proximosPassos = form.proximos_passos.trim();

    const blocos = [];
    if (observacao) {
      blocos.push(`EXECUCAO DA TAREFA:\n${observacao}`);
    }
    if (dificuldades) {
      blocos.push(`DIFICULDADES ENCONTRADAS:\n${dificuldades}`);
    }
    if (tempoGasto) {
      blocos.push(`TEMPO GASTO:\n${tempoGasto}`);
    }
    if (form.qualidade_entrega) {
      blocos.push(`QUALIDADE DA ENTREGA:\n${form.qualidade_entrega}`);
    }
    if (proximosPassos) {
      blocos.push(`PROXIMOS PASSOS SUGERIDOS:\n${proximosPassos}`);
    }

    if (blocos.length > 0) {
      blocos.push(
        `Finalizado por: ${user?.nome || user?.username}\nData: ${new Date().toLocaleString('pt-BR')}`
      );
    }

    return blocos.length > 0 ? blocos.join('\n\n---\n\n') : null;
  };

  const toggleSelecaoTarefa = (tarefaId, checked) => {
    setTarefasSelecionadas((current) => {
      if (checked) {
        return current.includes(tarefaId) ? current : [...current, tarefaId];
      }
      return current.filter((id) => id !== tarefaId);
    });
  };

  const toggleSelecionarTodas = (checked) => {
    if (!checked) {
      setTarefasSelecionadas([]);
      return;
    }
    setTarefasSelecionadas(tarefasSelecionaveis.map((tarefa) => tarefa.id));
  };

  const handleAbrirFinalizar = (tarefa) => {
    // Verificar se operador pode finalizar esta tarefa (apenas seu próprio setor)
    if (user?.role === 'operador') {
      const userSetor = user?.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      const tarefaSetor = tarefa.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      
      // Normalizar nomes de setores
      const setorMap = {
        'atendimento': 'atendimento',
        'criacao': 'criacao',
        'criação': 'criacao',
        'preproducao': 'pre-producao',
        'préproducao': 'pre-producao',
        'producao': 'producao',
        'produção': 'producao',
      };
      
      const userSetorNorm = setorMap[userSetor] || userSetor;
      const tarefaSetorNorm = setorMap[tarefaSetor] || tarefaSetor;
      
      if (userSetorNorm !== tarefaSetorNorm) {
        toast.error(`Você só pode finalizar tarefas do seu setor (${user?.setor}). Esta tarefa é do setor ${tarefa.setor}.`);
        return;
      }
    }
    
    // Verificar se é o responsável ou admin/gerente
    if (tarefa.responsavel_id && tarefa.responsavel_id !== user?.id && !['admin', 'gerente'].includes(user?.role)) {
      toast.error('Apenas o responsável pode finalizar esta tarefa');
      return;
    }
    
    setTarefaSelecionada(tarefa);
    setFeedbackForm({
      observacao: '',
      dificuldades: '',
      tempo_gasto: '',
      qualidade_entrega: '',
      proximos_passos: ''
    });
    setFinalizarModal(true);
  };

  const handleAbrirAtribuir = (tarefa) => {
    // Verificar permissão - apenas admin ou gerente podem atribuir
    if (!['admin', 'gerente'].includes(user?.role)) {
      toast.error('Apenas administradores e gerentes podem atribuir tarefas');
      return;
    }

    // Verificar se gerente está tentando atribuir fora de seu setor
    if (user?.role === 'gerente') {
      const userSetor = user?.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      const tarefaSetor = tarefa.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      
      const setorMap = {
        'atendimento': 'atendimento',
        'criacao': 'criacao',
        'criação': 'criacao',
        'preproducao': 'pre-producao',
        'préproducao': 'pre-producao',
        'producao': 'producao',
        'produção': 'producao',
      };
      
      const userSetorNorm = setorMap[userSetor] || userSetor;
      const tarefaSetorNorm = setorMap[tarefaSetor] || tarefaSetor;
      
      if (userSetorNorm !== tarefaSetorNorm) {
        toast.error(`Gerentes só podem atribuir tarefas de seu setor (${user?.setor})`);
        return;
      }
    }

    setTarefaParaAtribuir(tarefa);
    setAtribuirModalAberto(true);
  };

  const handleAtribuicaoSucesso = () => {
    toast.success('Tarefa atribuída com sucesso!');
    loadData(); // Recarregar tarefas
  };

  const handleFinalizar = async () => {
    const observacaoFinalizacao = buildFinalizacaoObservacao(feedbackForm);

    try {
      setFinalizando(true);

      await finalizarTarefa(tarefaSelecionada.id, {
        observacao: observacaoFinalizacao,
        usuario_id: user?.id || 'sistema',
        usuario_nome: user?.nome || user?.username || 'Sistema',
        usuario_setor: user?.setor || 'desconhecido',
        usuario_role: user?.role || 'operador',
        contrato_id_selecionado: tarefaSelecionada?.contrato_id || null
      });

      const tarefasDoProjeto = tarefas.filter(t => 
        t.projeto_id === tarefaSelecionada.projeto_id && 
        !isTarefaEfetivamenteFinalizada(t) &&
        t.id !== tarefaSelecionada.id
      );

      if (tarefasDoProjeto.length > 0) {
        const proximaTarefa = tarefasDoProjeto[0];
        if (proximaTarefa.responsavel_id) {
          try {
            await criarNotificacao({
              tipo: 'finalizacao',
              titulo: 'Nova etapa disponivel',
              mensagem: `A etapa "${tarefaSelecionada.titulo}" foi finalizada. A tarefa "${proximaTarefa.titulo}" esta aguardando sua acao.`,
              de_usuario_id: user?.id || 'sistema',
              de_usuario_nome: user?.nome || user?.username || 'Sistema',
              para_usuario_id: proximaTarefa.responsavel_id,
              para_usuario_nome: proximaTarefa.responsavel_nome,
              tarefa_id: proximaTarefa.id,
              projeto_id: proximaTarefa.projeto_id
            });
          } catch (err) {
            console.log('Erro ao notificar proximo responsavel:', err);
          }
        }
      }

      toast.success(
        <div>
          <p className="font-semibold">Tarefa finalizada com sucesso!</p>
          <p className="text-sm">
            {observacaoFinalizacao ? 'As observacoes foram registradas no historico.' : 'A etapa foi concluida sem observacao adicional.'}
          </p>
        </div>
      );

      setFinalizarModal(false);
      setTarefaSelecionada(null);
      loadData();
    } catch (error) {
      console.error('Erro ao finalizar tarefa:', error);
      toast.error('Erro ao finalizar tarefa');
    } finally {
      setFinalizando(false);
    }
  };

  const handleFinalizarLote = async () => {
    if (user?.role !== 'admin') {
      toast.error('A finalizacao em lote esta disponivel apenas para administradores');
      return;
    }

    if (tarefasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma tarefa para finalizar em lote');
      return;
    }

    try {
      setFinalizandoLote(true);
      const observacaoFinalizacao = buildFinalizacaoObservacao(feedbackFormLote);
      const response = await finalizarTarefasLote({
        tarefa_ids: tarefasSelecionadas,
        observacao: observacaoFinalizacao,
        usuario_id: user?.id || 'sistema',
        usuario_nome: user?.nome || user?.username || 'Sistema',
        usuario_setor: user?.setor || 'administracao',
        usuario_role: user?.role || 'admin',
      });

      toast.success(
        `${response?.total_finalizadas || 0} tarefa(s) finalizada(s) em lote`
      );

      if ((response?.total_ignoradas || 0) > 0 || (response?.total_erros || 0) > 0) {
        toast.info(
          `${response?.total_ignoradas || 0} ignorada(s) e ${response?.total_erros || 0} com erro`
        );
      }

      setFinalizarLoteModal(false);
      setTarefasSelecionadas([]);
      setFeedbackFormLote({
        observacao: '',
        dificuldades: '',
        tempo_gasto: '',
        qualidade_entrega: '',
        proximos_passos: ''
      });
      await loadData();
    } catch (error) {
      console.error('Erro ao finalizar tarefas em lote:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao finalizar tarefas em lote');
    } finally {
      setFinalizandoLote(false);
    }
  };

  const getStatusBadge = (tarefa) => {
    if (isTarefaEfetivamenteFinalizada(tarefa)) {
      return (
        <span className="status-badge status-concluido">
          Concluido
        </span>
      );
    }

    if (tarefa.atrasada) {
      return (
        <span className="status-badge status-atrasado">
          <AlertTriangle size={12} />
          {tarefa.dias_atraso} dias atrasado
        </span>
      );
    }

    const colors = {
      'Pendente': 'status-pendente',
      'Em Andamento': 'status-ativo',
      'Aguardando': 'status-aguardando',
      'Concluído': 'status-concluido'
    };

    return <span className={`status-badge ${colors[tarefa.status_nome] || 'status-pendente'}`}>{tarefa.status_nome}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getContratoNumero = (tarefa) => tarefa?.contrato_numero || tarefa?.contrato_id || 'Sem contrato';
  const getContratoFaculdade = (tarefa) => tarefa?.contrato_faculdade || 'Faculdade nao informada';
  const getContratoCurso = (tarefa) => tarefa?.contrato_curso || null;

  if (loading) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin" size={48} />
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="departamento-container p-6">
        {/* Header */}
        <div className="mb-6">
          <div 
            className="departamento-header p-6 rounded-lg mb-6"
            style={{ backgroundColor: deptInfo.cor + '15', borderLeft: `4px solid ${deptInfo.cor}` }}
          >
            <h1 className="departamento-title" style={{ color: deptInfo.cor }}>
              {deptInfo.nome}
            </h1>
            {deptInfo.descricao && (
              <p className="departamento-description">{deptInfo.descricao}</p>
            )}
            {equipeUsuarios.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {equipeUsuarios.map((usuario) => (
                  <Badge key={usuario.id} variant="outline" className="badge membro-badge">
                    <User size={12} className="mr-1" />
                    {usuario.nome}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="departamento-stats">
            <div className="stat-item">
              <div>
                <span className="stat-label">Total</span>
                <span className="stat-value">{stats.total}</span>
              </div>
              <FileText size={32} className="stat-icon stat-icon-primary" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Pendentes</span>
                <span className="stat-value">{stats.pendentes}</span>
              </div>
              <Clock size={32} className="stat-icon stat-icon-muted" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Em Andamento</span>
                <span className="stat-value">{stats.emAndamento}</span>
              </div>
              <Play size={32} className="stat-icon stat-icon-primary" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Atrasadas</span>
                <span className="stat-value">{stats.atrasadas}</span>
              </div>
              <AlertTriangle size={32} className="stat-icon stat-icon-danger" />
            </div>

            <div className="stat-item">
              <div>
                <span className="stat-label">Finalizadas</span>
                <span className="stat-value">{stats.finalizadas}</span>
              </div>
              <CheckCircle2 size={32} className="stat-icon stat-icon-success" />
            </div>
             
            <div className="stat-item">
              <div>
                <span className="stat-label">Prazo Médio</span>
                <span className="stat-value">{stats.prazoMedio} dias</span>
              </div>
              <TrendingUp size={32} className="stat-icon stat-icon-success" />
            </div>
          </div>

          {['admin', 'gerente'].includes(user?.role) && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    value={filtroResponsavel}
                    onChange={(e) => setFiltroResponsavel(e.target.value)}
                  >
                    <option value="todos">Todas as pessoas da equipe</option>
                    {equipeUsuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    value={filtroContrato}
                    onChange={(e) => setFiltroContrato(e.target.value)}
                  >
                    <option value="todos">Todos os contratos</option>
                    {contratosDisponiveis.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {contrato.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant={abaStatus === 'abertas' ? 'default' : 'outline'}
                  onClick={() => setAbaStatus('abertas')}
                >
                  Em aberto ({tarefasAbertas.length})
                </Button>
                <Button
                  type="button"
                  variant={abaStatus === 'finalizadas' ? 'default' : 'outline'}
                  onClick={() => setAbaStatus('finalizadas')}
                >
                  Finalizadas ({tarefasFinalizadas.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Bloco de Finalizados
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaStatus('finalizadas')}
                >
                  Ver lista completa
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {tarefasFinalizadasRecentes.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma etapa finalizada no contexto atual.</p>
              ) : (
                <div className="space-y-3">
                  {tarefasFinalizadasRecentes.map((tarefa) => (
                    <div key={tarefa.id} className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-green-900">{tarefa.titulo}</div>
                          <div className="departamento-task-context mt-2">
                            <div className="departamento-task-chip">
                              <FileText size={12} />
                              <span>Contrato: {getContratoNumero(tarefa)}</span>
                            </div>
                            <div className="departamento-task-chip secondary">
                              <Building2 size={12} />
                              <span>Faculdade: {getContratoFaculdade(tarefa)}</span>
                            </div>
                            {getContratoCurso(tarefa) && (
                              <div className="departamento-task-chip secondary">
                                <FileText size={12} />
                                <span>Curso: {getContratoCurso(tarefa)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Finalizada em {formatDate(tarefa.data_finalizacao)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={20} />
                Tarefas do Departamento
              </span>
              {user?.role === 'admin' && abaStatus === 'abertas' && tarefasSelecionaveis.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 text-gray-600">
                    <Checkbox
                      checked={todasSelecionadas}
                      onCheckedChange={(checked) => toggleSelecionarTodas(Boolean(checked))}
                    />
                    <span>Selecionar todas</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={tarefasSelecionadas.length === 0}
                    onClick={() => {
                      setFeedbackFormLote({
                        observacao: '',
                        dificuldades: '',
                        tempo_gasto: '',
                        qualidade_entrega: '',
                        proximos_passos: ''
                      });
                      setFinalizarLoteModal(true);
                    }}
                  >
                    Finalizar em lote ({tarefasSelecionadas.length})
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tarefasVisiveis.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {abaStatus === 'finalizadas'
                    ? 'Nenhuma tarefa finalizada encontrada'
                    : 'Nenhuma tarefa em aberto no momento'}
                </p>
                <p className="text-sm mt-2">Parabéns! Todas as tarefas estão concluídas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasVisiveis.map((tarefa) => (
                  <div 
                    key={tarefa.id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                      tarefa.atrasada ? 'bg-red-50 border-red-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      {user?.role === 'admin' && abaStatus === 'abertas' && (
                        <div className="pt-1">
                          <Checkbox
                            checked={tarefasSelecionadas.includes(tarefa.id)}
                            onCheckedChange={(checked) => toggleSelecaoTarefa(tarefa.id, Boolean(checked))}
                            aria-label={`Selecionar tarefa ${tarefa.titulo}`}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{tarefa.titulo}</h3>
                        {tarefa.descricao && (
                          <p className="text-sm text-gray-600 mb-2">{tarefa.descricao}</p>
                        )}

                        <div className="departamento-task-context">
                          <div className="departamento-task-chip">
                            <FileText size={12} />
                            <span>Contrato: {getContratoNumero(tarefa)}</span>
                          </div>
                          <div className="departamento-task-chip secondary">
                            <Building2 size={12} />
                            <span>Faculdade: {getContratoFaculdade(tarefa)}</span>
                          </div>
                          {getContratoCurso(tarefa) && (
                            <div className="departamento-task-chip secondary">
                              <FileText size={12} />
                              <span>Curso: {getContratoCurso(tarefa)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getStatusBadge(tarefa)}
                          
                          {tarefa.responsavel_nome && (
                            <Badge variant="outline" className="bg-white">
                              <User size={12} className="mr-1" />
                              {tarefa.responsavel_nome}
                            </Badge>
                          )}
                          
                          {tarefa.prazo && (
                            <Badge variant="outline" className="bg-white">
                              <Calendar size={12} className="mr-1" />
                              Prazo: {formatDate(tarefa.prazo)}
                            </Badge>
                          )}

                          {isTarefaEfetivamenteFinalizada(tarefa) && tarefa.data_finalizacao && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 size={12} className="mr-1" />
                              Finalizada em {formatDate(tarefa.data_finalizacao)}
                            </Badge>
                          )}
                        </div>
                      </div>
                       
                      <div className="ml-4 flex gap-2">
                        {['admin', 'gerente'].includes(user?.role) && !isTarefaEfetivamenteFinalizada(tarefa) && (
                          <Button
                            onClick={() => handleAbrirAtribuir(tarefa)}
                            variant="outline"
                            className="btn-ghost btn-ghost-blue"
                          >
                            <UserPlus size={16} className="mr-2" />
                            Atribuir
                          </Button>
                        )}
                        {!isTarefaEfetivamenteFinalizada(tarefa) && (
                          <Button
                            onClick={() => handleAbrirFinalizar(tarefa)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check size={16} className="mr-2" />
                            Finalizar Etapa
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Timeline de progresso */}
                    {tarefa.historico && tarefa.historico.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500 mb-2">Histórico recente:</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock size={12} />
                          <span>
                            Última atualização: {new Date(tarefa.atualizado_em).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Finalizar */}
        <Dialog open={finalizarModal} onOpenChange={setFinalizarModal}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" />
                Finalizar Etapa
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Info da tarefa */}
                {tarefaSelecionada && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">{tarefaSelecionada.titulo}</h4>
                    {tarefaSelecionada.descricao && (
                      <p className="text-sm text-blue-800">{tarefaSelecionada.descricao}</p>
                    )}
                    <div className="departamento-task-context mt-3">
                      <div className="departamento-task-chip">
                        <FileText size={12} />
                        <span>Contrato: {getContratoNumero(tarefaSelecionada)}</span>
                      </div>
                      <div className="departamento-task-chip secondary">
                        <Building2 size={12} />
                        <span>Faculdade: {getContratoFaculdade(tarefaSelecionada)}</span>
                      </div>
                      {getContratoCurso(tarefaSelecionada) && (
                        <div className="departamento-task-chip secondary">
                          <FileText size={12} />
                          <span>Curso: {getContratoCurso(tarefaSelecionada)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Formulário de feedback */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">
                      Como foi a execucao desta tarefa? (opcional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Registre o que foi feito, resultados e qualquer contexto importante, se quiser.
                    </p>
                    <Textarea
                      rows={4}
                      value={feedbackForm.observacao}
                      onChange={(e) => setFeedbackForm({...feedbackForm, observacao: e.target.value})}
                      placeholder="Exemplo: Realizei a reunião com a comissão, apresentei 3 propostas de layout e a comissão aprovou a proposta 2 com pequenas alterações nas cores..."
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {feedbackForm.observacao.length} caracteres preenchidos
                    </p>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Houve alguma dificuldade ou impedimento? (opcional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Use este campo apenas se quiser registrar algum ponto de atencao.
                    </p>
                    <Textarea
                      rows={3}
                      value={feedbackForm.dificuldades}
                      onChange={(e) => setFeedbackForm({...feedbackForm, dificuldades: e.target.value})}
                      placeholder="Exemplo: Dificuldade em contactar um membro da comissão / Nenhuma dificuldade"
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Tempo gasto (opcional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Quanto tempo levou para concluir esta etapa?
                    </p>
                    <input
                      type="text"
                      value={feedbackForm.tempo_gasto}
                      onChange={(e) => setFeedbackForm({...feedbackForm, tempo_gasto: e.target.value})}
                      placeholder="Exemplo: 2 horas / 1 dia / 3 horas distribuídas em 2 dias"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Qualidade da entrega
                    </Label>
                    <select
                      value={feedbackForm.qualidade_entrega}
                      onChange={(e) => setFeedbackForm({...feedbackForm, qualidade_entrega: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md mt-2"
                    >
                      <option value="">Selecionar apenas se quiser classificar</option>
                      <option value="excelente">Excelente - Superou expectativas</option>
                      <option value="boa">Boa - Atendeu plenamente</option>
                      <option value="satisfatoria">Satisfatória - Atendeu minimamente</option>
                      <option value="insatisfatoria">Insatisfatória - Precisa revisão</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Próximos passos ou recomendações (opcional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Sugestões para o próximo responsável ou melhorias no processo
                    </p>
                    <Textarea
                      rows={3}
                      value={feedbackForm.proximos_passos}
                      onChange={(e) => setFeedbackForm({...feedbackForm, proximos_passos: e.target.value})}
                      placeholder="Exemplo: Recomendo que o próximo responsável verifique os arquivos na pasta X antes de iniciar..."
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setFinalizarModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalizar}
                disabled={finalizando}
                className="bg-green-600 hover:bg-green-700"
              >
                {finalizando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finalizar Etapa
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Atribuição de Tarefa */}
        <Dialog open={finalizarLoteModal} onOpenChange={setFinalizarLoteModal}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" />
                Finalizar Tarefas em Lote
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-semibold text-amber-900">
                    {tarefasSelecionadas.length} tarefa(s) selecionada(s)
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    Esta acao sera aplicada apenas as tarefas abertas visiveis no filtro atual.
                  </p>
                  <div className="mt-3 space-y-2">
                    {tarefasSelecionadasVisiveis.map((tarefa) => (
                      <div key={tarefa.id} className="text-sm text-amber-900">
                        {tarefa.titulo} • {getContratoNumero(tarefa)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">
                      Observacao geral da finalizacao (opcional)
                    </Label>
                    <Textarea
                      rows={4}
                      value={feedbackFormLote.observacao}
                      onChange={(e) => setFeedbackFormLote({ ...feedbackFormLote, observacao: e.target.value })}
                      placeholder="Descreva o contexto da finalizacao em lote, se necessario."
                      className="resize-none mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Dificuldades ou observacoes adicionais (opcional)
                    </Label>
                    <Textarea
                      rows={3}
                      value={feedbackFormLote.dificuldades}
                      onChange={(e) => setFeedbackFormLote({ ...feedbackFormLote, dificuldades: e.target.value })}
                      placeholder="Informe excecoes, bloqueios removidos ou contexto relevante."
                      className="resize-none mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Tempo gasto (opcional)
                    </Label>
                    <input
                      type="text"
                      value={feedbackFormLote.tempo_gasto}
                      onChange={(e) => setFeedbackFormLote({ ...feedbackFormLote, tempo_gasto: e.target.value })}
                      placeholder="Exemplo: 1 hora / 1 turno"
                      className="w-full px-3 py-2 border rounded-md mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Qualidade da entrega
                    </Label>
                    <select
                      value={feedbackFormLote.qualidade_entrega}
                      onChange={(e) => setFeedbackFormLote({ ...feedbackFormLote, qualidade_entrega: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md mt-2"
                    >
                      <option value="">Selecionar apenas se quiser classificar</option>
                      <option value="excelente">Excelente - Superou expectativas</option>
                      <option value="boa">Boa - Atendeu plenamente</option>
                      <option value="satisfatoria">Satisfatoria - Atendeu minimamente</option>
                      <option value="insatisfatoria">Insatisfatoria - Precisa revisao</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Proximos passos ou recomendacoes (opcional)
                    </Label>
                    <Textarea
                      rows={3}
                      value={feedbackFormLote.proximos_passos}
                      onChange={(e) => setFeedbackFormLote({ ...feedbackFormLote, proximos_passos: e.target.value })}
                      placeholder="Sugestoes gerais para as proximas etapas."
                      className="resize-none mt-2"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setFinalizarLoteModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleFinalizarLote}
                disabled={finalizandoLote || tarefasSelecionadas.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {finalizandoLote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finalizar selecionadas
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AtribuirTarefaModal
          isOpen={atribuirModalAberto}
          onClose={() => {
            setAtribuirModalAberto(false);
            setTarefaParaAtribuir(null);
          }}
          tarefa={tarefaParaAtribuir}
          onSuccess={handleAtribuicaoSucesso}
        />
      </div>
    </LayoutNovo>
  );
};

export default DepartamentoViewNovo;

