import React, { useEffect, useState, useMemo } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
  RadialBarChart, RadialBar
} from 'recharts';
import {
  Folder,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Award,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import './RelatoriosNovo.css';

// Cores do tema
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Componente KPI Card
const KPICard = ({ label, value, hint, icon: Icon, color, delta }) => (
  <Card className="kpi-card">
    <CardContent className="kpi-content">
      <div className="kpi-icon-wrapper" style={{ backgroundColor: `${color}15` }}>
        {Icon && <Icon size={24} style={{ color }} />}
      </div>
      <div className="kpi-info">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value" style={{ color }}>{value}</span>
        {hint && <span className="kpi-hint">{hint}</span>}
        {delta !== undefined && delta !== null && (
          <div className={`kpi-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
            {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{delta >= 0 ? '+' : ''}{delta}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// Componente de tooltip customizado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RelatoriosNovo() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/reports/overview?days_lookback=${range}&user_role=${user?.role || 'admin'}`);
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  // Processar dados para gráficos
  const overdueByDept = useMemo(() => {
    if (!data?.overdue_by_department) return [];
    return data.overdue_by_department.map((x, i) => ({
      ...x,
      fill: CHART_COLORS[i % CHART_COLORS.length]
    }));
  }, [data]);

  const riskDist = useMemo(() => {
    if (!data?.risk_distribution) return [];
    return data.risk_distribution.map(x => ({
      name: x.risk_label,
      value: x.count,
      fill: x.color
    }));
  }, [data]);

  const sectorPerf = useMemo(() => {
    if (!data?.sector_performance) return [];
    return data.sector_performance.map((x, i) => ({
      ...x,
      name: x.setor_label,
      fill: CHART_COLORS[i % CHART_COLORS.length]
    }));
  }, [data]);

  const throughput7 = data?.throughput_7d || [];
  const throughput30 = data?.throughput_30d || [];
  const monthlyTrend = data?.monthly_trend || [];

  // Ícones para KPIs
  const getKPIIcon = (label) => {
    const icons = {
      'Total de Projetos': Folder,
      'Projetos em Andamento': Play,
      'Tarefas Atrasadas': AlertTriangle,
      'SLA (30d)': CheckCircle,
      'Tempo Médio': Clock,
    };
    return icons[label] || Activity;
  };

  if (loading) {
    return (
      <LayoutNovo>
        <div className="relatorios-loading">
          <RefreshCw className="animate-spin" size={48} />
          <p>Carregando relatórios...</p>
        </div>
      </LayoutNovo>
    );
  }

  if (!data) {
    return (
      <LayoutNovo>
        <div className="relatorios-error">
          <AlertCircle size={48} />
          <p>Erro ao carregar relatórios</p>
          <Button onClick={loadData}>Tentar novamente</Button>
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="relatorios-container">
        {/* Header */}
        <div className="relatorios-header">
          <div className="header-info">
            <h1 className="page-title">
              <BarChart3 size={28} />
              Relatórios e Análises
            </h1>
            <p className="page-subtitle">
              Atualizado em: {new Date(data.as_of).toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div className="header-actions">
            <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
              <SelectTrigger className="range-select">
                <Calendar size={16} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 180 dias</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={loadData} className="refresh-btn">
              <RefreshCw size={16} />
              Atualizar
            </Button>
            
            <Button variant="outline" className="export-btn">
              <Download size={16} />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="kpis-grid">
          {data.kpis?.map((kpi, index) => (
            <KPICard
              key={index}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              icon={getKPIIcon(kpi.label)}
              color={kpi.color || CHART_COLORS[index % CHART_COLORS.length]}
              delta={kpi.delta}
            />
          ))}
        </div>

        {/* Comparação Semanal */}
        {data.weekly_comparison && (
          <Card className="weekly-comparison-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                Comparação Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="weekly-grid">
                <div className="weekly-item">
                  <span className="weekly-label">Tarefas Criadas</span>
                  <div className="weekly-values">
                    <span className="weekly-current">{data.weekly_comparison.this_week.criadas}</span>
                    <span className={`weekly-delta ${data.weekly_comparison.delta_criadas >= 0 ? 'positive' : 'negative'}`}>
                      {data.weekly_comparison.delta_criadas >= 0 ? '+' : ''}{data.weekly_comparison.delta_criadas}
                    </span>
                  </div>
                  <span className="weekly-previous">vs {data.weekly_comparison.last_week.criadas} semana anterior</span>
                </div>
                <div className="weekly-item">
                  <span className="weekly-label">Tarefas Finalizadas</span>
                  <div className="weekly-values">
                    <span className="weekly-current">{data.weekly_comparison.this_week.finalizadas}</span>
                    <span className={`weekly-delta ${data.weekly_comparison.delta_finalizadas >= 0 ? 'positive' : 'negative'}`}>
                      {data.weekly_comparison.delta_finalizadas >= 0 ? '+' : ''}{data.weekly_comparison.delta_finalizadas}
                    </span>
                  </div>
                  <span className="weekly-previous">vs {data.weekly_comparison.last_week.finalizadas} semana anterior</span>
                </div>
                <div className="weekly-item">
                  <span className="weekly-label">Atrasadas Atuais</span>
                  <div className="weekly-values">
                    <span className="weekly-current danger">{data.weekly_comparison.this_week.atrasadas}</span>
                  </div>
                  <span className="weekly-previous">Tarefas vencidas não finalizadas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráficos Principais */}
        <div className="charts-grid">
          {/* Atrasos por Setor */}
          <Card className="chart-card large">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                Atrasos por Setor
              </CardTitle>
              <span className="chart-subtitle">Tarefas não finalizadas com prazo vencido</span>
            </CardHeader>
            <CardContent>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overdueByDept} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis 
                      dataKey="department_label" 
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      axisLine={{ stroke: 'var(--border-primary)' }}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      axisLine={{ stroke: 'var(--border-primary)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="overdue" 
                      name="Atrasadas"
                      radius={[4, 4, 0, 0]}
                    >
                      {overdueByDept.map((entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição de Risco */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon size={20} />
                Distribuição de Risco
              </CardTitle>
              <span className="chart-subtitle">Por projetos</span>
            </CardHeader>
            <CardContent>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {riskDist.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Produtividade */}
        <div className="charts-grid two-cols">
          {/* Throughput 7 dias */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={20} />
                Produtividade (7 dias)
              </CardTitle>
              <span className="chart-subtitle">Tarefas concluídas por dia</span>
            </CardHeader>
            <CardContent>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={throughput7}>
                    <defs>
                      <linearGradient id="colorValue7" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      name="Concluídas"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      fill="url(#colorValue7)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Throughput 30 dias */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} />
                Produtividade (30 dias)
              </CardTitle>
              <span className="chart-subtitle">Tarefas concluídas por dia</span>
            </CardHeader>
            <CardContent>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={throughput30}>
                    <defs>
                      <linearGradient id="colorValue30" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      name="Concluídas"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      fill="url(#colorValue30)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance por Setor */}
        <Card className="sector-performance-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              Performance por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sector-grid">
              {sectorPerf.map((setor, index) => (
                <div key={index} className="sector-item">
                  <div className="sector-header">
                    <span className="sector-name">{setor.name}</span>
                    <Badge 
                      style={{ 
                        backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20`,
                        color: CHART_COLORS[index % CHART_COLORS.length]
                      }}
                    >
                      {setor.total_tasks} tarefas
                    </Badge>
                  </div>
                  
                  <div className="sector-metrics">
                    <div className="metric">
                      <span className="metric-label">Conclusão</span>
                      <div className="metric-bar">
                        <Progress value={setor.completion_rate} className="h-2" />
                        <span className="metric-value">{setor.completion_rate}%</span>
                      </div>
                    </div>
                    <div className="metric">
                      <span className="metric-label">No Prazo</span>
                      <div className="metric-bar">
                        <Progress value={setor.on_time_rate} className="h-2" />
                        <span className="metric-value">{setor.on_time_rate}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="sector-stats">
                    <div className="stat">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>{setor.completed} concluídas</span>
                    </div>
                    <div className="stat">
                      <AlertTriangle size={14} className="text-red-500" />
                      <span>{setor.overdue} atrasadas</span>
                    </div>
                    <div className="stat">
                      <Clock size={14} className="text-blue-500" />
                      <span>{setor.avg_completion_days}d média</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabelas */}
        <div className="tables-grid">
          {/* Top Responsáveis com Atraso */}
          <Card className="table-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                Top Responsáveis com Atraso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Responsável</th>
                      <th>Setor</th>
                      <th>Atrasadas</th>
                      <th>Média Atraso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_overdue_assignees?.length > 0 ? (
                      data.top_overdue_assignees.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="assignee-cell">
                              <div className="assignee-avatar" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}>
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{item.name}</span>
                            </div>
                          </td>
                          <td>
                            <Badge variant="outline">{item.setor || 'N/A'}</Badge>
                          </td>
                          <td>
                            <span className="overdue-count">{item.overdue}</span>
                          </td>
                          <td>
                            <span className="delay-days">{item.avg_delay_days} dias</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-state">
                          <CheckCircle size={24} className="text-green-500" />
                          <span>Nenhum responsável com atraso</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Gargalos - Projetos Travados */}
          <Card className="table-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle size={20} />
                Gargalos - Projetos Travados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Atrasadas</th>
                      <th>Progresso</th>
                      <th>Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bottlenecks?.length > 0 ? (
                      data.bottlenecks.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="project-cell">
                              <span className="project-name">{item.cliente}</span>
                              <span className="project-stage">{item.project_name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="overdue-count">{item.overdue}</span>
                          </td>
                          <td>
                            <div className="progress-cell">
                              <Progress value={item.progress} className="h-2 w-20" />
                              <span>{item.progress}%</span>
                            </div>
                          </td>
                          <td>
                            <Badge 
                              style={{ 
                                backgroundColor: `${
                                  item.risk === 'critico' ? COLORS.danger :
                                  item.risk === 'alto' ? COLORS.orange :
                                  item.risk === 'medio' ? COLORS.warning :
                                  COLORS.success
                                }20`,
                                color: item.risk === 'critico' ? COLORS.danger :
                                       item.risk === 'alto' ? COLORS.orange :
                                       item.risk === 'medio' ? COLORS.warning :
                                       COLORS.success
                              }}
                            >
                              {item.risk?.charAt(0).toUpperCase() + item.risk?.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-state">
                          <CheckCircle size={24} className="text-green-500" />
                          <span>Nenhum gargalo identificado</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tendência Mensal */}
        {monthlyTrend.length > 0 && (
          <Card className="monthly-trend-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                Tendência Mensal (6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="criadas" name="Criadas" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="finalizadas" name="Finalizadas" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutNovo>
  );
}
