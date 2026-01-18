// ==========================================
// SISTEMA DE GESTÃO DE FORMATURAS - IDEIABH
// Dados Mock Completos e Funcionais
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

// STATUS DAS ETAPAS
export const STATUS_ETAPA = {
  NAO_INICIADA: 'Não Iniciada',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO: 'Aguardando',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada'
};

// Funções auxiliares para datas
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

// Todas as etapas do sistema
export const TODAS_ETAPAS = [
  // ATENDIMENTO - 17 etapas
  { id: 1, nome: 'Informar recebimento do contrato', departamento: 'atendimento', prazo_dias: 0, tipo: 'simples' },
  { id: 2, nome: 'Ativar contrato no site', departamento: 'atendimento', prazo_dias: 1, tipo: 'simples' },
  { id: 3, nome: '1º contato com a comissão', departamento: 'atendimento', prazo_dias: 1, tipo: 'simples' },
  { id: 4, nome: 'Reunião de atendimento', departamento: 'atendimento', prazo_dias: 15, tipo: 'interacao' },
  { id: 5, nome: 'Envio do questionário de criação', departamento: 'atendimento', prazo_dias: 1, tipo: 'simples' },
  { id: 6, nome: 'Recebimento do questionário preenchido', departamento: 'atendimento', prazo_dias: 60, tipo: 'complexo' },
  { id: 7, nome: 'Envio do e-mail de layout de fotos', departamento: 'atendimento', prazo_dias: 1, tipo: 'interacao' },
  { id: 8, nome: 'Enviar layout para comissão', departamento: 'atendimento', prazo_dias: 1, tipo: 'dependente' },
  { id: 9, nome: 'Agendar reunião de criação', departamento: 'atendimento', prazo_dias: -10, tipo: 'interacao' },
  { id: 10, nome: 'Liberação das fotos', departamento: 'atendimento', prazo_dias: 1, tipo: 'contratual' },
  { id: 11, nome: 'Cadastro de textos/REV1', departamento: 'atendimento', prazo_dias: 1, tipo: 'contratual' },
  { id: 12, nome: 'Acompanhar aprovação', departamento: 'atendimento', prazo_dias: 0, tipo: 'monitoramento' },
  { id: 13, nome: 'Aditivo contratual', departamento: 'atendimento', prazo_dias: 0, tipo: 'condicional' },
  { id: 14, nome: 'Cobrança à diretoria', departamento: 'atendimento', prazo_dias: 7, tipo: 'alerta' },
  { id: 15, nome: 'Conferência de lista', departamento: 'atendimento', prazo_dias: 1, tipo: 'complexo' },
  { id: 16, nome: 'Liberação envelope saída', departamento: 'atendimento', prazo_dias: 2, tipo: 'simples' },
  { id: 17, nome: 'Atualização planilha/relatório', departamento: 'atendimento', prazo_dias: 0, tipo: 'semanal' },
  
  // CRIAÇÃO - 16 etapas
  { id: 18, nome: 'RC - Reunião de criação', departamento: 'criacao', prazo_dias: 0, tipo: 'interacao' },
  { id: 19, nome: 'Envio do briefing', departamento: 'criacao', prazo_dias: 2, tipo: 'interacao' },
  { id: 20, nome: 'Layout de Fotos', departamento: 'criacao', prazo_dias: 3, tipo: 'dependente' },
  { id: 21, nome: 'Arte da Camisa', departamento: 'criacao', prazo_dias: 3, tipo: 'condicional' },
  { id: 22, nome: 'Textos cadastrados', departamento: 'criacao', prazo_dias: 0, tipo: 'notificacao' },
  { id: 23, nome: 'Fotos recebidas', departamento: 'criacao', prazo_dias: 0, tipo: 'notificacao' },
  { id: 24, nome: 'Início da criação', departamento: 'criacao', prazo_dias: 10, tipo: 'inicio_projeto' },
  { id: 25, nome: 'Criação do convite', departamento: 'criacao', prazo_dias: 3, tipo: 'producao' },
  { id: 26, nome: 'Correções', departamento: 'criacao', prazo_dias: 3, tipo: 'revisao' },
  { id: 27, nome: 'Liberação demais peças', departamento: 'criacao', prazo_dias: 0, tipo: 'notificacao' },
  { id: 28, nome: 'Miolo aprovado', departamento: 'criacao', prazo_dias: 1, tipo: 'marco' },
  { id: 29, nome: 'Capa aprovada', departamento: 'criacao', prazo_dias: 1, tipo: 'marco' },
  { id: 30, nome: 'Demais Peças', departamento: 'criacao', prazo_dias: 3, tipo: 'dependente' },
  { id: 31, nome: 'Páginas individuais', departamento: 'criacao', prazo_dias: 0, tipo: 'dependente' },
  { id: 32, nome: 'Revisão REV', departamento: 'criacao', prazo_dias: 1, tipo: 'revisao_final' },
  { id: 33, nome: 'Saída/Finalização', departamento: 'criacao', prazo_dias: 3, tipo: 'finalizacao' },
  
  // PRÉ-PRODUÇÃO - 6 etapas
  { id: 34, nome: 'Recorte e tratamento', departamento: 'pre-producao', prazo_dias: 10, tipo: 'producao' },
  { id: 35, nome: 'Recebimento envelope', departamento: 'pre-producao', prazo_dias: 1, tipo: 'recebimento' },
  { id: 36, nome: 'Conferir textos', departamento: 'pre-producao', prazo_dias: 1, tipo: 'revisao' },
  { id: 37, nome: 'Envio para gráfica', departamento: 'pre-producao', prazo_dias: 1, tipo: 'envio' },
  { id: 38, nome: 'Conferência xerox', departamento: 'pre-producao', prazo_dias: 1, tipo: 'condicional' },
  { id: 39, nome: 'Controle impressões', departamento: 'pre-producao', prazo_dias: 0, tipo: 'monitoramento' },
  
  // PRODUÇÃO - 6 etapas
  { id: 40, nome: 'Triagem materiais', departamento: 'producao', prazo_dias: 1, tipo: 'preparacao' },
  { id: 41, nome: 'Envio à gráfica', departamento: 'producao', prazo_dias: 1, tipo: 'envio' },
  { id: 42, nome: 'Ordem de produção', departamento: 'producao', prazo_dias: 1, tipo: 'inicio' },
  { id: 43, nome: 'Costura e acabamento', departamento: 'producao', prazo_dias: 5, tipo: 'producao' },
  { id: 44, nome: 'Conferência qualidade', departamento: 'producao', prazo_dias: 1, tipo: 'qualidade' },
  { id: 45, nome: 'Entrega convites', departamento: 'producao', prazo_dias: 1, tipo: 'finalizacao' }
];

