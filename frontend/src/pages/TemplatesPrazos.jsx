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
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getTemplatesPrazos,
  criarTemplatePadrao,
  deletarTemplatePrazo,
  aplicarTemplateContrato,
  getPrazosContrato
} from '../services/api';
import { mockContratos, DEPARTAMENTOS } from '../data/mockNovo';
import './TemplatesPrazos.css';

const DEPT_CORES = {
  'atendimento': '#3b82f6',
  'criacao': '#8b5cf6',
  'pre-producao': '#f59e0b',
  'producao': '#10b981'
};

const TemplatesPrazos = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Modals
  const [showAplicarModal, setShowAplicarModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [aplicarData, setAplicarData] = useState({
    contrato_id: '',
    data_inicio: ''
  });
  const [aplicarLoading, setAplicarLoading] = useState(false);
  const [aplicarResult, setAplicarResult] = useState(null);

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

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCriarPadrao = async () => {
    setCreating(true);
    try {
      await criarTemplatePadrao(user?.id || 'admin', user?.role || 'admin');
      await loadTemplates();
    } catch (err) {
      console.error('Error creating default template:', err);
      alert(err.response?.data?.detail || 'Erro ao criar template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      await deletarTemplatePrazo(templateId, user?.role || 'admin');
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir template');
    }
  };

  const handleAplicar = (template) => {
    setSelectedTemplate(template);
    setAplicarData({ contrato_id: '', data_inicio: '' });
    setAplicarResult(null);
    setShowAplicarModal(true);
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

  return (
    <LayoutNovo 
      title="Templates de Prazos" 
      subtitle="Definição de prazos padrão para contratos"
    >
      <div className="templates-container">
        {/* Header Actions */}
        <div className="templates-header">
          <Button variant="outline" onClick={loadTemplates} disabled={loading}>
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          {isAdmin && templates.length === 0 && (
            <Button onClick={handleCriarPadrao} disabled={creating}>
              {creating ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Plus size={18} className="mr-2" />
              )}
              Criar Template Padrão
            </Button>
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
              <p>Crie um template padrão para começar a definir prazos nos contratos.</p>
              {isAdmin && (
                <Button onClick={handleCriarPadrao} disabled={creating} className="mt-4">
                  {creating ? (
                    <Loader2 size={18} className="mr-2 animate-spin" />
                  ) : (
                    <Plus size={18} className="mr-2" />
                  )}
                  Criar Template Padrão IDEIABH
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="templates-grid">
            {templates.map(template => {
              const etapasPorDept = agruparEtapasPorDepartamento(template.etapas);
              
              return (
                <Card key={template.id} className="template-card">
                  <CardHeader>
                    <div className="template-header">
                      <div>
                        <CardTitle>{template.nome}</CardTitle>
                        {template.descricao && (
                          <p className="template-descricao">{template.descricao}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="prazo-total-badge">
                        <Clock size={14} className="mr-1" />
                        {template.prazo_total_dias} dias
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Resumo por Departamento */}
                    <div className="dept-resumo">
                      {Object.entries(etapasPorDept).map(([dept, etapas]) => {
                        const totalDias = etapas.reduce((acc, e) => acc + (e.prazo_dias || 0), 0);
                        const deptInfo = Object.values(DEPARTAMENTOS).find(d => d.id === dept);
                        
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
                        <Button 
                          variant="outline" 
                          className="btn-delete"
                          onClick={() => handleDelete(template.id)}
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
        )}

        {/* Modal Aplicar Template */}
        <Dialog open={showAplicarModal} onOpenChange={setShowAplicarModal}>
          <DialogContent className="sm:max-w-[600px]">
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
                        {selectedTemplate?.prazo_total_dias} dias • {selectedTemplate?.etapas?.length} etapas
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
                      {mockContratos.filter(c => c.status !== 'Concluído').map(contrato => (
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
                          selectedTemplate.prazo_total_dias * 24 * 60 * 60 * 1000
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
      </div>
    </LayoutNovo>
  );
};

export default TemplatesPrazos;
