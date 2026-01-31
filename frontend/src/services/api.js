import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// Status de Tarefas
// ==========================================

export const getStatusTarefas = async () => {
  const response = await api.get('/api/status-tarefas');
  return response.data;
};

export const criarStatusTarefa = async (data, userRole, userId) => {
  const response = await api.post(`/api/status-tarefas?user_role=${userRole}&user_id=${userId}`, data);
  return response.data;
};

export const atualizarStatusTarefa = async (statusId, data, userRole) => {
  const response = await api.put(`/api/status-tarefas/${statusId}?user_role=${userRole}`, data);
  return response.data;
};

export const deletarStatusTarefa = async (statusId, userRole) => {
  const response = await api.delete(`/api/status-tarefas/${statusId}?user_role=${userRole}`);
  return response.data;
};

// ==========================================
// Tarefas
// ==========================================

export const getTarefas = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.projeto_id) params.append('projeto_id', filters.projeto_id);
  if (filters.contrato_id) params.append('contrato_id', filters.contrato_id);
  if (filters.setor) params.append('setor', filters.setor);
  if (filters.status_id) params.append('status_id', filters.status_id);
  if (filters.responsavel_id) params.append('responsavel_id', filters.responsavel_id);
  if (filters.finalizada !== undefined) params.append('finalizada', filters.finalizada);
  if (filters.atrasada !== undefined) params.append('atrasada', filters.atrasada);
  
  const response = await api.get(`/api/tarefas?${params.toString()}`);
  return response.data;
};

export const getTarefa = async (tarefaId) => {
  const response = await api.get(`/api/tarefas/${tarefaId}`);
  return response.data;
};

export const criarTarefa = async (data) => {
  const response = await api.post('/api/tarefas', data);
  return response.data;
};

export const atualizarTarefa = async (tarefaId, data) => {
  const response = await api.put(`/api/tarefas/${tarefaId}`, data);
  return response.data;
};

export const finalizarTarefa = async (tarefaId, data) => {
  const response = await api.post(`/api/tarefas/${tarefaId}/finalizar`, data);
  return response.data;
};

export const alterarStatusTarefa = async (tarefaId, data) => {
  const response = await api.post(`/api/tarefas/${tarefaId}/alterar-status`, data);
  return response.data;
};

export const deletarTarefa = async (tarefaId, userRole, userId) => {
  const response = await api.delete(`/api/tarefas/${tarefaId}?user_role=${userRole}&user_id=${userId}`);
  return response.data;
};

export const deletarTodasTarefas = async (userRole, userId) => {
  const response = await api.delete(`/api/tarefas?user_role=${userRole}&user_id=${userId}`);
  return response.data;
};

// ==========================================
// Relatórios de Atrasos
// ==========================================

export const getTarefasAtrasadas = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.projeto_id) params.append('projeto_id', filters.projeto_id);
  if (filters.setor) params.append('setor', filters.setor);
  
  const response = await api.get(`/api/tarefas-atrasadas?${params.toString()}`);
  return response.data;
};

export const getAtrasosPorSetor = async () => {
  const response = await api.get('/api/atrasos-por-setor');
  return response.data;
};

export const getAtrasosPorProjeto = async (projetoId) => {
  const response = await api.get(`/api/atrasos-por-projeto/${projetoId}`);
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/api/dashboard-stats');
  return response.data;
};

// ==========================================
// Templates de Prazos
// ==========================================

export const getTemplatesPrazos = async () => {
  const response = await api.get('/api/templates-prazos');
  return response.data;
};

export const getTemplatePrazo = async (templateId) => {
  const response = await api.get(`/api/templates-prazos/${templateId}`);
  return response.data;
};

export const criarTemplatePrazo = async (data, userId, userRole) => {
  const response = await api.post(`/api/templates-prazos?user_id=${userId}&user_role=${userRole}`, data);
  return response.data;
};

export const atualizarTemplatePrazo = async (templateId, data, userRole) => {
  const response = await api.put(`/api/templates-prazos/${templateId}?user_role=${userRole}`, data);
  return response.data;
};

export const deletarTemplatePrazo = async (templateId, userRole) => {
  const response = await api.delete(`/api/templates-prazos/${templateId}?user_role=${userRole}`);
  return response.data;
};

