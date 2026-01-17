import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import {
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Building2,
  ChevronRight,
  X,
  User
} from 'lucide-react';
import { mockProjetos, mockContratos, DEPARTAMENTOS, TODAS_ETAPAS } from '../data/mockNovo';
import './DashboardNovo.css';

const DashboardNovo = () => {
  const navigate = useNavigate();
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);

  // Calcular KPIs corretos
  const kpis = {
    total_projetos: mockProjetos.length,
    em_dia: mockProjetos.filter(p => p.status === 'Ativo' && p.dias_atraso === 0).length,
    atrasados: mockProjetos.filter(p => p.status === 'Atrasado').length,
    concluidos: mockProjetos.filter(p => p.status === 'Concluído').length
  };

  // Projetos em andamento (Ativos e Atrasados)
  const projetosEmAndamento = mockProjetos.filter(p => 
    p.status === 'Ativo' || p.status === 'Atrasado'
  );

  // Alertas de atrasos ordenados (menor para maior)
  const projetosAtrasados = mockProjetos
    .filter(p => p.status === 'Atrasado')
    .sort((a, b) => a.dias_atraso - b.dias_atraso); // Crescente

  // Carga por responsável
  const cargaPorResponsavel = () => {
    const carga = {};
    
    // Percorrer todos os departamentos e suas equipes
    Object.values(DEPARTAMENTOS).forEach(dept => {
      // Contar projetos no departamento
      const projetosDept = mockProjetos.filter(p => 
        p.departamento_atual === dept.id && 
        (p.status === 'Ativo' || p.status === 'Atrasado')
      );
      
      // Distribuir entre os membros da equipe
      dept.equipe.forEach(membro => {
        if (!carga[membro]) {
          carga[membro] = {
            nome: membro,
            departamento: dept.nome,
            cor: dept.cor,
            projetos: 0,
            atrasados: 0
          };
        }
        
        // Dividir projetos entre membros da equipe
        const projetosPorMembro = Math.ceil(projetosDept.length / dept.equipe.length);
        carga[membro].projetos += projetosPorMembro;
        
        // Contar atrasados
        const atrasadosDept = projetosDept.filter(p => p.status === 'Atrasado');
        const atrasadosPorMembro = Math.ceil(atrasadosDept.length / dept.equipe.length);
        carga[membro].atrasados += atrasadosPorMembro;
      });
    });

    return Object.values(carga)
      .filter(c => c.projetos > 0)
      .sort((a, b) => b.projetos - a.projetos);
  };

  const responsaveis = cargaPorResponsavel();

  const handleKpiClick = (tipo) => {
    navigate('/projetos', { state: { filtro: tipo } });
  };

  const handleProjetoClick = (projeto) => {
    setProjetoSelecionado(projeto);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'Ativo': return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Concluído': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const getContrato = (contratoId) => {
    return mockContratos.find(c => c.id === contratoId);
  };

  const getDepartamentoInfo = (deptId) => {
    return Object.values(DEPARTAMENTOS).find(d => d.id === deptId);
  };

  const kpiCards = [
    {
      title: 'Total de Projetos',
      value: kpis.total_projetos,
      icon: FolderKanban,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      onClick: () => handleKpiClick('todos')
    },
    {
      title: 'Projetos em Dia',
      value: kpis.em_dia,
      icon: CheckCircle2,
      color: '#10b981',
      bgColor: '#ecfdf5',
      onClick: () => handleKpiClick('ativo')
    },
    {
      title: 'Projetos Atrasados',
      value: kpis.atrasados,
      icon: AlertTriangle,
      color: '#dc2626',
      bgColor: '#fef2f2',
      onClick: () => handleKpiClick('atrasado')
    },
    {
      title: 'Projetos Concluídos',
      value: kpis.concluidos,
      icon: TrendingUp,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      onClick: () => handleKpiClick('concluido')
    }
  ];

  return (
    <LayoutNovo 
      title="Dashboard" 
      subtitle="Visão geral dos projetos e atividades"
    >
      <div className="dashboard-novo-container">
        {/* KPI Cards */}
        <div className="kpi-grid-novo">
          {kpiCards.map((kpi, index) => (
            <Card 
              key={index} 
              className="kpi-card-novo clickable"
              onClick={kpi.onClick}
              style={{ cursor: 'pointer' }}
            >
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

        {/* Grid de Conteúdo */}
        <div className="dashboard-grid-novo">
          
          {/* Projetos em Andamento - CLICÁVEIS */}
          <Card className="dashboard-card-novo">
            <CardContent style={{ padding: '24px' }}>
              <div className="card-header-novo">
                <h3>Projetos em Andamento</h3>
                <Badge variant="secondary">{projetosEmAndamento.length}</Badge>
              </div>
              
              <div className="projetos-list-novo">
                {projetosEmAndamento.length === 0 ? (
                  <div className="empty-state-novo">
                    <FolderKanban size={32} style={{ color: '#cbd5e1' }} />
                    <p>Nenhum projeto em andamento</p>
                  </div>
                ) : (
                  projetosEmAndamento.map((projeto) => {
                    const statusColor = getStatusColor(projeto.status);
                    const deptInfo = getDepartamentoInfo(projeto.departamento_atual);
                    
                    return (
                      <div 
                        key={projeto.id} 
                        className="projeto-item-novo clickable-project"
                        onClick={() => handleProjetoClick(projeto)}
                      >
                        <div className="projeto-info-novo">
                          <div className="projeto-header-info">
                            <h4>{projeto.cliente}</h4>
                            <Badge 
                              style={{
                                backgroundColor: statusColor.bg,
                                color: statusColor.color,
                                border: `1px solid ${statusColor.border}`
                              }}
                            >
                              {projeto.status}
                            </Badge>
                          </div>
                          <p className="projeto-instituicao">{projeto.instituicao}</p>
                          <div className="projeto-meta-novo">
                            <span className="etapa-badge" style={{ backgroundColor: deptInfo?.cor + '20', color: deptInfo?.cor }}>
                              {deptInfo?.nome}
                            </span>
                            <span className="progresso-text">{projeto.progresso}%</span>
                          </div>
                        </div>
                        <div className="projeto-progress-novo">
                          <Progress value={projeto.progresso} />
                          {projeto.dias_atraso > 0 && (
                            <Badge variant="destructive" className="atraso-badge-mini">
                              <AlertTriangle size={12} />
                              {projeto.dias_atraso}d
                            </Badge>
                          )}
                        </div>
                        <ChevronRight size={18} className="projeto-arrow" />
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Atrasos - ORDENADO */}
          <Card className="dashboard-card-novo">
            <CardContent style={{ padding: '24px' }}>
              <div className="card-header-novo">
                <h3>Alertas de Atrasos</h3>
                <Badge variant="destructive">{projetosAtrasados.length}</Badge>
              </div>
              
              <div className="alertas-list-novo">
                {projetosAtrasados.length === 0 ? (
                  <div className="empty-state-novo success">
                    <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                    <p>Nenhum projeto atrasado! 🎉</p>
                  </div>
                ) : (
                  projetosAtrasados.map((projeto) => {
                    const deptInfo = getDepartamentoInfo(projeto.departamento_atual);
                    
                    return (
                      <div 
                        key={projeto.id} 
                        className="alerta-item-novo clickable-alert"
                        onClick={() => handleProjetoClick(projeto)}
                      >
                        <div className="alerta-icon-novo">
                          <AlertTriangle size={18} style={{ color: '#dc2626' }} />
                        </div>
                        <div className="alerta-content-novo">
                          <h4>{projeto.cliente}</h4>
                          <p>{projeto.instituicao}</p>
                          <div className="alerta-meta">
                            <span className="dept-tag" style={{ backgroundColor: deptInfo?.cor + '20', color: deptInfo?.cor }}>
                              {deptInfo?.nome}
                            </span>
                            <span className="etapa-text">{projeto.etapa_atual_nome}</span>
                          </div>
                        </div>
                        <Badge variant="destructive" className="dias-atraso-badge">
                          {projeto.dias_atraso} {projeto.dias_atraso === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Carga por Responsável */}
          <Card className="dashboard-card-novo full-width">
            <CardContent style={{ padding: '24px' }}>
              <div className="card-header-novo">
                <h3>Carga por Responsável</h3>
                <Badge variant="secondary">{responsaveis.length} pessoas</Badge>
              </div>
              
              <div className="responsaveis-grid-novo">
                {responsaveis.length === 0 ? (
                  <div className="empty-state-novo">
                    <Users size={32} style={{ color: '#cbd5e1' }} />
                    <p>Nenhuma carga distribuída</p>
                  </div>
                ) : (
                  responsaveis.map((resp, index) => (
                    <div key={index} className="responsavel-card-novo">
                      <div className="responsavel-header">
                        <div className="responsavel-avatar" style={{ backgroundColor: resp.cor + '30' }}>
                          <User size={18} style={{ color: resp.cor }} />
                        </div>
                        <div className="responsavel-info">
                          <h4>{resp.nome}</h4>
                          <span className="responsavel-dept" style={{ color: resp.cor }}>
                            {resp.departamento}
                          </span>
                        </div>
                      </div>
                      
                      <div className="responsavel-stats">
                        <div className="stat-item-resp">
                          <span className="stat-label-resp">Projetos</span>
                          <span className="stat-value-resp" style={{ color: resp.cor }}>
                            {resp.projetos}
                          </span>
                        </div>
                        {resp.atrasados > 0 && (
                          <div className="stat-item-resp">
                            <span className="stat-label-resp">Atrasados</span>
                            <span className="stat-value-resp" style={{ color: '#dc2626' }}>
                              {resp.atrasados}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="responsavel-progress">
                        <div className="progress-bar-resp">
                          <div 
                            className="progress-fill-resp" 
                            style={{ 
                              width: `${Math.min((resp.projetos / 5) * 100, 100)}%`,
                              backgroundColor: resp.cor 
                            }}
                          />
                        </div>
                        <span className="carga-label">
                          {resp.projetos <= 2 ? 'Carga Leve' : resp.projetos <= 4 ? 'Carga Normal' : 'Carga Alta'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Modal de Visualização Geral do Projeto */}
      {projetoSelecionado && (
        <Dialog open={!!projetoSelecionado} onOpenChange={() => setProjetoSelecionado(null)}>
          <DialogContent className="projeto-modal-novo">
            <DialogHeader>
              <DialogTitle className="modal-title-novo">
                <Building2 size={24} style={{ color: getDepartamentoInfo(projetoSelecionado.departamento_atual)?.cor }} />
                <div>
                  <h2>{projetoSelecionado.cliente}</h2>
                  <span className="modal-subtitle">{projetoSelecionado.instituicao}</span>
                </div>
                <button 
                  className="close-modal-btn" 
                  onClick={() => setProjetoSelecionado(null)}
                >
                  <X size={20} />
                </button>
              </DialogTitle>
            </DialogHeader>

            <div className="modal-content-novo">
              {/* Status e Progresso */}
              <div className="modal-section">
                <div className="status-row">
                  <Badge 
                    style={{
                      backgroundColor: getStatusColor(projetoSelecionado.status).bg,
                      color: getStatusColor(projetoSelecionado.status).color,
                      border: `1px solid ${getStatusColor(projetoSelecionado.status).border}`
                    }}
                  >
                    {projetoSelecionado.status}
                  </Badge>
                  <span className="progresso-badge">
                    Progresso: {projetoSelecionado.progresso}%
                  </span>
                </div>
                <Progress value={projetoSelecionado.progresso} className="modal-progress" />
              </div>

              {/* Informações do Contrato */}
              <div className="modal-section">
                <h3>Informações do Contrato</h3>
                <div className="info-grid-modal">
                  <div className="info-item-modal">
                    <Calendar size={16} />
                    <div>
                      <span className="info-label">Data de Início</span>
                      <span className="info-value">
                        {new Date(projetoSelecionado.data_inicio).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="info-item-modal">
                    <Calendar size={16} />
                    <div>
                      <span className="info-label">Data de Entrega</span>
                      <span className="info-value">
                        {new Date(projetoSelecionado.data_entrega).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="info-item-modal">
                    <Clock size={16} />
                    <div>
                      <span className="info-label">Dias Restantes</span>
                      <span className="info-value">{projetoSelecionado.dias_restantes} dias</span>
                    </div>
                  </div>
                  {projetoSelecionado.dias_atraso > 0 && (
                    <div className="info-item-modal alert">
                      <AlertTriangle size={16} />
                      <div>
                        <span className="info-label">Atraso</span>
                        <span className="info-value">{projetoSelecionado.dias_atraso} dias</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Departamento e Etapa Atual */}
              <div className="modal-section">
                <h3>Status Atual</h3>
                <div className="departamento-card-modal" style={{ borderColor: getDepartamentoInfo(projetoSelecionado.departamento_atual)?.cor }}>
                  <div className="dept-header-modal">
                    <span className="dept-name" style={{ color: getDepartamentoInfo(projetoSelecionado.departamento_atual)?.cor }}>
                      {getDepartamentoInfo(projetoSelecionado.departamento_atual)?.nome}
                    </span>
                  </div>
                  <div className="etapa-atual-modal">
                    <span className="etapa-label-modal">Etapa Atual:</span>
                    <span className="etapa-nome-modal">{projetoSelecionado.etapa_atual_nome}</span>
                  </div>
                  {getDepartamentoInfo(projetoSelecionado.departamento_atual)?.equipe && (
                    <div className="equipe-modal">
                      <span className="equipe-label-modal">Responsáveis:</span>
                      <div className="equipe-badges">
                        {getDepartamentoInfo(projetoSelecionado.departamento_atual).equipe.map((membro, idx) => (
                          <Badge key={idx} variant="outline" className="membro-badge-modal">
                            {membro}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="modal-actions">
                <Button 
                  onClick={() => {
                    navigate(`/projetos?projeto_id=${projetoSelecionado.id}`);
                    setProjetoSelecionado(null);
                  }}
                  className="btn-ver-detalhes"
                >
                  Ver Detalhes Completos
                  <ChevronRight size={18} />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setProjetoSelecionado(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </LayoutNovo>
  );
};

export default DashboardNovo;
