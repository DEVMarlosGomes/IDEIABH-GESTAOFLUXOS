import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  History,
  Plus,
  Edit,
  CheckCircle2,
  RefreshCw,
  User,
  Building2,
  Calendar,
  MessageSquare,
  GitBranch,
  Clock,
  ArrowRight
} from 'lucide-react';
import { TODAS_ETAPAS, DEPARTAMENTOS } from '../data/mockNovo';

const ACAO_CONFIG = {
  criada: { icon: Plus, cor: '#3b82f6', label: 'Criada' },
  atualizada: { icon: Edit, cor: '#f59e0b', label: 'Atualizada' },
  finalizada: { icon: CheckCircle2, cor: '#10b981', label: 'Finalizada' },
  status_alterado: { icon: RefreshCw, cor: '#8b5cf6', label: 'Status Alterado' },
};

const HistoricoModal = ({ isOpen, onClose, tarefa }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const historico = tarefa?.historico || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico da Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800">{tarefa?.titulo}</h4>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Building2 size={14} />
              {tarefa?.setor}
            </span>
            <span className="flex items-center gap-1">
              <User size={14} />
              {tarefa?.criado_por_nome}
            </span>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {historico.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History size={40} className="mx-auto mb-2 opacity-30" />
              <p>Nenhum registro no histórico</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((item, index) => {
                const config = ACAO_CONFIG[item.acao] || ACAO_CONFIG.atualizada;
                const Icon = config.icon;

                return (
                  <div key={item.id || index} className="relative pl-8 pb-4">
                    {/* Timeline line */}
                    {index < historico.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    
                    {/* Icon */}
                    <div 
                      className="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: config.cor }}
                    >
                      <Icon size={14} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge style={{ backgroundColor: `${config.cor}20`, color: config.cor }}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(item.data)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span><strong>{item.usuario_nome}</strong></span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{item.setor}</span>
                        </div>

                        {item.detalhes && (
                          <p className="text-gray-700 mt-2">{item.detalhes}</p>
                        )}

                        {item.observacao && (
                          <div className="mt-2 p-2 bg-gray-50 rounded flex gap-2">
                            <MessageSquare size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700">{item.observacao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoModal;
