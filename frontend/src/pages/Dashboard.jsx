import React from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  FolderKanban
} from 'lucide-react';
import { mockDashboard, mockProjetos, mockTarefas, NIVEIS_RISCO } from '../data/mock';
import './Dashboard.css';

const Dashboard = () => {
  const { kpis, projetos_por_status, tarefas_atrasadas, gargalos_responsaveis } = mockDashboard;

  const kpiCards = [
    {
      title: 'Total de Projetos',
      value: kpis.total_projetos,
      icon: FolderKanban,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    {
      title: 'No Prazo',
      value: `${kpis.percentual_no_prazo}%`,
      icon: CheckCircle2,
      color: '#10b981',
      bgColor: '#ecfdf5'
    },
    {
      title: 'Risco Médio',
      value: kpis.projetos_risco_medio,
      icon: AlertTriangle,
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    {
      title: 'Tarefas Atrasadas',
      value: kpis.tarefas_atrasadas_total,
      icon: Clock,
      color: '#ef4444',
      bgColor: '#fef2f2'
    }
  ];

  const getRiscoColor = (risco) => {
    return NIVEIS_RISCO[risco.toUpperCase()]?.cor || '#94a3b8';
  };

  return (
    <Layout>
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
          {/* Projetos por Status */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle className="card-title">
                <BarChart3 size={20} />
                Projetos por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="status-bars">
                {Object.entries(projetos_por_status).map(([status, count]) => (
                  <div key={status} className="status-bar-item">
                    <div className="status-bar-header">
                      <span className="status-name">{status}</span>
                      <span className="status-count">{count}</span>
                    </div>
                    <div className="status-bar-track">
                      <div 
                        className="status-bar-fill"
                        style={{ 
                          width: `${(count / kpis.total_projetos) * 100}%`,
                          backgroundColor: status === 'Finalizado' ? '#10b981' : 
                                          status === 'Em Andamento' ? '#3b82f6' : '#f59e0b'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projetos em Andamento */}
          <Card className="projects-card">
            <CardHeader>
              <CardTitle className="card-title">
                <FolderKanban size={20} />
                Projetos em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="projects-list">
                {mockProjetos.filter(p => p.progresso < 100).slice(0, 4).map((projeto) => (
                  <div key={projeto.id} className="project-item">
                    <div className="project-header">
                      <span className="project-name">{projeto.cliente}</span>
                      <Badge 
                        className="risk-badge"
                        style={{ 
                          backgroundColor: getRiscoColor(projeto.risco) + '20',
                          color: getRiscoColor(projeto.risco)
                        }}
                      >
                        {projeto.risco}
                      </Badge>
                    </div>
                    <div className="project-etapa">{projeto.etapa_atual}</div>
                    <div className="project-progress">
                      <Progress value={projeto.progresso} className="progress-bar" />
                      <span className="progress-text">{projeto.progresso}%</span>
                    </div>
                    <div className="project-footer">
                      <span className="days-remaining">
                        <Clock size={14} />
                        {projeto.dias_restantes} dias restantes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tarefas Atrasadas */}
          <Card className="tasks-card">
            <CardHeader>
              <CardTitle className="card-title text-red-600">
                <AlertTriangle size={20} />
                Tarefas Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tarefas_atrasadas.length > 0 ? (
                <div className="tasks-list">
                  {tarefas_atrasadas.map((tarefa) => (
                    <div key={tarefa.id} className="task-item alert">
                      <div className="task-info">
                        <span className="task-title">{tarefa.titulo}</span>
                        <span className="task-responsible">{tarefa.responsavel}</span>
                      </div>
                      <Badge variant="destructive" className="delay-badge">
                        {tarefa.dias_atraso} dias
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <CheckCircle2 size={40} className="text-green-500" />
                  <p>Nenhuma tarefa atrasada!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gargalos por Responsável */}
          <Card className="bottleneck-card">
            <CardHeader>
              <CardTitle className="card-title">
                <Users size={20} />
                Carga por Responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bottleneck-list">
                {gargalos_responsaveis.map(([responsavel, count], index) => (
                  <div key={index} className="bottleneck-item">
                    <div className="bottleneck-avatar">
                      {responsavel.charAt(0)}
                    </div>
                    <div className="bottleneck-info">
                      <span className="bottleneck-name">{responsavel}</span>
                      <div className="bottleneck-bar">
                        <div 
                          className="bottleneck-fill"
                          style={{ 
                            width: `${Math.min((count / 5) * 100, 100)}%`,
                            backgroundColor: count > 3 ? '#ef4444' : count > 2 ? '#f59e0b' : '#10b981'
                          }}
                        />
                      </div>
                    </div>
                    <span className="bottleneck-count">{count} tarefas</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
