import React, { useState, useEffect, useMemo } from 'react';
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
import { atualizarTarefa, listarUsuariosSetor } from '../services/api';
import { DEPARTAMENTOS } from '../data/mockNovo';
import { Loader2, AlertCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', cor: '#10b981' },
  { value: 'media', label: 'Média', cor: '#f59e0b' },
  { value: 'alta', label: 'Alta', cor: '#ef4444' },
  { value: 'critica', label: 'Crítica', cor: '#7f1d1d' },
];

const EditarTarefaModal = ({ isOpen, onClose, onSuccess, tarefa }) => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingError, setSavingError] = useState(false);
  const [usuariosSetor, setUsuariosSetor] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'gerente' || hasPermission('admin') || hasPermission('gerente');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    setor: '',
    responsavel_id: '',
    responsavel_nome: '',
    prazo: '',
    prioridade: 'media',
  });

  useEffect(() => {
    if (isOpen && tarefa) {
      setFormData({
        titulo: tarefa.titulo || '',
        descricao: tarefa.descricao || '',
        setor: tarefa.setor || '',
        responsavel_id: tarefa.responsavel_id || '',
        responsavel_nome: tarefa.responsavel_nome || '',
        prazo: tarefa.prazo ? tarefa.prazo.split('T')[0] : '',
        prioridade: tarefa.prioridade || 'media',
      });
      setSavingError(false);
    }
  }, [isOpen, tarefa]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      if (!formData.setor) {
        setUsuariosSetor([]);
        return;
      }
      setLoadingUsuarios(true);
      try {
        const data = await listarUsuariosSetor(formData.setor, user?.role || 'operador', user?.setor);
        setUsuariosSetor(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar usuários do setor:', err);
        setUsuariosSetor([]);
      } finally {
        setLoadingUsuarios(false);
      }
    };

    if (isOpen) {
      fetchUsuarios();
    }
  }, [isOpen, formData.setor, user?.role, user?.setor]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const responsavelOptions = useMemo(() => {
    const list = Array.isArray(usuariosSetor) ? [...usuariosSetor] : [];
    if (formData.responsavel_id && !list.find(u => u.id === formData.responsavel_id)) {
      list.unshift({ id: formData.responsavel_id, nome: formData.responsavel_nome || 'Responsável atual' });
    }
    return list;
  }, [usuariosSetor, formData.responsavel_id, formData.responsavel_nome]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error('Você não tem permissão para editar tarefas');
      return;
    }

    if (!tarefa?.id) {
      toast.error('Tarefa inválida. Feche e abra novamente.');
      return;
    }

    if (!formData.titulo?.trim()) {
      toast.error('Informe o título da tarefa');
      return;
    }

    setLoading(true);
    setSavingError(false);

    try {
      const updateData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao,
        setor: formData.setor,
        responsavel_id: formData.responsavel_id || null,
        responsavel_nome: formData.responsavel_nome || null,
        prazo: formData.prazo || null,
        prioridade: formData.prioridade || 'media',
        usuario_id: user?.id || 'unknown',
        usuario_nome: user?.nome || 'Usuário',
        usuario_setor: user?.setor || 'Geral',
        usuario_role: user?.role || 'operador',
      };

      await atualizarTarefa(tarefa.id, updateData);

      toast.success('Tarefa atualizada com sucesso');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating task:', err);
      setSavingError(true);
      toast.error('Erro ao atualizar tarefa');
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={20} className="text-blue-600" />
            Editar Tarefa
          </DialogTitle>
          <DialogDescription>
            Edite os dados da tarefa. Alterações serão registradas no histórico.
          </DialogDescription>
        </DialogHeader>

        {savingError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span>Não foi possível salvar. Tente novamente.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Setor</Label>
                <Select
                  value={formData.setor}
                  onValueChange={(value) => {
                    handleChange('setor', value);
                    handleChange('responsavel_id', '');
                    handleChange('responsavel_nome', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.cor }} />
                          {dept.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Responsável</Label>
                <Select
                  value={formData.responsavel_id || ''}
                  onValueChange={(value) => {
                    const usuario = responsavelOptions.find((u) => u.id === value);
                    handleChange('responsavel_id', value);
                    handleChange('responsavel_nome', usuario?.nome || '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsuarios ? 'Carregando...' : 'Selecione...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {responsavelOptions.length === 0 && (
                      <SelectItem value="__vazio" disabled>
                        {formData.setor ? 'Nenhum usuário no setor' : 'Selecione um setor'}
                      </SelectItem>
                    )}
                    {responsavelOptions.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.cor }} />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          <DialogFooter className="mt-4">
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
