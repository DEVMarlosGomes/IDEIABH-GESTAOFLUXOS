import React, { useState, useEffect, useCallback } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  User,
  Users,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Filter
} from 'lucide-react';
import { mockProjetos, TODAS_ETAPAS, DEPARTAMENTOS } from '../data/mockNovo';
import { useAuth } from '../context/AuthContext';
import { 
  getTarefas, 
  getStatusTarefas, 
  deletarTarefa, 
  deletarTodasTarefas,
  getAtrasosPorSetor 
} from '../services/api';
import TarefaModal from '../components/TarefaModal';
import FinalizarTarefaModal from '../components/FinalizarTarefaModal';
import StatusModal from '../components/StatusModal';
import TarefaCard from '../components/TarefaCard';
import HistoricoModal from '../components/HistoricoModal';
import EditarTarefaModal from '../components/EditarTarefaModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import './DepartamentoView.css';

const DepartamentoView = ({ departamento }) => {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === 'admin' || hasPermission('admin');
  const isGerente = user?.role === 'gerente' || hasPermission('gerente');
  
  const [projetos] = useState(mockProjetos);
  const [tarefas, setTarefas] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atrasosPorSetor, setAtrasosPorSetor] = useState([]);
  
  // Modals
  const [showTarefaModal, setShowTarefaModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
  const [selectedTarefa, setSelectedTarefa] = useState(null);
  const [activeTab, setActiveTab] = useState('andamento');


  // Encontrar info do departamento
  const deptInfo = Object.values(DEPARTAMENTOS).find(d => d.id === departamento) || {
    id: departamento,
    nome: 'Departamento',
    cor: '#3b82f6',
    equipe: [],
    descricao: ''
  };

  // Etapas deste departamento
  const etapasDepartamento = TODAS_ETAPAS.filter(e => e.departamento === departamento);

  // Projetos ativos neste departamento
  const projetosDepartamento = projetos.filter(p => 
    p.departamento_atual === departamento && 
    p.status !== 'Concluído'
  );

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tarefasData, statusData, atrasosData] = await Promise.all([
        getTarefas({ setor: departamento }),
        getStatusTarefas(),
        getAtrasosPorSetor()
      ]);
      setTarefas(tarefasData);
      setStatusList(statusData);
      setAtrasosPorSetor(atrasosData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [departamento]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter tasks by status
  const tarefasEmAndamento = tarefas.filter(t => !t.finalizada);
  const tarefasConcluidas = tarefas.filter(t => t.finalizada);
  const tarefasAtrasadas = tarefas.filter(t => t.atrasada && !t.finalizada);

  // Stats
  const stats = {
    totalProjetos: projetosDepartamento.length,
    projetosEmDia: projetosDepartamento.filter(p => p.dias_atraso === 0).length,
    projetosAtrasados: projetosDepartamento.filter(p => p.dias_atraso > 0).length,
    progressoMedio: projetosDepartamento.length > 0 
      ? Math.round(projetosDepartamento.reduce((acc, p) => acc + p.progresso, 0) / projetosDepartamento.length)
      : 0,
    totalTarefas: tarefas.length,
    tarefasEmAndamento: tarefasEmAndamento.length,
    tarefasConcluidas: tarefasConcluidas.length,
    tarefasAtrasadas: tarefasAtrasadas.length
  };

  // Get atrasos for this department
  const atrasosSetor = atrasosPorSetor.find(a => a.setor === departamento) || {
    total_tarefas: 0,
    tarefas_atrasadas: 0,
    total_dias_atraso: 0,
    tarefas: []
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Atrasado': return <AlertTriangle size={16} className="status-icon atrasado" />;
      case 'Ativo': return <Clock size={16} className="status-icon ativo" />;
      case 'Concluído': return <CheckCircle2 size={16} className="status-icon concluido" />;
      default: return <Circle size={16} className="status-icon" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'Ativo': return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Concluído': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  // Handlers
  const handleFinalizar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowFinalizarModal(true);
  };

  const handleVerHistorico = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowHistoricoModal(true);
  };

  const handleEditar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowEditarModal(true);
  };

  const handleDelete = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedTarefa) return;
    try {
      await deletarTarefa(selectedTarefa.id, user?.role || 'admin', user?.id || 'unknown');
      await loadData();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir tarefa');
    }
    setShowDeleteDialog(false);
    setSelectedTarefa(null);
  };

  const confirmDeleteAll = async () => {
    try {
      await deletarTodasTarefas(user?.role || 'admin', user?.id || 'unknown');
      await loadData();
    } catch (err) {
      console.error('Error deleting all tasks:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir tarefas');
    }
    setShowDeleteAllDialog(false);
  };

  return (
    <LayoutNovo 
      title={deptInfo.nome}
      subtitle={deptInfo.descricao}
    >
      <div className="departamento-container">
        {/* Header com estatísticas */}
        <div className="departamento-header">
          <div className="departamento-stats">
            <div className="stat-item" style={{ borderLeftColor: deptInfo.cor }}>
              <span className="stat-value">{stats.totalProjetos}</span>
              <span className="stat-label">Projetos Ativos</span>
            </div>
            <div className="stat-item" style={{ borderLeftColor: '#10b981' }}>
              <span className="stat-value">{stats.tarefasEmAndamento}</span>
              <span className="stat-label">Tarefas em Andamento</span>
            </div>
            <div className="stat-item" style={{ borderLeftColor: '#3b82f6' }}>
              <span className="stat-value">{stats.tarefasConcluidas}</span>
              <span className="stat-label">Tarefas Concluídas</span>
            </div>
            <div className="stat-item" style={{ borderLeftColor: '#ef4444' }}>
              <span className="stat-value">{stats.tarefasAtrasadas}</span>
              <span className="stat-label">Tarefas Atrasadas</span>
            </div>
          </div>

          {/* Equipe */}
          {deptInfo.equipe && deptInfo.equipe.length > 0 && (
            <div className="equipe-info">
              <Users size={18} style={{ color: deptInfo.cor }} />
              <span className="equipe-label">Equipe:</span>
              <div className="equipe-members">
                {deptInfo.equipe.map((membro, index) => (
                  <Badge key={index} variant="outline" className="membro-badge">
                    {membro}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="action-buttons">
          <Button onClick={() => setShowTarefaModal(true)}>
            <Plus size={18} className="mr-2" />
            Nova Tarefa
          </Button>
          
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setShowStatusModal(true)}>
                <Settings size={18} className="mr-2" />
                Adicionar Status
              </Button>
              
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteAllDialog(true)}
              >
                <Trash2 size={18} className="mr-2" />
                Apagar Todas
              </Button>
            </>
          )}

          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Alerta de Atrasos */}
        {atrasosSetor.tarefas_atrasadas > 0 && (
          <Card className="atrasos-alert-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-1">
                    Atenção: {atrasosSetor.tarefas_atrasadas} tarefa(s) atrasada(s)
                  </h4>
                  <p className="text-sm text-red-600 mb-3">
                    Total de {atrasosSetor.total_dias_atraso} dias de atraso neste setor
                  </p>
                  <div className="space-y-2">
                    {atrasosSetor.tarefas?.slice(0, 3).map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded">
                        <span className="font-medium">{t.titulo}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">
                            {t.criado_por} • {t.responsavel || 'Sem responsável'}
                          </span>
                          <Badge variant="destructive">{t.dias_atraso} dias</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs de Tarefas */}
        <Card className="tarefas-section">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="tabs-header">
                <TabsList className="tabs-list">
                  <TabsTrigger value="andamento" className="tab-trigger">
                    <Clock size={16} className="mr-2" />
                    Em Andamento ({tarefasEmAndamento.length})
                  </TabsTrigger>
                  <TabsTrigger value="concluido" className="tab-trigger">
                    <CheckCircle2 size={16} className="mr-2" />
                    Concluído ({tarefasConcluidas.length})
                  </TabsTrigger>
                  {tarefasAtrasadas.length > 0 && (
                    <TabsTrigger value="atrasadas" className="tab-trigger text-red-600">
                      <AlertTriangle size={16} className="mr-2" />
                      Atrasadas ({tarefasAtrasadas.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Status List */}
                <div className="status-legend">
                  {statusList.map(status => (
                    <div key={status.id} className="status-item">
                      <div 
                        className="status-dot" 
                        style={{ backgroundColor: status.cor }}
                      />
                      <span>{status.nome}</span>
                    </div>
                  ))}
                </div>
              </div>

              <TabsContent value="andamento" className="p-4">
                {loading ? (
                  <div className="loading-state">
                    <RefreshCw className="animate-spin" size={24} />
                    <span>Carregando tarefas...</span>
                  </div>
                ) : tarefasEmAndamento.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>Nenhuma tarefa em andamento</h3>
                    <p>Clique em "Nova Tarefa" para criar uma.</p>
                  </div>
                ) : (
                  <div className="tarefas-grid">
                    {tarefasEmAndamento.map(tarefa => (
                      <TarefaCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        onFinalizar={handleFinalizar}
                        onDelete={handleDelete}
                        onVerHistorico={handleVerHistorico}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="concluido" className="p-4">
                {tarefasConcluidas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <h3>Nenhuma tarefa concluída</h3>
                    <p>As tarefas finalizadas aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="tarefas-grid">
                    {tarefasConcluidas.map(tarefa => (
                      <TarefaCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        onVerHistorico={handleVerHistorico}
                        onDelete={handleDelete}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="atrasadas" className="p-4">
                {tarefasAtrasadas.length === 0 ? (
                  <div className="empty-state success">
                    <div className="empty-icon">🎉</div>
                    <h3>Nenhuma tarefa atrasada!</h3>
                    <p>Parabéns, todas as tarefas estão em dia.</p>
                  </div>
                ) : (
                  <div className="tarefas-grid">
                    {tarefasAtrasadas.map(tarefa => (
                      <TarefaCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        onFinalizar={handleFinalizar}
                        onDelete={handleDelete}
                        onVerHistorico={handleVerHistorico}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Lista de projetos */}
        <div className="projetos-departamento">
          <h3 className="section-title">Projetos no {deptInfo.nome}</h3>
          
          {projetosDepartamento.length === 0 ? (
            <Card className="empty-state-card">
              <CardContent style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
                <h3 style={{ marginBottom: '8px', color: '#64748b' }}>
                  Nenhum projeto neste departamento no momento
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Os projetos aparecerão aqui quando estiverem na etapa deste departamento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="projetos-grid-dept">
              {projetosDepartamento.map((projeto) => {
                const statusColor = getStatusColor(projeto.status);
                
                return (
                  <Card key={projeto.id} className="projeto-card-dept">
                    <CardContent style={{ padding: '20px' }}>
                      {/* Header */}
                      <div className="projeto-header-dept">
                        <div className="projeto-title-dept">
                          <Building2 size={18} style={{ color: deptInfo.cor }} />
                          <div>
                            <h4>{projeto.cliente}</h4>
                            <span className="projeto-instituicao">{projeto.instituicao}</span>
                          </div>
                        </div>
                        <Badge 
                          style={{ 
                            backgroundColor: statusColor.bg,
                            color: statusColor.color,
                            border: `1px solid ${statusColor.border}`
                          }}
                        >
                          {getStatusIcon(projeto.status)}
                          {projeto.status}
                        </Badge>
                      </div>

                      {/* Etapa Atual */}
                      <div className="etapa-atual-dept">
                        <div className="etapa-info-dept">
                          <span className="etapa-label-dept">Etapa Atual:</span>
                          <span className="etapa-nome-dept">{projeto.etapa_atual_nome}</span>
                        </div>
                        {projeto.dias_atraso > 0 && (
                          <Badge variant="destructive" className="atraso-badge">
                            <AlertTriangle size={12} />
                            {projeto.dias_atraso} dias de atraso
                          </Badge>
                        )}
                      </div>

                      {/* Progresso */}
                      <div className="progresso-dept">
                        <div className="progresso-header-dept">
                          <span>Progresso</span>
                          <span className="progresso-value">{projeto.progresso}%</span>
                        </div>
                        <Progress value={projeto.progresso} className="progress-bar-dept" />
                      </div>

                      {/* Informações adicionais */}
                      <div className="info-grid-dept">
                        <div className="info-item-dept">
                          <Calendar size={14} />
                          <div>
                            <span className="info-label-dept">Entrega</span>
                            <span className="info-value-dept">
                              {new Date(projeto.data_entrega).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="info-item-dept">
                          <Clock size={14} />
                          <div>
                            <span className="info-label-dept">Restam</span>
                            <span className="info-value-dept">{projeto.dias_restantes} dias</span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="acoes-dept">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="btn-visualizar"
                          style={{ borderColor: deptInfo.cor, color: deptInfo.cor }}
                        >
                          Ver Detalhes
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TarefaModal
        isOpen={showTarefaModal}
        onClose={() => setShowTarefaModal(false)}
        onSuccess={loadData}
        setor={departamento}
      />

      <FinalizarTarefaModal
        isOpen={showFinalizarModal}
        onClose={() => {
          setShowFinalizarModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
        onSuccess={loadData}
      />

      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSuccess={loadData}
        statusList={statusList}
      />

      <HistoricoModal
        isOpen={showHistoricoModal}
        onClose={() => {
          setShowHistoricoModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa "{selectedTarefa?.titulo}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Todas as Tarefas</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-red-600 font-semibold">ATENÇÃO:</span> Esta ação irá excluir TODAS as tarefas do sistema permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} className="bg-red-600 hover:bg-red-700">
              Sim, Apagar Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutNovo>
  );
};

export default DepartamentoView;
