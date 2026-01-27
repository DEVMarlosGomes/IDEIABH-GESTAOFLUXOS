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
import TarefaDetalhesModal from '../components/TarefaDetalhesModal';
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
  const { user, isAdminOrGerente } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canManage = isAdminOrGerente();
  
  const [projetos] = useState(mockProjetos);
  const [tarefas, setTarefas] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atrasosPorSetor, setAtrasosPorSetor] = useState([]);
  
  // Modals
  const [showTarefaModal, setShowTarefaModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
  const [selectedTarefa, setSelectedTarefa] = useState(null);
  const [activeTab, setActiveTab] = useState('andamento');

  // Departamento info
  const deptInfo = DEPARTAMENTOS[departamento] || {
    id: departamento,
    nome: departamento.charAt(0).toUpperCase() + departamento.slice(1),
    cor: '#64748b',
    descricao: 'Departamento'
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tarefasData, statusData, atrasosData] = await Promise.all([
        getTarefas({ setor: departamento }),
        getStatusTarefas(),
        getAtrasosPorSetor()
      ]);
      
      setTarefas(tarefasData || []);
      setStatusList(statusData || []);
      setAtrasosPorSetor(atrasosData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [departamento]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter tarefas
  const tarefasEmAndamento = tarefas.filter(t => !t.finalizada);
  const tarefasConcluidas = tarefas.filter(t => t.finalizada);
  const tarefasAtrasadas = tarefas.filter(t => !t.finalizada && t.atrasada);

  // Stats
  const stats = {
    total: tarefas.length,
    emAndamento: tarefasEmAndamento.length,
    concluidas: tarefasConcluidas.length,
    atrasadas: tarefasAtrasadas.length,
    percentualConcluido: tarefas.length > 0 
      ? Math.round((tarefasConcluidas.length / tarefas.length) * 100) 
      : 0
  };

  // Get current setor atrasos
  const setorAtrasos = atrasosPorSetor.find(s => s.setor === departamento) || {
    total_tarefas: 0,
    tarefas_atrasadas: 0,
    total_dias_atraso: 0
  };

  // Handlers
  const handleCardClick = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowDetalhesModal(true);
  };

  const handleFinalizar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowFinalizarModal(true);
  };

  const handleEditar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowEditarModal(true);
  };

  const handleExcluir = async (tarefa) => {
    if (!canManage) {
      alert('Apenas administradores e gerentes podem excluir tarefas');
      return;
    }
    try {
      await deletarTarefa(tarefa.id, user?.role || 'admin', user?.id || 'unknown');
      await loadData();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir tarefa');
    }
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
      <div className="departamento-view">
        {/* Header com estatísticas */}
        <div className="dept-header">
          <div className="dept-info">
            <div 
              className="dept-icon" 
              style={{ backgroundColor: deptInfo.cor }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="dept-title">{deptInfo.nome}</h1>
              <p className="dept-desc">{deptInfo.descricao}</p>
              {canManage && (
                <Badge variant="outline" className="mt-1">
                  {user?.role === 'admin' ? '👑 Admin' : '📋 Gerente'} - Pode editar/excluir
                </Badge>
              )}
            </div>
          </div>

          <div className="dept-actions">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </Button>
            
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowStatusModal(true)}
              >
                <Settings size={16} />
                Status
              </Button>
            )}

            <Button onClick={() => setShowTarefaModal(true)}>
              <Plus size={16} />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <Card className="stat-card">
            <CardContent className="stat-content">
              <div className="stat-icon blue">
                <Circle size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.emAndamento}</span>
                <span className="stat-label">Em Andamento</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="stat-content">
              <div className="stat-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.concluidas}</span>
                <span className="stat-label">Concluídas</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="stat-content">
              <div className="stat-icon red">
                <AlertTriangle size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.atrasadas}</span>
                <span className="stat-label">Atrasadas</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="stat-content">
              <div className="stat-info full">
                <span className="stat-label">Progresso</span>
                <span className="stat-value">{stats.percentualConcluido}%</span>
                <Progress value={stats.percentualConcluido} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de atrasos */}
        {setorAtrasos.tarefas_atrasadas > 0 && (
          <Card className="alert-card warning">
            <CardContent className="alert-content">
              <AlertTriangle className="alert-icon" />
              <div className="alert-text">
                <strong>{setorAtrasos.tarefas_atrasadas} tarefas atrasadas</strong>
                <span>Total de {setorAtrasos.total_dias_atraso} dias de atraso acumulado</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab('atrasadas')}
              >
                Ver Atrasadas
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dica de uso */}
        <div className="tip-banner">
          <span className="tip-icon">💡</span>
          <span>Clique em uma tarefa para ver detalhes, editar ou excluir</span>
        </div>

        {/* Tabs de tarefas */}
        <Card className="tarefas-section">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="tabs-header">
              <TabsList>
                <TabsTrigger value="andamento">
                  <Circle size={14} className="mr-2" />
                  Em Andamento ({stats.emAndamento})
                </TabsTrigger>
                <TabsTrigger value="concluido">
                  <CheckCircle2 size={14} className="mr-2" />
                  Concluídas ({stats.concluidas})
                </TabsTrigger>
                <TabsTrigger value="atrasadas">
                  <AlertTriangle size={14} className="mr-2" />
                  Atrasadas ({stats.atrasadas})
                </TabsTrigger>
              </TabsList>

              {isAdmin && tarefas.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteAllDialog(true)}
                >
                  <Trash2 size={14} className="mr-2" />
                  Apagar Todas
                </Button>
              )}
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
                      onClick={handleCardClick}
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
                      onClick={handleCardClick}
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
                      onClick={handleCardClick}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
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

      {/* Modal de Detalhes - Abre ao clicar na tarefa */}
      <TarefaDetalhesModal
        isOpen={showDetalhesModal}
        onClose={() => {
          setShowDetalhesModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
        onEditar={handleEditar}
        onExcluir={handleExcluir}
        onFinalizar={handleFinalizar}
      />

      <EditarTarefaModal
        isOpen={showEditarModal}
        onClose={() => {
          setShowEditarModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
        onSuccess={loadData}
      />

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
