// Mock Data for IDEIABH - Sistema de Gestão Operacional

export const mockUsers = [
  {
    id: 'user-1',
    nome: 'Admin Sistema',
    email: 'admin@ideiabh.com',
    role: 'admin',
    ativo: true,
    permissoes: {
      dashboard: true,
      contratos_visualizar: true,
      contratos_criar: true,
      contratos_editar: true,
      contratos_excluir: true,
      contratos_aprovar: true,
      contratos_finalizar: true,
      projetos_visualizar: true,
      projetos_avancar: true,
      tarefas_visualizar: true,
      tarefas_criar: true,
      tarefas_editar: true,
      tarefas_concluir: true,
      tarefas_mover: true,
      admin: true
    }
  },
  {
    id: 'user-2',
    nome: 'Maria Gerente',
    email: 'maria@ideiabh.com',
    role: 'gerente',
    ativo: true,
    permissoes: {
      dashboard: true,
      contratos_visualizar: true,
      contratos_criar: true,
      contratos_editar: true,
      projetos_visualizar: true,
      tarefas_visualizar: true,
      tarefas_editar: true,
      admin: false
    }
  },
  {
    id: 'user-3',
    nome: 'João Operador',
    email: 'joao@ideiabh.com',
    role: 'operador',
    ativo: true,
    permissoes: {
      dashboard: true,
      contratos_visualizar: true,
      projetos_visualizar: true,
      tarefas_visualizar: true,
      tarefas_concluir: true,
      admin: false
    }
  }
];

export const mockContratos = [
  {
    id: 'contrato-1',
    cliente: 'Universidade Federal MG',
    faculdade: 'Engenharia',
    numero_contrato: 'CT-2024-001',
    valor: 125000,
    data_inicio: '2024-01-15',
    data_fim: '2024-06-30',
    status: 'Em Andamento',
    projeto_id: 'projeto-1',
    created_at: '2024-01-10'
  },
  {
    id: 'contrato-2',
    cliente: 'PUC Minas',
    faculdade: 'Medicina',
    numero_contrato: 'CT-2024-002',
    valor: 85000,
    data_inicio: '2024-02-01',
    data_fim: '2024-07-31',
    status: 'Ativo',
    projeto_id: 'projeto-2',
    created_at: '2024-01-20'
  },
  {
    id: 'contrato-3',
    cliente: 'FUMEC',
    faculdade: 'Direito',
    numero_contrato: 'CT-2024-003',
    valor: 95000,
    data_inicio: '2024-03-01',
    data_fim: '2024-08-30',
    status: 'Em Andamento',
    projeto_id: 'projeto-3',
    created_at: '2024-02-15'
  },
  {
    id: 'contrato-4',
    cliente: 'Una',
    faculdade: 'Administração',
    numero_contrato: 'CT-2024-004',
    valor: 72000,
    data_inicio: '2024-01-20',
    data_fim: '2024-05-15',
    status: 'Finalizado',
    projeto_id: 'projeto-4',
    created_at: '2024-01-05'
  },
  {
    id: 'contrato-5',
    cliente: 'Estácio BH',
    faculdade: 'Comunicação',
    numero_contrato: 'CT-2024-005',
    valor: 110000,
    data_inicio: '2024-04-01',
    data_fim: '2024-09-30',
    status: 'Ativo',
    projeto_id: 'projeto-5',
    created_at: '2024-03-20'
  }
];

