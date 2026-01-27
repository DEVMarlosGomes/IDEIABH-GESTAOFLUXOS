import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { getProjeto, deletarTarefa } from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import TarefaDetalhesModal from '../components/TarefaDetalhesModal';
import EditarTarefaModal from '../components/EditarTarefaModal';
import FinalizarTarefaModal from '../components/FinalizarTarefaModal';

const ProjetoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdminOrGerente } = useAuth();
  const [projeto, setProjeto] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState(null);

  useEffect(() => {
    loadProjeto();
  }, [id]);

  const loadProjeto = async () => {
    try {
      setLoading(true);
      const data = await getProjeto(id);
      setProjeto(data);
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar detalhes do projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleTarefaClick = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowDetalhesModal(true);
  };

  const handleEditar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowEditarModal(true);
  };

  const handleFinalizar = (tarefa) => {
    setSelectedTarefa(tarefa);
    setShowFinalizarModal(true);
  };

  const handleExcluir = async (tarefa) => {
    const canManage = isAdminOrGerente ? isAdminOrGerente() : false;
    if (!canManage) {
      toast.error('Apenas administradores e gerentes podem excluir tarefas');
      return;
    }
    try {
      await deletarTarefa(tarefa.id, user?.role || 'admin', user?.id || 'unknown');
      toast.success('Tarefa excluída com sucesso');
      loadProjeto();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir tarefa');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
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

  const getStatusBadge = (tarefa) => {
    if (tarefa.finalizada) {
      return { label: 'Concluída', color: 'bg-green-100 text-green-800' };
    }
    if (tarefa.atrasada) {
      return { label: `Atrasada (${tarefa.dias_atraso}d)`, color: 'bg-red-100 text-red-800' };
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
            <p className="text-gray-600">Projeto não encontrado</p>
            <Button onClick={() => navigate('/projetos')} className="mt-4">
              Voltar para Projetos
            </Button>
          </div>
        </div>
      </LayoutNovo>
    );
  }

  const tarefasPorSetor = projeto.tarefas?.reduce((acc, tarefa) => {
    const setor = tarefa.setor || 'outros';
    if (!acc[setor]) {
      acc[setor] = [];
    }
    acc[setor].push(tarefa);
    return acc;
  }, {}) || {};

  return (
    <LayoutNovo>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/projetos')}
            className="mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar para Projetos
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {projeto.cliente}
              </h1>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center">
                  <Building2 size={16} className="mr-1.5" />
                  <span>UFMG</span>
                </div>
                <div className="flex items-center">
                  <Calendar size={16} className="mr-1.5" />
                  <span>Início: {formatDate(projeto.data_inicio)}</span>
                </div>
                <div className="flex items-center">
                  <Target size={16} className="mr-1.5" />
                  <span>Término: {formatDate(projeto.data_fim_prevista)}</span>
                </div>
              </div>
            </div>

            <Badge
              style={{
                backgroundColor: getRiscoColor(projeto.risco).bg,
                color: getRiscoColor(projeto.risco).color
              }}
              className="text-sm px-4 py-2"
            >
              Risco {projeto.risco}
            </Badge>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Progresso</p>
                  <p className="text-3xl font-bold text-blue-600">{projeto.progresso}%</p>
                </div>
                <Activity size={40} className="text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Tarefas</p>
                  <p className="text-3xl font-bold">{projeto.total_tarefas}</p>
                </div>
                <FileText size={40} className="text-gray-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Concluídas</p>
                  <p className="text-3xl font-bold text-green-600">{projeto.tarefas_concluidas}</p>
                </div>
                <CheckCircle2 size={40} className="text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Atrasadas</p>
                  <p className="text-3xl font-bold text-red-600">
                    {projeto.tarefas?.filter(t => t.atrasada).length || 0}
                  </p>
                </div>
                <AlertTriangle size={40} className="text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Etapa Atual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              Etapa Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">
                {projeto.etapa_atual}
              </h3>
              <Progress value={projeto.progresso} className="h-3 mb-2" />
              <p className="text-sm text-blue-800">
                {projeto.tarefas_concluidas} de {projeto.total_tarefas} etapas concluídas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas por Departamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Todas as Etapas do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(tarefasPorSetor)[0]}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {Object.keys(tarefasPorSetor).map((setor) => (
                  <TabsTrigger key={setor} value={setor} className="capitalize">
                    {setor}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(tarefasPorSetor).map(([setor, tarefas]) => (
                <TabsContent key={setor} value={setor}>
                  <div className="space-y-3">
                    {tarefas.map((tarefa, index) => {
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
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-500">
                                  #{index + 1}
                                </span>
                                <h4 className="font-semibold text-gray-900">
                                  {tarefa.titulo}
                                </h4>
                              </div>
                              {tarefa.descricao && (
                                <p className="text-sm text-gray-600 mb-2">{tarefa.descricao}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={statusBadge.color}>
                                {statusBadge.label}
                              </Badge>
                              <Eye size={18} className="text-gray-400" />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                          
                          {tarefa.observacao_finalizacao && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                              <strong>Observação:</strong> {tarefa.observacao_finalizacao}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </LayoutNovo>
  );
};

export default ProjetoDetalhes;
