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

export default api;
