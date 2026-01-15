import React from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  FolderKanban,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { mockProjetos, mockContratos, mockDashboard, mockTarefas } from '../data/mockNovo';
import './DashboardNovo.css';

const DashboardNovo = () => {
  const { kpis, tarefas_atrasadas, gargalos_responsaveis } = mockDashboard;

  const kpiCards = [
    {
      title: 'Total de Projetos',
      value: kpis.total_projetos,
      icon: FolderKanban,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    {
      title: 'Em Dia',
      value: kpis.em_dia,
      icon: CheckCircle2,
      color: '#10b981',
      bgColor: '#ecfdf5'
    },
    {
      title: 'Atrasados',
      value: kpis.atrasados,
      icon: AlertTriangle,
      color: '#dc2626',
      bgColor: '#fef2f2'
    },
    {
      title: 'Concluídos',
      value: kpis.concluidos,
      icon: TrendingUp,
      color: '#8b5cf6',
      bgColor: '#f5f3ff'
    }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <LayoutNovo title="Dashboard" subtitle="Visão geral do sistema de gestão">
      <div className="dashboard-novo-container">
        {/* KPI Cards */}
        <div className="kpi-grid-novo">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className="kpi-card-novo">
              <CardContent className="kpi-content-novo">
                <div className="kpi-icon-novo" style={{ backgroundColor: kpi.bgColor }}>
                  <kpi.icon size={24} style={{ color: kpi.color }} />
                </div>
                <div className="kpi-info-novo">
                  <span className="kpi-value-novo" style={{ color: kpi.color }}>{kpi.value}</span>
                  <span className="kpi-title-novo">{kpi.title}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="dashboard-grid-novo">
          {/* Projetos em Andamento */}
          <Card className="projetos-card-novo">
            <div className="card-header-novo">
              <h3><FolderKanban size={18} /> Projetos em Andamento</h3>
              <Badge variant="secondary">{mockProjetos.filter(p => p.status !== 'Concluído').length}</Badge>
            </div>
            <CardContent>
              <div className="projetos-list-novo">
                {mockProjetos.filter(p => p.status !== 'Concluído').map((projeto) => (
                  <div key={projeto.id} className={`projeto-item-novo ${projeto.status === 'Atrasado' ? 'atrasado' : ''}`}>
                    <div className="projeto-info-novo">
                      <span className="projeto-nome-novo">{projeto.cliente}</span>
                      <span className="projeto-etapa-novo">{projeto.etapa_atual_nome}</span>
                    </div>
                    <div className="projeto-progress-novo">
                      <Progress value={projeto.progresso} />
                      <span className="progress-text-novo">{projeto.progresso}%</span>
                    </div>
                    {projeto.dias_atraso > 0 && (
                      <Badge variant="destructive" className="atraso-badge-novo">
                        {projeto.dias_atraso}d
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Atraso */}
          <Card className="alertas-card-novo">
            <div className="card-header-novo alertas">
              <h3><AlertTriangle size={18} /> Alertas de Atraso</h3>
              <Badge variant="destructive">{tarefas_atrasadas.length}</Badge>
            </div>
            <CardContent>
              {tarefas_atrasadas.length > 0 ? (
                <div className="alertas-list-novo">
                  {tarefas_atrasadas.map((tarefa) => (
                    <div key={tarefa.id} className="alerta-item-novo">
                      <div className="alerta-icon">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="alerta-info">
                        <span className="alerta-titulo">{tarefa.titulo}</span>
                        <span className="alerta-cliente">{tarefa.cliente}</span>
                      </div>
                      <div className="alerta-responsavel">
                        <Users size={12} />
                        {tarefa.responsavel}
                      </div>
                      <Badge variant="destructive">{tarefa.dias_atraso}d</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-alertas">
                  <CheckCircle2 size={40} />
                  <p>Nenhum atraso no momento!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carga por Responsável */}
          <Card className="carga-card-novo">
            <div className="card-header-novo">
              <h3><Users size={18} /> Carga por Responsável</h3>
            </div>
            <CardContent>
              <div className="carga-list-novo">
                {gargalos_responsaveis.map(([responsavel, count], index) => (
                  <div key={index} className="carga-item-novo">
                    <div className="carga-avatar">
                      {responsavel.charAt(0)}
                    </div>
                    <div className="carga-info">
                      <span className="carga-nome">{responsavel}</span>
                      <div className="carga-bar">
                        <div 
                          className="carga-fill"
                          style={{ 
                            width: `${Math.min((count / 5) * 100, 100)}%`,
                            backgroundColor: count > 3 ? '#ef4444' : count > 2 ? '#f59e0b' : '#10b981'
                          }}
                        />
                      </div>
                    </div>
                    <span className="carga-count">{count} tarefas</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Próximas Entregas */}
          <Card className="entregas-card-novo">
            <div className="card-header-novo">
              <h3><Calendar size={18} /> Próximas Entregas</h3>
            </div>
            <CardContent>
              <div className="entregas-list-novo">
                {mockProjetos
                  .filter(p => p.status !== 'Concluído')
                  .sort((a, b) => a.dias_restantes - b.dias_restantes)
                  .slice(0, 4)
                  .map((projeto) => (
                    <div key={projeto.id} className="entrega-item-novo">
                      <div className="entrega-info">
                        <span className="entrega-cliente">{projeto.cliente}</span>
                        <span className="entrega-data">{formatDate(projeto.data_entrega)}</span>
                      </div>
                      <Badge 
                        className={`dias-badge ${projeto.dias_restantes < 30 ? 'urgente' : ''}`}
                      >
                        <Clock size={12} />
                        {projeto.dias_restantes} dias
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutNovo>
  );
};

export default DashboardNovo;
