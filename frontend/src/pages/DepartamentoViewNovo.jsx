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
  FileText,
  UserPlus
} from 'lucide-react';
import { DEPARTAMENTOS } from '../data/mockNovo';
import { useAuth } from '../context/AuthContext';
import { 
  getTarefas,
  finalizarTarefa,
  criarNotificacao,
  listarUsuariosSetor
} from '../services/api';
import AtribuirTarefaModal from '../components/AtribuirTarefaModal';
import { toast } from 'sonner';
import './DepartamentoView.css';

const DepartamentoViewNovo = ({ departamento }) => {
  const { user } = useAuth();
  
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipeUsuarios, setEquipeUsuarios] = useState([]);
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [atribuirModalAberto, setAtribuirModalAberto] = useState(false);
  const [tarefaParaAtribuir, setTarefaParaAtribuir] = useState(null);
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

  const normalizeSetor = (setor) => {
    if (!setor) return '';
    const key = setor.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
    const setorMap = {
      'atendimento': 'atendimento',
      'criacao': 'criacao',
      'criação': 'criacao',
      'preproducao': 'pre-producao',
      'préproducao': 'pre-producao',
      'pre-producao': 'pre-producao',
      'pré-produção': 'pre-producao',
      'producao': 'producao',
      'produção': 'producao',
    };
    return setorMap[key] || setor;
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { 
        setor: departamento,
        finalizada: false,
        usuario_role: user?.role,
        usuario_setor: user?.setor,
        usuario_id: user?.id
      };
      
      const departamentoNorm = (departamento || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (
        user?.role === 'operador' &&
        ['atendimento', 'criacao'].includes(departamentoNorm)
      ) {
        filters.responsavel_id = user?.id;
      }

      const tarefasData = await getTarefas(filters);
      
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

  const loadEquipe = useCallback(async () => {
    if (!user?.role) return;
    try {
      const setor = normalizeSetor(departamento);
      if (!setor) {
        setEquipeUsuarios([]);
        return;
      }
      const usuarios = await listarUsuariosSetor(
        setor,
        user.role,
        user.role === 'gerente' ? normalizeSetor(user.setor) : undefined
      );
      setEquipeUsuarios(usuarios || []);
    } catch (err) {
      setEquipeUsuarios([]);
    }
  }, [departamento, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadEquipe();
  }, [loadEquipe]);

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
    // Verificar se operador pode finalizar esta tarefa (apenas seu próprio setor)
    if (user?.role === 'operador') {
      const userSetor = user?.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      const tarefaSetor = tarefa.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      
      // Normalizar nomes de setores
      const setorMap = {
        'atendimento': 'atendimento',
        'criacao': 'criacao',
        'criação': 'criacao',
        'preproducao': 'pre-producao',
        'préproducao': 'pre-producao',
        'producao': 'producao',
        'produção': 'producao',
      };
      
      const userSetorNorm = setorMap[userSetor] || userSetor;
      const tarefaSetorNorm = setorMap[tarefaSetor] || tarefaSetor;
      
      if (userSetorNorm !== tarefaSetorNorm) {
        toast.error(`Você só pode finalizar tarefas do seu setor (${user?.setor}). Esta tarefa é do setor ${tarefa.setor}.`);
        return;
      }
    }
    
    // Verificar se é o responsável ou admin/gerente
    if (tarefa.responsavel_id && tarefa.responsavel_id !== user?.id && !['admin', 'gerente'].includes(user?.role)) {
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

  const handleAbrirAtribuir = (tarefa) => {
    // Verificar permissão - apenas admin ou gerente podem atribuir
    if (!['admin', 'gerente'].includes(user?.role)) {
      toast.error('Apenas administradores e gerentes podem atribuir tarefas');
      return;
    }

    // Verificar se gerente está tentando atribuir fora de seu setor
    if (user?.role === 'gerente') {
      const userSetor = user?.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      const tarefaSetor = tarefa.setor?.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
      
      const setorMap = {
        'atendimento': 'atendimento',
        'criacao': 'criacao',
        'criação': 'criacao',
        'preproducao': 'pre-producao',
        'préproducao': 'pre-producao',
        'producao': 'producao',
        'produção': 'producao',
      };
      
      const userSetorNorm = setorMap[userSetor] || userSetor;
      const tarefaSetorNorm = setorMap[tarefaSetor] || tarefaSetor;
      
      if (userSetorNorm !== tarefaSetorNorm) {
        toast.error(`Gerentes só podem atribuir tarefas de seu setor (${user?.setor})`);
        return;
      }
    }

    setTarefaParaAtribuir(tarefa);
    setAtribuirModalAberto(true);
  };

  const handleAtribuicaoSucesso = () => {
    toast.success('Tarefa atribuída com sucesso!');
    loadData(); // Recarregar tarefas
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
        usuario_setor: user?.setor || 'desconhecido',
        usuario_role: user?.role || 'operador',
        contrato_id_selecionado: tarefaSelecionada?.contrato_id || null
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
        <span className="status-badge status-atrasado">
          <AlertTriangle size={12} />
          {tarefa.dias_atraso} dias atrasado
        </span>
      );
    }

    const colors = {
      'Pendente': 'status-pendente',
      'Em Andamento': 'status-ativo',
      'Aguardando': 'status-aguardando',
      'Concluído': 'status-concluido'
    };

    return (
      <span className={`status-badge ${colors[tarefa.status_nome] || 'status-pendente'}`}>
        {tarefa.status_nome}
      </span>
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
            className="departamento-header p-6 rounded-lg mb-6"
            style={{ backgroundColor: deptInfo.cor + '15', borderLeft: `4px solid ${deptInfo.cor}` }}
          >
            <h1 className="departamento-title" style={{ color: deptInfo.cor }}>
              {deptInfo.nome}
            </h1>
            {deptInfo.descricao && (
              <p className="departamento-description">{deptInfo.descricao}</p>
            )}
            {equipeUsuarios.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {equipeUsuarios.map((usuario) => (
                  <Badge key={usuario.id} variant="outline" className="badge membro-badge">
                    <User size={12} className="mr-1" />
                    {usuario.nome}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="departamento-stats">
            <div className="stat-item">
              <div>
                <span className="stat-label">Total</span>
                <span className="stat-value">{stats.total}</span>
              </div>
              <FileText size={32} className="stat-icon stat-icon-primary" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Pendentes</span>
                <span className="stat-value">{stats.pendentes}</span>
              </div>
              <Clock size={32} className="stat-icon stat-icon-muted" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Em Andamento</span>
                <span className="stat-value">{stats.emAndamento}</span>
              </div>
              <Play size={32} className="stat-icon stat-icon-primary" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Atrasadas</span>
                <span className="stat-value">{stats.atrasadas}</span>
              </div>
              <AlertTriangle size={32} className="stat-icon stat-icon-danger" />
            </div>
            
            <div className="stat-item">
              <div>
                <span className="stat-label">Prazo Médio</span>
                <span className="stat-value">{stats.prazoMedio} dias</span>
              </div>
              <TrendingUp size={32} className="stat-icon stat-icon-success" />
            </div>
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
                      
                      <div className="ml-4 flex gap-2">
                        {['admin', 'gerente'].includes(user?.role) && (
                          <Button
                            onClick={() => handleAbrirAtribuir(tarefa)}
                            variant="outline"
                            className="btn-ghost btn-ghost-blue"
                          >
                            <UserPlus size={16} className="mr-2" />
                            Atribuir
                          </Button>
                        )}
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

        {/* Modal de Atribuição de Tarefa */}
        <AtribuirTarefaModal
          isOpen={atribuirModalAberto}
          onClose={() => {
            setAtribuirModalAberto(false);
            setTarefaParaAtribuir(null);
          }}
          tarefa={tarefaParaAtribuir}
          onSuccess={handleAtribuicaoSucesso}
        />
      </div>
    </LayoutNovo>
  );
};

export default DepartamentoViewNovo;

