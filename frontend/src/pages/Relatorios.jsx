import React, { useState, useEffect, useCallback } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Building2,
  User,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react';
import {
  getRelatorioGargalos,
  getRelatorioSemanal,
  getRelatorioMensal
} from '../services/api';
import './Relatorios.css';

const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', cor: '#10b981' },
  media: { label: 'Média', cor: '#f59e0b' },
  alta: { label: 'Alta', cor: '#ef4444' },
  critica: { label: 'Crítica', cor: '#7f1d1d' },
};

const Relatorios = () => {
  const [activeTab, setActiveTab] = useState('gargalos');
  const [loading, setLoading] = useState(true);
  const [gargalos, setGargalos] = useState(null);
  const [semanal, setSemanal] = useState(null);
  const [mensal, setMensal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gargalosData, semanalData, mensalData] = await Promise.all([
        getRelatorioGargalos(),
        getRelatorioSemanal(),
        getRelatorioMensal()
      ]);
      setGargalos(gargalosData);
      setSemanal(semanalData);
      setMensal(mensalData);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportToPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <LayoutNovo title="Relatórios" subtitle="Indicadores de produtividade e gargalos">
        <div className="loading-container">
          <RefreshCw className="animate-spin" size={32} />
          <span>Carregando relatórios...</span>
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo title="Relatórios" subtitle="Indicadores de produtividade e gargalos para cobrança">
      <div className="relatorios-container">
        {/* Header Actions */}
        <div className="relatorios-header">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw size={18} className="mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportToPrint}>
            <Download size={18} className="mr-2" />
            Imprimir/Exportar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="relatorios-tabs">
            <TabsTrigger value="gargalos" className="tab-item">
              <AlertTriangle size={16} className="mr-2" />
              Gargalos e Cobrança
            </TabsTrigger>
            <TabsTrigger value="semanal" className="tab-item">
              <Calendar size={16} className="mr-2" />
              Relatório Semanal
            </TabsTrigger>
            <TabsTrigger value="mensal" className="tab-item">
              <BarChart3 size={16} className="mr-2" />
              Relatório Mensal
            </TabsTrigger>
          </TabsList>

          {/* Tab: Gargalos */}
          <TabsContent value="gargalos" className="tab-content">
            {gargalos && (
              <div className="gargalos-content">
                {/* Resumo */}
                <div className="resumo-cards">
                  <Card className="resumo-card alerta">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{gargalos.resumo?.total_tarefas_atrasadas || 0}</span>
                        <span className="resumo-label">Tarefas Atrasadas</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card warning">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <Clock size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{gargalos.resumo?.total_dias_atraso || 0}</span>
                        <span className="resumo-label">Total Dias de Atraso</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card info">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <Building2 size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{gargalos.resumo?.setores_com_gargalo || 0}</span>
                        <span className="resumo-label">Setores com Gargalo</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card danger">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <AlertCircle size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{gargalos.resumo?.tarefas_criticas || 0}</span>
                        <span className="resumo-label">Tarefas Críticas</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Indicadores para Cobrança */}
                <Card className="cobranca-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target size={20} />
                      Indicadores para Cobrança
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="cobranca-grid">
                      {gargalos.indicadores_cobranca?.setor_mais_critico && (
                        <div className="cobranca-item">
                          <h4>Setor Mais Crítico</h4>
                          <div className="cobranca-destaque">
                            <span className="setor-nome">
                              {gargalos.indicadores_cobranca.setor_mais_critico.setor}
                            </span>
                            <Badge variant="destructive">
                              {gargalos.indicadores_cobranca.setor_mais_critico.quantidade_atrasadas} atrasadas
                            </Badge>
                          </div>
                          <p className="cobranca-detalhe">
                            Média de {gargalos.indicadores_cobranca.setor_mais_critico.media_dias_atraso} dias de atraso
                          </p>
                        </div>
                      )}

                      {gargalos.indicadores_cobranca?.responsavel_mais_atrasado && (
                        <div className="cobranca-item">
                          <h4>Responsável com Mais Atrasos</h4>
                          <div className="cobranca-destaque">
                            <span className="responsavel-nome">
                              <User size={16} className="inline mr-1" />
                              {gargalos.indicadores_cobranca.responsavel_mais_atrasado.responsavel}
                            </span>
                            <Badge variant="destructive">
                              {gargalos.indicadores_cobranca.responsavel_mais_atrasado.quantidade_atrasadas} tarefas
                            </Badge>
                          </div>
                          <p className="cobranca-detalhe">
                            Total: {gargalos.indicadores_cobranca.responsavel_mais_atrasado.total_dias_atraso} dias de atraso
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Gargalos por Setor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 size={20} />
                      Gargalos por Setor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gargalos.gargalos_por_setor?.length === 0 ? (
                      <div className="empty-message success">
                        <CheckCircle2 size={32} />
                        <p>Nenhum gargalo identificado!</p>
                      </div>
                    ) : (
                      <div className="setores-list">
                        {gargalos.gargalos_por_setor?.map((setor, idx) => (
                          <div key={idx} className="setor-item">
                            <div className="setor-header">
                              <div className="setor-info">
                                <h4>{setor.setor}</h4>
                                <div className="setor-stats">
                                  <Badge variant="destructive">
                                    {setor.quantidade_atrasadas} atrasadas
                                  </Badge>
                                  <span className="stat-text">
                                    Média: {setor.media_dias_atraso} dias
                                  </span>
                                </div>
                              </div>
                              <div className="setor-total">
                                <span className="total-dias">{setor.total_dias_atraso}</span>
                                <span className="total-label">dias totais</span>
                              </div>
                            </div>
                            
                            {setor.tarefas?.length > 0 && (
                              <div className="setor-tarefas">
                                {setor.tarefas.slice(0, 3).map((tarefa, tidx) => (
                                  <div key={tidx} className="tarefa-mini">
                                    <span className="tarefa-titulo">{tarefa.titulo}</span>
                                    <div className="tarefa-info-mini">
                                      <span>{tarefa.responsavel || 'N/A'}</span>
                                      <Badge 
                                        variant="outline"
                                        style={{ 
                                          borderColor: PRIORIDADE_CONFIG[tarefa.prioridade]?.cor,
                                          color: PRIORIDADE_CONFIG[tarefa.prioridade]?.cor
                                        }}
                                      >
                                        {tarefa.dias_atraso}d
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tarefas Críticas */}
                <Card className="tarefas-criticas-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={20} />
                      Tarefas Críticas - Ação Imediata
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gargalos.tarefas_criticas?.length === 0 ? (
                      <div className="empty-message success">
                        <CheckCircle2 size={32} />
                        <p>Nenhuma tarefa crítica no momento!</p>
                      </div>
                    ) : (
                      <div className="tarefas-criticas-list">
                        {gargalos.tarefas_criticas?.map((tarefa, idx) => (
                          <div key={idx} className="tarefa-critica-item">
                            <div className="tarefa-critica-header">
                              <h4>{tarefa.titulo}</h4>
                              <Badge variant="destructive" className="atraso-badge">
                                {tarefa.dias_atraso} dias de atraso
                              </Badge>
                            </div>
                            <div className="tarefa-critica-info">
                              <span><Building2 size={14} /> {tarefa.setor}</span>
                              <span><User size={14} /> {tarefa.responsavel || 'Não atribuído'}</span>
                              <Badge 
                                style={{ 
                                  backgroundColor: PRIORIDADE_CONFIG[tarefa.prioridade]?.cor + '20',
                                  color: PRIORIDADE_CONFIG[tarefa.prioridade]?.cor
                                }}
                              >
                                {PRIORIDADE_CONFIG[tarefa.prioridade]?.label || tarefa.prioridade}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tab: Semanal */}
          <TabsContent value="semanal" className="tab-content">
            {semanal && (
              <div className="semanal-content">
                <div className="periodo-info">
                  <Calendar size={16} />
                  <span>
                    Período: {new Date(semanal.periodo?.inicio).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(semanal.periodo?.fim).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Resumo Semanal */}
                <div className="resumo-cards">
                  <Card className="resumo-card success">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <TrendingUp size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{semanal.resumo?.tarefas_criadas || 0}</span>
                        <span className="resumo-label">Tarefas Criadas</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card info">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <CheckCircle2 size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{semanal.resumo?.tarefas_finalizadas || 0}</span>
                        <span className="resumo-label">Tarefas Finalizadas</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card alerta">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{semanal.resumo?.tarefas_atrasadas || 0}</span>
                        <span className="resumo-label">Atrasadas Atuais</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card">
                    <CardContent className="p-4">
                      <div className="resumo-icon">
                        <Target size={24} />
                      </div>
                      <div className="resumo-info">
                        <span className="resumo-valor">{semanal.resumo?.taxa_conclusao || 0}%</span>
                        <span className="resumo-label">Taxa de Conclusão</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Por Setor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho por Setor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="setor-performance-grid">
                      {Object.entries(semanal.por_setor || {}).map(([setor, dados]) => (
                        <div key={setor} className="setor-performance-item">
                          <h4>{setor}</h4>
                          <div className="performance-stats">
                            <div className="stat">
                              <span className="stat-valor">{dados.criadas}</span>
                              <span className="stat-label">Criadas</span>
                            </div>
                            <div className="stat">
                              <span className="stat-valor">{dados.finalizadas}</span>
                              <span className="stat-label">Finalizadas</span>
                            </div>
                            <div className="stat warning">
                              <span className="stat-valor">{dados.atrasadas}</span>
                              <span className="stat-label">Atrasadas</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Detalhes Atrasadas */}
                {semanal.detalhes_atrasadas?.length > 0 && (
                  <Card className="atrasadas-card">
                    <CardHeader>
                      <CardTitle className="text-red-600">Tarefas Atrasadas para Cobrança</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="atrasadas-list">
                        {semanal.detalhes_atrasadas.map((tarefa, idx) => (
                          <div key={idx} className="atrasada-item">
                            <div className="atrasada-info">
                              <span className="atrasada-titulo">{tarefa.titulo}</span>
                              <span className="atrasada-meta">
                                {tarefa.setor} • {tarefa.responsavel || 'N/A'}
                              </span>
                            </div>
                            <Badge variant="destructive">{tarefa.dias_atraso}d</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab: Mensal */}
          <TabsContent value="mensal" className="tab-content">
            {mensal && (
              <div className="mensal-content">
                <div className="periodo-info">
                  <Calendar size={16} />
                  <span>
                    Período: {new Date(mensal.periodo?.inicio).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(mensal.periodo?.fim).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Resumo Mensal */}
                <div className="resumo-cards">
                  <Card className="resumo-card success">
                    <CardContent className="p-4">
                      <div className="resumo-info">
                        <span className="resumo-valor">{mensal.resumo?.tarefas_criadas || 0}</span>
                        <span className="resumo-label">Tarefas Criadas</span>
                        <span className="resumo-sub">Média: {mensal.resumo?.media_diaria_criadas || 0}/dia</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card info">
                    <CardContent className="p-4">
                      <div className="resumo-info">
                        <span className="resumo-valor">{mensal.resumo?.tarefas_finalizadas || 0}</span>
                        <span className="resumo-label">Tarefas Finalizadas</span>
                        <span className="resumo-sub">Média: {mensal.resumo?.media_diaria_finalizadas || 0}/dia</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card">
                    <CardContent className="p-4">
                      <div className="resumo-info">
                        <span className="resumo-valor">{mensal.resumo?.taxa_conclusao || 0}%</span>
                        <span className="resumo-label">Taxa de Conclusão</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="resumo-card alerta">
                    <CardContent className="p-4">
                      <div className="resumo-info">
                        <span className="resumo-valor">{mensal.resumo?.tarefas_atrasadas || 0}</span>
                        <span className="resumo-label">Atrasadas Atuais</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Evolução Semanal */}
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução por Semana</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="evolucao-semanal">
                      {mensal.evolucao_semanal?.map((semana, idx) => (
                        <div key={idx} className="semana-item">
                          <div className="semana-header">
                            <span className="semana-numero">Semana {semana.semana}</span>
                            <span className="semana-periodo">
                              {new Date(semana.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                          <div className="semana-bars">
                            <div className="bar-group">
                              <div 
                                className="bar bar-criadas" 
                                style={{ height: `${Math.min(semana.criadas * 10, 100)}%` }}
                              />
                              <span className="bar-value">{semana.criadas}</span>
                              <span className="bar-label">Criadas</span>
                            </div>
                            <div className="bar-group">
                              <div 
                                className="bar bar-finalizadas" 
                                style={{ height: `${Math.min(semana.finalizadas * 10, 100)}%` }}
                              />
                              <span className="bar-value">{semana.finalizadas}</span>
                              <span className="bar-label">Finalizadas</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Análise por Setor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Análise por Setor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="analise-setor-grid">
                      {Object.entries(mensal.analise_por_setor || {}).map(([setor, dados]) => (
                        <div key={setor} className="analise-setor-item">
                          <div className="analise-header">
                            <h4>{setor}</h4>
                            <Badge variant={dados.taxa_conclusao >= 70 ? 'default' : 'destructive'}>
                              {dados.taxa_conclusao}% concluído
                            </Badge>
                          </div>
                          <Progress value={dados.taxa_conclusao} className="mt-2" />
                          <div className="analise-stats">
                            <span>Total: {dados.total}</span>
                            <span className="text-green-600">Finalizadas: {dados.finalizadas}</span>
                            <span className="text-blue-600">Andamento: {dados.em_andamento}</span>
                            <span className="text-red-600">Atrasadas: {dados.atrasadas}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Gargalos para Cobrança */}
                {mensal.gargalos_para_cobranca?.length > 0 && (
                  <Card className="cobranca-mensal-card">
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center gap-2">
                        <Target size={20} />
                        Lista de Cobrança - Ação Necessária
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="cobranca-list">
                        {mensal.gargalos_para_cobranca.map((item, idx) => (
                          <div key={idx} className="cobranca-list-item">
                            <div className="cobranca-list-info">
                              <h4>{item.tarefa}</h4>
                              <div className="cobranca-list-meta">
                                <span>{item.setor}</span>
                                <span>•</span>
                                <span>{item.responsavel}</span>
                              </div>
                            </div>
                            <div className="cobranca-list-action">
                              <Badge variant="destructive">{item.dias_atraso} dias</Badge>
                              <span className={`acao-sugerida ${item.acao_sugerida.includes('imediata') ? 'urgente' : ''}`}>
                                {item.acao_sugerida}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </LayoutNovo>
  );
};

export default Relatorios;
