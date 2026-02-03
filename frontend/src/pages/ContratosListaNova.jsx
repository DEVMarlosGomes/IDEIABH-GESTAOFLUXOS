import React, { useState, useEffect } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
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
  Building2,
  Loader2,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  List
} from 'lucide-react';
import { 
  getContratos, 
  criarContrato, 
  atualizarContrato, 
  deletarContrato,
  getTemplatesPrazos,
  listarUsuariosSetor
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import './ContratosLista.css';

const ContratosListaNova = () => {
  const { user } = useAuth();
  const [contratos, setContratos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState(null);
  const [viewContrato, setViewContrato] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [operadoresAtendimento, setOperadoresAtendimento] = useState([]);
  const [operadoresCriacao, setOperadoresCriacao] = useState([]);
  const [operadoresLoading, setOperadoresLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente: '',
    faculdade: '',
    curso: '',
    numero_contrato: '',
    pago: false,
    data_inicio: '',
    data_fim: '',
    observacao: '',
    template_id: '',
    atribuir_operadores: false,
    responsavel_atendimento_id: '',
    responsavel_criacao_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contratosData, templatesData] = await Promise.all([
        getContratos(),
        getTemplatesPrazos()
      ]);
      setContratos(contratosData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const loadOperadores = async () => {
    if (!user?.role) return;
    setOperadoresLoading(true);
    try {
      const [atendimento, criacao] = await Promise.all([
        listarUsuariosSetor('atendimento', user.role, user.setor),
        listarUsuariosSetor('criacao', user.role, user.setor)
      ]);
      setOperadoresAtendimento(atendimento || []);
      setOperadoresCriacao(criacao || []);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
      setOperadoresAtendimento([]);
      setOperadoresCriacao([]);
    } finally {
      setOperadoresLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && !editingContrato && !operadoresLoading) {
      loadOperadores();
    }
  }, [isModalOpen, editingContrato, user]);

  const filteredContratos = contratos.filter(contrato => {
    const matchesSearch = contrato.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contrato.numero_contrato?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTemplateCreator = (criador) => {
    if (!criador) return '-';
    const normalized = String(criador).toLowerCase();
    if (normalized === 'admin' || normalized === 'adm') return 'Adm';
    if (normalized === 'gerente') return 'Gerente';
    return criador;
  };

  const handleOpenModal = (contrato = null) => {
    if (contrato) {
      setEditingContrato(contrato);
      setFormData({
        cliente: contrato.cliente,
        faculdade: contrato.faculdade,
        curso: contrato.curso || '',
        numero_contrato: contrato.numero_contrato,
        pago: !!contrato.pago,
        data_inicio: contrato.data_inicio,
        data_fim: contrato.data_fim || '',
        observacao: contrato.observacao || '',
        template_id: contrato.template_id || '',
        atribuir_operadores: false,
        responsavel_atendimento_id: '',
        responsavel_criacao_id: ''
      });
      if (contrato.template_id) {
        const template = templates.find(t => t.id === contrato.template_id);
        setSelectedTemplate(template);
      }
    } else {
      setEditingContrato(null);
      setFormData({
        cliente: '',
        faculdade: '',
        curso: '',
        numero_contrato: '',
        pago: false,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        observacao: '',
        template_id: '',
        atribuir_operadores: false,
        responsavel_atendimento_id: '',
        responsavel_criacao_id: ''
      });
      setSelectedTemplate(null);
    }
    setIsModalOpen(true);
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template);
    setFormData({ ...formData, template_id: templateId });
    
    // Calcular data fim baseado no template
    if (formData.data_inicio && template) {
      const dataInicio = new Date(formData.data_inicio);
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + template.prazo_total_dias);
      setFormData({ 
        ...formData, 
        template_id: templateId,
        data_fim: dataFim.toISOString().split('T')[0]
      });
    }
  };

  const handleSave = async () => {
    // Validação
    if (!formData.cliente || !formData.faculdade || !formData.numero_contrato || 
        !formData.data_inicio || !formData.template_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      
      if (editingContrato) {
        // Editar contrato existente
        const updated = await atualizarContrato(editingContrato.id, {
          cliente: formData.cliente,
          faculdade: formData.faculdade,
          curso: formData.curso,
          numero_contrato: formData.numero_contrato,
          pago: formData.pago,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim,
          observacao: formData.observacao
        });
        setContratos(contratos.map(c => c.id === editingContrato.id ? updated : c));
        toast.success('Contrato atualizado com sucesso!');
      } else {
        // Criar novo contrato (que cria automaticamente o projeto e etapas)
        const result = await criarContrato({
          cliente: formData.cliente,
          faculdade: formData.faculdade,
          curso: formData.curso,
          numero_contrato: formData.numero_contrato,
          pago: formData.pago,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim,
          observacao: formData.observacao,
          template_id: formData.template_id,
          atribuir_operadores: formData.atribuir_operadores,
          responsavel_atendimento_id: formData.responsavel_atendimento_id || null,
          responsavel_criacao_id: formData.responsavel_criacao_id || null,
          criado_por: user?.nome || user?.username || 'sistema'
        });
        
        setContratos([result.contrato, ...contratos]);
        toast.success(
          <div>
            <p className="font-semibold">Contrato criado com sucesso!</p>
            <p className="text-sm">Projeto e {result.tarefas_criadas} etapas criadas automaticamente</p>
          </div>,
          { duration: 5000 }
        );
      }
      
      setIsModalOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast.error('Erro ao salvar contrato');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este contrato? O projeto e todas as etapas também serão removidos.')) {
      return;
    }

    try {
      await deletarContrato(id, user?.role || 'admin');
      setContratos(contratos.filter(c => c.id !== id));
      toast.success('Contrato deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar contrato:', error);
      if (error?.response?.status === 404) {
        await loadData();
        toast.error('Contrato não encontrado. Lista atualizada.');
        return;
      }
      toast.error('Erro ao deletar contrato');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await atualizarContrato(id, { status: newStatus });
      setContratos(contratos.map(c => c.id === id ? { ...c, status: newStatus } : c));
      toast.success(`Status atualizado para ${newStatus}`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
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

        {/* Controls */}
        <div className="contratos-controls">
          <div className="search-wrapper-contratos">
            <Search
              size={18}
              className={`search-icon-contratos ${searchTerm ? 'is-hidden' : ''}`}
            />
            <Input
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-contratos"
            />
          </div>

          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label="Visualizar em grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label="Visualizar em lista"
            >
              <List size={18} />
            </button>
          </div>

          <div className="filtros-status filtros-contratos">
            {['todos', 'Ativo', 'Em Andamento', 'Finalizado'].map((status) => (
              <button
                key={status}
                className={`filtro-btn ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'todos' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Contratos Grid/List */}
        <div className={`contratos-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {filteredContratos.map((contrato) => {
            const templateInfo = templates.find(t => t.id === contrato.template_id);
            const templateCreator = formatTemplateCreator(templateInfo?.criado_por);
            
            return (
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
                    <CheckCircle size={16} />
                    <div>
                      <span className="info-label">Pagamento</span>
                      <span className="info-value">{contrato.pago ? 'Pago' : 'Nao pago'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <Calendar size={16} />
                    <div>
                      <span className="info-label">Início</span>
                      <span className="info-value">{formatDate(contrato.data_inicio)}</span>
                    </div>
                  </div>
                  {contrato.template_nome && (
                    <div className="info-item">
                      <ClipboardList size={16} />
                      <div>
                        <span className="info-label">Template</span>
                        <span className="info-value text-xs">{contrato.template_nome}</span>
                        <span className="info-subvalue">Criador: {templateCreator}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="contrato-actions">
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
                      onClick={() => handleStatusChange(contrato.id, 'Em Andamento')}
                    >
                      <Play size={16} />
                      Iniciar
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="delete-btn"
                      onClick={() => handleDelete(contrato.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
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
          <DialogContent className="contrato-modal max-w-4xl dialog-safe-center">
            <DialogHeader>
              <DialogTitle>
                {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados do Contrato</TabsTrigger>
              <TabsTrigger value="template" disabled={editingContrato}>
                Template e Prazos
              </TabsTrigger>
              <TabsTrigger value="atribuicoes" disabled={editingContrato}>
                Atribuicoes
              </TabsTrigger>
            </TabsList>
              
              <TabsContent value="dados" className="space-y-4">
                <div className="modal-form">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <Label>Cliente *</Label>
                      <Input
                        value={formData.cliente}
                        onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <Label>Faculdade *</Label>
                      <Input
                        value={formData.faculdade}
                        onChange={(e) => setFormData({...formData, faculdade: e.target.value})}
                        placeholder="Nome da faculdade"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <Label>Curso</Label>
                      <Input
                        value={formData.curso}
                        onChange={(e) => setFormData({...formData, curso: e.target.value})}
                        placeholder="Ex: Medicina"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <Label>Numero do Contrato *</Label>
                      <Input
                        value={formData.numero_contrato}
                        onChange={(e) => setFormData({...formData, numero_contrato: e.target.value})}
                        placeholder="Ex: 2025-001"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <Label>Data de Inicio *</Label>
                      <Input
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => {
                          setFormData({...formData, data_inicio: e.target.value});
                          // Recalcular data fim se template selecionado
                          if (selectedTemplate) {
                            const dataInicio = new Date(e.target.value);
                            const dataFim = new Date(dataInicio);
                            dataFim.setDate(dataFim.getDate() + selectedTemplate.prazo_total_dias);
                            setFormData(prev => ({ 
                              ...prev, 
                              data_inicio: e.target.value,
                              data_fim: dataFim.toISOString().split("T")[0]
                            }));
                          }
                        }}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <Label>Data de Termino (Prevista)</Label>
                      <Input
                        type="date"
                        value={formData.data_fim}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <Label>Pago</Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={formData.pago}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pago: checked }))}
                        />
                        <span className="text-sm text-gray-600">
                          {formData.pago ? "Pago" : "Nao pago"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <Label>Observacao</Label>
                    <Textarea
                      value={formData.observacao}
                      onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                      placeholder="Observacoes sobre o contrato..."
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="template" className="space-y-4">
                <div className="space-y-4">
                  <div className="form-group">
                    <Label>Selecione o Template de Prazos *</Label>
                    <Select value={formData.template_id} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.nome} ({template.prazo_total_dias} dias)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTemplate && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="text-blue-600" size={20} />
                          {selectedTemplate.nome}
                        </CardTitle>
                        {selectedTemplate.descricao && (
                          <p className="text-sm text-gray-600 mt-1">{selectedTemplate.descricao}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <span className="font-medium">Prazo Total:</span>
                            <Badge className="bg-blue-600">
                              {selectedTemplate.prazo_total_dias} dias
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <span className="font-medium">Total de Etapas:</span>
                            <Badge className="bg-green-600">
                              {selectedTemplate.etapas?.length || 0} etapas
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <ClipboardList size={16} />
                            Etapas do Template:
                          </h4>
                          <ScrollArea className="h-64 rounded-md border p-3 bg-white">
                            <div className="space-y-2">
                              {selectedTemplate.etapas?.map((etapa, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{etapa.etapa_nome}</p>
                                    <p className="text-xs text-gray-500 capitalize">{etapa.departamento}</p>
                                  </div>
                                  <Badge variant="outline" className="ml-2">
                                    {etapa.prazo_dias} {etapa.prazo_dias === 1 ? 'dia' : 'dias'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="atribuicoes" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={formData.atribuir_operadores}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, atribuir_operadores: !!checked }))}
                    />
                    <Label>Atribuir etapas automaticamente</Label>
                  </div>

                  <div className="form-group">
                    <Label>Operador de Atendimento</Label>
                    <Select
                      value={formData.responsavel_atendimento_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, responsavel_atendimento_id: value }))}
                      disabled={!formData.atribuir_operadores}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o operador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoresLoading && (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        )}
                        {!operadoresLoading && operadoresAtendimento.length === 0 && (
                          <SelectItem value="empty" disabled>Nenhum operador disponivel</SelectItem>
                        )}
                        {!operadoresLoading && operadoresAtendimento.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="form-group">
                    <Label>Operador de Criacao</Label>
                    <Select
                      value={formData.responsavel_criacao_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, responsavel_criacao_id: value }))}
                      disabled={!formData.atribuir_operadores}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o operador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoresLoading && (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        )}
                        {!operadoresLoading && operadoresCriacao.length === 0 && (
                          <SelectItem value="empty" disabled>Nenhum operador disponivel</SelectItem>
                        )}
                        {!operadoresLoading && operadoresCriacao.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="form-hint">Quando ativo, todas as etapas dos setores de atendimento e criacao serao atribuidas aos operadores escolhidos.</p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {editingContrato ? 'Atualizar' : 'Criar Contrato e Projeto'}
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

export default ContratosListaNova;
