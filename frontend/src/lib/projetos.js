const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export const isTarefaEfetivamenteFinalizada = (tarefa) => {
  const status = normalizeText(tarefa?.status_nome);
  return Boolean(
    tarefa?.finalizada
    || tarefa?.data_finalizacao
    || status.includes('concluido')
    || status.includes('finalizado')
    || status.includes('entregue')
  );
};

export const getStatusFiltroDaTarefa = (tarefa) => {
  if (isTarefaEfetivamenteFinalizada(tarefa)) return 'concluida';
  const status = normalizeText(tarefa?.status_nome);
  if (status.includes('andamento')) return 'em_andamento';
  return 'pendente';
};

export const getPeriodoPasta = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sem periodo';
  const semestre = date.getMonth() < 6 ? 1 : 2;
  return `${date.getFullYear()}.${semestre}`;
};

export const getPeriodoSortValue = (periodo) => {
  const match = /^(\d{4})\.(1|2)$/.exec(periodo || '');
  if (!match) return -1;
  return Number(match[1]) * 10 + Number(match[2]);
};

export const getPeriodoProjeto = (projeto) => {
  const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
  const titulo = contrato?.numero_contrato || '';
  const match = /(\d{4}\.[12])/.exec(titulo);
  if (match) return match[1];
  return 'Sem periodo';
};

export const getNomePastaContrato = (projeto) => {
  const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
  const partes = [contrato.numero_contrato, contrato.curso, contrato.faculdade].filter(Boolean);

  if (partes.length > 0) {
    return partes.join(' ').toUpperCase();
  }

  return String(projeto?.cliente || 'CONTRATO').toUpperCase();
};

export const getStatusProjetoEfetivo = (projeto, tarefas = []) => {
  const tarefasProjeto = Array.isArray(tarefas) ? tarefas : [];
  const tarefasFinalizadas = tarefasProjeto.filter(isTarefaEfetivamenteFinalizada).length;
  const temTarefas = tarefasProjeto.length > 0;

  if (temTarefas && tarefasFinalizadas === tarefasProjeto.length) {
    return 'Concluído';
  }

  if (temTarefas && tarefasProjeto.some((tarefa) => !isTarefaEfetivamenteFinalizada(tarefa) && tarefa?.atrasada)) {
    return 'Atrasado';
  }

  if (
    temTarefas
    && tarefasProjeto.some((tarefa) => (
      !isTarefaEfetivamenteFinalizada(tarefa)
      && normalizeText(tarefa?.status_nome).includes('andamento')
    ))
  ) {
    return 'Em Andamento';
  }

  if (temTarefas && tarefasFinalizadas > 0) {
    return 'Em Andamento';
  }

  const statusProjeto = normalizeText(projeto?.status);
  if (statusProjeto.includes('concluido') || statusProjeto.includes('finalizado') || (projeto?.progresso || 0) >= 100) {
    return 'Concluído';
  }
  if (statusProjeto.includes('atrasado') || (projeto?.tarefas_atrasadas || 0) > 0) {
    return 'Atrasado';
  }
  if (statusProjeto.includes('andamento') || statusProjeto.includes('ativo')) {
    return 'Em Andamento';
  }

  return 'Pendente';
};

export const isProjetoEfetivamenteConcluido = (projeto, tarefas = []) => (
  getStatusProjetoEfetivo(projeto, tarefas) === 'Concluído'
);