export const mockProjetos = [
  {
    id: 'projeto-1',
    contrato_id: 'contrato-1',
    cliente: 'Universidade Federal MG',
    faculdade: 'Engenharia',
    etapa_atual: 'Produção',
    macro_etapa: 'PRODUCAO',
    progresso: 65,
    risco: 'Baixo',
    data_entrega: '2024-06-30',
    dias_restantes: 45
  },
  {
    id: 'projeto-2',
    contrato_id: 'contrato-2',
    cliente: 'PUC Minas',
    faculdade: 'Medicina',
    etapa_atual: 'Criação 1ª/2ª',
    macro_etapa: 'PRE_PRODUCAO',
    progresso: 35,
    risco: 'Médio',
    data_entrega: '2024-07-31',
    dias_restantes: 76
  },
  {
    id: 'projeto-3',
    contrato_id: 'contrato-3',
    cliente: 'FUMEC',
    faculdade: 'Direito',
    etapa_atual: 'Ativação',
    macro_etapa: 'PRE_PRODUCAO',
    progresso: 20,
    risco: 'Baixo',
    data_entrega: '2024-08-30',
    dias_restantes: 106
  },
  {
    id: 'projeto-4',
    contrato_id: 'contrato-4',
    cliente: 'Una',
    faculdade: 'Administração',
    etapa_atual: 'Encerrado',
    macro_etapa: 'POS_PRODUCAO',
    progresso: 100,
    risco: 'Baixo',
    data_entrega: '2024-05-15',
    dias_restantes: 0
  },
  {
    id: 'projeto-5',
    contrato_id: 'contrato-5',
    cliente: 'Estácio BH',
    faculdade: 'Comunicação',
    etapa_atual: 'Lançamento',
    macro_etapa: 'PRE_PRODUCAO',
    progresso: 10,
    risco: 'Baixo',
    data_entrega: '2024-09-30',
    dias_restantes: 137
  }
];

export const mockTarefas = [
  // Projeto 1 - UFMG - Produção
  {
    id: 'tarefa-1',
    projeto_id: 'projeto-1',
    titulo: 'Revisão de Layout Final',
    atividade: 'Revisão de Layout',
    etapa: 'Produção',
    macro_etapa: 'PRODUCAO',
    responsavel: 'João Operador',
    prazo: '2024-05-20',
    status: 'Em Andamento',
    critica: true,
    setor: 'Design'
  },
  {
    id: 'tarefa-2',
    projeto_id: 'projeto-1',
    titulo: 'Impressão Material',
    atividade: 'Produção Gráfica',
    etapa: 'Produção',
    macro_etapa: 'PRODUCAO',
    responsavel: 'Maria Gerente',
    prazo: '2024-05-25',
    status: 'Pendente',
    critica: true,
    setor: 'Produção'
  },
  // Projeto 2 - PUC - Pré-Produção
  {
    id: 'tarefa-3',
    projeto_id: 'projeto-2',
    titulo: 'Criação de Identidade Visual',
    atividade: 'Design Criativo',
    etapa: 'Criação 1ª/2ª',
    macro_etapa: 'PRE_PRODUCAO',
    responsavel: 'João Operador',
    prazo: '2024-05-15',
    status: 'Em Andamento',
    critica: true,
    setor: 'Criação'
  },
  {
    id: 'tarefa-4',
    projeto_id: 'projeto-2',
    titulo: 'Aprovação Cliente',
    atividade: 'Validação',
    etapa: 'Criação 1ª/2ª',
    macro_etapa: 'PRE_PRODUCAO',
    responsavel: 'Maria Gerente',
    prazo: '2024-05-18',
    status: 'Pendente',
    critica: false,
    setor: 'Atendimento'
  },
  // Projeto 3 - FUMEC - Ativação
  {
    id: 'tarefa-5',
    projeto_id: 'projeto-3',
    titulo: 'Briefing com Cliente',
    atividade: 'Reunião Inicial',
    etapa: 'Ativação',
    macro_etapa: 'PRE_PRODUCAO',
    responsavel: 'Maria Gerente',
    prazo: '2024-05-10',
    status: 'Concluído',
    critica: true,
    setor: 'Atendimento'
  },
  {
    id: 'tarefa-6',
    projeto_id: 'projeto-3',
    titulo: 'Coleta de Materiais',
    atividade: 'Preparação',
    etapa: 'Ativação',
    macro_etapa: 'PRE_PRODUCAO',
    responsavel: 'João Operador',
    prazo: '2024-05-12',
    status: 'Em Andamento',
    critica: false,
    setor: 'Produção'
  },
  // Tarefas atrasadas para dashboard
  {
    id: 'tarefa-7',
    projeto_id: 'projeto-2',
    titulo: 'Revisão de Texto',
    atividade: 'Revisão',
    etapa: 'Revisão',
    macro_etapa: 'PRE_PRODUCAO',
    responsavel: 'Admin Sistema',
    prazo: '2024-05-01',
    status: 'Em Andamento',
    critica: true,
    setor: 'Revisão'
  }
];

