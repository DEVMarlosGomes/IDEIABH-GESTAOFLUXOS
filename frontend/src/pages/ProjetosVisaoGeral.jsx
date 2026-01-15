import React, { useState } from 'react';
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
  Filter
} from 'lucide-react';
import { mockProjetos, mockContratos, STATUS_ETAPA } from '../data/mockNovo';
import './ProjetosVisaoGeral.css';

const ProjetosVisaoGeral = () => {
  const [projetos, setProjetos] = useState(mockProjetos);
  const [selectedProjeto, setSelectedProjeto] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [novaObservacao, setNovaObservacao] = useState('');
  const [etapaSelecionada, setEtapaSelecionada] = useState(null);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'Em Andamento': return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
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
              className={`filtro-btn em-dia ${filtroStatus === 'Em Andamento' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('Em Andamento')}
            >
              Em Dia ({projetos.filter(p => p.status === 'Em Andamento').length})
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
        </div>

        {/* Grid de Projetos */}
        <div className="projetos-grid">
          {filteredProjetos.map((projeto) => {
            const contrato = getContrato(projeto.contrato_id);
            const statusColor = getStatusColor(projeto.status);
            const etapaAtrasada = projeto.etapas.find(e => e.status === 'Atrasada');

            return (
              <Card 
                key={projeto.id} 
                className={`projeto-card-novo ${projeto.status === 'Atrasado' ? 'atrasado' : ''}`}
                onClick={() => setSelectedProjeto(projeto)}
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

        {/* Modal de Detalhes do Projeto */}
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
                {/* Resumo */}
                <div className="modal-resumo">
                  <div className="resumo-item">
                    <span className="resumo-label">Progresso</span>
                    <span className="resumo-value">{selectedProjeto.progresso}%</span>
                  </div>
                  <div className="resumo-item">
                    <span className="resumo-label">Dias de atraso</span>
                    <span className={`resumo-value ${selectedProjeto.dias_atraso > 0 ? 'atrasado' : ''}`}>
                      {selectedProjeto.dias_atraso} dias
                    </span>
                  </div>
                  <div className="resumo-item">
                    <span className="resumo-label">Data de entrega</span>
                    <span className="resumo-value">{formatDate(selectedProjeto.data_entrega)}</span>
                  </div>
                  <div className="resumo-item">
                    <span className="resumo-label">Dias restantes</span>
                    <span className="resumo-value">{selectedProjeto.dias_restantes}</span>
                  </div>
                </div>

                {/* Timeline de Etapas */}
                <div className="etapas-section">
                  <h4 className="section-title">Timeline de Etapas</h4>
                  <div className="etapas-timeline">
                    {selectedProjeto.etapas.map((etapa, index) => (
                      <div 
                        key={etapa.id} 
                        className={`etapa-item ${getEtapaStatusClass(etapa.status)}`}
                      >
                        <div className="etapa-connector">
                          {getEtapaStatusIcon(etapa.status)}
                          {index < selectedProjeto.etapas.length - 1 && (
                            <div className={`etapa-line ${getEtapaStatusClass(etapa.status)}`} />
                          )}
                        </div>
                        <div className="etapa-content">
                          <div className="etapa-header">
                            <span className="etapa-numero">{etapa.id}</span>
                            <span className="etapa-nome-timeline">{etapa.nome}</span>
                            {etapa.dias_atraso > 0 && (
                              <Badge variant="destructive" className="atraso-badge">
                                +{etapa.dias_atraso} dias
                              </Badge>
                            )}
                          </div>
                          <div className="etapa-meta">
                            <span className="meta-item">
                              <User size={12} />
                              {etapa.responsavel}
                            </span>
                            <span className="meta-item">
                              <Calendar size={12} />
                              Previsto: {formatDate(etapa.data_prevista_inicio)} - {formatDate(etapa.data_prevista_fim)}
                            </span>
                            {etapa.data_real_inicio && (
                              <span className="meta-item real">
                                Real: {formatDate(etapa.data_real_inicio)} - {etapa.data_real_fim ? formatDate(etapa.data_real_fim) : 'Em andamento'}
                              </span>
                            )}
                          </div>

                          {/* Observações da Etapa */}
                          {etapa.observacoes.length > 0 && (
                            <div className="etapa-observacoes">
                              {etapa.observacoes.map(obs => (
                                <div key={obs.id} className="observacao-item">
                                  <div className="obs-header">
                                    <span className="obs-usuario">{obs.usuario}</span>
                                    <span className="obs-data">{obs.data}</span>
                                  </div>
                                  <p className="obs-texto">{obs.texto}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Botão para adicionar observação */}
                          {etapaSelecionada === etapa.id ? (
                            <div className="nova-observacao-form">
                              <Textarea
                                placeholder="Digite sua observação..."
                                value={novaObservacao}
                                onChange={(e) => setNovaObservacao(e.target.value)}
                                rows={2}
                              />
                              <div className="obs-actions">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEtapaSelecionada(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleAdicionarObservacao(selectedProjeto.id, etapa.id)}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="add-obs-btn"
                              onClick={() => setEtapaSelecionada(etapa.id)}
                            >
                              <MessageSquare size={12} />
                              Adicionar observação
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