// 10 CONTRATOS COMPLETOS E FUNCIONAIS
export const mockContratos = [
  // CONTRATOS ATIVOS (4)
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
    cliente: 'Turma Direito 2025',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2025-002',
    valor: 175000,
    data_inicio: '2025-01-20',
    data_fim: '2025-07-20',
    data_fim_real: null,
    status: 'Ativo',
    prazo_textos: '2025-04-20',
    prazo_fotos: '2025-04-25',
    projeto_id: 'projeto-2',
    created_at: '2025-01-15',
    observacoes: []
  },
  {
    id: 'contrato-3',
    cliente: 'Turma Administração 2025',
    instituicao: 'FUMEC',
    numero_contrato: 'CT-2025-003',
    valor: 98000,
    data_inicio: '2025-02-01',
    data_fim: '2025-08-01',
    data_fim_real: null,
    status: 'Ativo',
    prazo_textos: '2025-05-01',
    prazo_fotos: '2025-05-05',
    projeto_id: 'projeto-3',
    created_at: '2025-01-25',
    observacoes: []
  },
  {
    id: 'contrato-4',
    cliente: 'Turma Arquitetura 2025',
    instituicao: 'Centro Universitário BH',
    numero_contrato: 'CT-2025-004',
    valor: 162000,
    data_inicio: '2025-01-15',
    data_fim: '2025-07-15',
    data_fim_real: null,
    status: 'Ativo',
    prazo_textos: '2025-04-15',
    prazo_fotos: '2025-04-18',
    projeto_id: 'projeto-4',
    created_at: '2025-01-10',
    observacoes: []
  },
  
  // CONTRATOS ATRASADOS (3)
  {
    id: 'contrato-5',
    cliente: 'Turma Medicina 2024',
    instituicao: 'UNIFENAS',
    numero_contrato: 'CT-2024-005',
    valor: 198000,
    data_inicio: '2024-12-01',
    data_fim: '2025-06-01',
    data_fim_real: null,
    status: 'Atrasado',
    prazo_textos: '2025-03-01',
    prazo_fotos: '2025-03-05',
    projeto_id: 'projeto-5',
    created_at: '2024-11-25',
    observacoes: []
  },
  {
    id: 'contrato-6',
    cliente: 'Turma Odontologia 2024',
    instituicao: 'UFMG',
    numero_contrato: 'CT-2024-006',
    valor: 187000,
    data_inicio: '2024-11-20',
    data_fim: '2025-05-20',
    data_fim_real: null,
    status: 'Atrasado',
    prazo_textos: '2025-02-20',
    prazo_fotos: '2025-02-25',
    projeto_id: 'projeto-6',
    created_at: '2024-11-15',
    observacoes: []
  },
  {
    id: 'contrato-7',
    cliente: 'Turma Ciência da Computação 2024',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2024-007',
    valor: 152000,
    data_inicio: '2024-12-10',
    data_fim: '2025-06-10',
    data_fim_real: null,
    status: 'Atrasado',
    prazo_textos: '2025-03-10',
    prazo_fotos: '2025-03-12',
    projeto_id: 'projeto-7',
    created_at: '2024-12-05',
    observacoes: []
  },
  
  // CONTRATOS CONCLUÍDOS (3)
  {
    id: 'contrato-8',
    cliente: 'Turma Pedagogia 2024',
    instituicao: 'Newton Paiva',
    numero_contrato: 'CT-2024-008',
    valor: 89000,
    data_inicio: '2024-08-01',
    data_fim: '2025-02-01',
    data_fim_real: '2025-01-28',
    status: 'Concluído',
    prazo_textos: '2024-11-01',
    prazo_fotos: '2024-11-05',
    projeto_id: 'projeto-8',
    created_at: '2024-07-25',
    observacoes: []
  },
  {
    id: 'contrato-9',
    cliente: 'Turma Enfermagem 2024',
    instituicao: 'Faculdade Santa Casa',
    numero_contrato: 'CT-2024-009',
    valor: 95000,
    data_inicio: '2024-07-15',
    data_fim: '2025-01-15',
    data_fim_real: '2025-01-10',
    status: 'Concluído',
    prazo_textos: '2024-10-15',
    prazo_fotos: '2024-10-20',
    projeto_id: 'projeto-9',
    created_at: '2024-07-10',
    observacoes: []
  },
  {
    id: 'contrato-10',
    cliente: 'Turma Fisioterapia 2024',
    instituicao: 'Una Bom Despacho',
    numero_contrato: 'CT-2024-010',
    valor: 78000,
    data_inicio: '2024-09-01',
    data_fim: '2025-03-01',
    data_fim_real: '2025-02-25',
    status: 'Concluído',
    prazo_textos: '2024-12-01',
    prazo_fotos: '2024-12-05',
    projeto_id: 'projeto-10',
    created_at: '2024-08-25',
    observacoes: []
  }
];

