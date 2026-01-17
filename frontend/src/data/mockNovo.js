// ==========================================
// SISTEMA DE GESTÃO DE FORMATURAS - IDEIABH
// ==========================================

// Definição dos Departamentos
export const DEPARTAMENTOS = {
  ATENDIMENTO: {
    id: 'atendimento',
    nome: 'Atendimento',
    cor: '#3b82f6',
    equipe: ['Ana', 'Larissa', 'Keyla', 'Mickaela'],
    descricao: 'Receber contrato, cadastrar no sistema e fazer o acompanhamento do cliente até a aprovação'
  },
  CRIACAO: {
    id: 'criacao',
    nome: 'Criação',
    cor: '#8b5cf6',
    equipe: ['Taelsei', 'Juliana', 'Clara', 'Suelen', 'Marcus', 'Fagner', 'Ketlen', 'Gabi'],
    descricao: 'Desenvolver a identidade visual e todas as peças gráficas do convite'
  },
  PRE_PRODUCAO: {
    id: 'pre-producao',
    nome: 'Pré-Produção',
    cor: '#f59e0b',
    equipe: ['Carlos', 'Emanuel'],
    descricao: 'Preparar arquivos e materiais para impressão'
  },
  PRODUCAO: {
    id: 'producao',
    nome: 'Produção/Entrega',
    cor: '#10b981',
    equipe: ['Ricardo'],
    descricao: 'Produção física dos convites e controle de entrega'
  }
};

// Função auxiliar para calcular datas
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toISOString().split('T')[0];
};

