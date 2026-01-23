import React, { useState, useEffect, useCallback } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  ChevronRight,
  Loader2,
  Check,
  Play,
  TrendingUp,
  FileText
} from 'lucide-react';
import { DEPARTAMENTOS } from '../data/mockNovo';
import { useAuth } from '../context/AuthContext';
import { 
  getTarefas,
  finalizarTarefa,
  criarNotificacao
} from '../services/api';
import { toast } from 'sonner';
import './DepartamentoView.css';

const DepartamentoViewNovo = ({ departamento }) => {
  const { user } = useAuth();
  
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    observacao: '',
    dificuldades: '',
    tempo_gasto: '',
    qualidade_entrega: 'boa',
    proximos_passos: ''
  });

  // Info do departamento
  const deptInfo = Object.values(DEPARTAMENTOS).find(d => d.id === departamento) || {
    id: departamento,
    nome: 'Departamento',
    cor: '#3b82f6',
    equipe: [],
    descricao: ''
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tarefasData = await getTarefas({ 
        setor: departamento,
        finalizada: false 
      });
      
      // Ordenar por prazo
      const sorted = tarefasData.sort((a, b) => {
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return new Date(a.prazo) - new Date(b.prazo);
      });
      
      setTarefas(sorted);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [departamento]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Estatísticas
  const stats = {
    total: tarefas.length,
    pendentes: tarefas.filter(t => t.status_nome === 'Pendente').length,
    emAndamento: tarefas.filter(t => t.status_nome === 'Em Andamento').length,
    atrasadas: tarefas.filter(t => t.atrasada).length,
    prazoMedio: Math.round(
      tarefas.reduce((acc, t) => {
        if (t.prazo) {
          const dias = Math.ceil((new Date(t.prazo) - new Date()) / (1000 * 60 * 60 * 24));
          return acc + dias;
        }
        return acc;
      }, 0) / (tarefas.length || 1)
    )
  };

  const handleAbrirFinalizar = (tarefa) => {
    // Verificar se é o responsável ou admin
    if (tarefa.responsavel_id && tarefa.responsavel_id !== user?.id && user?.role !== 'admin') {
      toast.error('Apenas o responsável pode finalizar esta tarefa');
      return;
    }
    
    setTarefaSelecionada(tarefa);
    setFeedbackForm({
      observacao: '',
      dificuldades: '',
      tempo_gasto: '',
      qualidade_entrega: 'boa',
      proximos_passos: ''
    });
    setFinalizarModal(true);
  };

  const handleFinalizar = async () => {
    // Validação
    if (!feedbackForm.observacao || feedbackForm.observacao.length < 10) {
      toast.error('Por favor, descreva como foi a execução da tarefa (mínimo 10 caracteres)');
      return;
    }

    if (!feedbackForm.dificuldades) {
      toast.error('Por favor, informe se houve dificuldades ou escreva "Nenhuma"');
      return;
    }

    try {
      setFinalizando(true);
      
      // Montar observação completa
      const observacaoCompleta = `
EXECUÇÃO DA TAREFA:
${feedbackForm.observacao}

DIFICULDADES ENCONTRADAS:
${feedbackForm.dificuldades}

TEMPO GASTO:
${feedbackForm.tempo_gasto || 'Não informado'}

QUALIDADE DA ENTREGA:
${feedbackForm.qualidade_entrega}

PRÓXIMOS PASSOS SUGERIDOS:
${feedbackForm.proximos_passos || 'Nenhum'}

---
Finalizado por: ${user?.nome || user?.username}
Data: ${new Date().toLocaleString('pt-BR')}
      `.trim();

      // Finalizar tarefa
      await finalizarTarefa(tarefaSelecionada.id, {
        observacao: observacaoCompleta,
        usuario_id: user?.id || 'sistema',
        usuario_nome: user?.nome || user?.username || 'Sistema',
        usuario_setor: departamento
      });

      // Buscar próxima tarefa do projeto
      const tarefasDoProjeto = tarefas.filter(t => 
        t.projeto_id === tarefaSelecionada.projeto_id && 
        !t.finalizada &&
        t.id !== tarefaSelecionada.id
      );

      // Se houver próxima tarefa e tiver responsável, notificar
      if (tarefasDoProjeto.length > 0) {
        const proximaTarefa = tarefasDoProjeto[0];
        if (proximaTarefa.responsavel_id) {
          try {
            await criarNotificacao({
              tipo: 'finalizacao',
              titulo: 'Nova etapa disponível',
              mensagem: `A etapa "${tarefaSelecionada.titulo}" foi finalizada. A tarefa "${proximaTarefa.titulo}" está aguardando sua ação.`,
              de_usuario_id: user?.id || 'sistema',
              de_usuario_nome: user?.nome || user?.username || 'Sistema',
              para_usuario_id: proximaTarefa.responsavel_id,
              para_usuario_nome: proximaTarefa.responsavel_nome,
              tarefa_id: proximaTarefa.id,
              projeto_id: proximaTarefa.projeto_id
            });
          } catch (err) {
            console.log('Erro ao notificar próximo responsável:', err);
          }
        }
      }

      toast.success(
        <div>
          <p className="font-semibold">Tarefa finalizada com sucesso!</p>
          <p className="text-sm">O feedback foi registrado no histórico</p>
        </div>
      );

      setFinalizarModal(false);
      setTarefaSelecionada(null);
      loadData(); // Recarregar tarefas
    } catch (error) {
      console.error('Erro ao finalizar tarefa:', error);
      toast.error('Erro ao finalizar tarefa');
    } finally {
      setFinalizando(false);
    }
  };

  const getStatusBadge = (tarefa) => {
    if (tarefa.atrasada) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <AlertTriangle size={12} className="mr-1" />
          {tarefa.dias_atraso} dias atrasado
        </Badge>
      );
    }
    
    const colors = {
      'Pendente': 'bg-gray-100 text-gray-800',
      'Em Andamento': 'bg-blue-100 text-blue-800',
      'Aguardando': 'bg-yellow-100 text-yellow-800',
      'Concluído': 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={colors[tarefa.status_nome] || 'bg-gray-100 text-gray-800'}>
        {tarefa.status_nome}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin" size={48} />
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="departamento-container p-6">
        {/* Header */}
        <div className="mb-6">
          <div 
            className="department-header p-6 rounded-lg mb-6"
            style={{ backgroundColor: deptInfo.cor + '15', borderLeft: `4px solid ${deptInfo.cor}` }}
          >
            <h1 className="text-3xl font-bold mb-2" style={{ color: deptInfo.cor }}>
              {deptInfo.nome}
            </h1>
            {deptInfo.descricao && (
              <p className="text-gray-600">{deptInfo.descricao}</p>
            )}
            {deptInfo.equipe && deptInfo.equipe.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {deptInfo.equipe.map((membro, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white">
                    <User size={12} className="mr-1" />
                    {membro}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText size={32} className="text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.pendentes}</p>
                  </div>
                  <Clock size={32} className="text-gray-400 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Em Andamento</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.emAndamento}</p>
                  </div>
                  <Play size={32} className="text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Atrasadas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.atrasadas}</p>
                  </div>
                  <AlertTriangle size={32} className="text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Prazo Médio</p>
                    <p className="text-2xl font-bold text-green-600">{stats.prazoMedio} dias</p>
                  </div>
                  <TrendingUp size={32} className="text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 size={20} />
              Tarefas do Departamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tarefas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhuma tarefa pendente no momento</p>
                <p className="text-sm mt-2">Parabéns! Todas as tarefas estão concluídas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefas.map((tarefa) => (
                  <div 
                    key={tarefa.id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                      tarefa.atrasada ? 'bg-red-50 border-red-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{tarefa.titulo}</h3>
                        {tarefa.descricao && (
                          <p className="text-sm text-gray-600 mb-2">{tarefa.descricao}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getStatusBadge(tarefa)}
                          
                          {tarefa.responsavel_nome && (
                            <Badge variant="outline" className="bg-white">
                              <User size={12} className="mr-1" />
                              {tarefa.responsavel_nome}
                            </Badge>
                          )}
                          
                          {tarefa.prazo && (
                            <Badge variant="outline" className="bg-white">
                              <Calendar size={12} className="mr-1" />
                              Prazo: {formatDate(tarefa.prazo)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button
                          onClick={() => handleAbrirFinalizar(tarefa)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check size={16} className="mr-2" />
                          Finalizar Etapa
                        </Button>
                      </div>
                    </div>
                    
                    {/* Timeline de progresso */}
                    {tarefa.historico && tarefa.historico.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500 mb-2">Histórico recente:</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock size={12} />
                          <span>
                            Última atualização: {new Date(tarefa.atualizado_em).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Finalizar */}
        <Dialog open={finalizarModal} onOpenChange={setFinalizarModal}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" />
                Finalizar Etapa - Feedback Obrigatório
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Info da tarefa */}
                {tarefaSelecionada && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">{tarefaSelecionada.titulo}</h4>
                    {tarefaSelecionada.descricao && (
                      <p className="text-sm text-blue-800">{tarefaSelecionada.descricao}</p>
                    )}
                  </div>
                )}
                
                {/* Formulário de feedback */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">
                      Como foi a execução desta tarefa? *
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Descreva o que foi realizado, resultados obtidos e qualquer informação relevante
                    </p>
                    <Textarea
                      rows={4}
                      value={feedbackForm.observacao}
                      onChange={(e) => setFeedbackForm({...feedbackForm, observacao: e.target.value})}
                      placeholder="Exemplo: Realizei a reunião com a comissão, apresentei 3 propostas de layout e a comissão aprovou a proposta 2 com pequenas alterações nas cores..."
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {feedbackForm.observacao.length} caracteres (mínimo 10)
                    </p>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Houve alguma dificuldade ou impedimento? *
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Relate problemas encontrados ou escreva "Nenhuma" se não houve
                    </p>
                    <Textarea
                      rows={3}
                      value={feedbackForm.dificuldades}
                      onChange={(e) => setFeedbackForm({...feedbackForm, dificuldades: e.target.value})}
                      placeholder="Exemplo: Dificuldade em contactar um membro da comissão / Nenhuma dificuldade"
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Tempo gasto (opcional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Quanto tempo levou para concluir esta etapa?
                    </p>
                    <input
                      type="text"
                      value={feedbackForm.tempo_gasto}
                      onChange={(e) => setFeedbackForm({...feedbackForm, tempo_gasto: e.target.value})}
                      placeholder="Exemplo: 2 horas / 1 dia / 3 horas distribuídas em 2 dias"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Qualidade da entrega
                    </Label>
                    <select
                      value={feedbackForm.qualidade_entrega}
                      onChange={(e) => setFeedbackForm({...feedbackForm, qualidade_entrega: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md mt-2"
                    >
                      <option value="excelente">Excelente - Superou expectativas</option>
                      <option value="boa">Boa - Atendeu plenamente</option>
                      <option value="satisfatoria">Satisfatória - Atendeu minimamente</option>
                      <option value="insatisfatoria">Insatisfatória - Precisa revisão</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Próximos passos ou recomendações (opcional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Sugestões para o próximo responsável ou melhorias no processo
                    </p>
                    <Textarea
                      rows={3}
                      value={feedbackForm.proximos_passos}
                      onChange={(e) => setFeedbackForm({...feedbackForm, proximos_passos: e.target.value})}
                      placeholder="Exemplo: Recomendo que o próximo responsável verifique os arquivos na pasta X antes de iniciar..."
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setFinalizarModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalizar}
                disabled={finalizando}
                className="bg-green-600 hover:bg-green-700"
              >
                {finalizando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finalizar Etapa
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutNovo>
  );
};

export default DepartamentoViewNovo;