export const mockDashboard = {
  timestamp: new Date().toISOString(),
  kpis: {
    total_projetos: 5,
    percentual_no_prazo: 80,
    projetos_risco_alto: 0,
    projetos_risco_medio: 1,
    tarefas_atrasadas_total: 1
  },
  projetos_por_status: {
    'Em Andamento': 2,
    'Ativo': 2,
    'Finalizado': 1
  },
  tarefas_atrasadas: [
    {
      id: 'tarefa-7',
      titulo: 'Revisão de Texto',
      responsavel: 'Admin Sistema',
      dias_atraso: 14
    }
  ],
  gargalos_responsaveis: [
    ['João Operador', 3],
    ['Maria Gerente', 3],
    ['Admin Sistema', 1]
  ]
};

export const mockNotificacoes = [
  {
    id: 'notif-1',
    titulo: 'Nova tarefa atribuída',
    mensagem: 'Você foi designado para: Revisão de Layout Final',
    tipo: 'atribuicao',
    lida: false,
    created_at: '2024-05-14T10:30:00'
  },
  {
    id: 'notif-2',
    titulo: 'Prazo próximo',
    mensagem: 'Tarefa "Criação de Identidade Visual" vence em 2 dias',
    tipo: 'prazo',
    lida: false,
    created_at: '2024-05-13T14:00:00'
  },
  {
    id: 'notif-3',
    titulo: 'Projeto avançou',
    mensagem: 'Projeto UFMG avançou para etapa de Produção',
    tipo: 'etapa',
    lida: true,
    created_at: '2024-05-10T09:00:00'
  }
];

export const ETAPAS_PROJETO = {
  LANCAMENTO: 'Lançamento',
  ATIVACAO: 'Ativação',
  REVISAO_TEXTO: 'Revisão de Texto',
  CRIACAO_1_2: 'Criação 1ª/2ª',
  CONFERENCIA: 'Conferência',
  AJUSTE_LAYOUT: 'Ajuste de Layout',
  CRIACAO_3_4: 'Criação 3ª/4ª',
  APROVACAO_FINAL: 'Aprovação Final',
  PLANEJAMENTO_PRODUCAO: 'Planejamento Produção',
  PRE_PRODUCAO: 'Pré-Produção',
  PRODUCAO: 'Produção',
  QUALIDADE: 'Qualidade',
  ENTREGA: 'Entrega',
  POS_VENDAS: 'Pós-Vendas',
  ENCERRADO: 'Encerrado'
};

export const MACRO_ETAPAS = {
  PRE_PRODUCAO: {
    titulo: 'Pré-Produção',
    cor: '#3b82f6',
    etapas: ['Lançamento', 'Ativação', 'Revisão de Texto', 'Criação 1ª/2ª', 'Conferência', 'Ajuste de Layout', 'Criação 3ª/4ª', 'Aprovação Final', 'Planejamento Produção', 'Pré-Produção']
  },
  PRODUCAO: {
    titulo: 'Produção',
    cor: '#f59e0b',
    etapas: ['Produção', 'Qualidade', 'Entrega']
  },
  POS_PRODUCAO: {
    titulo: 'Pós-Produção',
    cor: '#10b981',
    etapas: ['Pós-Vendas', 'Encerrado']
  }
};

export const STATUS_CONTRATO = {
  ATIVO: 'Ativo',
  EM_ANDAMENTO: 'Em Andamento',
  EM_PRODUCAO: 'Em Produção',
  FINALIZADO: 'Finalizado',
  ENTREGUE: 'Entregue'
};

export const STATUS_TAREFA = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído'
};

export const NIVEIS_RISCO = {
  BAIXO: { label: 'Baixo', cor: '#22c55e' },
  MEDIO: { label: 'Médio', cor: '#f59e0b' },
  ALTO: { label: 'Alto', cor: '#ef4444' }
};