// Definição das Etapas de ATENDIMENTO
export const ETAPAS_ATENDIMENTO = [
  {
    id: 1,
    nome: 'Informar recebimento do contrato',
    departamento: 'atendimento',
    prazo_dias: 0, // No mesmo dia
    descricao: 'Informar que recebeu o contrato - No mesmo dia que receber',
    tipo: 'simples',
    requer_interacao: false
  },
  {
    id: 2,
    nome: 'Ativar contrato no site',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: '1 dia após receber o contrato',
    tipo: 'simples',
    requer_interacao: false
  },
  {
    id: 3,
    nome: '1º contato com a comissão',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: '1 dia após receber o contrato',
    tipo: 'simples',
    requer_interacao: false
  },
  {
    id: 4,
    nome: 'Reunião de atendimento',
    departamento: 'atendimento',
    prazo_dias: 15, // 15 dias após o primeiro contato
    descricao: '15 dias após o primeiro contato com a comissão',
    tipo: 'interacao',
    requer_interacao: true,
    interacao_com: ['criacao'],
    campo_interacao: 'Atendimento e Criação devem estar cientes sobre a marcação da reunião'
  },
  {
    id: 5,
    nome: 'Envio do questionário de criação',
    departamento: 'atendimento',
    prazo_dias: 1, // 1 dia após reunião
    descricao: '1 dia após a reunião de atendimento',
    tipo: 'simples',
    requer_interacao: false
  },
  {
    id: 6,
    nome: 'Recebimento do questionário preenchido',
    departamento: 'atendimento',
    prazo_dias: 60, // 2 meses
    descricao: 'Receber questionário preenchido pela comissão',
    tipo: 'complexo',
    requer_justificativa: true,
    lembretes: [
      { dias_antes: 1, mensagem: 'Cobrar questionário da comissão' },
      { dias_antes: 0, mensagem: 'Enviar questionário para Criação' },
      { tipo: 'semanal', mensagem: 'Lembrete semanal até 1 semana antes da entrega de textos' }
    ],
    requer_interacao: true,
    interacao_com: ['criacao'],
    campo_interacao: 'Criação confirma recebimento do questionário'
  },
  {
    id: 7,
    nome: 'Envio do e-mail de layout de fotos',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: '1 dia após a reunião de atendimento',
    tipo: 'interacao',
    requer_interacao: true,
    interacao_com: ['criacao'],
    campo_interacao: 'Criação confirma recebimento do layout de fotos'
  },
  {
    id: 8,
    nome: 'Enviar layout para comissão',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: 'Após receber documento da Criação',
    tipo: 'dependente',
    depende_de: 'criacao_layout_fotos'
  },
  {
    id: 9,
    nome: 'Agendar reunião de criação',
    departamento: 'atendimento',
    prazo_dias: -10, // 10 dias ANTES da entrega de textos
    descricao: '10 dias antes da entrega de textos e fotos',
    tipo: 'interacao',
    requer_interacao: true,
    interacao_com: ['criacao'],
    lembretes: [
      { dias_antes: 1, mensagem: 'Confirmar reunião com cliente' }
    ],
    campo_interacao: 'Atendimento confirma reunião, Criação fica ciente'
  },
  {
    id: 10,
    nome: 'Liberação das fotos para pré-produção',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: '1 dia após recebimento dentro do prazo contratual',
    tipo: 'contratual',
    pode_atrasar_ate: 365 // até 1 ano
  },
  {
    id: 11,
    nome: 'Cadastro de textos/REV1',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: '1 dia após cadastro dentro do prazo contratual',
    tipo: 'contratual',
    pode_atrasar_ate: 365
  },
  {
    id: 12,
    nome: 'Acompanhar aprovação',
    departamento: 'atendimento',
    prazo_dias: 0,
    descricao: 'Fazer cobrança após prazo expirado',
    tipo: 'monitoramento',
    lembretes: [
      { dias_antes: 1, mensagem: 'Site vai fechar amanhã' },
      { dias_antes: 0, mensagem: 'Site fechando hoje' }
    ]
  },
  {
    id: 13,
    nome: 'Aditivo contratual',
    departamento: 'atendimento',
    prazo_dias: 0,
    descricao: 'Se prazo perdido em decorrência de atrasos do cliente',
    tipo: 'condicional',
    lembretes: [
      { dias_antes: 7, mensagem: 'Lembrar comissão sobre prazo de cadastro' }
    ]
  },
  {
    id: 14,
    nome: 'Cobrança e direcionamento à diretoria',
    departamento: 'atendimento',
    prazo_dias: 7,
    descricao: 'Em caso de atraso das etapas dos criadores',
    tipo: 'alerta',
    condicao: 'sem_movimentacao_criacao'
  },
  {
    id: 15,
    nome: 'Envio de e-mail de conferência de lista',
    departamento: 'atendimento',
    prazo_dias: 1,
    descricao: '1 dia após apresentação do convite',
    tipo: 'complexo',
    lembretes: [
      { dias_apos: 3, mensagem: 'Verificar se financeiro retornou' },
      { tipo: 'pendencia', prazo_dias: 7, mensagem: 'Resolver pendências da lista' }
    ]
  },
  {
    id: 16,
    nome: 'Liberação envelope de saída',
    departamento: 'atendimento',
    prazo_dias: 2,
    descricao: 'Liberar para pré-produção',
    tipo: 'simples',
    requer_justificativa: true
  },
  {
    id: 17,
    nome: 'Atualização planilha geral e relatório',
    departamento: 'atendimento',
    prazo_dias: 0,
    descricao: 'Toda quinta-feira até 17h',
    tipo: 'semanal',
    dia_semana: 4, // Quinta-feira
    hora_limite: '17:00',
    lembretes: [
      { dias_antes: 1, mensagem: 'Atualizar planilha amanhã' },
      { dias_antes: 0, mensagem: 'Atualizar planilha hoje até 17h' }
    ],
    destaque: true
  }
];

