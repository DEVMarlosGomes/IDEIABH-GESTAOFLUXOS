import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  FolderKanban,
  Loader2,
  Bell,
  Mail,
  AlertCircle
} from 'lucide-react';
import { getDashboardAvancado, cobrarOperador } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import './Dashboard.css';

const DashboardAvancado = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [cobrancaModal, setCobrancaModal] = useState(false);
  const [tarefaParaCobrar, setTarefaParaCobrar] = useState(null);
  const [cobrancaForm, setCobrancaForm] = useState({
    mensagem: '',
    enviar_email: true
  });
  const [enviandoCobranca, setEnviandoCobranca] = useState(false);
  const [filtroSemestre, setFiltroSemestre] = useState('todos');
  const [filtroRisco, setFiltroRisco] = useState('todos');
  const [draggingProjectId, setDraggingProjectId] = useState(null);

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

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardAvancado({
        user_role: user?.role || 'operador',
        user_id: user?.id || null,
        user_setor: user?.setor || null
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      const backendMessage = error?.response?.data?.detail;
      const networkMessage = !error?.response && error?.message === 'Network Error'
        ? 'API indisponivel na porta 8001. Verifique se o backend terminou de subir.'
        : null;
      toast.error(backendMessage || networkMessage || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.setor]);

  useEffect(() => {
    if (!user?.role) return;
    loadDashboard();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard, user?.role]);

  const handleCobrar = (atraso) => {
    if (!atraso.responsavel_id) {
      toast.error('Esta tarefa não tem responsável atribuído');
      return;
    }
    
    setTarefaParaCobrar(atraso);
    setCobrancaForm({
      mensagem: `Olá ${atraso.responsavel},\n\nIdentificamos que a tarefa "${atraso.titulo}" está com ${atraso.dias_atraso} dias de atraso.\n\nPor favor, dê andamento o mais rápido possível ou informe se há algum impedimento.\n\nObrigado!`,
      enviar_email: true
    });
    setCobrancaModal(true);
  };

  const handleEnviarCobranca = async () => {
    if (!cobrancaForm.mensagem.trim()) {
      toast.error('Por favor, escreva uma mensagem');
      return;
    }

    try {
      setEnviandoCobranca(true);
      
      await cobrarOperador({
        tarefa_id: tarefaParaCobrar.tarefa_id,
        operador_id: tarefaParaCobrar.responsavel_id,
        operador_nome: tarefaParaCobrar.responsavel,
        operador_email: `${tarefaParaCobrar.responsavel_id}@ideiabh.com.br`, // Em produção, buscar do banco
        mensagem: cobrancaForm.mensagem,
        gerente_id: user?.id || 'admin',
        gerente_nome: user?.nome || user?.username || 'Gerente',
        enviar_email: cobrancaForm.enviar_email
      }, user?.role || 'gerente');
      
      toast.success(
        <div>
          <p className="font-semibold">Cobrança enviada com sucesso!</p>
          <p className="text-sm">
            {cobrancaForm.enviar_email ? 
              'Notificação interna e email enviados' : 
              'Notificação interna enviada'}
          </p>
        </div>
      );
      
      setCobrancaModal(false);
      setTarefaParaCobrar(null);
    } catch (error) {
      console.error('Erro ao enviar cobrança:', error);
      toast.error('Erro ao enviar cobrança');
    } finally {
      setEnviandoCobranca(false);
    }
  };

  const getRiscoColor = (risco) => {
    const colors = {
      'baixo': { bg: '#dcfce7', color: '#15803d' },
      'medio': { bg: '#fef3c7', color: '#b45309' },
      'alto': { bg: '#fed7aa', color: '#c2410c' },
      'critico': { bg: '#fecaca', color: '#dc2626' }
    };
    return colors[risco] || colors.baixo;
  };

  const getPrioridadeColor = (prioridade) => {
    const colors = {
      'baixa': '#94a3b8',
      'media': '#3b82f6',
      'alta': '#f59e0b',
      'critica': '#ef4444'
    };
    return colors[prioridade] || colors.media;
  };

  const getTerminoContratoReferencia = (projeto) => (
    projeto?.contrato_data_aditivo
    || projeto?.contrato_data_fim
    || projeto?.contrato_data_termino_referencia
    || projeto?.data_fim_prevista
    || null
  );

  const getSemestreProjeto = (projeto) => {
    const referencia = getTerminoContratoReferencia(projeto) || projeto?.data_inicio || null;
    if (!referencia) return 'Sem data';
    const data = new Date(referencia);
    if (Number.isNaN(data.getTime())) return 'Sem data';
    const ano = data.getFullYear();
    const semestre = data.getMonth() < 6 ? 1 : 2;
    return `${ano}.${semestre}`;
  };

  const getRiscoPorTerminoContrato = (projeto) => {
    const referencia = getTerminoContratoReferencia(projeto);
    if (!referencia) return projeto?.risco || 'baixo';

    const dataFim = new Date(referencia);
    if (Number.isNaN(dataFim.getTime())) return projeto?.risco || 'baixo';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataFim.setHours(0, 0, 0, 0);

    const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 7) return 'critico';
    if (diasRestantes <= 21) return 'alto';
    if (diasRestantes <= 45) return 'medio';
    return 'baixo';
  };

  const handleDragContratoStart = (event, projetoId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(projetoId));
    event.dataTransfer.setData('application/x-ideiabh-projeto', String(projetoId));
    setDraggingProjectId(String(projetoId));
  };

  const handleDragContratoEnd = () => {
    setDraggingProjectId(null);
  };

  const isOperador = user?.role === 'operador';
  const setorOperador = normalizeSetor(user?.setor);

  const setorMatches = (value) => {
    if (!setorOperador) return false;
    return normalizeSetor(value) === setorOperador;
  };

  const projetosEmAndamentoRaw = dashboardData?.projetos_em_andamento || [];
  const alertasAtrasosRaw = dashboardData?.alertas_atrasos || [];
  const cargaResponsavelRaw = dashboardData?.carga_por_responsavel || [];

  const projetos_em_andamento = isOperador
    ? projetosEmAndamentoRaw.filter((projeto) => {
        const projetoSetor =
          projeto.setor ||
          projeto.etapa_atual_setor ||
          projeto.departamento ||
          projeto.setor_atual;
        return projetoSetor ? setorMatches(projetoSetor) : true;
      })
    : projetosEmAndamentoRaw;

  const semestresDisponiveis = useMemo(
    () => Array.from(new Set(projetos_em_andamento.map((projeto) => getSemestreProjeto(projeto)))).sort(),
    [projetos_em_andamento]
  );

  const projetosFiltradosDashboard = useMemo(() => (
    projetos_em_andamento
      .filter((projeto) => {
        if (filtroSemestre !== 'todos' && getSemestreProjeto(projeto) !== filtroSemestre) {
          return false;
        }
        if (filtroRisco !== 'todos' && getRiscoPorTerminoContrato(projeto) !== filtroRisco) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dataA = getTerminoContratoReferencia(a);
        const dataB = getTerminoContratoReferencia(b);
        const sortA = dataA ? new Date(dataA).getTime() : Number.MAX_SAFE_INTEGER;
        const sortB = dataB ? new Date(dataB).getTime() : Number.MAX_SAFE_INTEGER;
        if (sortA !== sortB) return sortA - sortB;
        return String(a.contrato_numero || a.contrato_id || a.id || '')
          .localeCompare(String(b.contrato_numero || b.contrato_id || b.id || ''));
      })
  ), [filtroRisco, filtroSemestre, projetos_em_andamento]);

  const projetosAgrupadosDashboard = useMemo(() => {
    const grupos = projetosFiltradosDashboard.reduce((acc, projeto) => {
      const semestre = getSemestreProjeto(projeto);
      if (!acc[semestre]) {
        acc[semestre] = [];
      }
      acc[semestre].push(projeto);
      return acc;
    }, {});

    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [projetosFiltradosDashboard]);

  const atrasoPertenceAoOperador = (atraso) => {
    if (atraso?.responsavel_id && user?.id) {
      return atraso.responsavel_id === user.id;
    }
    const nomeUsuario = (user?.nome || user?.username || '').trim().toLowerCase();
    if (nomeUsuario && atraso?.responsavel) {
      return atraso.responsavel.trim().toLowerCase() === nomeUsuario;
    }
    return false;
  };

  const alertas_atrasos = isOperador
    ? alertasAtrasosRaw.filter((atraso) => atrasoPertenceAoOperador(atraso))
    : alertasAtrasosRaw;

  const carga_por_responsavel = isOperador
    ? cargaResponsavelRaw.filter((carga) => {
        if (carga.setor) return setorMatches(carga.setor);
        if (carga.tarefas && carga.tarefas.length > 0) {
          return setorMatches(carga.tarefas[0].setor);
        }
        return false;
      })
    : cargaResponsavelRaw;

  const resumo = isOperador
    ? {
        total_projetos: projetos_em_andamento.length,
        projetos_em_andamento: projetos_em_andamento.length,
        total_tarefas_atrasadas: alertas_atrasos.length,
        responsaveis_com_atraso: 0,
      }
    : (dashboardData?.resumo || {
        total_projetos: 0,
        projetos_em_andamento: 0,
        total_tarefas_atrasadas: 0,
        responsaveis_com_atraso: 0,
      });

  const kpiCards = [
    {
      title: 'Total de Projetos',
      value: resumo.total_projetos,
      icon: FolderKanban,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    {
      title: 'Projetos em Andamento',
      value: resumo.projetos_em_andamento,
      icon: TrendingUp,
      color: '#10b981',
      bgColor: '#ecfdf5'
    },
    {
      title: 'Tarefas Atrasadas',
      value: resumo.total_tarefas_atrasadas,
      icon: Clock,
      color: '#ef4444',
      bgColor: '#fef2f2'
    },
    ...(!isOperador ? [{
      title: 'Responsáveis com Atraso',
      value: resumo.responsaveis_com_atraso,
      icon: Users,
      color: '#f59e0b',
      bgColor: '#fffbeb'
    }] : [])
  ];

  const podeCobrar = user?.role === 'admin' || user?.role === 'gerente';

  if (loading) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin" size={48} />
        </div>
      </LayoutNovo>
    );
  }

  if (!dashboardData) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Erro ao carregar dados do dashboard</p>
            <Button onClick={loadDashboard} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="dashboard-container">
        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className="kpi-card">
              <CardContent className="kpi-content">
                <div className="kpi-icon" style={{ backgroundColor: kpi.bgColor }}>
                  <kpi.icon size={24} style={{ color: kpi.color }} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
                  <span className="kpi-title">{kpi.title}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="dashboard-grid">
          {/* Projetos em Andamento */}
          <Card className="projects-card col-span-2">
            <CardHeader>
              <CardTitle className="card-title">
                <FolderKanban size={20} />
                Projetos em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="dashboard-project-filters">
                <div className="dashboard-filter-group">
                  <label htmlFor="dashboard-semestre">Semestre</label>
                  <select
                    id="dashboard-semestre"
                    value={filtroSemestre}
                    onChange={(e) => setFiltroSemestre(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    {semestresDisponiveis.map((semestre) => (
                      <option key={semestre} value={semestre}>
                        {semestre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dashboard-filter-group">
                  <label htmlFor="dashboard-risco">Risco</label>
                  <select
                    id="dashboard-risco"
                    value={filtroRisco}
                    onChange={(e) => setFiltroRisco(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="baixo">Baixo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                    <option value="critico">Critico</option>
                  </select>
                </div>
                <p className="dashboard-filter-note">
                  Risco calculado pela proximidade do termino do contrato e ordenado pelo fim mais proximo.
                </p>
              </div>

              <div className="projects-list space-y-3">
                {projetosAgrupadosDashboard.map(([semestre, projetosSemestre]) => (
                  <div key={semestre} className="project-group">
                    <div className="project-group-header">
                      <span className="project-group-title">{semestre}</span>
                      <span className="project-group-count">{projetosSemestre.length} contrato(s)</span>
                    </div>

                    <div className="space-y-3">
                      {projetosSemestre.map((projeto) => (
                  <div
                    key={projeto.id}
                    className={`project-item border rounded-lg p-4 ${draggingProjectId === String(projeto.id) ? 'dragging' : ''}`}
                    draggable={isOperador}
                    onDragStart={(event) => handleDragContratoStart(event, projeto.id)}
                    onDragEnd={handleDragContratoEnd}
                    title={isOperador ? 'Arraste este contrato para uma pasta na sidebar' : undefined}
                  >
                    <div className="project-header flex items-center justify-between mb-2">
                      <div className="project-title-block">
                        <span className="project-contract">
                          {(projeto.contrato_numero || projeto.contrato_id || 'Sem contrato').toUpperCase()}
                        </span>
                        {(projeto.contrato_faculdade || projeto.contrato_curso) && (
                          <span className="project-contract-meta">
                            {[projeto.contrato_faculdade, projeto.contrato_curso].filter(Boolean).join(' - ')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge 
                          style={{ 
                            backgroundColor: getRiscoColor(getRiscoPorTerminoContrato(projeto)).bg,
                            color: getRiscoColor(getRiscoPorTerminoContrato(projeto)).color
                          }}
                        >
                          Risco {getRiscoPorTerminoContrato(projeto)}
                        </Badge>
                        {projeto.tarefas_atrasadas > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertTriangle size={12} className="mr-1" />
                            {projeto.tarefas_atrasadas} atrasadas
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="project-etapa text-sm text-gray-600 mb-3">
                      Etapa atual: {projeto.etapa_atual}
                    </div>
                    <div className="project-progress mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold">{projeto.progresso}%</span>
                      </div>
                      <Progress value={projeto.progresso} className="h-2" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{projeto.tarefas_concluidas} de {projeto.total_tarefas} tarefas concluídas</span>
                      <span>Término: {new Date(getTerminoContratoReferencia(projeto) || projeto.data_fim_prevista).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {projetosFiltradosDashboard.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum projeto encontrado para os filtros atuais</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Atrasos */}
          <Card className="alerts-card">
            <CardHeader>
              <CardTitle className="card-title text-red-600">
                <AlertTriangle size={20} />
                {isOperador ? 'Minhas Demandas em Atraso' : 'Alertas de Atrasos'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="alerts-list space-y-2 max-h-96 overflow-y-auto">
                {alertas_atrasos?.map((atraso, index) => (
                  <div key={index} className="alert-item border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{atraso.titulo}</p>
                        {atraso.contrato_numero && (
                          <p className="alert-contract">
                            Contrato {atraso.contrato_numero}
                          </p>
                        )}
                        {!isOperador && (
                          <p className="text-xs text-gray-600 mt-1">
                            {atraso.responsavel || 'Não atribuído'}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1 capitalize">
                          {atraso.setor}
                        </p>
                      </div>
                      <Badge 
                        className="ml-2"
                        style={{ backgroundColor: getPrioridadeColor(atraso.prioridade) }}
                      >
                        {atraso.dias_atraso} dias
                      </Badge>
                    </div>
                    
                    {podeCobrar && atraso.responsavel && atraso.responsavel !== 'Não atribuído' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full mt-2 text-xs border-red-300 hover:bg-red-100"
                        onClick={() => handleCobrar(atraso)}
                      >
                        <Bell size={12} className="mr-1" />
                        Cobrar Responsável
                      </Button>
                    )}
                  </div>
                ))}
                
                {(!alertas_atrasos || alertas_atrasos.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 size={48} className="mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Nenhum atraso identificado!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!isOperador && (
        <Card className="load-card mt-6">
          <CardHeader>
            <CardTitle className="card-title">
              <Users size={20} />
              Carga por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {carga_por_responsavel?.map((carga, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{carga.responsavel}</h4>
                    {carga.tarefas_atrasadas > 0 && (
                      <AlertTriangle size={20} className="text-red-500" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total de tarefas:</span>
                      <span className="font-semibold">{carga.total_tarefas}</span>
                    </div>
                    
                    {carga.tarefas_atrasadas > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Atrasadas:</span>
                          <span className="font-semibold text-red-600">{carga.tarefas_atrasadas}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Dias de atraso:</span>
                          <span className="font-semibold text-red-600">{carga.total_dias_atraso}</span>
                        </div>
                        
                        {podeCobrar && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full mt-2 text-xs border-red-300 hover:bg-red-100"
                            onClick={() => {
                              if (carga.tarefas && carga.tarefas.length > 0) {
                                handleCobrar({
                                  tarefa_id: carga.tarefas[0].id,
                                  titulo: `${carga.tarefas.length} tarefa(s) atrasada(s)`,
                                  responsavel: carga.responsavel,
                                  responsavel_id: carga.responsavel,
                                  dias_atraso: carga.total_dias_atraso,
                                  setor: carga.tarefas[0].setor
                                });
                              }
                            }}
                          >
                            <Bell size={12} className="mr-1" />
                            Cobrar
                          </Button>
                        )}
                      </>
                    )}
                    
                    {carga.tarefas_atrasadas === 0 && (
                      <div className="flex items-center justify-center py-2 text-green-600 text-sm">
                        <CheckCircle2 size={16} className="mr-1" />
                        Em dia
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {(!carga_por_responsavel || carga_por_responsavel.length === 0) && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma carga de trabalho registrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Modal de Cobrança */}
        <Dialog open={cobrancaModal} onOpenChange={setCobrancaModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="text-orange-600" />
                Cobrar Operador - {tarefaParaCobrar?.responsavel}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Tarefa Atrasada:</h4>
                <p className="text-sm">{tarefaParaCobrar?.titulo}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>Atraso: <strong>{tarefaParaCobrar?.dias_atraso} dias</strong></span>
                  <span className="capitalize">Setor: <strong>{tarefaParaCobrar?.setor}</strong></span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Mensagem da Cobrança *</Label>
                <Textarea
                  rows={8}
                  value={cobrancaForm.mensagem}
                  onChange={(e) => setCobrancaForm({...cobrancaForm, mensagem: e.target.value})}
                  placeholder="Escreva a mensagem de cobrança..."
                  className="resize-none"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enviar_email"
                  checked={cobrancaForm.enviar_email}
                  onCheckedChange={(checked) => setCobrancaForm({...cobrancaForm, enviar_email: checked})}
                />
                <label htmlFor="enviar_email" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Mail size={16} />
                  Enviar também por email
                </label>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCobrancaModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleEnviarCobranca} 
                disabled={enviandoCobranca}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {enviandoCobranca ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Enviar Cobrança
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutNovo>
  );
};

export default DashboardAvancado;
