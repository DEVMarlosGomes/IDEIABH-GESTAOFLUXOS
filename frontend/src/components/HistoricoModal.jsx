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
  const [projetoInfo, setProjetoInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('historico');

  useEffect(() => {
    if (tarefa?.projeto_id) {
      // Buscar informações do projeto - aqui você pode adicionar uma chamada à API
      // Por enquanto, vamos usar dados mock
      const mockProjeto = {
        id: tarefa.projeto_id,
        cliente: tarefa.projeto_cliente || 'Cliente',
        instituicao: tarefa.projeto_instituicao || 'Instituição',
        etapa_atual: tarefa.setor,
        progresso: 60,
        historico_etapas: [
          { 
            departamento: 'atendimento', 
            etapa: 'Briefing Inicial',
            data_inicio: '2024-01-15',
            data_conclusao: '2024-01-20',
            responsavel: 'Maria Silva',
            status: 'concluida'
          },
          { 
            departamento: 'criacao', 
            etapa: 'Desenvolvimento Criativo',
            data_inicio: '2024-01-21',
            data_conclusao: null,
            responsavel: 'João Santos',
            status: 'em_andamento'
          }
        ]
      };
      setProjetoInfo(mockProjeto);
    }
  }, [tarefa]);

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

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const historico = tarefa?.historico || [];

  // Obter todas as etapas do fluxo de trabalho ordenadas
  const getFluxoCompleto = () => {
    const departamentos = ['atendimento', 'criacao', 'pre-producao', 'producao'];
    const fluxo = [];
    
    departamentos.forEach(dept => {
      const etapasDept = TODAS_ETAPAS.filter(e => e.departamento === dept);
      etapasDept.forEach(etapa => {
        fluxo.push({
          ...etapa,
          departamentoInfo: DEPARTAMENTOS[dept.toUpperCase().replace('-', '_')],
          concluida: false,
          emAndamento: etapa.departamento === tarefa?.setor
        });
      });
    });

    return fluxo;
  };

  const fluxoCompleto = getFluxoCompleto();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico & Processo
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">{tarefa?.titulo}</h4>
          <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History size={16} />
              Histórico da Tarefa
            </TabsTrigger>
            <TabsTrigger value="processo" className="flex items-center gap-2">
              <GitBranch size={16} />
              Fluxo do Projeto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="mt-4">
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
                          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                        )}
                        
                        {/* Icon */}
                        <div 
                          className="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: config.cor }}
                        >
                          <Icon size={14} className="text-white" />
                        </div>

                        {/* Content */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge style={{ backgroundColor: `${config.cor}20`, color: config.cor }}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(item.data)}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span><strong>{item.usuario_nome}</strong></span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500 dark:text-gray-400">{item.setor}</span>
                            </div>

                            {item.detalhes && (
                              <p className="text-gray-700 dark:text-gray-300 mt-2">{item.detalhes}</p>
                            )}

                            {item.observacao && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded flex gap-2">
                                <MessageSquare size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700 dark:text-gray-300">{item.observacao}</p>
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
          </TabsContent>

          <TabsContent value="processo" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {Object.entries(
                  fluxoCompleto.reduce((acc, etapa) => {
                    const deptKey = etapa.departamento;
                    if (!acc[deptKey]) acc[deptKey] = [];
                    acc[deptKey].push(etapa);
                    return acc;
                  }, {})
                ).map(([deptKey, etapas], deptIndex, array) => {
                  const deptInfo = etapas[0].departamentoInfo;
                  const isCurrentDept = deptKey === tarefa?.setor;
                  
                  return (
                    <div key={deptKey} className="relative">
                      {/* Departamento Header */}
                      <div 
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                          isCurrentDept 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: deptInfo?.cor || '#64748b' }}
                        >
                          <Building2 size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            {deptInfo?.nome || deptKey}
                            {isCurrentDept && (
                              <Badge variant="default" className="bg-blue-600">
                                <Clock size={12} className="mr-1" />
                                Em Andamento
                              </Badge>
                            )}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {etapas.length} etapa(s) neste departamento
                          </p>
                        </div>
                      </div>

                      {/* Etapas do Departamento */}
                      <div className="ml-8 mt-3 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                        {etapas.map((etapa, etapaIndex) => (
                          <div 
                            key={etapa.id}
                            className={`p-3 rounded-lg border ${
                              etapa.emAndamento
                                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {etapa.concluida ? (
                                    <CheckCircle2 size={16} className="text-green-600" />
                                  ) : etapa.emAndamento ? (
                                    <Clock size={16} className="text-blue-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                                  )}
                                  <span className={`text-sm font-medium ${
                                    etapa.emAndamento 
                                      ? 'text-blue-700 dark:text-blue-400' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {etapa.nome}
                                  </span>
                                </div>
                                {etapa.descricao && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                                    {etapa.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Arrow to next department */}
                      {deptIndex < array.length - 1 && (
                        <div className="flex justify-center my-2">
                          <ArrowRight size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoModal;
