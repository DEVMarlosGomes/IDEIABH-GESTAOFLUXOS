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
import './FinalizarTarefaModal.css';

const FinalizarTarefaModal = ({ isOpen, onClose, tarefa, onSuccess, contratoSelecionadoId = null }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [observacao, setObservacao] = useState('');
  const contratoNumero = tarefa?.contrato_numero || tarefa?.contrato_id || '-';
  const contratoCliente = tarefa?.contrato_cliente || 'Cliente nao informado';
  const contratoFaculdade = tarefa?.contrato_faculdade || 'Faculdade nao informada';
  const contratoCurso = tarefa?.contrato_curso || null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await finalizarTarefa(tarefa.id, {
        observacao: observacao.trim() || null,
        usuario_id: user?.id || 'unknown',
        usuario_nome: user?.nome || 'Usuário',
        usuario_setor: user?.setor || 'Geral',
        usuario_role: user?.role || 'operador',
        contrato_id_selecionado: contratoSelecionadoId || tarefa?.contrato_id || null,
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
      <DialogContent className="finalizar-tarefa-modal sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Finalizar Tarefa
          </DialogTitle>
          <DialogDescription>
            Você está finalizando a tarefa: <strong>{tarefa?.titulo}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="finalizar-form">
          <div className="finalizar-body">
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
                <div><strong>Contrato:</strong> {contratoNumero}</div>
                <div><strong>Cliente:</strong> {contratoCliente}</div>
                <div><strong>Faculdade:</strong> {contratoFaculdade}</div>
                {contratoCurso && <div><strong>Curso:</strong> {contratoCurso}</div>}
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
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Descreva como a tarefa foi concluída, se quiser registrar algo importante..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Esse campo é opcional e será registrado no histórico apenas se preenchido.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="finalizar-footer">
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
