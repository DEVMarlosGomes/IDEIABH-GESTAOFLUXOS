// Mock Data Atualizado com Etapas Detalhadas e Sistema de Atrasos

export const mockUsers = [
  {
    id: 'user-1',
    nome: 'Admin Sistema',
    email: 'admin@ideiabh.com',
    role: 'admin',
    ativo: true,
    departamento: 'Administração',
    avatar: 'AS',
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
    nome: 'Maria Letro',
    email: 'maria@ideiabh.com',
    role: 'gerente',
    ativo: true,
    departamento: 'Criação',
    avatar: 'ML',
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
    nome: 'João Silva',
    email: 'joao@ideiabh.com',
    role: 'operador',
    ativo: true,
    departamento: 'Produção',
    avatar: 'JS',
    permissoes: {
      dashboard: true,
      contratos_visualizar: true,
      projetos_visualizar: true,
      tarefas_visualizar: true,
      tarefas_concluir: true,
      admin: false
    }
  },
  {
    id: 'user-4',
    nome: 'Ana Costa',
    email: 'ana@ideiabh.com',
    role: 'operador',
    ativo: true,
    departamento: 'Atendimento',
    avatar: 'AC',
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

// Definição das Etapas do Sistema
export const ETAPAS_SISTEMA = [
  { id: 1, nome: 'Lançamento', departamento: 'Atendimento', duracao_padrao: 2 },
  { id: 2, nome: 'Ativação', departamento: 'Atendimento', duracao_padrao: 3 },
  { id: 3, nome: 'Revisão de Texto', departamento: 'Criação', duracao_padrao: 5 },
  { id: 4, nome: 'Criação (1ª e 2ª AP)', departamento: 'Criação', duracao_padrao: 7 },
  { id: 5, nome: 'Conferência', departamento: 'Criação', duracao_padrao: 2 },
  { id: 6, nome: 'Ajuste de Layout', departamento: 'Criação', duracao_padrao: 3 },
  { id: 7, nome: 'Criação (3ª e 4ª AP)', departamento: 'Criação', duracao_padrao: 5 },
  { id: 8, nome: 'Aprovação Final', departamento: 'Atendimento', duracao_padrao: 2 },
  { id: 9, nome: 'Planejamento Produção', departamento: 'Pré-Produção', duracao_padrao: 3 },
  { id: 10, nome: 'Pré-Produção', departamento: 'Pré-Produção', duracao_padrao: 5 },
  { id: 11, nome: 'Produção', departamento: 'Produção', duracao_padrao: 10 },
  { id: 12, nome: 'Controle de Qualidade', departamento: 'Produção', duracao_padrao: 3 },
  { id: 13, nome: 'Entrega', departamento: 'Produção', duracao_padrao: 2 },
  { id: 14, nome: 'Pós-Vendas', departamento: 'Atendimento', duracao_padrao: 5 }
];

export const mockContratos = [
  // CONTRATOS ATIVOS (10 contratos)
  {
    id: 'contrato-1',
    cliente: 'Turma Engenharia 2024',
    instituicao: 'Universidade Federal MG',
    numero_contrato: 'CT-2024-001',
    valor: 125000,
    data_inicio: '2024-01-15',
    data_fim: '2024-06-30',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-1',
    created_at: '2024-01-10',
    observacoes: []
  },
  {
    id: 'contrato-3',
    cliente: 'Turma Direito 2024',
    instituicao: 'FUMEC',
    numero_contrato: 'CT-2024-003',
    valor: 95000,
    data_inicio: '2024-03-01',
    data_fim: '2024-08-30',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-3',
    created_at: '2024-02-15',
    observacoes: []
  },
  {
    id: 'contrato-5',
    cliente: 'Turma Comunicação 2024',
    instituicao: 'Estácio BH',
    numero_contrato: 'CT-2024-005',
    valor: 110000,
    data_inicio: '2024-04-01',
    data_fim: '2024-09-30',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-5',
    created_at: '2024-03-20',
    observacoes: []
  },
  {
    id: 'contrato-6',
    cliente: 'Turma Arquitetura 2024',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2024-006',
    valor: 135000,
    data_inicio: '2024-02-10',
    data_fim: '2024-07-20',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-6',
    created_at: '2024-02-05',
    observacoes: []
  },
  {
    id: 'contrato-7',
    cliente: 'Turma Psicologia 2024',
    instituicao: 'Newton Paiva',
    numero_contrato: 'CT-2024-007',
    valor: 88000,
    data_inicio: '2024-03-15',
    data_fim: '2024-08-15',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-7',
    created_at: '2024-03-10',
    observacoes: []
  },
  {
    id: 'contrato-8',
    cliente: 'Turma Odontologia 2024',
    instituicao: 'UFMG',
    numero_contrato: 'CT-2024-008',
    valor: 142000,
    data_inicio: '2024-01-25',
    data_fim: '2024-06-25',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-8',
    created_at: '2024-01-20',
    observacoes: []
  },
  {
    id: 'contrato-9',
    cliente: 'Turma Veterinária 2024',
    instituicao: 'Centro Universitário BH',
    numero_contrato: 'CT-2024-009',
    valor: 99000,
    data_inicio: '2024-04-05',
    data_fim: '2024-09-05',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-9',
    created_at: '2024-04-01',
    observacoes: []
  },
  {
    id: 'contrato-10',
    cliente: 'Turma Enfermagem 2024',
    instituicao: 'Faculdade Santa Casa',
    numero_contrato: 'CT-2024-010',
    valor: 78000,
    data_inicio: '2024-03-20',
    data_fim: '2024-08-20',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-10',
    created_at: '2024-03-15',
    observacoes: []
  },
  {
    id: 'contrato-11',
    cliente: 'Turma Fisioterapia 2024',
    instituicao: 'Una Bom Despacho',
    numero_contrato: 'CT-2024-011',
    valor: 92000,
    data_inicio: '2024-02-15',
    data_fim: '2024-07-15',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-11',
    created_at: '2024-02-10',
    observacoes: []
  },
  {
    id: 'contrato-12',
    cliente: 'Turma Ciências Contábeis 2024',
    instituicao: 'Estácio BH',
    numero_contrato: 'CT-2024-012',
    valor: 67000,
    data_inicio: '2024-04-10',
    data_fim: '2024-09-10',
    data_fim_real: null,
    status: 'Ativo',
    projeto_id: 'projeto-12',
    created_at: '2024-04-05',
    observacoes: []
  },

  // CONTRATOS ATRASADOS (10 contratos)
  {
    id: 'contrato-2',
    cliente: 'Turma Medicina 2024',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2024-002',
    valor: 85000,
    data_inicio: '2024-02-01',
    data_fim: '2024-07-31',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-2',
    created_at: '2024-01-20',
    observacoes: []
  },
  {
    id: 'contrato-13',
    cliente: 'Turma Biomedicina 2024',
    instituicao: 'UFMG',
    numero_contrato: 'CT-2024-013',
    valor: 118000,
    data_inicio: '2024-01-10',
    data_fim: '2024-06-10',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-13',
    created_at: '2024-01-05',
    observacoes: []
  },
  {
    id: 'contrato-14',
    cliente: 'Turma Farmácia 2024',
    instituicao: 'Newton Paiva',
    numero_contrato: 'CT-2024-014',
    valor: 95000,
    data_inicio: '2024-02-05',
    data_fim: '2024-07-05',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-14',
    created_at: '2024-01-30',
    observacoes: []
  },
  {
    id: 'contrato-15',
    cliente: 'Turma Nutrição 2024',
    instituicao: 'Una Contagem',
    numero_contrato: 'CT-2024-015',
    valor: 73000,
    data_inicio: '2024-01-20',
    data_fim: '2024-06-20',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-15',
    created_at: '2024-01-15',
    observacoes: []
  },
  {
    id: 'contrato-16',
    cliente: 'Turma Ed. Física 2024',
    instituicao: 'FUMEC',
    numero_contrato: 'CT-2024-016',
    valor: 82000,
    data_inicio: '2024-02-10',
    data_fim: '2024-07-10',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-16',
    created_at: '2024-02-05',
    observacoes: []
  },
  {
    id: 'contrato-17',
    cliente: 'Turma Jornalismo 2024',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2024-017',
    valor: 91000,
    data_inicio: '2024-01-15',
    data_fim: '2024-06-15',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-17',
    created_at: '2024-01-10',
    observacoes: []
  },
  {
    id: 'contrato-18',
    cliente: 'Turma Design Gráfico 2024',
    instituicao: 'Estácio BH',
    numero_contrato: 'CT-2024-018',
    valor: 77000,
    data_inicio: '2024-02-20',
    data_fim: '2024-07-20',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-18',
    created_at: '2024-02-15',
    observacoes: []
  },
  {
    id: 'contrato-19',
    cliente: 'Turma Marketing 2024',
    instituicao: 'Centro Universitário BH',
    numero_contrato: 'CT-2024-019',
    valor: 84000,
    data_inicio: '2024-01-25',
    data_fim: '2024-06-25',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-19',
    created_at: '2024-01-20',
    observacoes: []
  },
  {
    id: 'contrato-20',
    cliente: 'Turma Publicidade 2024',
    instituicao: 'Newton Paiva',
    numero_contrato: 'CT-2024-020',
    valor: 89000,
    data_inicio: '2024-02-01',
    data_fim: '2024-07-01',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-20',
    created_at: '2024-01-25',
    observacoes: []
  },
  {
    id: 'contrato-21',
    cliente: 'Turma Sistemas de Informação 2024',
    instituicao: 'FUMEC',
    numero_contrato: 'CT-2024-021',
    valor: 105000,
    data_inicio: '2024-01-30',
    data_fim: '2024-06-30',
    data_fim_real: null,
    status: 'Atrasado',
    projeto_id: 'projeto-21',
    created_at: '2024-01-25',
    observacoes: []
  },

  // CONTRATOS CONCLUÍDOS (5 contratos)
  {
    id: 'contrato-4',
    cliente: 'Turma Administração 2024',
    instituicao: 'Una',
    numero_contrato: 'CT-2024-004',
    valor: 72000,
    data_inicio: '2024-01-20',
    data_fim: '2024-05-15',
    data_fim_real: '2024-05-15',
    status: 'Concluído',
    projeto_id: 'projeto-4',
    created_at: '2024-01-05',
    observacoes: []
  },
  {
    id: 'contrato-22',
    cliente: 'Turma Ciências Biológicas 2023',
    instituicao: 'UFMG',
    numero_contrato: 'CT-2023-022',
    valor: 115000,
    data_inicio: '2023-08-01',
    data_fim: '2024-01-15',
    data_fim_real: '2024-01-15',
    status: 'Concluído',
    projeto_id: 'projeto-22',
    created_at: '2023-07-20',
    observacoes: []
  },
  {
    id: 'contrato-23',
    cliente: 'Turma Geografia 2023',
    instituicao: 'PUC Minas',
    numero_contrato: 'CT-2023-023',
    valor: 68000,
    data_inicio: '2023-09-01',
    data_fim: '2024-02-20',
    data_fim_real: '2024-02-18',
    status: 'Concluído',
    projeto_id: 'projeto-23',
    created_at: '2023-08-25',
    observacoes: []
  },
  {
    id: 'contrato-24',
    cliente: 'Turma História 2023',
    instituicao: 'Newton Paiva',
    numero_contrato: 'CT-2023-024',
    valor: 74000,
    data_inicio: '2023-10-01',
    data_fim: '2024-03-10',
    data_fim_real: '2024-03-10',
    status: 'Concluído',
    projeto_id: 'projeto-24',
    created_at: '2023-09-20',
    observacoes: []
  },
  {
    id: 'contrato-25',
    cliente: 'Turma Letras 2023',
    instituicao: 'FUMEC',
    numero_contrato: 'CT-2023-025',
    valor: 65000,
    data_inicio: '2023-11-01',
    data_fim: '2024-04-05',
    data_fim_real: '2024-04-03',
    status: 'Concluído',
    projeto_id: 'projeto-25',
    created_at: '2023-10-25',
    observacoes: []
  }
];

// Projetos com Etapas Detalhadas
export const mockProjetos = [
  {
    id: 'projeto-1',
    contrato_id: 'contrato-1',
    cliente: 'Turma Engenharia 2024',
    instituicao: 'Universidade Federal MG',
    etapa_atual: 11,
    etapa_atual_nome: 'Produção',
    progresso: 75,
    status: 'Em Andamento',
    data_entrega: '2024-06-30',
    dias_restantes: 45,
    dias_atraso: 0,
    etapas: [
      { id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-01-15', data_prevista_fim: '2024-01-17', data_real_inicio: '2024-01-15', data_real_fim: '2024-01-17', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-01-18', data_prevista_fim: '2024-01-21', data_real_inicio: '2024-01-18', data_real_fim: '2024-01-21', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-01-22', data_prevista_fim: '2024-01-27', data_real_inicio: '2024-01-22', data_real_fim: '2024-01-27', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-01-28', data_prevista_fim: '2024-02-04', data_real_inicio: '2024-01-28', data_real_fim: '2024-02-04', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-05', data_prevista_fim: '2024-02-07', data_real_inicio: '2024-02-05', data_real_fim: '2024-02-07', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-08', data_prevista_fim: '2024-02-11', data_real_inicio: '2024-02-08', data_real_fim: '2024-02-11', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-12', data_prevista_fim: '2024-02-17', data_real_inicio: '2024-02-12', data_real_fim: '2024-02-17', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-18', data_prevista_fim: '2024-02-20', data_real_inicio: '2024-02-18', data_real_fim: '2024-02-20', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-02-21', data_prevista_fim: '2024-02-24', data_real_inicio: '2024-02-21', data_real_fim: '2024-02-24', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-02-25', data_prevista_fim: '2024-03-01', data_real_inicio: '2024-02-25', data_real_fim: '2024-03-01', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-02', data_prevista_fim: '2024-03-12', data_real_inicio: '2024-03-02', data_real_fim: null, status: 'Em Andamento', dias_atraso: 0, observacoes: [] },
      { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-03-13', data_prevista_fim: '2024-03-16', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-03-17', data_prevista_fim: '2024-03-19', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-20', data_prevista_fim: '2024-03-25', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }
    ]
  },
  {
    id: 'projeto-2',
    contrato_id: 'contrato-2',
    cliente: 'Turma Medicina 2024',
    instituicao: 'PUC Minas',
    etapa_atual: 4,
    etapa_atual_nome: 'Criação (1ª e 2ª AP)',
    progresso: 28,
    status: 'Atrasado',
    data_entrega: '2024-07-31',
    dias_restantes: 76,
    dias_atraso: 8,
    etapa_atraso: 'Criação (1ª e 2ª AP)',
    etapas: [
      { id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-01', data_prevista_fim: '2024-02-03', data_real_inicio: '2024-02-01', data_real_fim: '2024-02-03', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-04', data_prevista_fim: '2024-02-07', data_real_inicio: '2024-02-04', data_real_fim: '2024-02-07', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-08', data_prevista_fim: '2024-02-13', data_real_inicio: '2024-02-08', data_real_fim: '2024-02-15', status: 'Concluída', dias_atraso: 2, observacoes: [{ id: 1, usuario: 'Maria Letro', data: '2024-02-15 10:30', texto: 'Texto do cliente chegou incompleto. Aguardamos complementação.' }] },
      { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-14', data_prevista_fim: '2024-02-21', data_real_inicio: '2024-02-16', data_real_fim: null, status: 'Atrasada', dias_atraso: 8, observacoes: [{ id: 2, usuario: 'Maria Letro', data: '2024-02-28 14:20', texto: 'Cliente solicitou mudanças no conceito visual. Aguardando nova aprovação.' }, { id: 3, usuario: 'Admin Sistema', data: '2024-03-01 09:00', texto: 'Prioridade elevada. Acompanhar diariamente.' }] },
      { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-22', data_prevista_fim: '2024-02-24', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-25', data_prevista_fim: '2024-02-28', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-01', data_prevista_fim: '2024-03-06', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-07', data_prevista_fim: '2024-03-09', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-10', data_prevista_fim: '2024-03-13', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-14', data_prevista_fim: '2024-03-19', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-20', data_prevista_fim: '2024-03-30', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-03-31', data_prevista_fim: '2024-04-03', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-04-04', data_prevista_fim: '2024-04-06', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-04-07', data_prevista_fim: '2024-04-12', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }
    ]
  },
  {
    id: 'projeto-3',
    contrato_id: 'contrato-3',
    cliente: 'Turma Direito 2024',
    instituicao: 'FUMEC',
    etapa_atual: 2,
    etapa_atual_nome: 'Ativação',
    progresso: 14,
    status: 'Em Andamento',
    data_entrega: '2024-08-30',
    dias_restantes: 106,
    dias_atraso: 0,
    etapas: [
      { id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-01', data_prevista_fim: '2024-03-03', data_real_inicio: '2024-03-01', data_real_fim: '2024-03-03', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-04', data_prevista_fim: '2024-03-07', data_real_inicio: '2024-03-04', data_real_fim: null, status: 'Em Andamento', dias_atraso: 0, observacoes: [] },
      { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-08', data_prevista_fim: '2024-03-13', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-14', data_prevista_fim: '2024-03-21', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-22', data_prevista_fim: '2024-03-24', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-25', data_prevista_fim: '2024-03-28', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-29', data_prevista_fim: '2024-04-03', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-04-04', data_prevista_fim: '2024-04-06', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-04-07', data_prevista_fim: '2024-04-10', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-04-11', data_prevista_fim: '2024-04-16', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-04-17', data_prevista_fim: '2024-04-27', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-04-28', data_prevista_fim: '2024-05-01', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-05-02', data_prevista_fim: '2024-05-04', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-05-05', data_prevista_fim: '2024-05-10', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }
    ]
  },
  {
    id: 'projeto-4',
    contrato_id: 'contrato-4',
    cliente: 'Turma Administração 2024',
    instituicao: 'Una',
    etapa_atual: 14,
    etapa_atual_nome: 'Pós-Vendas',
    progresso: 100,
    status: 'Concluído',
    data_entrega: '2024-05-15',
    dias_restantes: 0,
    dias_atraso: 0,
    etapas: [
      { id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-01-20', data_prevista_fim: '2024-01-22', data_real_inicio: '2024-01-20', data_real_fim: '2024-01-22', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-01-23', data_prevista_fim: '2024-01-26', data_real_inicio: '2024-01-23', data_real_fim: '2024-01-26', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-01-27', data_prevista_fim: '2024-02-01', data_real_inicio: '2024-01-27', data_real_fim: '2024-02-01', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-02', data_prevista_fim: '2024-02-09', data_real_inicio: '2024-02-02', data_real_fim: '2024-02-09', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-10', data_prevista_fim: '2024-02-12', data_real_inicio: '2024-02-10', data_real_fim: '2024-02-12', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-13', data_prevista_fim: '2024-02-16', data_real_inicio: '2024-02-13', data_real_fim: '2024-02-16', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-17', data_prevista_fim: '2024-02-22', data_real_inicio: '2024-02-17', data_real_fim: '2024-02-22', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-23', data_prevista_fim: '2024-02-25', data_real_inicio: '2024-02-23', data_real_fim: '2024-02-25', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-02-26', data_prevista_fim: '2024-02-29', data_real_inicio: '2024-02-26', data_real_fim: '2024-02-29', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-01', data_prevista_fim: '2024-03-06', data_real_inicio: '2024-03-01', data_real_fim: '2024-03-06', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-07', data_prevista_fim: '2024-03-17', data_real_inicio: '2024-03-07', data_real_fim: '2024-03-17', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-03-18', data_prevista_fim: '2024-03-21', data_real_inicio: '2024-03-18', data_real_fim: '2024-03-21', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-03-22', data_prevista_fim: '2024-03-24', data_real_inicio: '2024-03-22', data_real_fim: '2024-03-24', status: 'Concluída', dias_atraso: 0, observacoes: [] },
      { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-25', data_prevista_fim: '2024-03-30', data_real_inicio: '2024-03-25', data_real_fim: '2024-03-30', status: 'Concluída', dias_atraso: 0, observacoes: [] }
    ]
  },
  {
    id: 'projeto-5',
    contrato_id: 'contrato-5',
    cliente: 'Turma Comunicação 2024',
    instituicao: 'Estácio BH',
    etapa_atual: 1,
    etapa_atual_nome: 'Lançamento',
    progresso: 7,
    status: 'Ativo',
    data_entrega: '2024-09-30',
    dias_restantes: 137,
    dias_atraso: 0,
    etapas: [
      { id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-04-01', data_prevista_fim: '2024-04-03', data_real_inicio: '2024-04-01', data_real_fim: null, status: 'Em Andamento', dias_atraso: 0, observacoes: [] },
      { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-04-04', data_prevista_fim: '2024-04-07', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-08', data_prevista_fim: '2024-04-13', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-14', data_prevista_fim: '2024-04-21', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-22', data_prevista_fim: '2024-04-24', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-25', data_prevista_fim: '2024-04-28', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-29', data_prevista_fim: '2024-05-04', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-05-05', data_prevista_fim: '2024-05-07', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-05-08', data_prevista_fim: '2024-05-11', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-05-12', data_prevista_fim: '2024-05-17', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-05-18', data_prevista_fim: '2024-05-28', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-05-29', data_prevista_fim: '2024-06-01', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-06-02', data_prevista_fim: '2024-06-04', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] },
      { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-06-05', data_prevista_fim: '2024-06-10', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }
    ]
  },
  // Projeto 6 - Ativo
  { id: 'projeto-6', contrato_id: 'contrato-6', cliente: 'Turma Arquitetura 2024', instituicao: 'PUC Minas', etapa_atual: 3, etapa_atual_nome: 'Revisão de Texto', progresso: 21, status: 'Ativo', data_entrega: '2024-07-20', dias_restantes: 75, dias_atraso: 0, etapas: [{ id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-10', data_prevista_fim: '2024-02-12', data_real_inicio: '2024-02-10', data_real_fim: '2024-02-12', status: 'Concluída', dias_atraso: 0, observacoes: [] }, { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-13', data_prevista_fim: '2024-02-16', data_real_inicio: '2024-02-13', data_real_fim: '2024-02-16', status: 'Concluída', dias_atraso: 0, observacoes: [] }, { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-17', data_prevista_fim: '2024-02-22', data_real_inicio: '2024-02-17', data_real_fim: null, status: 'Em Andamento', dias_atraso: 0, observacoes: [] }, { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-23', data_prevista_fim: '2024-03-02', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-03', data_prevista_fim: '2024-03-05', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-06', data_prevista_fim: '2024-03-09', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-10', data_prevista_fim: '2024-03-15', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-16', data_prevista_fim: '2024-03-18', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-19', data_prevista_fim: '2024-03-22', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-23', data_prevista_fim: '2024-03-28', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-29', data_prevista_fim: '2024-04-08', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-04-09', data_prevista_fim: '2024-04-12', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-04-13', data_prevista_fim: '2024-04-15', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-04-16', data_prevista_fim: '2024-04-21', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }] },
  // Projeto 7 - Ativo
  { id: 'projeto-7', contrato_id: 'contrato-7', cliente: 'Turma Psicologia 2024', instituicao: 'Newton Paiva', etapa_atual: 2, etapa_atual_nome: 'Ativação', progresso: 14, status: 'Ativo', data_entrega: '2024-08-15', dias_restantes: 100, dias_atraso: 0, etapas: [{ id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-15', data_prevista_fim: '2024-03-17', data_real_inicio: '2024-03-15', data_real_fim: '2024-03-17', status: 'Concluída', dias_atraso: 0, observacoes: [] }, { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-18', data_prevista_fim: '2024-03-21', data_real_inicio: '2024-03-18', data_real_fim: null, status: 'Em Andamento', dias_atraso: 0, observacoes: [] }, { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-22', data_prevista_fim: '2024-03-27', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-03-28', data_prevista_fim: '2024-04-04', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-05', data_prevista_fim: '2024-04-07', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-08', data_prevista_fim: '2024-04-11', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-04-12', data_prevista_fim: '2024-04-17', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-04-18', data_prevista_fim: '2024-04-20', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-04-21', data_prevista_fim: '2024-04-24', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-04-25', data_prevista_fim: '2024-04-30', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-05-01', data_prevista_fim: '2024-05-11', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-05-12', data_prevista_fim: '2024-05-15', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-05-16', data_prevista_fim: '2024-05-18', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-05-19', data_prevista_fim: '2024-05-24', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }] },
  // Projeto 8 - Ativo
  { id: 'projeto-8', contrato_id: 'contrato-8', cliente: 'Turma Odontologia 2024', instituicao: 'UFMG', etapa_atual: 4, etapa_atual_nome: 'Criação (1ª e 2ª AP)', progresso: 28, status: 'Ativo', data_entrega: '2024-06-25', dias_restantes: 50, dias_atraso: 0, etapas: [{ id: 1, nome: 'Lançamento', responsavel: 'Ana Costa', data_prevista_inicio: '2024-01-25', data_prevista_fim: '2024-01-27', data_real_inicio: '2024-01-25', data_real_fim: '2024-01-27', status: 'Concluída', dias_atraso: 0, observacoes: [] }, { id: 2, nome: 'Ativação', responsavel: 'Ana Costa', data_prevista_inicio: '2024-01-28', data_prevista_fim: '2024-01-31', data_real_inicio: '2024-01-28', data_real_fim: '2024-01-31', status: 'Concluída', dias_atraso: 0, observacoes: [] }, { id: 3, nome: 'Revisão de Texto', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-01', data_prevista_fim: '2024-02-06', data_real_inicio: '2024-02-01', data_real_fim: '2024-02-06', status: 'Concluída', dias_atraso: 0, observacoes: [] }, { id: 4, nome: 'Criação (1ª e 2ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-07', data_prevista_fim: '2024-02-14', data_real_inicio: '2024-02-07', data_real_fim: null, status: 'Em Andamento', dias_atraso: 0, observacoes: [] }, { id: 5, nome: 'Conferência', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-15', data_prevista_fim: '2024-02-17', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 6, nome: 'Ajuste de Layout', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-18', data_prevista_fim: '2024-02-21', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 7, nome: 'Criação (3ª e 4ª AP)', responsavel: 'Maria Letro', data_prevista_inicio: '2024-02-22', data_prevista_fim: '2024-02-27', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 8, nome: 'Aprovação Final', responsavel: 'Ana Costa', data_prevista_inicio: '2024-02-28', data_prevista_fim: '2024-03-02', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 9, nome: 'Planejamento Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-03', data_prevista_fim: '2024-03-06', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 10, nome: 'Pré-Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-07', data_prevista_fim: '2024-03-12', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 11, nome: 'Produção', responsavel: 'João Silva', data_prevista_inicio: '2024-03-13', data_prevista_fim: '2024-03-23', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 12, nome: 'Controle de Qualidade', responsavel: 'João Silva', data_prevista_inicio: '2024-03-24', data_prevista_fim: '2024-03-27', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 13, nome: 'Entrega', responsavel: 'João Silva', data_prevista_inicio: '2024-03-28', data_prevista_fim: '2024-03-30', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }, { id: 14, nome: 'Pós-Vendas', responsavel: 'Ana Costa', data_prevista_inicio: '2024-03-31', data_prevista_fim: '2024-04-05', data_real_inicio: null, data_real_fim: null, status: 'Não Iniciada', dias_atraso: 0, observacoes: [] }] }
,
  // Restantes projetos Ativos (9-12)
  { id: 'projeto-9', contrato_id: 'contrato-9', cliente: 'Turma Veterinária 2024', instituicao: 'Centro Universitário BH', etapa_atual: 2, etapa_atual_nome: 'Ativação', progresso: 14, status: 'Ativo', data_entrega: '2024-09-05', dias_restantes: 120, dias_atraso: 0, etapas: [] },
  { id: 'projeto-10', contrato_id: 'contrato-10', cliente: 'Turma Enfermagem 2024', instituicao: 'Faculdade Santa Casa', etapa_atual: 3, etapa_atual_nome: 'Revisão de Texto', progresso: 21, status: 'Ativo', data_entrega: '2024-08-20', dias_restantes: 95, dias_atraso: 0, etapas: [] },
  { id: 'projeto-11', contrato_id: 'contrato-11', cliente: 'Turma Fisioterapia 2024', instituicao: 'Una Bom Despacho', etapa_atual: 1, etapa_atual_nome: 'Lançamento', progresso: 7, status: 'Ativo', data_entrega: '2024-07-15', dias_restantes: 68, dias_atraso: 0, etapas: [] },
  { id: 'projeto-12', contrato_id: 'contrato-12', cliente: 'Turma Ciências Contábeis 2024', instituicao: 'Estácio BH', etapa_atual: 1, etapa_atual_nome: 'Lançamento', progresso: 7, status: 'Ativo', data_entrega: '2024-09-10', dias_restantes: 125, dias_atraso: 0, etapas: [] },
  // Projetos Atrasados (13-21)
  { id: 'projeto-13', contrato_id: 'contrato-13', cliente: 'Turma Biomedicina 2024', instituicao: 'UFMG', etapa_atual: 4, etapa_atual_nome: 'Criação (1ª e 2ª AP)', progresso: 28, status: 'Atrasado', data_entrega: '2024-06-10', dias_restantes: 30, dias_atraso: 6, etapas: [] },
  { id: 'projeto-14', contrato_id: 'contrato-14', cliente: 'Turma Farmácia 2024', instituicao: 'Newton Paiva', etapa_atual: 5, etapa_atual_nome: 'Conferência', progresso: 35, status: 'Atrasado', data_entrega: '2024-07-05', dias_restantes: 58, dias_atraso: 4, etapas: [] },
  { id: 'projeto-15', contrato_id: 'contrato-15', cliente: 'Turma Nutrição 2024', instituicao: 'Una Contagem', etapa_atual: 3, etapa_atual_nome: 'Revisão de Texto', progresso: 21, status: 'Atrasado', data_entrega: '2024-06-20', dias_restantes: 40, dias_atraso: 7, etapas: [] },
  { id: 'projeto-16', contrato_id: 'contrato-16', cliente: 'Turma Ed. Física 2024', instituicao: 'FUMEC', etapa_atual: 4, etapa_atual_nome: 'Criação (1ª e 2ª AP)', progresso: 28, status: 'Atrasado', data_entrega: '2024-07-10', dias_restantes: 63, dias_atraso: 5, etapas: [] },
  { id: 'projeto-17', contrato_id: 'contrato-17', cliente: 'Turma Jornalismo 2024', instituicao: 'PUC Minas', etapa_atual: 6, etapa_atual_nome: 'Ajuste de Layout', progresso: 42, status: 'Atrasado', data_entrega: '2024-06-15', dias_restantes: 35, dias_atraso: 8, etapas: [] },
  { id: 'projeto-18', contrato_id: 'contrato-18', cliente: 'Turma Design Gráfico 2024', instituicao: 'Estácio BH', etapa_atual: 3, etapa_atual_nome: 'Revisão de Texto', progresso: 21, status: 'Atrasado', data_entrega: '2024-07-20', dias_restantes: 73, dias_atraso: 3, etapas: [] },
  { id: 'projeto-19', contrato_id: 'contrato-19', cliente: 'Turma Marketing 2024', instituicao: 'Centro Universitário BH', etapa_atual: 7, etapa_atual_nome: 'Criação (3ª e 4ª AP)', progresso: 50, status: 'Atrasado', data_entrega: '2024-06-25', dias_restantes: 45, dias_atraso: 9, etapas: [] },
  { id: 'projeto-20', contrato_id: 'contrato-20', cliente: 'Turma Publicidade 2024', instituicao: 'Newton Paiva', etapa_atual: 4, etapa_atual_nome: 'Criação (1ª e 2ª AP)', progresso: 28, status: 'Atrasado', data_entrega: '2024-07-01', dias_restantes: 54, dias_atraso: 6, etapas: [] },
  { id: 'projeto-21', contrato_id: 'contrato-21', cliente: 'Turma Sistemas de Informação 2024', instituicao: 'FUMEC', etapa_atual: 5, etapa_atual_nome: 'Conferência', progresso: 35, status: 'Atrasado', data_entrega: '2024-06-30', dias_restantes: 53, dias_atraso: 10, etapas: [] },
  // Projetos Concluídos (22-25)
  { id: 'projeto-22', contrato_id: 'contrato-22', cliente: 'Turma Ciências Biológicas 2023', instituicao: 'UFMG', etapa_atual: 14, etapa_atual_nome: 'Pós-Vendas', progresso: 100, status: 'Concluído', data_entrega: '2024-01-15', dias_restantes: 0, dias_atraso: 0, etapas: [] },
  { id: 'projeto-23', contrato_id: 'contrato-23', cliente: 'Turma Geografia 2023', instituicao: 'PUC Minas', etapa_atual: 14, etapa_atual_nome: 'Pós-Vendas', progresso: 100, status: 'Concluído', data_entrega: '2024-02-20', dias_restantes: 0, dias_atraso: 0, etapas: [] },
  { id: 'projeto-24', contrato_id: 'contrato-24', cliente: 'Turma História 2023', instituicao: 'Newton Paiva', etapa_atual: 14, etapa_atual_nome: 'Pós-Vendas', progresso: 100, status: 'Concluído', data_entrega: '2024-03-10', dias_restantes: 0, dias_atraso: 0, etapas: [] },
  { id: 'projeto-25', contrato_id: 'contrato-25', cliente: 'Turma Letras 2023', instituicao: 'FUMEC', etapa_atual: 14, etapa_atual_nome: 'Pós-Vendas', progresso: 100, status: 'Concluído', data_entrega: '2024-04-05', dias_restantes: 0, dias_atraso: 0, etapas: [] }

];

export const mockTarefas = mockProjetos.flatMap(projeto => 
  projeto.etapas.filter(e => e.status === 'Em Andamento' || e.status === 'Atrasada').map(etapa => ({
    id: `tarefa-${projeto.id}-${etapa.id}`,
    projeto_id: projeto.id,
    cliente: projeto.cliente,
    titulo: etapa.nome,
    etapa: etapa.nome,
    responsavel: etapa.responsavel,
    prazo: etapa.data_prevista_fim,
    status: etapa.status === 'Atrasada' ? 'Atrasada' : 'Em Andamento',
    dias_atraso: etapa.dias_atraso
  }))
);

export const mockDashboard = {
  timestamp: new Date().toISOString(),
  kpis: {
    total_projetos: mockProjetos.length,
    em_dia: mockProjetos.filter(p => p.status === 'Em Andamento' && p.dias_atraso === 0).length,
    atrasados: mockProjetos.filter(p => p.status === 'Atrasado').length,
    concluidos: mockProjetos.filter(p => p.status === 'Concluído').length,
    percentual_no_prazo: Math.round((mockProjetos.filter(p => p.dias_atraso === 0).length / mockProjetos.length) * 100)
  },
  tarefas_atrasadas: mockTarefas.filter(t => t.status === 'Atrasada'),
  gargalos_responsaveis: [
    ['Maria Letro', 2],
    ['João Silva', 1],
    ['Ana Costa', 1]
  ]
};

export const mockNotificacoes = [
  {
    id: 'notif-1',
    titulo: 'Projeto atrasado',
    mensagem: 'Turma Medicina 2024 está com 8 dias de atraso na etapa Criação',
    tipo: 'alerta',
    lida: false,
    created_at: '2024-05-14T10:30:00'
  },
  {
    id: 'notif-2',
    titulo: 'Nova observação',
    mensagem: 'Maria Letro adicionou uma observação no projeto PUC Minas',
    tipo: 'info',
    lida: false,
    created_at: '2024-05-13T14:00:00'
  },
  {
    id: 'notif-3',
    titulo: 'Projeto concluído',
    mensagem: 'Turma Administração 2024 foi finalizado com sucesso',
    tipo: 'sucesso',
    lida: true,
    created_at: '2024-05-10T09:00:00'
  }
];

export const STATUS_PROJETO = {
  EM_ANDAMENTO: 'Em Andamento',
  ATRASADO: 'Atrasado',
  CONCLUIDO: 'Concluído'
};

export const STATUS_ETAPA = {
  NAO_INICIADA: 'Não Iniciada',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada'
};

export const DEPARTAMENTOS = [
  { id: 'atendimento', nome: 'Atendimento', cor: '#3b82f6', icone: 'Users' },
  { id: 'criacao', nome: 'Criação', cor: '#8b5cf6', icone: 'Palette' },
  { id: 'pre-producao', nome: 'Pré-Produção', cor: '#f59e0b', icone: 'ClipboardList' },
  { id: 'producao', nome: 'Produção', cor: '#10b981', icone: 'Package' }
];
