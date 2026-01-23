import React, { useState, useEffect } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Activity,
  Loader2,
  Bell,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import {
  getRelatorioGargalos,
  getRelatorioSemanal,
  getRelatorioMensal,
  cobrarOperador,
  getDashboardAvancado
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import './Relatorios.css';

const RelatoriosCompleto = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  
  // Dados dos relatórios
  const [relGargalos, setRelGargalos] = useState(null);
  const [relSemanal, setRelSemanal] = useState(null);
  const [relMensal, setRelMensal] = useState(null);
  const [dashData, setDashData] = useState(null);
  
  // Modal de cobrança
  const [cobrancaModal, setCobrancaModal] = useState(false);
  const [itemParaCobrar, setItemParaCobrar] = useState(null);
  const [mensagemCobranca, setMensagemCobranca] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [gargalos, semanal, mensal, dashboard] = await Promise.all([
        getRelatorioGargalos(),
        getRelatorioSemanal(),
        getRelatorioMensal(),
        getDashboardAvancado()
      ]);
      
      setRelGargalos(gargalos);
      setRelSemanal(semanal);
      setRelMensal(mensal);
      setDashData(dashboard);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const podeCobrar = user?.role === 'admin' || user?.role === 'gerente';

  const handleAbrirCobranca = (item) => {
    setItemParaCobrar(item);
    setMensagemCobranca(
      `Olá ${item.responsavel},\n\nIdentificamos que você possui ${item.quantidade_atrasadas} tarefa(s) atrasada(s) totalizando ${item.total_dias_atraso} dias de atraso.\n\nPor favor, priorize estas demandas o mais rápido possível.\n\nObrigado!`
    );
    setCobrancaModal(true);
  };

  const handleEnviarCobranca = async () => {
    if (!mensagemCobranca.trim()) {
      toast.error('Escreva uma mensagem');
      return;
    }

    try {
      setEnviando(true);
      
      // Para cada tarefa atrasada do responsável, enviar cobrança
      if (itemParaCobrar.tarefas && itemParaCobrar.tarefas.length > 0) {
        await cobrarOperador({
          tarefa_id: itemParaCobrar.tarefas[0].id,
          operador_id: itemParaCobrar.responsavel,
          operador_nome: itemParaCobrar.responsavel,
          operador_email: `${itemParaCobrar.responsavel}@ideiabh.com.br`,
          mensagem: mensagemCobranca,
          gerente_id: user?.id || 'admin',
          gerente_nome: user?.nome || user?.username || 'Gerente',
          enviar_email: true
        }, user?.role || 'gerente');
        
        toast.success('Cobrança enviada com sucesso!');
        setCobrancaModal(false);
      }
    } catch (error) {
      console.error('Erro ao enviar cobrança:', error);
      toast.error('Erro ao enviar cobrança');
    } finally {
      setEnviando(false);
    }
  };

  const exportarPDF = () => {
    toast.info('Funcionalidade de exportação em desenvolvimento');
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

  return (
    <LayoutNovo>
      <div className="relatorios-container p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Relatórios Gerenciais</h1>
            <p className="text-gray-600 mt-1">
              Análises detalhadas para tomada de decisão e gestão da equipe
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAllData}>
              <Activity size={16} className="mr-2" />
              Atualizar
            </Button>
            <Button onClick={exportarPDF}>
              <Download size={16} className="mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="gargalos">Gargalos</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="geral" className="space-y-6">
            {dashData && dashData.resumo && (
              <>
                {/* KPIs Principais */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Projetos Totais</p>
                          <p className="text-3xl font-bold">{dashData.resumo.total_projetos}</p>
                        </div>
                        <Target size={40} className="text-blue-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Em Andamento</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {dashData.resumo.projetos_em_andamento}
                          </p>
                        </div>
                        <Activity size={40} className="text-blue-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Tarefas Atrasadas</p>
                          <p className="text-3xl font-bold text-red-600">
                            {dashData.resumo.total_tarefas_atrasadas}
                          </p>
                        </div>
                        <AlertTriangle size={40} className="text-red-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Responsáveis com Atraso</p>
                          <p className="text-3xl font-bold text-orange-600">
                            {dashData.resumo.responsaveis_com_atraso}
                          </p>
                        </div>
                        <Users size={40} className="text-orange-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Carga por Responsável */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users size={20} />
                      Performance por Responsável
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashData.carga_por_responsavel?.slice(0, 10).map((resp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                resp.tarefas_atrasadas > 0 ? 'bg-red-500' : 'bg-green-500'
                              }`}>
                                {resp.responsavel.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold">{resp.responsavel}</p>
                                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                  <span>Total: {resp.total_tarefas}</span>
                                  {resp.tarefas_atrasadas > 0 && (
                                    <span className="text-red-600 font-medium">
                                      Atrasadas: {resp.tarefas_atrasadas} ({resp.total_dias_atraso} dias)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {podeCobrar && resp.tarefas_atrasadas > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleAbrirCobranca(resp)}
                            >
                              <Bell size={14} className="mr-1" />
                              Cobrar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* TAB: Gargalos */}
          <TabsContent value="gargalos" className="space-y-6">
            {relGargalos && relGargalos.resumo && (
              <>
                {/* Resumo de Gargalos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={32} className="text-red-600" />
                        <div>
                          <p className="text-sm text-red-800">Tarefas Críticas</p>
                          <p className="text-2xl font-bold text-red-900">
                            {relGargalos.resumo.tarefas_criticas}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Users size={32} className="text-orange-600" />
                        <div>
                          <p className="text-sm text-orange-800">Setores com Gargalo</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {relGargalos.resumo.setores_com_gargalo}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Clock size={32} className="text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-800">Total Dias Atraso</p>
                          <p className="text-2xl font-bold text-yellow-900">
                            {relGargalos.resumo.total_dias_atraso}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gargalos por Setor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 size={20} />
                      Gargalos por Setor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {relGargalos.gargalos_por_setor?.map((setor, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg capitalize">{setor.setor}</h3>
                            <Badge className="bg-red-100 text-red-800">
                              {setor.quantidade_atrasadas} atrasadas
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-600">Total Dias Atraso</p>
                              <p className="text-xl font-bold text-red-600">
                                {setor.total_dias_atraso}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Média por Tarefa</p>
                              <p className="text-xl font-bold">
                                {setor.media_dias_atraso} dias
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Prioridade</p>
                              <Badge className={
                                setor.media_dias_atraso > 10 ? 'bg-red-600' :
                                setor.media_dias_atraso > 5 ? 'bg-orange-600' : 'bg-yellow-600'
                              }>
                                {setor.media_dias_atraso > 10 ? 'Crítica' :
                                 setor.media_dias_atraso > 5 ? 'Alta' : 'Média'}
                              </Badge>
                            </div>
                          </div>

                          {setor.tarefas && setor.tarefas.length > 0 && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm font-medium text-blue-600">
                                Ver {setor.tarefas.length} tarefa(s) atrasada(s)
                              </summary>
                              <div className="mt-2 space-y-2">
                                {setor.tarefas.slice(0, 5).map((tarefa, tidx) => (
                                  <div key={tidx} className="text-sm p-2 bg-gray-50 rounded">
                                    <p className="font-medium">{tarefa.titulo}</p>
                                    <p className="text-gray-600 text-xs">
                                      Responsável: {tarefa.responsavel} • Atraso: {tarefa.dias_atraso} dias
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Responsáveis com Gargalo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users size={20} />
                      Responsáveis que Precisam de Atenção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {relGargalos.gargalos_por_responsavel?.slice(0, 10).map((resp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                          <div className="flex-1">
                            <p className="font-semibold">{resp.responsavel}</p>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              <span>Atrasadas: {resp.quantidade_atrasadas}</span>
                              <span>Total atraso: {resp.total_dias_atraso} dias</span>
                              <span>Setores: {resp.setores_afetados?.join(', ')}</span>
                            </div>
                          </div>
                          
                          {podeCobrar && (
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleAbrirCobranca(resp)}
                            >
                              <Bell size={14} className="mr-1" />
                              Cobrar Urgente
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* TAB: Semanal */}
          <TabsContent value="semanal" className="space-y-6">
            {relSemanal && relSemanal.resumo && (
              <>
                {/* Resumo Semanal */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Tarefas Criadas</p>
                      <p className="text-3xl font-bold flex items-center gap-2">
                        {relSemanal.resumo.tarefas_criadas}
                        <TrendingUp size={20} className="text-green-500" />
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Tarefas Finalizadas</p>
                      <p className="text-3xl font-bold flex items-center gap-2">
                        {relSemanal.resumo.tarefas_finalizadas}
                        <CheckCircle2 size={20} className="text-blue-500" />
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Taxa de Conclusão</p>
                      <p className="text-3xl font-bold text-green-600">
                        {relSemanal.resumo.taxa_conclusao}%
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Atrasadas</p>
                      <p className="text-3xl font-bold text-red-600">
                        {relSemanal.resumo.tarefas_atrasadas}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance por Setor (Semanal) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Semanal por Setor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(relSemanal.por_setor || {}).map(([setor, dados]) => (
                        <div key={setor} className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2 capitalize">{setor}</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Criadas</p>
                              <p className="text-xl font-bold">{dados.criadas}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Finalizadas</p>
                              <p className="text-xl font-bold text-green-600">{dados.finalizadas}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Atrasadas</p>
                              <p className="text-xl font-bold text-red-600">{dados.atrasadas}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* TAB: Mensal */}
          <TabsContent value="mensal" className="space-y-6">
            {relMensal && relMensal.resumo && (
              <>
                {/* Resumo Mensal */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Criadas no Mês</p>
                      <p className="text-3xl font-bold">{relMensal.resumo.tarefas_criadas}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Média: {relMensal.resumo.media_diaria_criadas}/dia
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Finalizadas</p>
                      <p className="text-3xl font-bold text-green-600">
                        {relMensal.resumo.tarefas_finalizadas}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Média: {relMensal.resumo.media_diaria_finalizadas}/dia
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Taxa Conclusão</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {relMensal.resumo.taxa_conclusao}%
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Atrasadas</p>
                      <p className="text-3xl font-bold text-red-600">
                        {relMensal.resumo.tarefas_atrasadas}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Tendência</p>
                      <p className="text-3xl font-bold flex items-center gap-2">
                        {relMensal.resumo.taxa_conclusao >= 70 ? (
                          <>
                            <TrendingUp className="text-green-500" />
                            <span className="text-green-600 text-xl">Boa</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="text-red-500" />
                            <span className="text-red-600 text-xl">Ruim</span>
                          </>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Análise por Setor Mensal */}
                <Card>
                  <CardHeader>
                    <CardTitle>Análise Mensal Detalhada por Setor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(relMensal.analise_por_setor || {}).map(([setor, dados]) => (
                        <Card key={setor} className="border-2">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg capitalize">{setor}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total de tarefas:</span>
                                <span className="font-semibold">{dados.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Finalizadas:</span>
                                <span className="font-semibold text-green-600">{dados.finalizadas}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Em andamento:</span>
                                <span className="font-semibold text-blue-600">{dados.em_andamento}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Atrasadas:</span>
                                <span className="font-semibold text-red-600">{dados.atrasadas}</span>
                              </div>
                              <div className="pt-2 border-t">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">Taxa de Conclusão:</span>
                                  <Badge className={
                                    dados.taxa_conclusao >= 80 ? 'bg-green-600' :
                                    dados.taxa_conclusao >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                  }>
                                    {dados.taxa_conclusao}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Gargalos para Cobrança */}
                {relMensal.gargalos_para_cobranca && relMensal.gargalos_para_cobranca.length > 0 && (
                  <Card className="border-red-300 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-900 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Itens Prioritários para Cobrança
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {relMensal.gargalos_para_cobranca.map((item, idx) => (
                          <div key={idx} className="bg-white border border-red-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-red-900">{item.tarefa}</h4>
                                <div className="flex gap-4 text-sm text-gray-600 mt-2">
                                  <span className="capitalize">Setor: {item.setor}</span>
                                  <span>Responsável: {item.responsavel}</span>
                                  <span className="text-red-600 font-medium">
                                    Atraso: {item.dias_atraso} dias
                                  </span>
                                </div>
                                <Badge className="mt-2 bg-red-600">
                                  {item.acao_sugerida}
                                </Badge>
                              </div>
                              
                              {podeCobrar && (
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 ml-4"
                                  onClick={() => handleAbrirCobranca({
                                    responsavel: item.responsavel,
                                    quantidade_atrasadas: 1,
                                    total_dias_atraso: item.dias_atraso,
                                    tarefas: [{ id: `tarefa-${idx}`, titulo: item.tarefa }]
                                  })}
                                >
                                  <Bell size={14} className="mr-1" />
                                  Cobrar Agora
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de Cobrança */}
        <Dialog open={cobrancaModal} onOpenChange={setCobrancaModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="text-orange-600" />
                Enviar Cobrança - {itemParaCobrar?.responsavel}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {itemParaCobrar && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Tarefas Atrasadas:</p>
                      <p className="text-xl font-bold text-red-900">
                        {itemParaCobrar.quantidade_atrasadas}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Dias de Atraso:</p>
                      <p className="text-xl font-bold text-red-900">
                        {itemParaCobrar.total_dias_atraso}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Mensagem da Cobrança *</Label>
                <Textarea
                  rows={8}
                  value={mensagemCobranca}
                  onChange={(e) => setMensagemCobranca(e.target.value)}
                  placeholder="Escreva a mensagem..."
                  className="resize-none"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setCobrancaModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleEnviarCobranca}
                disabled={enviando}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {enviando ? (
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

export default RelatoriosCompleto;
