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
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuth } from '../context/AuthContext';
import { finalizarTarefa } from '../services/api';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const FinalizarTarefaModal = ({ isOpen, onClose, tarefa, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [observacao, setObservacao] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!observacao.trim()) {
      setError('A observação é obrigatória para finalizar a tarefa');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await finalizarTarefa(tarefa.id, {
        observacao: observacao.trim(),
        usuario_id: user?.id || 'unknown',
        usuario_nome: user?.nome || 'Usuário',
        usuario_setor: user?.setor || 'Geral',
        usuario_role: user?.role || 'operador',
      });
      
      setObservacao('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error finalizing task:', err);
      setError(err.response?.data?.detail || 'Erro ao finalizar tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Finalizar Tarefa
          </DialogTitle>
          <DialogDescription>
            Você está finalizando a tarefa: <strong>{tarefa?.titulo}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="py-4">
            {/* Info da tarefa */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
              <div><strong>Setor:</strong> {tarefa?.setor}</div>
              <div><strong>Responsável:</strong> {tarefa?.responsavel_nome || 'Não definido'}</div>
              <div><strong>Criada por:</strong> {tarefa?.criado_por_nome} ({tarefa?.criado_por_setor})</div>
              {tarefa?.prazo && (
                <div><strong>Prazo:</strong> {new Date(tarefa.prazo).toLocaleDateString('pt-BR')}</div>
              )}
              {tarefa?.atrasada && (
                <div className="text-red-600 font-medium">
                  Atraso: {tarefa.dias_atraso} dias
                </div>
              )}
            </div>

            {/* Observação */}
            <div className="grid gap-2">
              <Label htmlFor="observacao">Observação *</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Descreva como a tarefa foi concluída, o que foi feito, observações importantes..."
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                A observação é obrigatória e ficará registrada no histórico da tarefa.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar Tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FinalizarTarefaModal;
