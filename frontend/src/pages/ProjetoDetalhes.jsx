import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  registrarAditivoContrato,
  listarUsuariosSetor,
  atualizarResponsaveisProjeto,
  atualizarPrazosProjeto,
  finalizarTarefasLote,
} from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import TarefaDetalhesModal from '../components/TarefaDetalhesModal';
import EditarTarefaModal from '../components/EditarTarefaModal';
import FinalizarTarefaModal from '../components/FinalizarTarefaModal';
import AtribuirTarefaModal from '../components/AtribuirTarefaModal';
import { getStatusFiltroDaTarefa, isTarefaEfetivamenteFinalizada } from '../lib/projetos';

const prioridadeDaTarefa = (tarefa) => (tarefa?.prioridade || 'media').toLowerCase();

const extractErrorMsg = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || String(e)).join('; ');
  return detail || fallback;
};

const normalizeSetor = (setor = '') => String(setor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z]/g, '');

const formatDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const SETOR_ORDER = [
  'atendimento',
  'criacao',
  'pre-producao',
  'producao',
];

const ProjetoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdminOrGerente } = useAuth();
  const [projeto, setProjeto] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const [setorAtivo, setSetorAtivo] = useState('');
  const setorEscolhidoRef = useRef('');
  const [aditivoDate, setAditivoDate] = useState('');
  const [salvandoAditivo, setSalvandoAditivo] = useState(false);
  const [operadoresAtendimento, setOperadoresAtendimento] = useState([]);
  const [operadoresCriacao, setOperadoresCriacao] = useState([]);
  const [responsaveisProjeto, setResponsaveisProjeto] = useState({
    atendimento: '',
    criacao: '',
  });
  const [aplicarResponsaveisEmFinalizadas, setAplicarResponsaveisEmFinalizadas] = useState(true);
  const [salvandoResponsaveis, setSalvandoResponsaveis] = useState(false);
  const [prazosProjeto, setPrazosProjeto] = useState([]);
  const [salvandoPrazos, setSalvandoPrazos] = useState(false);
  const [tarefasSelecionadas, setTarefasSelecionadas] = useState([]);
  const [finalizarLoteModal, setFinalizarLoteModal] = useState(false);
  const [finalizandoLote, setFinalizandoLote] = useState(false);
  const [feedbackFormLote, setFeedbackFormLote] = useState({ observacao: '' });

  const canManageProjeto = isAdminOrGerente ? isAdminOrGerente() : false;
  const setorUsuarioNormalizado = normalizeSetor(user?.setor);
  const canManageSetorProjeto = useCallback((setor) => (
    user?.role === 'admin' || setorUsuarioNormalizado === normalizeSetor(setor)
  ), [setorUsuarioNormalizado, user?.role]);

  useEffect(() => {
    if (!canManageProjeto) return;

    const carregarOperadores = async () => {
      try {
        if (canManageSetorProjeto('atendimento')) {
          const atendimento = await listarUsuariosSetor('atendimento', user?.role || 'admin', user?.setor || undefined);
          setOperadoresAtendimento(Array.isArray(atendimento) ? atendimento : []);
        } else {
          setOperadoresAtendimento([]);
        }

        if (canManageSetorProjeto('criacao')) {
          const criacao = await listarUsuariosSetor('criacao', user?.role || 'admin', user?.setor || undefined);
          setOperadoresCriacao(Array.isArray(criacao) ? criacao : []);
        } else {
          setOperadoresCriacao([]);
        }
      } catch (error) {
        console.error('Erro ao carregar operadores do projeto:', error);
      }
    };

    carregarOperadores();
  }, [canManageProjeto, canManageSetorProjeto, user?.role, user?.setor]);

  const loadProjeto = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjeto(
        id,
        user?.role || 'operador',
        user?.id || null,
        user?.setor || null
      );
      setProjeto(data);
      setAditivoDate(data?.contrato?.data_aditivo || '');
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      if (error?.response?.status === 403) {
        toast.error(extractErrorMsg(error, 'Acesso negado a este projeto'));
      } else {
        toast.error(extractErrorMsg(error, 'Erro ao carregar detalhes do projeto'));
      }
      setProjeto(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, user?.role, user?.setor]);

  useEffect(() => {
    loadProjeto();
  }, [loadProjeto]);

  useEffect(() => {
    const contratos = projeto?.contratos || [];
    const contratoExiste = contratos.some((contrato) => contrato.id === filtroContrato);
    if (filtroContrato !== 'todos' && !contratoExiste) {
      setFiltroContrato('todos');
    }
  }, [filtroContrato, projeto]);

  const handleRegistrarAditivo = async () => {
    const contratoId = projeto?.contrato?.id || contratosProjeto[0]?.id;
    if (!contratoId) {
      toast.error('Contrato principal nao encontrado');
      return;
    }

    if (!aditivoDate) {
      toast.error('Informe a data de aditivo');
      return;
    }

    try {
      setSalvandoAditivo(true);
      const result = await registrarAditivoContrato(contratoId, aditivoDate, {
        user_role: user?.role || 'operador',
        user_id: user?.id || null,
        user_setor: user?.setor || null,
      });
      toast.success(
        `Aditivo aplicado. ${result?.prazos_recalculados?.length || 0} etapa(s) recalculada(s).`
      );
      await loadProjeto();
    } catch (error) {
      console.error('Erro ao aplicar aditivo:', error);
      toast.error(extractErrorMsg(error, 'Erro ao aplicar aditivo'));
    } finally {
      setSalvandoAditivo(false);
    }
  };

  const getResponsavelProjetoPorSetor = useCallback((setor) => (
    (projeto?.tarefas || []).find(
      (tarefa) => normalizeSetor(tarefa.setor) === normalizeSetor(setor) && tarefa.responsavel_id
    ) || null
  ), [projeto]);

  const buildOperatorOptions = (usuarios, selectedId, fallbackNome) => {
    const lista = Array.isArray(usuarios) ? [...usuarios] : [];
    if (selectedId && !lista.some((usuario) => usuario.id === selectedId)) {
      lista.unshift({
        id: selectedId,
        nome: fallbackNome || 'Responsavel atual',
      });
    }
    return lista;
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

  const contratoPrincipalDetalhes = projeto?.contrato || contratosProjeto[0] || null;
  const enriquecerTarefaComContrato = useCallback((tarefa) => {
    if (!tarefa) return tarefa;
    const contratoMeta = contratosProjeto.find((contrato) => contrato.id === tarefa.contrato_id)
      || contratoPrincipalDetalhes
      || null;

    return {
      ...tarefa,
      contrato_numero: tarefa.contrato_numero || contratoMeta?.numero_contrato || tarefa.contrato_id,
      contrato_cliente: tarefa.contrato_cliente || contratoMeta?.cliente || projeto?.cliente,
      contrato_faculdade: tarefa.contrato_faculdade || contratoMeta?.faculdade || null,
      contrato_curso: tarefa.contrato_curso || contratoMeta?.curso || null,
    };
  }, [contratoPrincipalDetalhes, contratosProjeto, projeto?.cliente]);

  const responsavelAtualAtendimento = useMemo(
    () => getResponsavelProjetoPorSetor('atendimento'),
    [getResponsavelProjetoPorSetor]
  );
  const responsavelAtualCriacao = useMemo(
    () => getResponsavelProjetoPorSetor('criacao'),
    [getResponsavelProjetoPorSetor]
  );
  const opcoesAtendimento = useMemo(
    () => buildOperatorOptions(
      operadoresAtendimento,
      responsaveisProjeto.atendimento,
      responsavelAtualAtendimento?.responsavel_nome
    ),
    [operadoresAtendimento, responsaveisProjeto.atendimento, responsavelAtualAtendimento]
  );
  const opcoesCriacao = useMemo(
    () => buildOperatorOptions(
      operadoresCriacao,
      responsaveisProjeto.criacao,
      responsavelAtualCriacao?.responsavel_nome
    ),
    [operadoresCriacao, responsaveisProjeto.criacao, responsavelAtualCriacao]
  );
  const prazosProjetoMap = useMemo(
    () => Object.fromEntries((prazosProjeto || []).map((item) => [item.tarefa_id, item.prazo || ''])),
    [prazosProjeto]
  );
  const tarefasPrazoEditaveis = useMemo(() => (
    (projeto?.tarefas || [])
      .filter((tarefa) => !isTarefaEfetivamenteFinalizada(tarefa))
      .sort((a, b) => sortKey(a) - sortKey(b))
      .map((tarefa) => ({
        ...tarefa,
        prazo_editavel: prazosProjetoMap[tarefa.id] ?? formatDateInput(tarefa.prazo),
      }))
  ), [projeto, prazosProjetoMap]);
  const totalPrazosAlterados = useMemo(() => (
    tarefasPrazoEditaveis.filter(
      (tarefa) => tarefa.prazo_editavel !== formatDateInput(tarefa.prazo)
    ).length
  ), [tarefasPrazoEditaveis]);

  useEffect(() => {
    if (!projeto) return;

    const tarefasProjeto = projeto.tarefas || [];
    const responsavelAtendimento = tarefasProjeto.find(
      (tarefa) => normalizeSetor(tarefa.setor) === 'atendimento' && tarefa.responsavel_id
    );
    const responsavelCriacao = tarefasProjeto.find(
      (tarefa) => normalizeSetor(tarefa.setor) === 'criacao' && tarefa.responsavel_id
    );

    setResponsaveisProjeto({
      atendimento: responsavelAtendimento?.responsavel_id || '',
      criacao: responsavelCriacao?.responsavel_id || '',
    });

    setPrazosProjeto(
      tarefasProjeto
        .filter((tarefa) => !isTarefaEfetivamenteFinalizada(tarefa))
        .map((tarefa) => ({
          tarefa_id: tarefa.id,
          prazo: formatDateInput(tarefa.prazo),
        }))
    );
  }, [projeto]);

  const tarefasFiltradas = useMemo(() => {
    const base = projeto?.tarefas || [];

    return base.filter((tarefa) => {
      if (filtroContrato !== 'todos' && tarefa.contrato_id !== filtroContrato) {
        return false;
      }

      if (filtroStatus !== 'todos' && getStatusFiltroDaTarefa(tarefa) !== filtroStatus) {
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

  function sortKey(tarefa) {
    const candidates = [tarefa.prazo_original, tarefa.prazo, tarefa.criado_em];
    for (const value of candidates) {
      if (!value) continue;
      const dt = new Date(value);
      if (!Number.isNaN(dt.getTime())) {
        return dt.getTime();
      }
    }
    return 0;
  }

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

  const setoresOrdenados = useMemo(() => {
    return Object.keys(tarefasPorSetor).sort((a, b) => {
      const ai = SETOR_ORDER.indexOf(a);
      const bi = SETOR_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [tarefasPorSetor]);

  const tarefasAbertasDoSetorAtivo = useMemo(
    () => (user?.role === 'admin' && setorAtivo
      ? (tarefasPorSetor[setorAtivo] || []).filter((t) => !isTarefaEfetivamenteFinalizada(t))
      : []),
    [user?.role, setorAtivo, tarefasPorSetor],
  );

  const todasSelecionadasNoSetor = tarefasAbertasDoSetorAtivo.length > 0
    && tarefasAbertasDoSetorAtivo.every((t) => tarefasSelecionadas.includes(t.id));

  const handleSetorChange = useCallback((setor) => {
    setorEscolhidoRef.current = setor;
    setSetorAtivo(setor);
    setTarefasSelecionadas([]);
  }, []);

  useEffect(() => {
    if (setoresOrdenados.length === 0) {
      if (setorAtivo) {
        setSetorAtivo('');
      }
      return;
    }

    if (setorAtivo && setoresOrdenados.includes(setorAtivo)) {
      return;
    }

    // Restore the sector the user last chose manually, if it still exists
    if (setorEscolhidoRef.current && setoresOrdenados.includes(setorEscolhidoRef.current)) {
      setSetorAtivo(setorEscolhidoRef.current);
      return;
    }

    const setorUsuario = setoresOrdenados.find(
      (setor) => normalizeSetor(setor) === setorUsuarioNormalizado
    );

    setSetorAtivo(setorUsuario || setoresOrdenados[0]);
  }, [setorAtivo, setorUsuarioNormalizado, setoresOrdenados]);

  const resumoFiltrado = useMemo(() => {
    const total = tarefasFiltradas.length;
    const concluidas = tarefasFiltradas.filter((t) => isTarefaEfetivamenteFinalizada(t)).length;
    const emAndamento = tarefasFiltradas.filter((t) => (
      !isTarefaEfetivamenteFinalizada(t)
      && (t.status_nome || '').toLowerCase() === 'em andamento'
    )).length;
    const pendentes = total - concluidas - emAndamento;
    return { total, concluidas, emAndamento, pendentes };
  }, [tarefasFiltradas]);

  const handleTarefaClick = (tarefa) => {
    setSelectedTarefa(enriquecerTarefaComContrato(tarefa));
    setShowDetalhesModal(true);
  };

  const handleEditar = (tarefa) => {
    setSelectedTarefa(enriquecerTarefaComContrato(tarefa));
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

    setSelectedTarefa(enriquecerTarefaComContrato(tarefa));
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

    setTarefaParaAtribuir(enriquecerTarefaComContrato(tarefa));
    setShowAtribuirModal(true);
  };

  const toggleSelecaoTarefa = useCallback((tarefaId, checked) => {
    setTarefasSelecionadas((prev) => (checked
      ? prev.includes(tarefaId) ? prev : [...prev, tarefaId]
      : prev.filter((id) => id !== tarefaId)));
  }, []);

  const toggleSelecionarTodasDoSetor = useCallback((checked) => {
    if (!checked) {
      setTarefasSelecionadas([]);
      return;
    }
    setTarefasSelecionadas(tarefasAbertasDoSetorAtivo.map((t) => t.id));
  }, [tarefasAbertasDoSetorAtivo]);

  const handleFinalizarLote = async () => {
    if (tarefasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma tarefa para finalizar em lote');
      return;
    }
    try {
      setFinalizandoLote(true);
      const response = await finalizarTarefasLote({
        tarefa_ids: tarefasSelecionadas,
        observacao: feedbackFormLote.observacao.trim() || null,
        usuario_id: user?.id || 'sistema',
        usuario_nome: user?.nome || user?.username || 'Sistema',
        usuario_setor: user?.setor || '',
        usuario_role: user?.role || 'admin',
      });
      toast.success(`${response?.total_finalizadas || 0} tarefa(s) finalizada(s) em lote`);
      if ((response?.total_ignoradas || 0) > 0 || (response?.total_erros || 0) > 0) {
        toast.info(`${response?.total_ignoradas || 0} ignorada(s), ${response?.total_erros || 0} com erro`);
      }
      setTarefasSelecionadas([]);
      setFeedbackFormLote({ observacao: '' });
      setFinalizarLoteModal(false);
      await loadProjeto();
    } catch (error) {
      console.error('Erro ao finalizar tarefas em lote:', error);
      toast.error(extractErrorMsg(error, 'Erro ao finalizar tarefas em lote'));
    } finally {
      setFinalizandoLote(false);
    }
  };

  const handleSalvarResponsaveisProjeto = async () => {
    if (!canManageProjeto) {
      toast.error('Apenas administradores e gerentes podem atualizar responsaveis do projeto');
      return;
    }

    try {
      setSalvandoResponsaveis(true);
      const response = await atualizarResponsaveisProjeto(id, {
        user_role: user?.role || 'admin',
        user_id: user?.id || null,
        user_nome: user?.nome || user?.username || 'Sistema',
        user_setor: user?.setor || null,
        responsavel_atendimento_id: responsaveisProjeto.atendimento || null,
        responsavel_criacao_id: responsaveisProjeto.criacao || null,
        aplicar_finalizadas: aplicarResponsaveisEmFinalizadas,
      });

      toast.success(
        `Responsaveis atualizados em ${response?.atualizacoes?.length || 0} tarefa(s) do projeto`
      );
      if (response?.projeto) {
        setProjeto(response.projeto);
      } else {
        await loadProjeto();
      }
    } catch (error) {
      console.error('Erro ao atualizar responsaveis do projeto:', error);
      toast.error(extractErrorMsg(error, 'Erro ao atualizar responsaveis do projeto'));
    } finally {
      setSalvandoResponsaveis(false);
    }
  };

  const handlePrazoProjetoChange = (tarefaId, prazo) => {
    setPrazosProjeto((prev) => prev.map((item) => (
      item.tarefa_id === tarefaId
        ? { ...item, prazo }
        : item
    )));
  };

  const handleSalvarPrazosProjeto = async () => {
    if (!canManageProjeto) {
      toast.error('Apenas administradores e gerentes podem ajustar prazos do projeto');
      return;
    }

    const payload = tarefasPrazoEditaveis
      .filter((tarefa) => tarefa.prazo_editavel !== formatDateInput(tarefa.prazo))
      .map((tarefa) => ({
        tarefa_id: tarefa.id,
        prazo: tarefa.prazo_editavel || null,
      }))
      .filter((item) => item.prazo);

    if (payload.length === 0) {
      toast.error('Nenhum prazo foi alterado');
      return;
    }

    try {
      setSalvandoPrazos(true);
      const response = await atualizarPrazosProjeto(id, {
        user_role: user?.role || 'admin',
        user_id: user?.id || null,
        user_nome: user?.nome || user?.username || 'Sistema',
        user_setor: user?.setor || null,
        prazos: payload,
      });

      toast.success(
        `${response?.tarefas_atualizadas?.length || payload.length} prazo(s) atualizados no projeto`
      );
      if (response?.projeto) {
        setProjeto(response.projeto);
      } else {
        await loadProjeto();
      }
    } catch (error) {
      console.error('Erro ao atualizar prazos do projeto:', error);
      toast.error(extractErrorMsg(error, 'Erro ao atualizar prazos do projeto'));
    } finally {
      setSalvandoPrazos(false);
    }
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
      toast.error(extractErrorMsg(err, 'Erro ao excluir tarefa'));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getContratoMetaTarefa = (tarefa) => (
    contratosProjeto.find((contrato) => contrato.id === tarefa?.contrato_id) || contratoPrincipalDetalhes || null
  );

  const getContratoNumeroTarefa = (tarefa) => (
    getContratoMetaTarefa(tarefa)?.numero_contrato || tarefa?.contrato_id || 'Sem contrato'
  );

  const getContratoFaculdadeTarefa = (tarefa) => (
    getContratoMetaTarefa(tarefa)?.faculdade || 'Faculdade nao informada'
  );

  const getContratoCursoTarefa = (tarefa) => (
    getContratoMetaTarefa(tarefa)?.curso || null
  );

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
    if (isTarefaEfetivamenteFinalizada(tarefa)) {
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
            <CardTitle>Contrato e Aditivo</CardTitle>
          </CardHeader>
          <CardContent>
            {!contratoPrincipalDetalhes ? (
              <p className="text-sm text-gray-500">Nenhum contrato associado</p>
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
                  <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {contratosProjeto.map((contrato) => (
                      <Badge key={contrato.id} variant="outline" className="bg-white">
                        {contrato.numero_contrato || contrato.id} - {contrato.status || 'Ativo'}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border p-3 bg-white">
                      <div className="text-xs text-gray-500 mb-1">Numero do contrato</div>
                      <div className="font-semibold text-gray-900">
                        {contratoPrincipalDetalhes.numero_contrato || contratoPrincipalDetalhes.id}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <div className="text-xs text-gray-500 mb-1">Cliente / Faculdade</div>
                      <div className="font-semibold text-gray-900">
                        {contratoPrincipalDetalhes.cliente || projeto.cliente}
                        {contratoPrincipalDetalhes.faculdade ? ` - ${contratoPrincipalDetalhes.faculdade}` : ''}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <div className="text-xs text-gray-500 mb-1">Curso</div>
                      <div className="font-semibold text-gray-900">
                        {contratoPrincipalDetalhes.curso || 'Nao informado'}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <div className="text-xs text-gray-500 mb-1">Previsao atual</div>
                      <div className="font-semibold text-gray-900">
                        {formatDate(projeto.data_fim_prevista)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-900">
                    <Calendar size={16} />
                    Data de aditivo
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Ajusta proporcionalmente as etapas nao finalizadas deste contrato ate a nova data final.
                  </p>
                  <div className="space-y-3">
                    <div className="text-xs text-slate-600">
                      Ultimo aditivo: {contratoPrincipalDetalhes.data_aditivo ? formatDate(contratoPrincipalDetalhes.data_aditivo) : 'Nao informado'}
                    </div>
                    <input
                      type="date"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                      value={aditivoDate}
                      onChange={(e) => setAditivoDate(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleRegistrarAditivo}
                      disabled={salvandoAditivo}
                    >
                      {salvandoAditivo ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        'Aplicar aditivo'
                      )}
                    </Button>
                  </div>
                </div>
                </div>

                {canManageProjeto && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  <div className="rounded-xl border bg-white p-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Responsaveis do projeto</div>
                      <p className="text-xs text-slate-600 mt-1">
                        Atualize atendimento e criacao no projeto e replique a troca em todas as tarefas do contrato.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Atendimento</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                          value={responsaveisProjeto.atendimento}
                          disabled={!canManageSetorProjeto('atendimento')}
                          onChange={(e) => setResponsaveisProjeto((prev) => ({
                            ...prev,
                            atendimento: e.target.value,
                          }))}
                        >
                          <option value="">Sem responsavel</option>
                          {opcoesAtendimento.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </option>
                          ))}
                        </select>
                        {!canManageSetorProjeto('atendimento') && (
                          <p className="mt-1 text-xs text-gray-500">Seu perfil so pode alterar o proprio setor.</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Criacao</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                          value={responsaveisProjeto.criacao}
                          disabled={!canManageSetorProjeto('criacao')}
                          onChange={(e) => setResponsaveisProjeto((prev) => ({
                            ...prev,
                            criacao: e.target.value,
                          }))}
                        >
                          <option value="">Sem responsavel</option>
                          {opcoesCriacao.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </option>
                          ))}
                        </select>
                        {!canManageSetorProjeto('criacao') && (
                          <p className="mt-1 text-xs text-gray-500">Seu perfil so pode alterar o proprio setor.</p>
                        )}
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={aplicarResponsaveisEmFinalizadas}
                        onChange={(e) => setAplicarResponsaveisEmFinalizadas(e.target.checked)}
                      />
                      <span>
                        Aplicar tambem nas etapas finalizadas.
                        <span className="block text-xs text-slate-500 mt-1">
                          Desmarque se quiser preservar o responsavel historico das etapas ja concluidas.
                        </span>
                      </span>
                    </label>

                    <Button
                      onClick={handleSalvarResponsaveisProjeto}
                      disabled={salvandoResponsaveis}
                    >
                      {salvandoResponsaveis ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Aplicar responsaveis no projeto'
                      )}
                    </Button>
                  </div>

                  <div className="rounded-xl border bg-white p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Ajuste manual de prazos</div>
                        <p className="text-xs text-slate-600 mt-1">
                          O template continua sequencial. Se necessario, ajuste manualmente as datas das etapas abertas.
                        </p>
                      </div>
                      {totalPrazosAlterados > 0 && (
                        <Badge className="bg-amber-100 text-amber-800">
                          {totalPrazosAlterados} alterado(s)
                        </Badge>
                      )}
                    </div>

                    {tarefasPrazoEditaveis.length === 0 ? (
                      <p className="text-sm text-gray-500">Nao ha etapas abertas para ajustar.</p>
                    ) : (
                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                        {tarefasPrazoEditaveis.map((tarefa) => (
                          <div key={tarefa.id} className="rounded-lg border bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-slate-900">{tarefa.titulo}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {tarefa.setor} | {tarefa.contrato_numero || tarefa.contrato_id}
                                </div>
                              </div>
                              <input
                                type="date"
                                className="border rounded-md px-3 py-2 text-sm bg-white"
                                value={tarefa.prazo_editavel}
                                onChange={(e) => handlePrazoProjetoChange(tarefa.id, e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleSalvarPrazosProjeto}
                      disabled={salvandoPrazos || totalPrazosAlterados === 0}
                    >
                      {salvandoPrazos ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        'Salvar prazos do projeto'
                      )}
                    </Button>
                  </div>
                  </div>
                )}
              </>
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
              <Tabs value={setorAtivo} onValueChange={handleSetorChange}>
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  {setoresOrdenados.map((setor) => (
                    <TabsTrigger key={setor} value={setor} className="capitalize">
                      {setor}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {setoresOrdenados.map((setor) => (
                  <TabsContent key={setor} value={setor}>
                    {user?.role === 'admin' && (tarefasPorSetor[setor] || []).some((t) => !isTarefaEfetivamenteFinalizada(t)) && (
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                          <Checkbox
                            checked={todasSelecionadasNoSetor && setor === setorAtivo}
                            onCheckedChange={(checked) => toggleSelecionarTodasDoSetor(checked)}
                          />
                          Selecionar todas abertas
                        </label>
                        {tarefasSelecionadas.length > 0 && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setFinalizarLoteModal(true)}
                          >
                            <CheckCircle2 size={14} className="mr-2" />
                            Finalizar em lote ({tarefasSelecionadas.length})
                          </Button>
                        )}
                      </div>
                    )}
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
                              {user?.role === 'admin' && !isTarefaEfetivamenteFinalizada(tarefa) && (
                                <div
                                  className="flex-shrink-0 mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={tarefasSelecionadas.includes(tarefa.id)}
                                    onCheckedChange={(checked) => toggleSelecaoTarefa(tarefa.id, checked)}
                                  />
                                </div>
                              )}
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
                                Contrato: {getContratoNumeroTarefa(tarefa)}
                              </div>
                              <div className="flex items-center">
                                <Building2 size={14} className="mr-1" />
                                Faculdade: {getContratoFaculdadeTarefa(tarefa)}
                              </div>
                              {getContratoCursoTarefa(tarefa) && (
                                <div className="flex items-center">
                                  <FileText size={14} className="mr-1" />
                                  Curso: {getContratoCursoTarefa(tarefa)}
                                </div>
                              )}
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
                              {isTarefaEfetivamenteFinalizada(tarefa) && tarefa.data_finalizacao && (
                                <div className="flex items-center text-green-600">
                                  <CheckCircle2 size={14} className="mr-1" />
                                  Finalizada em: {formatDate(tarefa.data_finalizacao)}
                                </div>
                              )}
                            </div>

                            {!isTarefaEfetivamenteFinalizada(tarefa) && (
                              <div
                                className="mt-3 pt-3 border-t flex justify-end"
                                onClick={(e) => e.stopPropagation()}
                              >
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
        onAtualizar={loadProjeto}
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

      <Dialog open={finalizarLoteModal} onOpenChange={(open) => { if (!open) setFinalizarLoteModal(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar {tarefasSelecionadas.length} tarefa(s) em lote</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">
              As tarefas selecionadas serão marcadas como concluídas. Esta ação não pode ser desfeita.
            </p>
            <div>
              <Label htmlFor="lote-obs" className="text-sm font-medium">Observação (opcional)</Label>
              <Textarea
                id="lote-obs"
                rows={3}
                className="resize-none mt-1"
                placeholder="Contexto ou justificativa da finalização em lote..."
                value={feedbackFormLote.observacao}
                onChange={(e) => setFeedbackFormLote({ observacao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizarLoteModal(false)} disabled={finalizandoLote}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleFinalizarLote}
              disabled={finalizandoLote}
            >
              {finalizandoLote ? <Loader2 size={14} className="mr-2 animate-spin" /> : <CheckCircle2 size={14} className="mr-2" />}
              {finalizandoLote ? 'Finalizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutNovo>
  );
};

export default ProjetoDetalhes;
