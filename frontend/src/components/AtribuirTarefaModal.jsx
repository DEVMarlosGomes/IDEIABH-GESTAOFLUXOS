import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarUsuariosSetor, atribuirTarefa } from '../services/api';
import './TarefaModal.css';

export const AtribuirTarefaModal = ({ isOpen, onClose, tarefa, onSuccess }) => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const normalizeSetor = (setor) => {
    if (!setor) return '';
    const key = setor.toLowerCase().replace('-', '').replace('_', '').replace(' ', '');
    const setorMap = {
      'atendimento': 'atendimento',
      'criacao': 'criacao',
      'criação': 'criacao',
      'preproducao': 'pre-producao',
      'préproducao': 'pre-producao',
      'producao': 'producao',
      'produção': 'producao',
    };
    return setorMap[key] || setor;
  };

  // Carregar usuários do setor quando o modal abre
  useEffect(() => {
    if (isOpen && tarefa) {
      carregarUsuarios();
    }
  }, [isOpen, tarefa]);

  const carregarUsuarios = async () => {
    try {
      setAssigning(true);
      setError(null);
      setSuccess(false);
      setUsuarioSelecionado(null);
      
      // Listar usuários do setor da tarefa
      const setorTarefa = normalizeSetor(tarefa?.setor);
      if (!setorTarefa) {
        setUsuarios([]);
        setError('Setor da tarefa não identificado');
        return;
      }

      const dados = await listarUsuariosSetor(
        setorTarefa,
        user.role,
        user.role === 'gerente' ? normalizeSetor(user.setor) : undefined
      );
      
      const setorNormalizado = normalizeSetor(tarefa?.setor);
      const apenasOperadores = (dados || []).filter((usuario) => {
        const usuarioSetorNorm = normalizeSetor(usuario.setor);
        return usuario.role === 'operador' && usuarioSetorNorm === setorNormalizado;
      });

      setUsuarios(apenasOperadores);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar usuários');
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleAtribuir = async () => {
    if (!usuarioSelecionado) {
      setError('Selecione um usuário para atribuir a tarefa');
      return;
    }

    try {
      setLoadingUsers(true);
      setError(null);

      await atribuirTarefa(
        tarefa.id,
        usuarioSelecionado.id,
        usuarioSelecionado.nome,
        normalizeSetor(usuarioSelecionado.setor) || normalizeSetor(tarefa?.setor),
        user.id,
        user.nome || user.username,
        normalizeSetor(user.setor),
        user.role
      );

      setSuccess(true);
      setUsuarioSelecionado(null);

      // Fechar modal após 1.5 segundos
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao atribuir tarefa');
      console.error('Erro ao atribuir tarefa:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!isOpen || !tarefa) return null;
  const setorBadge = normalizeSetor(tarefa?.setor);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Atribuir Tarefa</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {success && (
          <div className="modal-success-message">
            ✓ Tarefa atribuída com sucesso!
          </div>
        )}

        {error && (
          <div className="modal-error-message">
            ✕ {error}
          </div>
        )}

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Tarefa</label>
            <div className="form-readonly">
              <strong>{tarefa.titulo}</strong>
              <p className="text-muted">{tarefa.descricao}</p>
              <div className="badge" style={{ 
                backgroundColor: setorBadge === 'atendimento' ? '#3b82f6' :
                                setorBadge === 'criacao' ? '#8b5cf6' :
                                setorBadge === 'pre-producao' ? '#f59e0b' :
                                '#ef4444'
              }}>
                {tarefa.setor}
              </div>
            </div>
          </div>

          {tarefa.responsavel_nome && (
            <div className="form-group">
              <label className="form-label">Responsável Atual</label>
              <div className="form-readonly">
                {tarefa.responsavel_nome}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Selecionar Usuário *</label>
            {loadingUsers && !usuarios.length ? (
              <div className="loading-spinner">Carregando usuários...</div>
            ) : usuarios.length === 0 ? (
              <div className="no-users-message">
                Nenhum usuário disponível neste setor
              </div>
            ) : (
              <select
                className="form-select"
                value={usuarioSelecionado?.id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const usuario = usuarios.find(u => String(u.id) === String(selectedId));
                  setUsuarioSelecionado(usuario || null);
                }}
                disabled={loadingUsers || assigning}
              >
                <option value="">-- Selecione um usuário --</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nome} ({usuario.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {usuarioSelecionado && (
            <div className="selected-user-info">
              <h4>Usuário Selecionado</h4>
              <div className="user-card">
                <div className="user-field">
                  <span className="field-label">Nome:</span>
                  <span className="field-value">{usuarioSelecionado.nome}</span>
                </div>
                <div className="user-field">
                  <span className="field-label">Email:</span>
                  <span className="field-value">{usuarioSelecionado.email}</span>
                </div>
                <div className="user-field">
                  <span className="field-label">Setor:</span>
                  <span className="field-value">{usuarioSelecionado.setor}</span>
                </div>
                <div className="user-field">
                  <span className="field-label">Função:</span>
                  <span className="field-value">{usuarioSelecionado.role}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loadingUsers || assigning}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAtribuir}
            disabled={assigning || loadingUsers || !usuarioSelecionado}
          >
            {assigning ? 'Atribuindo...' : 'Atribuir Tarefa'}
          </button>
        </div>
      </div>

      <style>{`
        .selected-user-info {
          margin-top: 20px;
          padding: 15px;
          background-color: #f0f9ff;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
        }

        .selected-user-info h4 {
          margin: 0 0 12px 0;
          color: #1e40af;
          font-size: 14px;
          font-weight: 600;
        }

        .user-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .user-field {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
        }

        .user-field:last-child {
          border-bottom: none;
        }

        .field-label {
          font-weight: 600;
          color: #475569;
          font-size: 13px;
        }

        .field-value {
          color: #1e293b;
          font-size: 13px;
        }

        .no-users-message {
          padding: 20px;
          text-align: center;
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          color: #991b1b;
          font-size: 14px;
        }

        .loading-spinner {
          text-align: center;
          padding: 20px;
          color: #64748b;
          font-size: 14px;
        }

        .modal-success-message {
          padding: 12px 16px;
          background-color: #dcfce7;
          border: 1px solid #86efac;
          border-radius: 4px;
          color: #166534;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .modal-error-message {
          padding: 12px 16px;
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          color: #991b1b;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
        }

        .text-muted {
          color: #64748b;
          font-size: 13px;
          margin-top: 4px;
        }

        .form-readonly {
          padding: 12px;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          color: #1e293b;
          font-size: 14px;
        }

        .form-readonly strong {
          display: block;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-select:disabled {
          background-color: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default AtribuirTarefaModal;