// Definição das Etapas de CRIAÇÃO
export const ETAPAS_CRIACAO = [
  {
    id: 1,
    nome: 'RC - Reunião de criação',
    departamento: 'criacao',
    prazo_dias: 0,
    descricao: 'Após atendimento agendar',
    tipo: 'interacao',
    lembretes: [
      { tipo: 'agendamento', mensagem: 'Ciente que reunião foi agendada' },
      { dias_antes: 1, mensagem: 'Confirmar reunião amanhã' },
      { dias_antes: 0, mensagem: 'Reunião hoje' }
    ],
    observacao: 'Desmarcar com 1 dia de antecedência e comunicar atendimento'
  },
  {
    id: 2,
    nome: 'Envio do briefing de criação',
    departamento: 'criacao',
    prazo_dias: 2,
    descricao: '2 dias após reunião',
    tipo: 'interacao',
    requer_interacao: true,
    interacao_com: ['atendimento'],
    campo_interacao: 'Atendimento confirma recebimento do documento'
  },
  {
    id: 3,
    nome: 'Layout de Fotos',
    departamento: 'criacao',
    prazo_dias: 3,
    descricao: '3 dias após receber solicitação do atendimento',
    tipo: 'dependente',
    depende_de: 'atendimento_solicita_layout'
  },
  {
    id: 4,
    nome: 'Arte da Camisa',
    departamento: 'criacao',
    prazo_dias: 3,
    descricao: '3 dias após receber solicitação (quando aplicável)',
    tipo: 'condicional',
    depende_de: 'atendimento_solicita_camisa'
  },
  {
    id: 5,
    nome: 'Textos cadastrados - Notificação',
    departamento: 'criacao',
    prazo_dias: 0,
    descricao: 'Ficar ciente que textos foram cadastrados e revisados',
    tipo: 'notificacao',
    campo_informativo: true
  },
  {
    id: 6,
    nome: 'Recebimento das fotos da pré',
    departamento: 'criacao',
    prazo_dias: 0,
    descricao: 'Ficar ciente que fotos estão recortadas',
    tipo: 'notificacao',
    campo_informativo: true
  },
  {
    id: 7,
    nome: 'Início da criação do convite',
    departamento: 'criacao',
    prazo_dias: 10,
    descricao: '10 dias após entrega de textos e fotos',
    tipo: 'inicio_projeto',
    observacao: 'Se prazos diferentes, iniciar com os textos'
  },
  {
    id: 8,
    nome: 'Dias de criação do convite',
    departamento: 'criacao',
    prazo_dias: 3,
    descricao: '3 dias para criar',
    tipo: 'producao'
  },
  {
    id: 9,
    nome: 'Correções',
    departamento: 'criacao',
    prazo_dias: 3,
    descricao: '3 dias após liberar site para correções',
    tipo: 'revisao'
  },
  {
    id: 10,
    nome: 'Liberação demais peças',
    departamento: 'criacao',
    prazo_dias: 0,
    descricao: 'Informar liberação após aprovação CDC',
    tipo: 'notificacao'
  },
  {
    id: 11,
    nome: 'Miolo do convite aprovado',
    departamento: 'criacao',
    prazo_dias: 1,
    descricao: 'Informar que miolo está totalmente aprovado',
    tipo: 'marco'
  },
  {
    id: 12,
    nome: 'Capa aprovada',
    departamento: 'criacao',
    prazo_dias: 1,
    descricao: 'Informar aprovação da capa',
    tipo: 'marco'
  },
  {
    id: 13,
    nome: 'Demais Peças',
    departamento: 'criacao',
    prazo_dias: 3,
    descricao: 'Caixas, tags, folders, etc.',
    tipo: 'dependente',
    depende_de: 'capa_aprovada'
  },
  {
    id: 14,
    nome: 'Aprovação páginas individuais',
    departamento: 'criacao',
    prazo_dias: 0,
    descricao: 'Após aprovação CDC',
    tipo: 'dependente',
    depende_de: 'cdc_aprovada'
  },
  {
    id: 15,
    nome: 'Revisão - REV',
    departamento: 'criacao',
    prazo_dias: 1,
    descricao: '1 dia após miolo totalmente aprovado',
    tipo: 'revisao_final'
  },
  {
    id: 16,
    nome: 'Saída - Finalização',
    departamento: 'criacao',
    prazo_dias: 3,
    descricao: '3 dias após convite totalmente aprovado',
    tipo: 'finalizacao',
    campo_pendencias: true,
    observacao: 'Informar se cortesias ficaram pendentes'
  }
];

// Definição das Etapas de PRÉ-PRODUÇÃO
export const ETAPAS_PRE_PRODUCAO = [
  {
    id: 1,
    nome: 'Recorte e tratamento das fotos',
    departamento: 'pre-producao',
    prazo_dias: 10,
    descricao: '10 dias para tratamento',
    tipo: 'producao',
    requer_justificativa: true,
    requer_interacao: true,
    interacao_com: ['criacao'],
    campo_interacao: 'Informar Criação que fotos estão liberadas',
    observacao: 'Justificar se houver fotos pendentes ou baixa resolução'
  },
  {
    id: 2,
    nome: 'Recebimento envelope de saída',
    departamento: 'pre-producao',
    prazo_dias: 1,
    descricao: '1 dia para iniciar saída',
    tipo: 'recebimento'
  },
  {
    id: 3,
    nome: 'Conferir textos e revisão ortográfica',
    departamento: 'pre-producao',
    prazo_dias: 1,
    descricao: 'Após receber envelope do atendimento',
    tipo: 'revisao'
  },
  {
    id: 4,
    nome: 'Envio dos arquivos para gráfica',
    departamento: 'pre-producao',
    prazo_dias: 1,
    descricao: 'Após conferência',
    tipo: 'envio'
  },
  {
    id: 5,
    nome: 'Conferência de xerox',
    departamento: 'pre-producao',
    prazo_dias: 1,
    descricao: 'Caso impressão externa',
    tipo: 'condicional'
  },
  {
    id: 6,
    nome: 'Controle de impressões internas',
    departamento: 'pre-producao',
    prazo_dias: 0,
    descricao: 'Monitoramento contínuo',
    tipo: 'monitoramento'
  }
];

