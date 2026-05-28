import React, { useState, useEffect, useCallback } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
  Edit,
  Copy,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getTemplatesPrazos,
  criarTemplatePrazo,
  atualizarTemplatePrazo,
  deletarTemplatePrazo,
  aplicarTemplateContrato,
  getContratos,
} from '../services/api';
import { DEPARTAMENTOS } from '../data/mockNovo';
import './TemplatesPrazos.css';

const DEPT_CORES = {
  'atendimento': '#3b82f6',
  'criacao': '#8b5cf6',
  'pre-producao': '#f59e0b',
  'producao': '#10b981'
};

// Etapas padrão do sistema IDEIABH
const ETAPAS_PADRAO = [
  // ATENDIMENTO
  { etapa_id: 1, etapa_nome: "Informar recebimento do contrato", departamento: "atendimento", prazo_dias: 1 },
  { etapa_id: 2, etapa_nome: "Ativar contrato no site", departamento: "atendimento", prazo_dias: 1 },
  { etapa_id: 3, etapa_nome: "1º contato com a comissão", departamento: "atendimento", prazo_dias: 2 },
  { etapa_id: 4, etapa_nome: "Reunião de atendimento", departamento: "atendimento", prazo_dias: 15 },
  { etapa_id: 5, etapa_nome: "Envio do questionário de criação", departamento: "atendimento", prazo_dias: 1 },
  { etapa_id: 6, etapa_nome: "Recebimento do questionário preenchido", departamento: "atendimento", prazo_dias: 30 },
  { etapa_id: 7, etapa_nome: "Envio do e-mail de layout de fotos", departamento: "atendimento", prazo_dias: 1 },
  { etapa_id: 8, etapa_nome: "Enviar layout para comissão", departamento: "atendimento", prazo_dias: 1 },
  { etapa_id: 9, etapa_nome: "Agendar reunião de criação", departamento: "atendimento", prazo_dias: 5 },
  { etapa_id: 10, etapa_nome: "Liberação das fotos", departamento: "atendimento", prazo_dias: 3 },
  { etapa_id: 11, etapa_nome: "Cadastro de textos/REV1", departamento: "atendimento", prazo_dias: 2 },
  { etapa_id: 12, etapa_nome: "Acompanhar aprovação", departamento: "atendimento", prazo_dias: 7 },
  
  // CRIAÇÃO
  { etapa_id: 18, etapa_nome: "RC - Reunião de criação", departamento: "criacao", prazo_dias: 2 },
  { etapa_id: 19, etapa_nome: "Envio do briefing", departamento: "criacao", prazo_dias: 2 },
  { etapa_id: 20, etapa_nome: "Layout de Fotos", departamento: "criacao", prazo_dias: 5 },
  { etapa_id: 24, etapa_nome: "Início da criação", departamento: "criacao", prazo_dias: 10 },
  { etapa_id: 25, etapa_nome: "Criação do convite", departamento: "criacao", prazo_dias: 5 },
  { etapa_id: 26, etapa_nome: "Correções", departamento: "criacao", prazo_dias: 3 },
  { etapa_id: 28, etapa_nome: "Miolo aprovado", departamento: "criacao", prazo_dias: 2 },
  { etapa_id: 29, etapa_nome: "Capa aprovada", departamento: "criacao", prazo_dias: 2 },
  { etapa_id: 30, etapa_nome: "Demais Peças", departamento: "criacao", prazo_dias: 5 },
  { etapa_id: 33, etapa_nome: "Saída/Finalização", departamento: "criacao", prazo_dias: 3 },
  
  // PRÉ-PRODUÇÃO
  { etapa_id: 34, etapa_nome: "Recorte e tratamento", departamento: "pre-producao", prazo_dias: 10 },
  { etapa_id: 35, etapa_nome: "Recebimento envelope", departamento: "pre-producao", prazo_dias: 1 },
  { etapa_id: 36, etapa_nome: "Conferir textos", departamento: "pre-producao", prazo_dias: 2 },
  { etapa_id: 37, etapa_nome: "Envio para gráfica", departamento: "pre-producao", prazo_dias: 1 },
  
  // PRODUÇÃO
  { etapa_id: 40, etapa_nome: "Triagem materiais", departamento: "producao", prazo_dias: 1 },
  { etapa_id: 41, etapa_nome: "Envio à gráfica", departamento: "producao", prazo_dias: 1 },
  { etapa_id: 42, etapa_nome: "Ordem de produção", departamento: "producao", prazo_dias: 1 },
  { etapa_id: 43, etapa_nome: "Costura e acabamento", departamento: "producao", prazo_dias: 7 },
  { etapa_id: 44, etapa_nome: "Conferência qualidade", departamento: "producao", prazo_dias: 1 },
  { etapa_id: 45, etapa_nome: "Entrega convites", departamento: "producao", prazo_dias: 1 },
];

