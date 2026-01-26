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
import { atualizarTarefa, getStatusTarefas } from '../services/api';
import { DEPARTAMENTOS } from '../data/mockNovo';
import { Loader2, AlertCircle, Edit } from 'lucide-react';

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', cor: '#10b981' },
  { value: 'media', label: 'Média', cor: '#f59e0b' },
  { value: 'alta', label: 'Alta', cor: '#ef4444' },
  { value: 'critica', label: 'Crítica', cor: '#7f1d1d' },
];

const EditarTarefaModal = ({ isOpen, onClose, onSuccess, tarefa }) => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusList, setStatusList] = useState([]);
  
  const canEdit = user?.role === 'admin' || user?.role === 'gerente' || hasPermission('admin') || hasPermission('gerente');
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    setor: '',
    responsavel_nome: '',
    status_id: '',
    prazo: '',
    prioridade: 'media',
  });

  useEffect(() => {
    const fetchStatusList = async () => {
      try {
        const data = await getStatusTarefas();
        setStatusList(data);
      } catch (err) {
        console.error('Error loading status list:', err);
      }
    };

    if (isOpen && tarefa) {
      fetchStatusList();
      setFormData({
        titulo: tarefa.titulo || '',
        descricao: tarefa.descricao || '',
        setor: tarefa.setor || '',
        responsavel_nome: tarefa.responsavel_nome || '',
        status_id: tarefa.status_id || '',
        prazo: tarefa.prazo ? tarefa.prazo.split('T')[0] : '',
        prioridade: tarefa.prioridade || 'media',
      });
      setError(null);
    }
  }, [isOpen, tarefa]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canEdit) {
      setError('Você não tem permissão para editar tarefas');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        usuario_id: user?.id || 'unknown',
        usuario_nome: user?.nome || 'Usuário',
        usuario_setor: user?.setor || 'Geral',
        usuario_role: user?.role || 'operador',
      };

      await atualizarTarefa(tarefa.id, updateData);
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err.response?.data?.detail || 'Erro ao atualizar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const departamentos = Object.values(DEPARTAMENTOS);

  if (!canEdit) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Sem Permissão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Apenas <strong>administradores</strong> e <strong>gerentes</strong> podem editar tarefas.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={20} className="text-blue-600" />
            Editar Tarefa
          </DialogTitle>
          <DialogDescription>
            Edite os dados da tarefa. Alterações serão registradas no histórico.
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

            {/* Setor e Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Setor</Label>
                <Select
                  value={formData.setor}
                  onValueChange={(value) => handleChange('setor', value)}
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
              {tarefa?.prazo_original && tarefa.prazo_original !== formData.prazo && (
                <p className="text-xs text-gray-500">
                  Prazo original: {tarefa.prazo_original}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditarTarefaModal;
