import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user?.role) return;
    loadDashboard();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [user?.role, user?.id, user?.setor]);

  const loadDashboard = async () => {
    try {
      const data = await getDashboardAvancado({
        user_role: user?.role || 'operador',
        user_id: user?.id || null,
        user_setor: user?.setor || null
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

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

  const isOperador = user?.role === 'operador';
  const setorOperador = normalizeSetor(user?.setor);

  const setorMatches = (value) => {
    if (!setorOperador) return false;
    return normalizeSetor(value) === setorOperador;
  };

  const projetosEmAndamentoRaw = dashboardData.projetos_em_andamento || [];
  const alertasAtrasosRaw = dashboardData.alertas_atrasos || [];
  const cargaResponsavelRaw = dashboardData.carga_por_responsavel || [];

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
    : dashboardData.resumo;

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
              <div className="projects-list space-y-3">
                {projetos_em_andamento?.slice(0, 6).map((projeto) => (
                  <div key={projeto.id} className="project-item border rounded-lg p-4">
                    <div className="project-header flex items-center justify-between mb-2">
                      <span className="project-name font-semibold text-lg">{projeto.cliente}</span>
                      <div className="flex gap-2">
                        <Badge 
                          style={{ 
                            backgroundColor: getRiscoColor(projeto.risco).bg,
                            color: getRiscoColor(projeto.risco).color
                          }}
                        >
                          Risco {projeto.risco}
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
                      <span>Término: {new Date(projeto.data_fim_prevista).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
                
                {(!projetos_em_andamento || projetos_em_andamento.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum projeto em andamento</p>
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