export const criarTemplatePadrao = async (userId, userRole) => {
  const response = await api.post(`/api/templates-prazos/criar-padrao?user_id=${userId}&user_role=${userRole}`);
  return response.data;
};

export const aplicarTemplateContrato = async (contratoId, templateId, dataInicio) => {
  const response = await api.post(
    `/api/contratos/${contratoId}/aplicar-template/${templateId}?data_inicio=${dataInicio}`
  );
  return response.data;
};

export const getPrazosContrato = async (contratoId) => {
  const response = await api.get(`/api/contratos/${contratoId}/prazos`);
  return response.data;
};

// ==========================================
// Relatórios
// ==========================================

export const getRelatorioGargalos = async () => {
  const response = await api.get('/api/relatorio-gargalos');
  return response.data;
};

export const getRelatorioSemanal = async () => {
  const response = await api.get('/api/relatorio-semanal');
  return response.data;
};

export const getRelatorioMensal = async () => {
  const response = await api.get('/api/relatorio-mensal');
  return response.data;
};

// ==========================================
// Contratos
// ==========================================

export const getContratos = async () => {
  const response = await api.get('/api/contratos');
  return response.data;
};

export const getContrato = async (contratoId) => {
  const response = await api.get(`/api/contratos/${contratoId}`);
  return response.data;
};

export const criarContrato = async (data) => {
  const response = await api.post('/api/contratos', data);
  return response.data;
};

export const atualizarContrato = async (contratoId, data) => {
  const response = await api.put(`/api/contratos/${contratoId}`, data);
  return response.data;
};

export const deletarContrato = async (contratoId, userRole) => {
  const response = await api.delete(`/api/contratos/${contratoId}?user_role=${userRole}`);
  return response.data;
};

// ==========================================
// Projetos
// ==========================================

export const getProjetos = async () => {
  const response = await api.get('/api/projetos');
  return response.data;
};

export const getProjeto = async (projetoId) => {
  const response = await api.get(`/api/projetos/${projetoId}`);
  return response.data;
};

// ==========================================
// Notificações
// ==========================================

export const getNotificacoes = async (usuarioId, apenasNaoLidas = false) => {
  const response = await api.get(`/api/notificacoes/${usuarioId}?apenas_nao_lidas=${apenasNaoLidas}`);
  return response.data;
};

export const criarNotificacao = async (data) => {
  const response = await api.post('/api/notificacoes', data);
  return response.data;
};

export const marcarNotificacaoLida = async (notificacaoId) => {
  const response = await api.put(`/api/notificacoes/${notificacaoId}/marcar-lida`);
  return response.data;
};

export const cobrarOperador = async (data, userRole) => {
  const response = await api.post(`/api/cobrar-operador?user_role=${userRole}`, data);
  return response.data;
};

export const responderCobranca = async (data) => {
  const response = await api.post('/api/cobrancas/responder', data);
  return response.data;
};

// ==========================================
// Atribuição de Tarefas
// ==========================================

export const listarUsuariosSetor = async (setor, userRole, userSetor) => {
  const params = new URLSearchParams();
  params.append('usuario_role', userRole);
  if (userSetor) params.append('usuario_setor', userSetor);
  
  const response = await api.get(`/api/usuarios/setor/${setor}?${params}`);
  return response.data;
};

export const atribuirTarefa = async (
  tarefaId,
  usuarioId,
  usuarioNome,
  usuarioSetor,
  atribuidorId,
  atribuidorNome,
  atribuidorSetor,
  atribuidorRole
) => {
  const params = new URLSearchParams();
  params.append('atribuidor_id', atribuidorId);
  params.append('atribuidor_nome', atribuidorNome);
  params.append('atribuidor_setor', atribuidorSetor);
  params.append('atribuidor_role', atribuidorRole);
  
  const data = {
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    usuario_setor: usuarioSetor,
  };
  
  const response = await api.post(`/api/tarefas/${tarefaId}/atribuir?${params}`, data);
  return response.data;
};

// ==========================================
// Dashboard Avançado
// ==========================================

export const getDashboardAvancado = async () => {
  const response = await api.get('/api/dashboard-avancado');
  return response.data;
};

export default api;