// Definição das Etapas de PRODUÇÃO
export const ETAPAS_PRODUCAO = [
  {
    id: 1,
    nome: 'Triagem de materiais',
    departamento: 'producao',
    prazo_dias: 1,
    descricao: 'Organizar materiais recebidos',
    tipo: 'preparacao'
  },
  {
    id: 2,
    nome: 'Envio do arquivo à gráfica',
    departamento: 'producao',
    prazo_dias: 1,
    descricao: 'Enviar para impressão externa',
    tipo: 'envio'
  },
  {
    id: 3,
    nome: 'Ordem de produção',
    departamento: 'producao',
    prazo_dias: 1,
    descricao: 'Iniciar produção interna',
    tipo: 'inicio'
  },
  {
    id: 4,
    nome: 'Costura e acabamento interno',
    departamento: 'producao',
    prazo_dias: 5,
    descricao: 'Finalização manual dos convites',
    tipo: 'producao'
  },
  {
    id: 5,
    nome: 'Conferência final de qualidade',
    departamento: 'producao',
    prazo_dias: 1,
    descricao: 'Verificação antes da entrega',
    tipo: 'qualidade'
  },
  {
    id: 6,
    nome: 'Entrega dos convites',
    departamento: 'producao',
    prazo_dias: 1,
    descricao: 'Entrega à comissão',
    tipo: 'finalizacao',
    requer_interacao: true,
    interacao_com: ['atendimento'],
    campo_interacao: 'Atendimento agenda entrega com cliente'
  }
];

// Combinar todas as etapas
export const TODAS_ETAPAS = [
  ...ETAPAS_ATENDIMENTO.map(e => ({ ...e, departamento_obj: DEPARTAMENTOS.ATENDIMENTO })),
  ...ETAPAS_CRIACAO.map(e => ({ ...e, departamento_obj: DEPARTAMENTOS.CRIACAO })),
  ...ETAPAS_PRE_PRODUCAO.map(e => ({ ...e, departamento_obj: DEPARTAMENTOS.PRE_PRODUCAO })),
  ...ETAPAS_PRODUCAO.map(e => ({ ...e, departamento_obj: DEPARTAMENTOS.PRODUCAO }))
];

// Função para criar projeto com datas calculadas
const criarProjeto = (contratoId, cliente, instituicao, dataInicio, status = 'Ativo') => {
  const dataInicioDate = new Date(dataInicio);
  const hoje = new Date();
  
  // Calcular etapa atual baseado no tempo decorrido
  const diasDecorridos = Math.floor((hoje - dataInicioDate) / (1000 * 60 * 60 * 24));
  
  let etapaAtual = 1;
  let departamentoAtual = 'atendimento';
  let progresso = 10;
  
  if (diasDecorridos > 60) {
    departamentoAtual = 'criacao';
    etapaAtual = 5;
    progresso = 45;
  } else if (diasDecorridos > 30) {
    departamentoAtual = 'atendimento';
    etapaAtual = 10;
    progresso = 35;
  } else if (diasDecorridos > 15) {
    departamentoAtual = 'atendimento';
    etapaAtual = 6;
    progresso = 25;
  }
  
  const dataEntrega = addMonths(dataInicio, 6); // 6 meses de contrato
  const diasRestantes = Math.floor((new Date(dataEntrega) - hoje) / (1000 * 60 * 60 * 24));
  
  return {
    id: contratoId.replace('contrato', 'projeto'),
    contrato_id: contratoId,
    cliente: cliente,
    instituicao: instituicao,
    departamento_atual: departamentoAtual,
    etapa_atual: etapaAtual,
    etapa_atual_nome: ETAPAS_ATENDIMENTO[etapaAtual - 1]?.nome || 'Iniciando',
    progresso: progresso,
    status: status,
    data_inicio: dataInicio,
    data_entrega: dataEntrega,
    dias_restantes: diasRestantes > 0 ? diasRestantes : 0,
    dias_atraso: status === 'Atrasado' ? Math.floor(Math.random() * 10) + 1 : 0,
    observacoes: []
  };
};

