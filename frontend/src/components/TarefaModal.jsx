import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useAuth } from '../context/AuthContext';
import { criarTarefa, getStatusTarefas, getProjetos, getContratos } from '../services/api';
import { DEPARTAMENTOS } from '../data/mockNovo';
import { Loader2, AlertCircle } from 'lucide-react';

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', cor: '#10b981' },
  { value: 'media', label: 'Média', cor: '#f59e0b' },
  { value: 'alta', label: 'Alta', cor: '#ef4444' },
  { value: 'critica', label: 'Crítica', cor: '#7f1d1d' },
];

const TarefaModal = ({ isOpen, onClose, onSuccess, projetoId = null, contratoId = null, setor = null }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [contratos, setContratos] = useState([]);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    projeto_id: projetoId || '',
    contrato_id: contratoId || '',
    setor: setor || '',
    responsavel_nome: '',
    status_id: '',
    prazo: '',
    prioridade: 'media',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch status list
        const statusData = await getStatusTarefas();
        setStatusList(statusData);
        if (statusData.length > 0) {
          setFormData(prev => ({ ...prev, status_id: prev.status_id || statusData[0].id }));
        }
        
        // Fetch projetos from API
        try {
          const projetosData = await getProjetos(
            user?.role || 'operador',
            user?.id || null,
            user?.setor || null
          );
          setProjetos(projetosData || []);
        } catch (err) {
          console.error('Error loading projetos:', err);
          setProjetos([]);
        }
        
        // Fetch contratos from API
        try {
          const contratosData = await getContratos({
            user_role: user?.role || 'operador',
            user_id: user?.id || null,
            user_setor: user?.setor || null
          });
          setContratos(contratosData || []);
        } catch (err) {
          console.error('Error loading contratos:', err);
          setContratos([]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setFormData(prev => ({
        ...prev,
        projeto_id: projetoId || '',
        contrato_id: contratoId || '',
        setor: setor || '',
      }));
    }
  }, [isOpen, projetoId, contratoId, setor]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill contrato when projeto is selected
    if (field === 'projeto_id' && value) {
      const projeto = projetos.find(p => p.id === value);
      if (projeto) {
        setFormData(prev => ({ ...prev, contrato_id: projeto.contrato_id }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const tarefaData = {
        ...formData,
        criado_por_id: user?.id || 'unknown',
        criado_por_nome: user?.nome || 'Usuário',
        criado_por_setor: formData.setor || 'Geral',
      };

      await criarTarefa(tarefaData);
      
      // Reset form
      setFormData({
        titulo: '',
        descricao: '',
        projeto_id: projetoId || '',
        contrato_id: contratoId || '',
        setor: setor || '',
        responsavel_nome: '',
        status_id: statusList[0]?.id || '',
        prazo: '',
        prioridade: 'media',
      });
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.detail || 'Erro ao criar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const departamentos = Object.values(DEPARTAMENTOS);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Preencha os dados da tarefa. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Título */}
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Ex: Revisão de layout"
                required
              />
            </div>

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descreva a tarefa..."
                rows={3}
              />
            </div>

            {/* Projeto e Contrato */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Projeto *</Label>
                <Select
                  value={formData.projeto_id}
                  onValueChange={(value) => handleChange('projeto_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos.length > 0 ? (
                      projetos.map((projeto) => (
                        <SelectItem key={projeto.id} value={projeto.id}>
                          {projeto.cliente}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Nenhum projeto encontrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {projetos.length === 0 && (
                  <p className="text-xs text-amber-600">Crie um contrato primeiro para ter projetos disponíveis</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Contrato *</Label>
                <Select
                  value={formData.contrato_id}
                  onValueChange={(value) => handleChange('contrato_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contratos.length > 0 ? (
                      contratos.map((contrato) => (
                        <SelectItem key={contrato.id} value={contrato.id}>
                          {contrato.numero_contrato} - {contrato.cliente}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Nenhum contrato encontrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Setor e Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Setor *</Label>
                <Select
                  value={formData.setor}
                  onValueChange={(value) => handleChange('setor', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: dept.cor }}
                          />
                          {dept.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={formData.responsavel_nome}
                  onChange={(e) => handleChange('responsavel_nome', e.target.value)}
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            {/* Status e Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formData.status_id}
                  onValueChange={(value) => handleChange('status_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusList.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: status.cor }}
                          />
                          {status.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => handleChange('prioridade', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: p.cor }}
                          />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prazo */}
            <div className="grid gap-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input
                id="prazo"
                type="date"
                value={formData.prazo}
                onChange={(e) => handleChange('prazo', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TarefaModal;
