import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  Play,
  Eye,
  Calendar,
  DollarSign,
  Building2,
  AlertCircle
} from 'lucide-react';
import { mockContratos, STATUS_CONTRATO } from '../data/mock';
import './ContratosLista.css';

const ContratosLista = () => {
  const [contratos, setContratos] = useState(mockContratos);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState(null);
  const [viewContrato, setViewContrato] = useState(null);
  const [formData, setFormData] = useState({
    cliente: '',
    faculdade: '',
    numero_contrato: '',
    valor: '',
    data_inicio: '',
    data_fim: ''
  });

  const filteredContratos = contratos.filter(contrato => {
    const matchesSearch = contrato.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contrato.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'todos' || contrato.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    const colors = {
      'Ativo': { bg: '#dbeafe', color: '#1d4ed8' },
      'Em Andamento': { bg: '#dcfce7', color: '#15803d' },
      'Em Produção': { bg: '#fef3c7', color: '#b45309' },
      'Finalizado': { bg: '#e0e7ff', color: '#4338ca' },
      'Entregue': { bg: '#d1fae5', color: '#047857' }
    };
    return colors[status] || { bg: '#f1f5f9', color: '#475569' };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleOpenModal = (contrato = null) => {
    if (contrato) {
      setEditingContrato(contrato);
      setFormData({
        cliente: contrato.cliente,
        faculdade: contrato.faculdade,
        numero_contrato: contrato.numero_contrato,
        valor: contrato.valor.toString(),
        data_inicio: contrato.data_inicio,
        data_fim: contrato.data_fim
      });
    } else {
      setEditingContrato(null);
      setFormData({
        cliente: '',
        faculdade: '',
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
        created_at: new Date().toISOString().split('T')[0]
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

  const handleAprovar = (id) => {
    setContratos(contratos.map(c => 
      c.id === id ? { ...c, status: 'Em Andamento' } : c
    ));
  };

  const handleFinalizar = (id) => {
    setContratos(contratos.map(c => 
      c.id === id ? { ...c, status: 'Finalizado' } : c
    ));
  };

  return (
    <Layout>
      <div className="contratos-container">
        {/* Header */}
        <div className="contratos-header">
          <div className="header-left">
            <h2 className="page-subtitle">Gerenciamento de Contratos</h2>
            <p className="page-description">Visualize e gerencie todos os contratos do sistema</p>
          </div>
          <Button className="add-button" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Novo Contrato
          </Button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <Input
              type="text"
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-buttons">
            {['todos', 'Ativo', 'Em Andamento', 'Finalizado'].map((status) => (
              <button
                key={status}
                className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'todos' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Contratos Grid */}
        <div className="contratos-grid">
          {filteredContratos.map((contrato) => (
            <Card key={contrato.id} className="contrato-card">
              <CardHeader className="contrato-card-header">
                <div className="contrato-header-top">
                  <span className="contrato-numero">{contrato.numero_contrato}</span>
                  <Badge 
                    style={{ 
                      backgroundColor: getStatusColor(contrato.status).bg,
                      color: getStatusColor(contrato.status).color
                    }}
                  >
                    {contrato.status}
                  </Badge>
                </div>
                <CardTitle className="contrato-cliente">{contrato.cliente}</CardTitle>
                <span className="contrato-faculdade">
                  <Building2 size={14} />
                  {contrato.faculdade}
                </span>
              </CardHeader>
              <CardContent className="contrato-card-content">
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
                      <span className="info-label">Início</span>
                      <span className="info-value">{formatDate(contrato.data_inicio)}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <Calendar size={16} />
                    <div>
                      <span className="info-label">Término</span>
                      <span className="info-value">{formatDate(contrato.data_fim)}</span>
                    </div>
                  </div>
                </div>

                <div className="contrato-actions">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewContrato(contrato)}
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
                  {contrato.status === 'Ativo' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="approve-btn"
                      onClick={() => handleAprovar(contrato.id)}
                    >
                      <Play size={16} />
                      Aprovar
                    </Button>
                  )}
                  {contrato.status === 'Em Andamento' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="finalize-btn"
                      onClick={() => handleFinalizar(contrato.id)}
                    >
                      <CheckCircle size={16} />
                      Finalizar
                    </Button>
                  )}
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
          ))}
        </div>

        {filteredContratos.length === 0 && (
          <div className="empty-state">
            <FileText size={48} />
            <h3>Nenhum contrato encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo contrato.</p>
          </div>
        )}

        {/* Modal de Criar/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="contrato-modal">
            <DialogHeader>
              <DialogTitle>
                {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
              </DialogTitle>
            </DialogHeader>
            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <Label>Cliente</Label>
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="form-group">
                  <Label>Faculdade</Label>
                  <Input
                    value={formData.faculdade}
                    onChange={(e) => setFormData({...formData, faculdade: e.target.value})}
                    placeholder="Nome da faculdade"
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingContrato ? 'Salvar' : 'Criar Contrato'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização */}
        <Dialog open={!!viewContrato} onOpenChange={() => setViewContrato(null)}>
          <DialogContent className="contrato-view-modal">
            <DialogHeader>
              <DialogTitle>Detalhes do Contrato</DialogTitle>
            </DialogHeader>
            {viewContrato && (
              <div className="view-content">
                <div className="view-header">
                  <h3>{viewContrato.cliente}</h3>
                  <Badge 
                    style={{ 
                      backgroundColor: getStatusColor(viewContrato.status).bg,
                      color: getStatusColor(viewContrato.status).color
                    }}
                  >
                    {viewContrato.status}
                  </Badge>
                </div>
                <div className="view-grid">
                  <div className="view-item">
                    <span className="view-label">Número do Contrato</span>
                    <span className="view-value">{viewContrato.numero_contrato}</span>
                  </div>
                  <div className="view-item">
                    <span className="view-label">Faculdade</span>
                    <span className="view-value">{viewContrato.faculdade}</span>
                  </div>
                  <div className="view-item">
                    <span className="view-label">Valor</span>
                    <span className="view-value">{formatCurrency(viewContrato.valor)}</span>
                  </div>
                  <div className="view-item">
                    <span className="view-label">Data de Início</span>
                    <span className="view-value">{formatDate(viewContrato.data_inicio)}</span>
                  </div>
                  <div className="view-item">
                    <span className="view-label">Data de Término</span>
                    <span className="view-value">{formatDate(viewContrato.data_fim)}</span>
                  </div>
                  <div className="view-item">
                    <span className="view-label">Criado em</span>
                    <span className="view-value">{formatDate(viewContrato.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ContratosLista;
