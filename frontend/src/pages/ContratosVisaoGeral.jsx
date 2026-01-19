import React, { useState } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  User,
  MessageSquare,
  LayoutGrid,
  List
} from 'lucide-react';
import { mockContratos, mockProjetos } from '../data/mockNovo';
import './ContratosVisaoGeral.css';

const ContratosVisaoGeral = () => {
  const [contratos, setContratos] = useState(mockContratos);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'list'
  const [formData, setFormData] = useState({
    cliente: '',
    instituicao: '',
    numero_contrato: '',
    valor: '',
    data_inicio: '',
    data_fim: ''
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'Em Andamento': return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Concluído': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'Ativo': return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getProjeto = (projetoId) => {
    return mockProjetos.find(p => p.id === projetoId);
  };

  const filteredContratos = contratos.filter(c => {
    const matchesSearch = c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.instituicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filtroStatus === 'todos' || c.status === filtroStatus;
    return matchesSearch && matchesFilter;
  });

  const handleOpenModal = (contrato = null) => {
    if (contrato) {
      setEditingContrato(contrato);
      setFormData({
        cliente: contrato.cliente,
        instituicao: contrato.instituicao,
        numero_contrato: contrato.numero_contrato,
        valor: contrato.valor.toString(),
        data_inicio: contrato.data_inicio,
        data_fim: contrato.data_fim
      });
    } else {
      setEditingContrato(null);
      setFormData({
        cliente: '',
        instituicao: '',
        numero_contrato: '',
        valor: '',
        data_inicio: '',
        data_fim: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingContrato) {
      setContratos(contratos.map(c => 
        c.id === editingContrato.id 
          ? { ...c, ...formData, valor: parseFloat(formData.valor) }
          : c
      ));
    } else {
      const newContrato = {
        id: 'contrato-' + Date.now(),
        ...formData,
        valor: parseFloat(formData.valor),
        status: 'Ativo',
        projeto_id: 'projeto-' + Date.now(),
        created_at: new Date().toISOString().split('T')[0],
        observacoes: []
      };
      setContratos([...contratos, newContrato]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato?')) {
      setContratos(contratos.filter(c => c.id !== id));
    }
  };

  return (
    <LayoutNovo title="Contratos" subtitle="Gerencie todos os contratos e acompanhe o status de cada um">
      <div className="contratos-visao-container">
        {/* Header com busca e filtros */}
        <div className="contratos-header-novo">
          <div className="search-filter-row">
            <div className="search-box-contratos">
              <Search size={18} className="search-icon" />
              <Input
                type="text"
                placeholder="Buscar por cliente, instituição ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filtros-status">
              <button 
                className={`filtro-btn ${filtroStatus === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('todos')}
              >
                Todos
              </button>
              <button 
                className={`filtro-btn ${filtroStatus === 'Ativo' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('Ativo')}
              >
                Ativos
              </button>
              <button 
                className={`filtro-btn ${filtroStatus === 'Atrasado' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('Atrasado')}
              >
                Atrasados
              </button>
              <button 
                className={`filtro-btn ${filtroStatus === 'Concluído' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('Concluído')}
              >
                Concluídos
              </button>
            </div>
            <Button className="add-button" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Novo Contrato
            </Button>
            
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
        </div>

        {/* Visualização em Lista/Tabela */}
        {viewMode === 'list' && (
          <div className="contratos-table-container">
            <table className="contratos-table">
              <thead>
                <tr>
                  <th>Nº Contrato</th>
                  <th>Cliente</th>
                  <th>Instituição</th>
                  <th>Valor</th>
                  <th>Data Início</th>
                  <th>Data Fim</th>
                  <th>Progresso</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContratos.map((contrato) => {
                  const statusColor = getStatusColor(contrato.status);
                  const projeto = getProjeto(contrato.projeto_id);
                  return (
                    <tr 
                      key={contrato.id} 
                      className={`table-row ${contrato.status === 'Atrasado' ? 'atrasado' : ''}`}
                    >
                      <td className="td-contrato-num">{contrato.numero_contrato}</td>
                      <td className="td-cliente">{contrato.cliente}</td>
                      <td className="td-instituicao">
                        <Building2 size={14} />
                        {contrato.instituicao}
                      </td>
                      <td className="td-valor">{formatCurrency(contrato.valor)}</td>
                      <td className="td-data">{formatDate(contrato.data_inicio)}</td>
                      <td className="td-data">{formatDate(contrato.data_fim)}</td>
                      <td className="td-progresso">
                        {projeto && (
                          <div className="progresso-cell">
                            <Progress value={projeto.progresso} className="progress-mini" />
                            <span className="progresso-text">{projeto.progresso}%</span>
                          </div>
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
                          {contrato.status === 'Atrasado' && <AlertTriangle size={12} />}
                          {contrato.status}
                        </Badge>
                      </td>
                      <td className="td-acoes">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedContrato(contrato)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenModal(contrato)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="delete-btn"
                          onClick={() => handleDelete(contrato.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid de Contratos (Cards) */}
        {viewMode === 'cards' && (
        <div className="contratos-grid-novo">
          {filteredContratos.map((contrato) => {
            const statusColor = getStatusColor(contrato.status);
            const projeto = getProjeto(contrato.projeto_id);

            return (
              <Card 
                key={contrato.id} 
                className={`contrato-card-novo ${contrato.status === 'Atrasado' ? 'atrasado' : ''}`}
              >
                <CardContent className="contrato-card-content-novo">
                  {/* Header */}
                  <div className="card-header-contrato">
                    <span className="contrato-numero">{contrato.numero_contrato}</span>
                    <Badge 
                      style={{ 
                        backgroundColor: statusColor.bg,
                        color: statusColor.color,
                        border: `1px solid ${statusColor.border}`
                      }}
                    >
                      {contrato.status === 'Atrasado' && <AlertTriangle size={12} />}
                      {contrato.status}
                    </Badge>
                  </div>

                  {/* Cliente Info */}
                  <div className="contrato-cliente-info">
                    <h3 className="cliente-nome">{contrato.cliente}</h3>
                    <span className="instituicao">
                      <Building2 size={14} />
                      {contrato.instituicao}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="contrato-info-grid">
                    <div className="info-item">
                      <DollarSign size={16} />
                      <div>
                        <span className="info-label">Valor</span>
                        <span className="info-value">{formatCurrency(contrato.valor)}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} />
                      <div>
                        <span className="info-label">Período</span>
                        <span className="info-value">{formatDate(contrato.data_inicio)} - {formatDate(contrato.data_fim)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progresso do Projeto */}
                  {projeto && (
                    <div className="projeto-progresso">
                      <div className="progresso-header">
                        <span>Progresso do projeto</span>
                        <span className="progresso-percent">{projeto.progresso}%</span>
                      </div>
                      <Progress value={projeto.progresso} className="progresso-bar" />
                      {projeto.dias_atraso > 0 && (
                        <span className="atraso-info">
                          <AlertTriangle size={12} />
                          {projeto.dias_atraso} dias de atraso
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="contrato-actions-novo">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedContrato(contrato)}
                    >
                      <Eye size={16} />
                      Detalhes
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleOpenModal(contrato)}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="delete-btn"
                      onClick={() => handleDelete(contrato.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        {/* Empty State */}
        {filteredContratos.length === 0 && (
          <div className="empty-state">
            <FileText size={48} />
            <h3>Nenhum contrato encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo contrato.</p>
          </div>
        )}

        {/* Modal de Detalhes do Contrato */}
        <Dialog open={!!selectedContrato} onOpenChange={() => setSelectedContrato(null)}>
          <DialogContent className="contrato-modal-detalhado">
            <DialogHeader>
              <DialogTitle className="modal-title">
                {selectedContrato?.numero_contrato}
                <Badge 
                  style={{ 
                    backgroundColor: getStatusColor(selectedContrato?.status || '').bg,
                    color: getStatusColor(selectedContrato?.status || '').color
                  }}
                >
                  {selectedContrato?.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {selectedContrato && (
              <div className="modal-content">
                {/* Info do Contrato */}
                <div className="contrato-info-section">
                  <h3 className="cliente-nome-modal">{selectedContrato.cliente}</h3>
                  <span className="instituicao-modal">
                    <Building2 size={14} />
                    {selectedContrato.instituicao}
                  </span>

                  <div className="info-grid-modal">
                    <div className="info-item-modal">
                      <span className="label">Valor do Contrato</span>
                      <span className="value">{formatCurrency(selectedContrato.valor)}</span>
                    </div>
                    <div className="info-item-modal">
                      <span className="label">Data de Início</span>
                      <span className="value">{formatDate(selectedContrato.data_inicio)}</span>
                    </div>
                    <div className="info-item-modal">
                      <span className="label">Data de Término</span>
                      <span className="value">{formatDate(selectedContrato.data_fim)}</span>
                    </div>
                    <div className="info-item-modal">
                      <span className="label">Criado em</span>
                      <span className="value">{formatDate(selectedContrato.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Projeto Vinculado com Etapas Completas */}
                {(() => {
                  const projeto = getProjeto(selectedContrato.projeto_id);
                  if (!projeto) return null;

                  // Funções auxiliares para status
                  const getEtapaStatusClass = (status) => {
                    switch(status) {
                      case 'Concluída': return 'concluida';
                      case 'Em Andamento': return 'em-andamento';
                      case 'Atrasada': return 'atrasada';
                      default: return 'nao-iniciada';
                    }
                  };

                  // Departamentos para agrupamento
                  const DEPS = {
                    'atendimento': { nome: 'Atendimento', cor: '#3b82f6' },
                    'criacao': { nome: 'Criação', cor: '#8b5cf6' },
                    'pre-producao': { nome: 'Pré-Produção', cor: '#f59e0b' },
                    'producao': { nome: 'Produção/Entrega', cor: '#10b981' }
                  };

                  return (
                    <div className="projeto-vinculado-section-full">
                      <h4 className="section-title-modal">
                        Projeto Vinculado - Visão Completa
                      </h4>
                      
                      {/* Resumo do Projeto */}
                      <div className="projeto-resumo-full">
                        <div className="resumo-header-full">
                          <div className="resumo-info">
                            <span className="etapa-atual-label">Etapa atual:</span>
                            <strong>{projeto.etapa_atual_nome}</strong>
                          </div>
                          <div className="resumo-stats">
                            <span className="stat-item">
                              <CheckCircle size={14} className="text-green" />
                              {projeto.etapas.filter(e => e.status === 'Concluída').length} concluídas
                            </span>
                            <span className="stat-item">
                              <Clock size={14} className="text-blue" />
                              {projeto.etapas.filter(e => e.status === 'Em Andamento').length} em andamento
                            </span>
                            <span className="stat-item">
                              <AlertTriangle size={14} className="text-red" />
                              {projeto.etapas.filter(e => e.status === 'Atrasada').length} atrasadas
                            </span>
                          </div>
                          {projeto.dias_atraso > 0 && (
                            <Badge variant="destructive">
                              {projeto.dias_atraso} dias de atraso
                            </Badge>
                          )}
                        </div>

                        <div className="progresso-modal-full">
                          <div className="progresso-header">
                            <span>Progresso geral ({projeto.etapas.filter(e => e.status === 'Concluída').length}/{projeto.etapas.length} etapas)</span>
                            <span className="progresso-percent">{projeto.progresso}%</span>
                          </div>
                          <Progress value={projeto.progresso} />
                        </div>
                      </div>

                      {/* Etapas Agrupadas por Departamento */}
                      <div className="etapas-por-departamento">
                        <h5 className="etapas-title-full">
                          Todas as Etapas ({projeto.etapas.length})
                        </h5>
                        
                        {['atendimento', 'criacao', 'pre-producao', 'producao'].map(deptId => {
                          const deptEtapas = projeto.etapas.filter(e => e.departamento === deptId);
                          if (deptEtapas.length === 0) return null;
                          
                          const deptInfo = DEPS[deptId];
                          const concluidas = deptEtapas.filter(e => e.status === 'Concluída').length;
                          const total = deptEtapas.length;
                          const progressoDept = Math.round((concluidas / total) * 100);
                          
                          return (
                            <div key={deptId} className="dept-section-contrato">
                              <div className="dept-header-contrato" style={{ borderLeftColor: deptInfo.cor }}>
                                <span className="dept-nome" style={{ color: deptInfo.cor }}>{deptInfo.nome}</span>
                                <span className="dept-stats">{concluidas}/{total} ({progressoDept}%)</span>
                              </div>
                              
                              <div className="etapas-list-contrato">
                                {deptEtapas.map((etapa) => (
                                  <div 
                                    key={etapa.id} 
                                    className={`etapa-item-contrato ${getEtapaStatusClass(etapa.status)}`}
                                  >
                                    <div className="etapa-status-icon">
                                      {etapa.status === 'Concluída' && <CheckCircle size={14} className="icon-concluida" />}
                                      {etapa.status === 'Em Andamento' && <Clock size={14} className="icon-andamento" />}
                                      {etapa.status === 'Atrasada' && <AlertTriangle size={14} className="icon-atrasada" />}
                                      {etapa.status === 'Não Iniciada' && <div className="circle-empty-small" />}
                                    </div>
                                    <div className="etapa-info-contrato">
                                      <span className="etapa-num">{etapa.id}</span>
                                      <span className="etapa-nome">{etapa.nome}</span>
                                    </div>
                                    <div className="etapa-meta-contrato">
                                      <span className="responsavel"><User size={10} /> {etapa.responsavel}</span>
                                      <span className="datas">{formatDate(etapa.data_prevista_fim)}</span>
                                    </div>
                                    {etapa.dias_atraso > 0 && (
                                      <Badge variant="destructive" className="atraso-mini">
                                        +{etapa.dias_atraso}d
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Observações */}
                <div className="observacoes-section">
                  <h4 className="section-title-modal">
                    <MessageSquare size={16} />
                    Observações do Contrato
                  </h4>
                  {selectedContrato.observacoes?.length > 0 ? (
                    <div className="observacoes-lista">
                      {selectedContrato.observacoes.map((obs, index) => (
                        <div key={index} className="observacao-item-modal">
                          <div className="obs-header">
                            <span className="obs-usuario">{obs.usuario}</span>
                            <span className="obs-data">{obs.data}</span>
                          </div>
                          <p className="obs-texto">{obs.texto}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-obs">Nenhuma observação registrada.</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Criar/Editar Contrato */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="contrato-form-modal">
            <DialogHeader>
              <DialogTitle>
                {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
              </DialogTitle>
            </DialogHeader>
            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <Label>Cliente / Turma</Label>
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    placeholder="Ex: Turma Medicina 2024"
                  />
                </div>
                <div className="form-group">
                  <Label>Instituição</Label>
                  <Input
                    value={formData.instituicao}
                    onChange={(e) => setFormData({...formData, instituicao: e.target.value})}
                    placeholder="Ex: PUC Minas"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Label>Número do Contrato</Label>
                  <Input
                    value={formData.numero_contrato}
                    onChange={(e) => setFormData({...formData, numero_contrato: e.target.value})}
                    placeholder="CT-2024-XXX"
                  />
                </div>
                <div className="form-group">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingContrato ? 'Salvar Alterações' : 'Criar Contrato'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutNovo>
  );
};

export default ContratosVisaoGeral;
