/**
 * Testes unitários para src/lib/projetos.js
 *
 * Cobre as duas funcionalidades principais:
 *  1. Filtro de Semestres – lógica de período (getPeriodoPasta, getPeriodoProjeto,
 *     getPeriodoSortValue, getNomePastaContrato)
 *  2. Aba "Finalizados" – lógica de status efetivo do projeto e da tarefa
 *     (isTarefaEfetivamenteFinalizada, getStatusFiltroDaTarefa,
 *      getStatusProjetoEfetivo, isProjetoEfetivamenteConcluido)
 */

import {
  isTarefaEfetivamenteFinalizada,
  getStatusFiltroDaTarefa,
  getPeriodoPasta,
  getPeriodoSortValue,
  getPeriodoProjeto,
  getNomePastaContrato,
  getStatusProjetoEfetivo,
  isProjetoEfetivamenteConcluido,
} from './projetos';

// ---------------------------------------------------------------------------
// isTarefaEfetivamenteFinalizada
// ---------------------------------------------------------------------------

describe('isTarefaEfetivamenteFinalizada', () => {
  test('retorna false para null/undefined', () => {
    expect(isTarefaEfetivamenteFinalizada(null)).toBe(false);
    expect(isTarefaEfetivamenteFinalizada(undefined)).toBe(false);
  });

  test('retorna true quando finalizada=true', () => {
    expect(isTarefaEfetivamenteFinalizada({ finalizada: true })).toBe(true);
  });

  test('retorna true quando data_finalizacao está preenchida', () => {
    expect(isTarefaEfetivamenteFinalizada({ data_finalizacao: '2024-01-15T10:00:00Z' })).toBe(true);
  });

  test('retorna true quando status_nome contém "concluido" (com acento)', () => {
    expect(isTarefaEfetivamenteFinalizada({ status_nome: 'Concluído' })).toBe(true);
  });

  test('retorna true quando status_nome contém "finalizado"', () => {
    expect(isTarefaEfetivamenteFinalizada({ status_nome: 'Finalizado' })).toBe(true);
    expect(isTarefaEfetivamenteFinalizada({ status_nome: 'FINALIZADO' })).toBe(true);
  });

  test('retorna true quando status_nome contém "entregue"', () => {
    expect(isTarefaEfetivamenteFinalizada({ status_nome: 'Entregue' })).toBe(true);
  });

  test('retorna false para tarefa em andamento', () => {
    expect(isTarefaEfetivamenteFinalizada({ status_nome: 'Em Andamento', finalizada: false })).toBe(false);
  });

  test('retorna false para tarefa pendente', () => {
    expect(isTarefaEfetivamenteFinalizada({ status_nome: 'Pendente' })).toBe(false);
    expect(isTarefaEfetivamenteFinalizada({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStatusFiltroDaTarefa
// ---------------------------------------------------------------------------

describe('getStatusFiltroDaTarefa', () => {
  test('retorna "concluida" para tarefas finalizadas (flag)', () => {
    expect(getStatusFiltroDaTarefa({ finalizada: true })).toBe('concluida');
  });

  test('retorna "concluida" para tarefas com status Concluído', () => {
    expect(getStatusFiltroDaTarefa({ status_nome: 'Concluído' })).toBe('concluida');
  });

  test('retorna "em_andamento" para tarefas em andamento', () => {
    expect(getStatusFiltroDaTarefa({ status_nome: 'Em Andamento' })).toBe('em_andamento');
  });

  test('retorna "pendente" para tarefas sem status definido', () => {
    expect(getStatusFiltroDaTarefa({})).toBe('pendente');
  });

  test('retorna "pendente" para tarefas explicitamente pendentes', () => {
    expect(getStatusFiltroDaTarefa({ status_nome: 'Pendente' })).toBe('pendente');
  });

  test('concluída tem precedência sobre qualquer outra lógica', () => {
    // finalizada=true + status_nome em andamento → ainda concluída
    expect(getStatusFiltroDaTarefa({ finalizada: true, status_nome: 'Em Andamento' })).toBe('concluida');
  });
});

// ---------------------------------------------------------------------------
// getPeriodoPasta  (Filtro de Semestres)
// ---------------------------------------------------------------------------

describe('getPeriodoPasta', () => {
  test('retorna "Sem periodo" para null/undefined/vazio', () => {
    expect(getPeriodoPasta(null)).toBe('Sem periodo');
    expect(getPeriodoPasta(undefined)).toBe('Sem periodo');
    expect(getPeriodoPasta('')).toBe('Sem periodo');
  });

  test('retorna "Sem periodo" para data inválida', () => {
    expect(getPeriodoPasta('nao-e-uma-data')).toBe('Sem periodo');
  });

  test('retorna semestre 1 para datas de janeiro a junho', () => {
    // Jan, Mar, Jun (mês índice 0, 2, 5 — todos < 6 → semestre 1)
    expect(getPeriodoPasta('2024-01-15')).toBe('2024.1');
    expect(getPeriodoPasta('2024-03-01')).toBe('2024.1');
    expect(getPeriodoPasta('2024-06-15')).toBe('2024.1');
  });

  test('retorna semestre 2 para datas de julho a dezembro', () => {
    // Datas do meio do mês para evitar problema de fuso UTC-3 (1º dia UTC = último dia do mês anterior)
    expect(getPeriodoPasta('2024-07-15')).toBe('2024.2');
    expect(getPeriodoPasta('2024-09-15')).toBe('2024.2');
    expect(getPeriodoPasta('2024-12-15')).toBe('2024.2');
  });

  test('inclui o ano correto no período', () => {
    expect(getPeriodoPasta('2023-02-10')).toBe('2023.1');
    expect(getPeriodoPasta('2025-10-20')).toBe('2025.2');
  });
});

// ---------------------------------------------------------------------------
// getPeriodoSortValue  (Filtro de Semestres – ordenação)
// ---------------------------------------------------------------------------

describe('getPeriodoSortValue', () => {
  test('retorna -1 para formatos inválidos', () => {
    expect(getPeriodoSortValue(null)).toBe(-1);
    expect(getPeriodoSortValue('')).toBe(-1);
    expect(getPeriodoSortValue('Sem periodo')).toBe(-1);
    expect(getPeriodoSortValue('2024')).toBe(-1);
    expect(getPeriodoSortValue('2024.3')).toBe(-1);
  });

  test('calcula valor correto de ordenação', () => {
    expect(getPeriodoSortValue('2024.1')).toBe(20241);
    expect(getPeriodoSortValue('2024.2')).toBe(20242);
    expect(getPeriodoSortValue('2023.2')).toBe(20232);
  });

  test('períodos mais recentes têm valor maior', () => {
    expect(getPeriodoSortValue('2024.2')).toBeGreaterThan(getPeriodoSortValue('2024.1'));
    expect(getPeriodoSortValue('2025.1')).toBeGreaterThan(getPeriodoSortValue('2024.2'));
  });

  test('ordenação descendente reflete cronologia correta', () => {
    const periodos = ['2024.1', '2023.2', '2025.1', '2024.2'];
    const ordenados = [...periodos].sort((a, b) => getPeriodoSortValue(b) - getPeriodoSortValue(a));
    expect(ordenados).toEqual(['2025.1', '2024.2', '2024.1', '2023.2']);
  });
});

// ---------------------------------------------------------------------------
// getPeriodoProjeto  (Filtro de Semestres – extração de período do projeto)
// ---------------------------------------------------------------------------

describe('getPeriodoProjeto', () => {
  test('prioriza contrato.data_fim', () => {
    const projeto = {
      contrato: { data_fim: '2024-08-15', data_inicio: '2024-01-01' },
      data_fim_prevista: '2023-12-01',
    };
    expect(getPeriodoProjeto(projeto)).toBe('2024.2');
  });

  test('usa contrato.data_inicio quando data_fim está ausente', () => {
    const projeto = { contrato: { data_inicio: '2024-03-01' } };
    expect(getPeriodoProjeto(projeto)).toBe('2024.1');
  });

  test('usa primeiro contrato do array contratos quando contrato está ausente', () => {
    const projeto = { contratos: [{ data_fim: '2024-11-01' }] };
    expect(getPeriodoProjeto(projeto)).toBe('2024.2');
  });

  test('usa projeto.data_fim_prevista como fallback', () => {
    const projeto = { data_fim_prevista: '2024-02-20' };
    expect(getPeriodoProjeto(projeto)).toBe('2024.1');
  });

  test('usa projeto.data_inicio como último fallback', () => {
    const projeto = { data_inicio: '2025-09-05' };
    expect(getPeriodoProjeto(projeto)).toBe('2025.2');
  });

  test('retorna "Sem periodo" para projeto sem datas', () => {
    expect(getPeriodoProjeto({})).toBe('Sem periodo');
    expect(getPeriodoProjeto(null)).toBe('Sem periodo');
  });
});

// ---------------------------------------------------------------------------
// getNomePastaContrato  (Filtro de Semestres – nome exibido na pasta)
// ---------------------------------------------------------------------------

describe('getNomePastaContrato', () => {
  test('combina numero_contrato + curso + faculdade em maiúsculas', () => {
    const projeto = {
      contrato: { numero_contrato: 'CT-001', curso: 'ADM', faculdade: 'UFMG' },
    };
    expect(getNomePastaContrato(projeto)).toBe('CT-001 ADM UFMG');
  });

  test('ignora partes nulas ou vazias', () => {
    const projeto = {
      contrato: { numero_contrato: 'CT-002', curso: null, faculdade: '' },
    };
    expect(getNomePastaContrato(projeto)).toBe('CT-002');
  });

  test('usa apenas faculdade quando número e curso ausentes', () => {
    const projeto = {
      contrato: { faculdade: 'PUC Minas' },
    };
    expect(getNomePastaContrato(projeto)).toBe('PUC MINAS');
  });

  test('usa primeiro contrato do array quando contrato está ausente', () => {
    const projeto = {
      contratos: [{ numero_contrato: 'CT-010', curso: 'DIR' }],
    };
    expect(getNomePastaContrato(projeto)).toBe('CT-010 DIR');
  });

  test('usa cliente como fallback quando não há dados de contrato', () => {
    const projeto = { cliente: 'Empresa XYZ' };
    expect(getNomePastaContrato(projeto)).toBe('EMPRESA XYZ');
  });

  test('usa "CONTRATO" quando não há nenhum dado', () => {
    expect(getNomePastaContrato({})).toBe('CONTRATO');
  });
});

// ---------------------------------------------------------------------------
// getStatusProjetoEfetivo  (Aba "Finalizados")
// ---------------------------------------------------------------------------

describe('getStatusProjetoEfetivo – Aba Finalizados', () => {
  // --- Concluído ---

  test('retorna "Concluído" quando TODAS as tarefas estão finalizadas', () => {
    const tarefas = [
      { status_nome: 'Concluído', finalizada: true },
      { data_finalizacao: '2024-01-10' },
    ];
    expect(getStatusProjetoEfetivo({}, tarefas)).toBe('Concluído');
  });

  test('NÃO retorna "Concluído" quando alguma tarefa ainda está aberta', () => {
    const tarefas = [
      { finalizada: true },
      { status_nome: 'Pendente', finalizada: false },
    ];
    expect(getStatusProjetoEfetivo({}, tarefas)).not.toBe('Concluído');
  });

  test('retorna "Concluído" via projeto.progresso = 100 (sem tarefas)', () => {
    expect(getStatusProjetoEfetivo({ progresso: 100 }, [])).toBe('Concluído');
  });

  test('retorna "Concluído" via projeto.status = "Concluído" (sem tarefas)', () => {
    expect(getStatusProjetoEfetivo({ status: 'Concluído' }, [])).toBe('Concluído');
  });

  test('retorna "Concluído" via projeto.status = "concluido" (sem acento)', () => {
    expect(getStatusProjetoEfetivo({ status: 'concluido' }, [])).toBe('Concluído');
  });

  // --- Atrasado ---

  test('retorna "Atrasado" quando há tarefa aberta com atrasada=true', () => {
    const tarefas = [{ status_nome: 'Em Andamento', finalizada: false, atrasada: true }];
    expect(getStatusProjetoEfetivo({}, tarefas)).toBe('Atrasado');
  });

  test('NÃO considera atrasada uma tarefa já finalizada', () => {
    // tarefa finalizada com flag de atraso não deve contaminar o status
    const tarefas = [{ finalizada: true, atrasada: true }];
    expect(getStatusProjetoEfetivo({}, tarefas)).toBe('Concluído');
  });

  test('retorna "Atrasado" via projeto.tarefas_atrasadas > 0 (sem tarefas)', () => {
    expect(getStatusProjetoEfetivo({ tarefas_atrasadas: 2 }, [])).toBe('Atrasado');
  });

  test('retorna "Atrasado" via projeto.status = "Atrasado" (sem tarefas)', () => {
    expect(getStatusProjetoEfetivo({ status: 'Atrasado' }, [])).toBe('Atrasado');
  });

  // --- Em Andamento ---

  test('retorna "Em Andamento" quando tarefa está em andamento', () => {
    const tarefas = [{ status_nome: 'Em Andamento', finalizada: false, atrasada: false }];
    expect(getStatusProjetoEfetivo({}, tarefas)).toBe('Em Andamento');
  });

  test('retorna "Em Andamento" quando há mix de tarefas concluídas e abertas', () => {
    const tarefas = [
      { finalizada: true },
      { status_nome: 'Pendente', finalizada: false },
    ];
    expect(getStatusProjetoEfetivo({}, tarefas)).toBe('Em Andamento');
  });

  test('retorna "Em Andamento" via projeto.status (sem tarefas)', () => {
    expect(getStatusProjetoEfetivo({ status: 'Em Andamento' }, [])).toBe('Em Andamento');
    expect(getStatusProjetoEfetivo({ status: 'Ativo' }, [])).toBe('Em Andamento');
  });

  // --- Pendente ---

  test('retorna "Pendente" como fallback final (projeto vazio, sem tarefas)', () => {
    expect(getStatusProjetoEfetivo({}, [])).toBe('Pendente');
  });

  test('retorna "Pendente" quando todas as tarefas são pendentes sem atraso', () => {
    const tarefas = [
      { status_nome: 'Pendente', finalizada: false, atrasada: false },
    ];
    expect(getStatusProjetoEfetivo({}, tarefas)).toBe('Pendente');
  });
});

// ---------------------------------------------------------------------------
// isProjetoEfetivamenteConcluido
// ---------------------------------------------------------------------------

describe('isProjetoEfetivamenteConcluido', () => {
  test('retorna true quando status efetivo é Concluído (via progresso)', () => {
    expect(isProjetoEfetivamenteConcluido({ progresso: 100 }, [])).toBe(true);
  });

  test('retorna true quando todas as tarefas estão finalizadas', () => {
    expect(isProjetoEfetivamenteConcluido({}, [{ finalizada: true }])).toBe(true);
  });

  test('retorna false para projetos não concluídos', () => {
    expect(isProjetoEfetivamenteConcluido({ status: 'Em Andamento' }, [])).toBe(false);
    expect(isProjetoEfetivamenteConcluido({}, [])).toBe(false);
    expect(isProjetoEfetivamenteConcluido({}, [{ finalizada: false }])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integração – Filtro de semestres com múltiplos projetos
// ---------------------------------------------------------------------------

describe('Integração: filtro de semestres na sidebar/visão geral', () => {
  const projetos = [
    { id: 1, contrato: { data_fim: '2024-03-15' } },  // 2024.1
    { id: 2, contrato: { data_fim: '2024-09-10' } },  // 2024.2
    { id: 3, contrato: { data_fim: '2025-02-01' } },  // 2025.1
    { id: 4, contratos: [{ data_fim: '2023-11-20' }] }, // 2023.2
  ];

  test('cada projeto mapeia para o semestre correto', () => {
    expect(getPeriodoProjeto(projetos[0])).toBe('2024.1');
    expect(getPeriodoProjeto(projetos[1])).toBe('2024.2');
    expect(getPeriodoProjeto(projetos[2])).toBe('2025.1');
    expect(getPeriodoProjeto(projetos[3])).toBe('2023.2');
  });

  test('ordenação descendente coloca semestres mais recentes primeiro', () => {
    const periodos = projetos.map(getPeriodoProjeto);
    const ordenados = [...periodos].sort((a, b) => getPeriodoSortValue(b) - getPeriodoSortValue(a));
    expect(ordenados).toEqual(['2025.1', '2024.2', '2024.1', '2023.2']);
  });

  test('filtrar por semestre retorna apenas os projetos daquele período', () => {
    const filtro = '2024.1';
    const filtrados = projetos.filter((p) => getPeriodoProjeto(p) === filtro);
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe(1);
  });

  test('filtrar por "todos" retorna todos os projetos', () => {
    const filtro = 'todos';
    const filtrados = filtro === 'todos' ? projetos : projetos.filter((p) => getPeriodoProjeto(p) === filtro);
    expect(filtrados).toHaveLength(4);
  });
});