// CONTRATOS DE EXEMPLO
export const mockContratos = [
  {
    id: 'contrato-1',
    cliente: 'Turma Engenharia Civil 2025',
    instituicao: 'UFMG',
    numero_contrato: 'CT-2025-001',
    valor: 145000,
    data_inicio: '2025-01-10',
    data_fim: '2025-07-10',
    data_fim_real: null,
    status: 'Ativo',
    prazo_textos: '2025-04-10',
    prazo_fotos: '2025-04-15',
    projeto_id: 'projeto-1',
    created_at: '2025-01-05',
    observacoes: []
  },
  {
    id: 'contrato-2',
    cliente: 'Turma Medicina 2025',
    instituicao: 'UNIFENAS',
    numero_contrato: 'CT-2025-002',
    valor: 198000,
    data_inicio: '2024-12-15',
    data_fim: '2025-06-15',
    data_fim_real: null,
    status: 'Atrasado',
    prazo_textos: '2025-03-15',
    prazo_fotos: '2025-03-20',
    projeto_id: 'projeto-2',
    created_at: '2024-12-10',
    observacoes: []
  },
  {
    id: 'contrato-3',
    cliente: 'Turma Direito 2025',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2025-003',
    valor: 175000,
    data_inicio: '2025-01-20',
    data_fim: '2025-07-20',
    data_fim_real: null,
    status: 'Ativo',
    prazo_textos: '2025-04-20',
    prazo_fotos: '2025-04-25',
    projeto_id: 'projeto-3',
    created_at: '2025-01-15',
    observacoes: []
  }
];

// PROJETOS DE EXEMPLO
export const mockProjetos = mockContratos.map(contrato => 
  criarProjeto(
    contrato.id,
    contrato.cliente,
    contrato.instituicao,
    contrato.data_inicio,
    contrato.status
  )
);

// STATUS DAS ETAPAS
export const STATUS_ETAPA = {
  NAO_INICIADA: 'Não Iniciada',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO: 'Aguardando',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada'
};

// TAREFAS (baseadas nas etapas dos projetos)
export const mockTarefas = [];

// DASHBOARD
export const mockDashboard = {
  timestamp: new Date().toISOString(),
  kpis: {
    total_projetos: mockProjetos.length,
    em_dia: mockProjetos.filter(p => p.status === 'Ativo' && p.dias_atraso === 0).length,
    atrasados: mockProjetos.filter(p => p.status === 'Atrasado').length,
    concluidos: mockProjetos.filter(p => p.status === 'Concluído').length,
    percentual_no_prazo: mockProjetos.length > 0 
      ? Math.round((mockProjetos.filter(p => p.dias_atraso === 0).length / mockProjetos.length) * 100)
      : 0
  },
  tarefas_atrasadas: [],
  gargalos_responsaveis: []
};

// NOTIFICAÇÕES DINÂMICAS
export const mockNotificacoes = [
  ...mockProjetos
    .filter(p => p.status === 'Atrasado' && p.dias_atraso > 0)
    .slice(0, 5)
    .map((projeto, index) => ({
      id: `notif-atraso-${projeto.id}`,
      titulo: 'Projeto atrasado',
      mensagem: `${projeto.cliente} está com ${projeto.dias_atraso} dias de atraso na etapa ${projeto.etapa_atual_nome}`,
      tipo: 'alerta',
      lida: false,
      projeto_id: projeto.id,
      created_at: new Date(Date.now() - index * 3600000).toISOString()
    })),
  {
    id: 'notif-sistema-1',
    titulo: 'Sistema atualizado',
    mensagem: 'Novo sistema de gestão de formaturas implementado com sucesso',
    tipo: 'sucesso',
    lida: false,
    created_at: new Date().toISOString()
  }
];

// ÍCONES DOS DEPARTAMENTOS
export const ICONES_DEPARTAMENTOS = [
  { id: 'atendimento', nome: 'Atendimento', cor: '#3b82f6', icone: 'Users' },
  { id: 'criacao', nome: 'Criação', cor: '#8b5cf6', icone: 'Palette' },
  { id: 'pre-producao', nome: 'Pré-Produção', cor: '#f59e0b', icone: 'ClipboardList' },
  { id: 'producao', nome: 'Produção/Entrega', cor: '#10b981', icone: 'Package' }
];

// Export default para compatibilidade
export default {
  mockContratos,
  mockProjetos,
  mockTarefas,
  mockDashboard,
  mockNotificacoes,
  DEPARTAMENTOS,
  TODAS_ETAPAS,
  STATUS_ETAPA,
  ICONES_DEPARTAMENTOS
};