const TemplatesPrazos = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const defaultCriador = user?.nome || user?.username || 'sistema';
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showAplicarModal, setShowAplicarModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Editor state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    descricao: '',
    etapas: [],
    criado_por: defaultCriador
  });
  
  // Aplicar state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [aplicarData, setAplicarData] = useState({
    contrato_id: '',
    data_inicio: ''
  });
  const [aplicarLoading, setAplicarLoading] = useState(false);
  const [aplicarResult, setAplicarResult] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [contratosLoading, setContratosLoading] = useState(false);
  
  // Delete state
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplatesPrazos();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContratos = useCallback(async () => {
    setContratosLoading(true);
    try {
      const data = await getContratos();
      setContratos(data || []);
    } catch (err) {
      console.error('Error loading contratos:', err);
      setContratos([]);
    } finally {
      setContratosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    setTemplateForm(prev => ({
      ...prev,
      criado_por: user?.nome || user?.username || 'sistema'
    }));
  }, [user]);

  // Calcular prazo total
  const calcularPrazoTotal = (etapas) => {
    return etapas.reduce((acc, e) => acc + (parseInt(e.prazo_dias) || 0), 0);
  };

  // Criar novo template (do zero ou baseado no padrão)
  const handleNovoTemplate = (usarPadrao = false) => {
    setEditingTemplate(null);
    setTemplateForm({
      nome: usarPadrao ? 'Novo Template (Padrão)' : 'Novo Template',
      descricao: '',
      etapas: usarPadrao ? JSON.parse(JSON.stringify(ETAPAS_PADRAO)) : [],
      criado_por: defaultCriador
    });
    setShowEditorModal(true);
  };

  // Editar template existente
  const handleEditarTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      nome: template.nome,
      descricao: template.descricao || '',
      etapas: JSON.parse(JSON.stringify(template.etapas || [])),
      criado_por: template.criado_por || defaultCriador
    });
    setShowEditorModal(true);
  };

  // Duplicar template
  const handleDuplicarTemplate = (template) => {
    setEditingTemplate(null);
    setTemplateForm({
      nome: `${template.nome} (Cópia)`,
      descricao: template.descricao || '',
      etapas: JSON.parse(JSON.stringify(template.etapas || [])),
      criado_por: template.criado_por || defaultCriador
    });
    setShowEditorModal(true);
  };

  // Adicionar nova etapa
  const handleAddEtapa = () => {
    const novaEtapa = {
      etapa_id: Date.now(),
      etapa_nome: '',
      departamento: 'atendimento',
      prazo_dias: 1
    };
    setTemplateForm(prev => ({
      ...prev,
      etapas: [...prev.etapas, novaEtapa]
    }));
  };

  // Remover etapa
  const handleRemoveEtapa = (index) => {
    setTemplateForm(prev => ({
      ...prev,
      etapas: prev.etapas.filter((_, i) => i !== index)
    }));
  };

  // Atualizar etapa
  const handleUpdateEtapa = (index, field, value) => {
    setTemplateForm(prev => ({
      ...prev,
      etapas: prev.etapas.map((etapa, i) => 
        i === index ? { ...etapa, [field]: field === 'prazo_dias' ? parseInt(value) || 0 : value } : etapa
      )
    }));
  };

  // Mover etapa para cima/baixo
  const handleMoveEtapa = (index, direction) => {
    const newEtapas = [...templateForm.etapas];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newEtapas.length) return;
    
    [newEtapas[index], newEtapas[newIndex]] = [newEtapas[newIndex], newEtapas[index]];
    
    setTemplateForm(prev => ({
      ...prev,
      etapas: newEtapas
    }));
  };

  // Salvar template
  const handleSalvarTemplate = async () => {
    if (!templateForm.nome.trim()) {
      alert('Digite um nome para o template');
      return;
    }
    
    if (templateForm.etapas.length === 0) {
      alert('Adicione pelo menos uma etapa');
      return;
    }

    // Validar etapas
    for (let i = 0; i < templateForm.etapas.length; i++) {
      if (!templateForm.etapas[i].etapa_nome.trim()) {
        alert(`A etapa ${i + 1} precisa de um nome`);
        return;
      }
    }

    setSaving(true);
    try {
      const data = {
        nome: templateForm.nome,
        descricao: templateForm.descricao,
        etapas: templateForm.etapas.map((e, idx) => ({
          ...e,
          etapa_id: e.etapa_id || idx + 1
        }))
      };
      
      if (!editingTemplate && templateForm.criado_por) {
        data.criado_por = templateForm.criado_por;
      }

      if (editingTemplate) {
        await atualizarTemplatePrazo(editingTemplate.id, data, user?.role || 'admin');
      } else {
        await criarTemplatePrazo(data, user?.id || 'admin', user?.role || 'admin');
      }
      
      await loadTemplates();
      setShowEditorModal(false);
    } catch (err) {
      console.error('Error saving template:', err);
      alert(err.response?.data?.detail || 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  // Deletar template
  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await deletarTemplatePrazo(templateToDelete.id, user?.role || 'admin');
      await loadTemplates();
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir template');
    }
  };

  // Aplicar template
  const handleAplicar = (template) => {
    setSelectedTemplate(template);
    setAplicarData({ contrato_id: '', data_inicio: '' });
    setAplicarResult(null);
    setShowAplicarModal(true);
    if (!contratos.length) {
      loadContratos();
    }
  };

  const confirmarAplicar = async () => {
    if (!aplicarData.contrato_id || !aplicarData.data_inicio) {
      alert('Selecione o contrato e a data de início');
      return;
    }

    setAplicarLoading(true);
    try {
      const result = await aplicarTemplateContrato(
        aplicarData.contrato_id,
        selectedTemplate.id,
        aplicarData.data_inicio
      );
      setAplicarResult(result);
    } catch (err) {
      console.error('Error applying template:', err);
      alert(err.response?.data?.detail || 'Erro ao aplicar template');
    } finally {
      setAplicarLoading(false);
    }
  };

  // Agrupar etapas por departamento
  const agruparEtapasPorDepartamento = (etapas) => {
    const grupos = {};
    etapas?.forEach(etapa => {
      const dept = etapa.departamento || 'outros';
      if (!grupos[dept]) {
        grupos[dept] = [];
      }
      grupos[dept].push(etapa);
    });
    return grupos;
  };

  const departamentos = Object.values(DEPARTAMENTOS);
  
  const formatCriador = (criador) => criador || 'N/D';

  return (
    <LayoutNovo 
      title="Templates de Prazos" 
      subtitle="Defina e personalize os prazos padrão para contratos"
    >
      <div className="templates-container">
        {/* Header Actions */}
        <div className="templates-header">
          <div className="header-left">
            <Button variant="outline" onClick={loadTemplates} disabled={loading}>
              <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          
          {isAdmin && (
            <div className="header-right">
              <Button variant="outline" onClick={() => handleNovoTemplate(false)}>
                <Plus size={18} className="mr-2" />
                Template em Branco
              </Button>
              <Button onClick={() => handleNovoTemplate(true)}>
                <FileText size={18} className="mr-2" />
                Usar Template Padrão
              </Button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="loading-container">
            <RefreshCw className="animate-spin" size={32} />
            <span>Carregando templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <Card className="empty-card">
            <CardContent className="empty-content">
              <FileText size={48} className="empty-icon" />
              <h3>Nenhum template cadastrado</h3>
              <p>Crie um template para definir os prazos padrão de cada etapa do contrato.</p>
              {isAdmin && (
                <div className="empty-actions">
                  <Button variant="outline" onClick={() => handleNovoTemplate(false)}>
                    <Plus size={18} className="mr-2" />
                    Criar do Zero
                  </Button>
                  <Button onClick={() => handleNovoTemplate(true)}>
                    <FileText size={18} className="mr-2" />
                    Usar Padrão IDEIABH
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="templates-grid">
            {templates.map(template => {
              const etapasPorDept = agruparEtapasPorDepartamento(template.etapas);
              const prazoTotal = calcularPrazoTotal(template.etapas || []);
              
              return (
                <Card key={template.id} className="template-card">
                  <CardHeader>
                    <div className="template-header">
                      <div>
                        <CardTitle>{template.nome}</CardTitle>
                        {template.descricao && (
                          <p className="template-descricao">{template.descricao}</p>
                        )}
                        <p className="template-criador">
                          Criador: {formatCriador(template.criado_por)}
                        </p>
                      </div>
                      <Badge variant="outline" className="prazo-total-badge">
                        <Clock size={14} className="mr-1" />
                        {prazoTotal} dias
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Resumo por Departamento */}
                    <div className="dept-resumo">
                      {Object.entries(etapasPorDept).map(([dept, etapas]) => {
                        const totalDias = etapas.reduce((acc, e) => acc + (parseInt(e.prazo_dias) || 0), 0);
                        const deptInfo = departamentos.find(d => d.id === dept);
                        
                        return (
                          <div key={dept} className="dept-item">
                            <div 
                              className="dept-cor" 
                              style={{ backgroundColor: DEPT_CORES[dept] || '#64748b' }}
                            />
                            <div className="dept-info">
                              <span className="dept-nome">{deptInfo?.nome || dept}</span>
                              <span className="dept-stats">
                                {etapas.length} etapas • {totalDias} dias
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Etapas Detalhadas */}
                    <div className="etapas-acordeon">
                      <details>
                        <summary className="etapas-summary">
                          Ver todas as {template.etapas?.length || 0} etapas
                        </summary>
                        <div className="etapas-lista">
                          {template.etapas?.map((etapa, idx) => (
                            <div key={idx} className="etapa-item-template">
                              <div 
                                className="etapa-dept-indicator" 
                                style={{ backgroundColor: DEPT_CORES[etapa.departamento] || '#64748b' }}
                              />
                              <span className="etapa-nome-template">{etapa.etapa_nome}</span>
                              <Badge variant="outline" className="etapa-prazo">
                                {etapa.prazo_dias}d
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>

                    {/* Ações */}
                    <div className="template-actions">
                      <Button 
                        onClick={() => handleAplicar(template)}
                        className="btn-aplicar"
                      >
                        <Copy size={16} className="mr-2" />
                        Aplicar a Contrato
                      </Button>
                      
                      {isAdmin && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={() => handleEditarTemplate(template)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleDuplicarTemplate(template)}
                          >
                            <Copy size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            className="btn-delete"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal Editor de Template */}
        <Dialog open={showEditorModal} onOpenChange={setShowEditorModal}>
          <DialogContent className="editor-modal">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template de Prazos'}
              </DialogTitle>
              <DialogDescription>
                Configure as etapas e prazos. Você pode personalizar cada prazo conforme necessário.
              </DialogDescription>
            </DialogHeader>

            <div className="editor-content">
              {/* Info básica */}
              <div className="editor-section">
                <div className="form-row">
                  <div className="form-group flex-1">
                    <Label>Nome do Template *</Label>
                    <Input
                      value={templateForm.nome}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Template Padrão, Template Rápido..."
                    />
                  </div>
                  <div className="form-group prazo-total-group">
                    <Label>Prazo Total</Label>
                    <div className="prazo-total-display">
                      <Clock size={18} />
                      <span>{calcularPrazoTotal(templateForm.etapas)} dias</span>
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <Label>Descrição</Label>
                  <Textarea
                    value={templateForm.descricao}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição opcional do template..."
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <Label>Criador</Label>
                  <div className="template-criador-display">
                    {templateForm.criado_por || 'sistema'}
                  </div>
                  <p className="form-hint">Criador definido automaticamente pelo usuario logado.</p>
                </div>
              </div>

              {/* Lista de Etapas */}
              <div className="editor-section etapas-section">
                <div className="section-header">
                  <h3>Etapas ({templateForm.etapas.length})</h3>
                  <Button size="sm" onClick={handleAddEtapa}>
                    <Plus size={16} className="mr-1" />
                    Adicionar Etapa
                  </Button>
                </div>

                {templateForm.etapas.length === 0 ? (
                  <div className="etapas-empty">
                    <p>Nenhuma etapa adicionada</p>
                    <Button variant="outline" onClick={handleAddEtapa}>
                      <Plus size={16} className="mr-2" />
                      Adicionar primeira etapa
                    </Button>
                  </div>
                ) : (
                  <div className="etapas-editor-list">
                    {templateForm.etapas.map((etapa, index) => (
                      <div key={index} className="etapa-editor-item">
                        <div className="etapa-drag">
                          <GripVertical size={16} />
                          <span className="etapa-numero">{index + 1}</span>
                        </div>
                        
                        <div className="etapa-fields">
                          <div className="etapa-field nome-field">
                            <Input
                              value={etapa.etapa_nome}
                              onChange={(e) => handleUpdateEtapa(index, 'etapa_nome', e.target.value)}
                              placeholder="Nome da etapa"
                            />
                          </div>
                          
                          <div className="etapa-field dept-field">
                            <Select
                              value={etapa.departamento}
                              onValueChange={(value) => handleUpdateEtapa(index, 'departamento', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {departamentos.map(dept => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded" 
                                        style={{ backgroundColor: dept.cor }}
                                      />
                                      {dept.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="etapa-field prazo-field">
                            <div className="prazo-input-group">
                              <Input
                                type="number"
                                min="0"
                                value={etapa.prazo_dias}
                                onChange={(e) => handleUpdateEtapa(index, 'prazo_dias', e.target.value)}
                              />
                              <span className="prazo-suffix">dias</span>
                            </div>
                          </div>
                        </div>

                        <div className="etapa-actions">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMoveEtapa(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMoveEtapa(index, 'down')}
                            disabled={index === templateForm.etapas.length - 1}
                          >
                            <ChevronDown size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="btn-remove"
                            onClick={() => handleRemoveEtapa(index)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditorModal(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarTemplate} disabled={saving}>
                {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                <Save size={16} className="mr-2" />
                Salvar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Aplicar Template */}
        <Dialog open={showAplicarModal} onOpenChange={setShowAplicarModal}>
          <DialogContent className="sm:max-w-[600px] aplicar-modal">
            <DialogHeader>
              <DialogTitle>Aplicar Template ao Contrato</DialogTitle>
              <DialogDescription>
                Selecione o contrato e a data de início para gerar os prazos de cada etapa.
              </DialogDescription>
            </DialogHeader>

            {!aplicarResult ? (
              <div className="aplicar-form">
                <div className="form-group">
                  <Label>Template Selecionado</Label>
                  <div className="template-info-box">
                    <FileText size={18} />
                    <div>
                      <span className="template-nome">{selectedTemplate?.nome}</span>
                      <span className="template-prazo">
                        {calcularPrazoTotal(selectedTemplate?.etapas || [])} dias • {selectedTemplate?.etapas?.length} etapas
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <Label>Contrato *</Label>
                  <Select
                    value={aplicarData.contrato_id}
                    onValueChange={(value) => setAplicarData(prev => ({ ...prev, contrato_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o contrato..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contratosLoading && (
                        <SelectItem value="loading" disabled>
                          Carregando contratos...
                        </SelectItem>
                      )}
                      {!contratosLoading && contratos.length === 0 && (
                        <SelectItem value="empty" disabled>
                          Nenhum contrato disponível
                        </SelectItem>
                      )}
                      {!contratosLoading && contratos
                        .filter(c => c.status !== 'Finalizado' && c.status !== 'Entregue')
                        .map(contrato => (
                          <SelectItem key={contrato.id} value={contrato.id}>
                            {contrato.numero_contrato} - {contrato.cliente}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={aplicarData.data_inicio}
                    onChange={(e) => setAplicarData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  />
                  <p className="form-hint">
                    A partir desta data, os prazos de cada etapa serão calculados sequencialmente.
                  </p>
                </div>

                {aplicarData.data_inicio && selectedTemplate && (
                  <div className="preview-fim">
                    <Calendar size={16} />
                    <span>
                      Previsão de conclusão:{' '}
                      <strong>
                        {new Date(
                          new Date(aplicarData.data_inicio).getTime() + 
                          calcularPrazoTotal(selectedTemplate.etapas || []) * 24 * 60 * 60 * 1000
                        ).toLocaleDateString('pt-BR')}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="aplicar-result">
                <div className="result-header success">
                  <CheckCircle2 size={32} />
                  <h3>Template Aplicado com Sucesso!</h3>
                </div>

                <div className="result-info">
                  <div className="result-item">
                    <span className="result-label">Data Início:</span>
                    <span>{new Date(aplicarResult.data_inicio).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Data Fim Prevista:</span>
                    <span>{new Date(aplicarResult.data_fim_prevista).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Total de Etapas:</span>
                    <span>{aplicarResult.etapas?.length}</span>
                  </div>
                </div>

                <div className="result-etapas">
                  <h4>Prazos Gerados:</h4>
                  <div className="etapas-geradas">
                    {aplicarResult.etapas?.slice(0, 5).map((etapa, idx) => (
                      <div key={idx} className="etapa-gerada">
                        <div 
                          className="etapa-dept-indicator" 
                          style={{ backgroundColor: DEPT_CORES[etapa.departamento] || '#64748b' }}
                        />
                        <span className="etapa-nome-gerada">{etapa.etapa_nome}</span>
                        <span className="etapa-datas">
                          {new Date(etapa.data_inicio).toLocaleDateString('pt-BR')} -{' '}
                          {new Date(etapa.data_fim).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                    {aplicarResult.etapas?.length > 5 && (
                      <p className="mais-etapas">
                        + {aplicarResult.etapas.length - 5} etapas...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {!aplicarResult ? (
                <>
                  <Button variant="outline" onClick={() => setShowAplicarModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={confirmarAplicar} disabled={aplicarLoading}>
                    {aplicarLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
                    Aplicar Template
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowAplicarModal(false)}>
                  Fechar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Template</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o template "{templateToDelete?.nome}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LayoutNovo>
  );
};

export default TemplatesPrazos;