// Dias de atraso fixos para cada contrato atrasado (valores consistentes)
const DIAS_ATRASO_FIXOS = {
  'contrato-5': 5,   // Turma Medicina 2024 - menor atraso
  'contrato-6': 12,  // Turma Odontologia 2024 - atraso médio
  'contrato-7': 18   // Turma Ciência da Computação 2024 - maior atraso
};

// Função para criar projeto baseado no contrato
const criarProjeto = (contrato) => {
  const hoje = new Date();
  const dataInicio = new Date(contrato.data_inicio);
  const diasDecorridos = Math.floor((hoje - dataInicio) / (1000 * 60 * 60 * 24));
  
  let departamentoAtual = 'atendimento';
  let etapaAtual = 1;
  let etapaNome = 'Informar recebimento do contrato';
  let progresso = 5;
  let diasAtraso = 0;
  
  if (contrato.status === 'Concluído') {
    departamentoAtual = 'producao';
    etapaAtual = 45;
    etapaNome = 'Entrega convites';
    progresso = 100;
  } else if (contrato.status === 'Atrasado') {
    // Usar valores fixos de dias de atraso para consistência
    diasAtraso = DIAS_ATRASO_FIXOS[contrato.id] || 10;
    
    if (diasDecorridos > 90) {
      departamentoAtual = 'criacao';
      etapaAtual = 26;
      etapaNome = 'Correções';
      progresso = 65;
    } else if (diasDecorridos > 60) {
      departamentoAtual = 'criacao';
      etapaAtual = 20;
      etapaNome = 'Layout de Fotos';
      progresso = 45;
    } else {
      departamentoAtual = 'atendimento';
      etapaAtual = 11;
      etapaNome = 'Cadastro de textos/REV1';
      progresso = 35;
    }
  } else { // Ativo
    if (diasDecorridos > 50) {
      departamentoAtual = 'criacao';
      etapaAtual = 25;
      etapaNome = 'Criação do convite';
      progresso = 55;
    } else if (diasDecorridos > 30) {
      departamentoAtual = 'criacao';
      etapaAtual = 19;
      etapaNome = 'Envio do briefing';
      progresso = 40;
    } else if (diasDecorridos > 15) {
      departamentoAtual = 'atendimento';
      etapaAtual = 6;
      etapaNome = 'Recebimento do questionário preenchido';
      progresso = 25;
    } else {
      departamentoAtual = 'atendimento';
      etapaAtual = 3;
      etapaNome = '1º contato com a comissão';
      progresso = 15;
    }
  }
  
  const dataEntrega = contrato.status === 'Concluído' ? contrato.data_fim_real : contrato.data_fim;
  const diasRestantes = Math.max(0, Math.floor((new Date(dataEntrega) - hoje) / (1000 * 60 * 60 * 24)));
  
  return {
    id: contrato.projeto_id,
    contrato_id: contrato.id,
    cliente: contrato.cliente,
    instituicao: contrato.instituicao,
    departamento_atual: departamentoAtual,
    etapa_atual: etapaAtual,
    etapa_atual_nome: etapaNome,
    progresso: progresso,
    status: contrato.status,
    data_inicio: contrato.data_inicio,
    data_entrega: dataEntrega,
    dias_restantes: diasRestantes,
    dias_atraso: diasAtraso,
    etapas: [], // Etapas serão populadas conforme necessário
    observacoes: []
  };
};

// PROJETOS CRIADOS A PARTIR DOS CONTRATOS
export const mockProjetos = mockContratos.map(contrato => criarProjeto(contrato));

// TAREFAS
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
  gargalos_responsaveis: [
    ['Maria Letro', 3],
    ['João Silva', 2],
    ['Ana Costa', 1]
  ]
};

// NOTIFICAÇÕES DINÂMICAS
export const mockNotificacoes = [
  ...mockProjetos
    .filter(p => p.status === 'Atrasado' && p.dias_atraso > 0)
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
    mensagem: 'Sistema de gestão de formaturas operacional com 10 contratos ativos',
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
