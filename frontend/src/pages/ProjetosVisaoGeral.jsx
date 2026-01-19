import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Building2,
  Calendar,
  User,
  MessageSquare,
  Plus,
  Filter,
  LayoutGrid,
  List,
  Eye
} from 'lucide-react';
import { mockProjetos, mockContratos, STATUS_ETAPA, DEPARTAMENTOS } from '../data/mockNovo';
import './ProjetosVisaoGeral.css';

const ProjetosVisaoGeral = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState(mockProjetos);
  const [selectedProjeto, setSelectedProjeto] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [novaObservacao, setNovaObservacao] = useState('');
  const [etapaSelecionada, setEtapaSelecionada] = useState(null);
  const [highlightedProjetoId, setHighlightedProjetoId] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'list'
  const projetoRefs = useRef({});

  // Handle filter from Dashboard KPI clicks
  useEffect(() => {
    if (location.state?.filtro) {
      const filtroMap = {
        'todos': 'todos',
        'ativo': 'Ativo',
        'atrasado': 'Atrasado',
        'concluido': 'Concluído'
      };
      setFiltroStatus(filtroMap[location.state.filtro] || 'todos');
    }
  }, [location.state]);

  // Handle navigation from notifications with projeto_id
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projetoId = params.get('projeto_id');
    
    if (projetoId) {
      setHighlightedProjetoId(projetoId);
      
      // Scroll to the project card after a short delay
      setTimeout(() => {
        if (projetoRefs.current[projetoId]) {
          projetoRefs.current[projetoId].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Remove highlight after animation
          setTimeout(() => {
            setHighlightedProjetoId(null);
            // Clean URL
            navigate('/projetos', { replace: true });
          }, 3000);
        }
      }, 500);
    }
  }, [location, navigate]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'Ativo': return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Concluído': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const getEtapaStatusIcon = (status) => {
    switch(status) {
      case 'Concluída': return <CheckCircle2 size={18} className="etapa-icon concluida" />;
      case 'Em Andamento': return <Clock size={18} className="etapa-icon em-andamento" />;
      case 'Atrasada': return <AlertTriangle size={18} className="etapa-icon atrasada" />;
      default: return <Circle size={18} className="etapa-icon nao-iniciada" />;
    }
  };

  const getEtapaStatusClass = (status) => {
    switch(status) {
      case 'Concluída': return 'concluida';
      case 'Em Andamento': return 'em-andamento';
      case 'Atrasada': return 'atrasada';
      default: return 'nao-iniciada';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getContrato = (contratoId) => {
    return mockContratos.find(c => c.id === contratoId);
  };

  const filteredProjetos = projetos.filter(p => {
    if (filtroStatus === 'todos') return true;
    return p.status === filtroStatus;
  });

  const handleAdicionarObservacao = (projetoId, etapaId) => {
    if (!novaObservacao.trim()) return;

    setProjetos(projetos.map(p => {
      if (p.id === projetoId) {
        return {
          ...p,
          etapas: p.etapas.map(e => {
            if (e.id === etapaId) {
              return {
                ...e,
                observacoes: [
                  ...e.observacoes,
                  {
                    id: Date.now(),
                    usuario: 'Admin Sistema',
                    data: new Date().toLocaleString('pt-BR'),
                    texto: novaObservacao
                  }
                ]
              };
            }
            return e;
          })
        };
      }
      return p;
    }));

    // Atualizar o projeto selecionado também
    if (selectedProjeto && selectedProjeto.id === projetoId) {
      setSelectedProjeto({
        ...selectedProjeto,
        etapas: selectedProjeto.etapas.map(e => {
          if (e.id === etapaId) {
            return {
              ...e,
              observacoes: [
                ...e.observacoes,
                {
                  id: Date.now(),
                  usuario: 'Admin Sistema',
                  data: new Date().toLocaleString('pt-BR'),
                  texto: novaObservacao
                }
              ]
            };
          }
          return e;
        })
      });
    }

    setNovaObservacao('');
    setEtapaSelecionada(null);
  };

  return (
    <LayoutNovo title="Visão Geral de Projetos" subtitle="Acompanhe o status e atrasos de todos os projetos">
      <div className="projetos-visao-container">
        {/* Filtros e Resumo */}
        <div className="visao-header">
          <div className="filtros-status">
            <button 
              className={`filtro-btn ${filtroStatus === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('todos')}
            >
              Todos ({projetos.length})
            </button>
            <button 
              className={`filtro-btn em-dia ${filtroStatus === 'Ativo' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('Ativo')}
            >
              Ativos ({projetos.filter(p => p.status === 'Ativo').length})
            </button>
            <button 
              className={`filtro-btn atrasados ${filtroStatus === 'Atrasado' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('Atrasado')}
            >
              Atrasados ({projetos.filter(p => p.status === 'Atrasado').length})
            </button>
            <button 
              className={`filtro-btn concluidos ${filtroStatus === 'Concluído' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('Concluído')}
            >
              Concluídos ({projetos.filter(p => p.status === 'Concluído').length})
            </button>
          </div>
          
          {/* Toggle de Visualização */}
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Visualização em Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Visualização em Lista/Tabela */}
        {viewMode === 'list' && (
          <div className="projetos-table-container">
            <table className="projetos-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Instituição</th>
                  <th>Etapa Atual</th>
                  <th>Progresso</th>
                  <th>Data Entrega</th>
                  <th>Dias Restantes</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjetos.map((projeto) => {
                  const statusColor = getStatusColor(projeto.status);
                  return (
                    <tr 
                      key={projeto.id} 
                      className={`table-row ${projeto.status === 'Atrasado' ? 'atrasado' : ''}`}
                    >
                      <td className="td-cliente">{projeto.cliente}</td>
                      <td className="td-instituicao">
                        <Building2 size={14} />
                        {projeto.instituicao}
                      </td>
                      <td className="td-etapa">{projeto.etapa_atual_nome}</td>
                      <td className="td-progresso">
                        <div className="progresso-cell">
                          <Progress value={projeto.progresso} className="progress-mini" />
                          <span className="progresso-text">{projeto.progresso}%</span>
                        </div>
                      </td>
                      <td className="td-data">{formatDate(projeto.data_entrega)}</td>
                      <td className="td-dias">
                        {projeto.dias_atraso > 0 ? (
                          <span className="dias-atraso">
                            <AlertTriangle size={14} />
                            {projeto.dias_atraso}d atraso
                          </span>
                        ) : (
                          <span className="dias-restantes">{projeto.dias_restantes}d</span>
                        )}
                      </td>
                      <td className="td-status">
                        <Badge 
                          style={{ 
                            backgroundColor: statusColor.bg,
                            color: statusColor.color,
                            border: `1px solid ${statusColor.border}`
                          }}
                        >
                          {projeto.status}
                        </Badge>
                      </td>
                      <td className="td-acoes">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedProjeto(projeto)}
                        >
                          <Eye size={16} />
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid de Projetos (Cards) */}
        {viewMode === 'cards' && (
          <div className="projetos-grid">
          {filteredProjetos.map((projeto) => {
            const contrato = getContrato(projeto.contrato_id);
            const statusColor = getStatusColor(projeto.status);
            const etapaAtrasada = projeto.etapas.find(e => e.status === 'Atrasada');
            const isHighlighted = highlightedProjetoId === projeto.id;

            return (
              <Card 
                key={projeto.id}
                ref={(el) => (projetoRefs.current[projeto.id] = el)}
                className={`projeto-card-novo ${projeto.status === 'Atrasado' ? 'atrasado' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                onClick={() => setSelectedProjeto(projeto)}
                style={isHighlighted ? { scrollMarginTop: '100px' } : {}}
              >
                <CardContent className="projeto-card-content-novo">
                  {/* Header do Card */}
                  <div className="card-header-novo">
                    <div className="cliente-info">
                      <h3 className="cliente-nome">{projeto.cliente}</h3>
                      <span className="instituicao">
                        <Building2 size={14} />
                        {projeto.instituicao}
                      </span>
                    </div>
                    <Badge 
                      className="status-badge-novo"
                      style={{ 
                        backgroundColor: statusColor.bg,
                        color: statusColor.color,
                        border: `1px solid ${statusColor.border}`
                      }}
                    >
                      {projeto.status === 'Atrasado' && <AlertTriangle size={12} />}
                      {projeto.status}
                    </Badge>
                  </div>

                  {/* Etapa Atual */}
                  <div className="etapa-atual-info">
                    <span className="etapa-label">Etapa atual:</span>
                    <span className="etapa-nome">{projeto.etapa_atual_nome}</span>
                  </div>

                  {/* Indicador de Atraso */}
                  {projeto.dias_atraso > 0 && etapaAtrasada && (
                    <div className="atraso-indicator">
                      <AlertTriangle size={14} />
                      <span>
                        <strong>{projeto.dias_atraso} dias</strong> de atraso em &quot;{etapaAtrasada.nome}&quot;
                      </span>
                    </div>
                  )}

                  {/* Progresso */}
                  <div className="progresso-section">
                    <div className="progresso-header">
                      <span>Progresso geral</span>
                      <span className="progresso-percent">{projeto.progresso}%</span>
                    </div>
                    <Progress 
                      value={projeto.progresso} 
                      className={`progresso-bar ${projeto.status === 'Atrasado' ? 'atrasado' : ''}`}
                    />
                  </div>

                  {/* Footer */}
                  <div className="card-footer-novo">
                    <div className="prazo-info">
                      <Calendar size={14} />
                      <span>Entrega: {formatDate(projeto.data_entrega)}</span>
                    </div>
                    <button className="ver-detalhes-btn">
                      Ver detalhes
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        {/* Modal de Detalhes do Projeto - Visão Completa */}
        <Dialog open={!!selectedProjeto} onOpenChange={() => setSelectedProjeto(null)}>
          <DialogContent className="projeto-modal-detalhado">
            <DialogHeader>
              <DialogTitle className="modal-title">
                {selectedProjeto?.cliente}
                <Badge 
                  className="status-badge-modal"
                  style={{ 
                    backgroundColor: getStatusColor(selectedProjeto?.status || '').bg,
                    color: getStatusColor(selectedProjeto?.status || '').color
                  }}
                >
                  {selectedProjeto?.status}
                </Badge>
              </DialogTitle>
              <div className="modal-subtitle">
                <Building2 size={14} />
                {selectedProjeto?.instituicao}
              </div>
            </DialogHeader>

            {selectedProjeto && (
              <div className="modal-content">
                {/* Resumo Geral */}
                <div className="modal-resumo">
                  <div className="resumo-item">
                    <span className="resumo-label">Progresso</span>
                    <span className="resumo-value">{selectedProjeto.progresso}%</span>
                  </div>
                  <div className="resumo-item">
                    <span className="resumo-label">Etapa Atual</span>
                    <span className="resumo-value small">{selectedProjeto.etapa_atual_nome}</span>
                  </div>
                  <div className="resumo-item">
                    <span className="resumo-label">Data de entrega</span>
                    <span className="resumo-value">{formatDate(selectedProjeto.data_entrega)}</span>
                  </div>
                  <div className="resumo-item">
                    <span className="resumo-label">{selectedProjeto.dias_atraso > 0 ? 'Dias de Atraso' : 'Dias Restantes'}</span>
                    <span className={`resumo-value ${selectedProjeto.dias_atraso > 0 ? 'atrasado' : 'em-dia'}`}>
                      {selectedProjeto.dias_atraso > 0 ? `${selectedProjeto.dias_atraso} dias` : `${selectedProjeto.dias_restantes} dias`}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso Visual */}
                <div className="progresso-visual-section">
                  <Progress value={selectedProjeto.progresso} className="progresso-bar-modal" />
                  <div className="progresso-legend">
                    <span className="legend-item concluido">
                      <CheckCircle2 size={14} />
                      Concluídas: {selectedProjeto.etapas.filter(e => e.status === 'Concluída').length}
                    </span>
                    <span className="legend-item em-andamento">
                      <Clock size={14} />
                      Em Andamento: {selectedProjeto.etapas.filter(e => e.status === 'Em Andamento').length}
                    </span>
                    <span className="legend-item atrasado">
                      <AlertTriangle size={14} />
                      Atrasadas: {selectedProjeto.etapas.filter(e => e.status === 'Atrasada').length}
                    </span>
                    <span className="legend-item pendente">
                      <Circle size={14} />
                      Pendentes: {selectedProjeto.etapas.filter(e => e.status === 'Não Iniciada').length}
                    </span>
                  </div>
                </div>

                {/* Timeline de Etapas Agrupadas por Departamento */}
                <div className="etapas-section-full">
                  <h4 className="section-title">
                    <Filter size={16} />
                    Todas as Etapas do Projeto ({selectedProjeto.etapas.length} etapas)
                  </h4>
                  
                  {/* Agrupar por departamento */}
                  {['atendimento', 'criacao', 'pre-producao', 'producao'].map(deptId => {
                    const deptEtapas = selectedProjeto.etapas.filter(e => e.departamento === deptId);
                    if (deptEtapas.length === 0) return null;
                    
                    const deptInfo = DEPARTAMENTOS[deptId.toUpperCase().replace('-', '_')];
                    const concluidas = deptEtapas.filter(e => e.status === 'Concluída').length;
                    const total = deptEtapas.length;
                    const progressoDept = Math.round((concluidas / total) * 100);
                    
                    return (
                      <div key={deptId} className="departamento-section">
                        <div className="dept-header-full" style={{ borderLeftColor: deptInfo?.cor || '#64748b' }}>
                          <div className="dept-info">
                            <h5 className="dept-nome" style={{ color: deptInfo?.cor || '#64748b' }}>
                              {deptInfo?.nome || deptId}
                            </h5>
                            <span className="dept-progress">{concluidas}/{total} etapas ({progressoDept}%)</span>
                          </div>
                          <Progress value={progressoDept} className="dept-progress-bar" />
                        </div>
                        
                        <div className="etapas-list-full">
                          {deptEtapas.map((etapa) => (
                            <div 
                              key={etapa.id} 
                              className={`etapa-row ${getEtapaStatusClass(etapa.status)}`}
                            >
                              <div className="etapa-status-indicator">
                                {getEtapaStatusIcon(etapa.status)}
                              </div>
                              <div className="etapa-main-info">
                                <div className="etapa-row-header">
                                  <span className="etapa-numero-badge">{etapa.id}</span>
                                  <span className="etapa-nome-full">{etapa.nome}</span>
                                  {etapa.dias_atraso > 0 && (
                                    <Badge variant="destructive" className="atraso-badge-small">
                                      +{etapa.dias_atraso}d
                                    </Badge>
                                  )}
                                </div>
                                <div className="etapa-details">
                                  <span className="detail-item">
                                    <User size={12} />
                                    {etapa.responsavel}
                                  </span>
                                  <span className="detail-item">
                                    <Calendar size={12} />
                                    {formatDate(etapa.data_prevista_inicio)} - {formatDate(etapa.data_prevista_fim)}
                                  </span>
                                  <Badge 
                                    className={`status-badge-mini ${getEtapaStatusClass(etapa.status)}`}
                                  >
                                    {etapa.status}
                                  </Badge>
                                </div>
                                
                                {/* Observações da Etapa */}
                                {etapa.observacoes.length > 0 && (
                                  <div className="etapa-obs-mini">
                                    {etapa.observacoes.slice(-1).map(obs => (
                                      <div key={obs.id} className="obs-mini">
                                        <MessageSquare size={10} />
                                        <span className="obs-text-mini">{obs.texto}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Ações */}
                              <div className="etapa-actions">
                                {etapaSelecionada === etapa.id ? (
                                  <div className="obs-form-mini">
                                    <Textarea
                                      placeholder="Observação..."
                                      value={novaObservacao}
                                      onChange={(e) => setNovaObservacao(e.target.value)}
                                      rows={1}
                                      className="obs-textarea-mini"
                                    />
                                    <div className="obs-btns">
                                      <Button size="sm" variant="ghost" onClick={() => setEtapaSelecionada(null)}>✕</Button>
                                      <Button size="sm" onClick={() => handleAdicionarObservacao(selectedProjeto.id, etapa.id)}>✓</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="add-obs-btn-mini"
                                    onClick={() => setEtapaSelecionada(etapa.id)}
                                  >
                                    <Plus size={14} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutNovo>
  );
};

export default ProjetosVisaoGeral;
