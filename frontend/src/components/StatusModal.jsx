import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { criarStatusTarefa } from '../services/api';
import { Loader2, AlertCircle, Plus } from 'lucide-react';

const CORES_PREDEFINIDAS = [
  '#94a3b8', // Cinza
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#f59e0b', // Amarelo
  '#ef4444', // Vermelho
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#f97316', // Laranja
  '#14b8a6', // Teal
];

const StatusModal = ({ isOpen, onClose, onSuccess, statusList }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cor: '#3b82f6',
    ordem: (statusList?.length || 0) + 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      setError('O nome do status é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await criarStatusTarefa(formData, user?.role || 'admin', user?.id || 'unknown');
      
      setFormData({
        nome: '',
        cor: '#3b82f6',
        ordem: (statusList?.length || 0) + 2,
      });
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error creating status:', err);
      setError(err.response?.data?.detail || 'Erro ao criar status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Status
          </DialogTitle>
          <DialogDescription>
            Crie um novo status personalizado para as tarefas.
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
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome do Status *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Em Revisão"
                required
              />
            </div>

            {/* Cor */}
            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cor }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.cor === cor 
                        ? 'border-gray-800 scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="cor-custom" className="text-sm">Ou escolha:</Label>
                <Input
                  id="cor-custom"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="w-12 h-8 p-0 border-0"
                />
                <span className="text-sm text-gray-500">{formData.cor}</span>
              </div>
            </div>

            {/* Ordem */}
            <div className="grid gap-2">
              <Label htmlFor="ordem">Ordem de exibição</Label>
              <Input
                id="ordem"
                type="number"
                min="1"
                value={formData.ordem}
                onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {/* Preview */}
            <div className="grid gap-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: formData.cor }}
                >
                  {formData.nome || 'Nome do Status'}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StatusModal;
