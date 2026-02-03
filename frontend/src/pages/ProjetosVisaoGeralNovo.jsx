import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Search,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  Loader2,
  LayoutGrid,
  List
} from 'lucide-react';
import { getProjetos } from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import './ProjetosVisaoGeral.css';

const ProjetosVisaoGeralNovo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [viewMode, setViewMode] = useState('grid'); // grid ou list

  useEffect(() => {
    loadProjetos();
  }, [user?.role]);

  const loadProjetos = async () => {
    if (!['admin', 'gerente'].includes(user?.role)) {
      setProjetos([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getProjetos(user?.role || 'operador');
      setProjetos(data);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar projetos
  const projetosFiltrados = projetos.filter(projeto => {
    const matchSearch = projeto.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchStatus = true;
    if (filterStatus === 'ativos') {
      matchStatus = projeto.status === 'Em Andamento' && !projeto.atrasado;
    } else if (filterStatus === 'atrasados') {
      matchStatus = projeto.tarefas_atrasadas > 0;
    } else if (filterStatus === 'concluidos') {
      matchStatus = projeto.progresso === 100;
    }
    
    return matchSearch && matchStatus;
  });

  // Contar por status
  const counts = {
    todos: projetos.length,
    ativos: projetos.filter(p => p.status === 'Em Andamento' && p.tarefas_atrasadas === 0).length,
    atrasados: projetos.filter(p => p.tarefas_atrasadas > 0).length,
    concluidos: projetos.filter(p => p.progresso === 100).length
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (projeto) => {
    if (projeto.progresso === 100) {
      return { label: 'Concluído', className: 'status-badge-novo concluido' };
    }
    if (projeto.tarefas_atrasadas > 0) {
      return { label: 'Atrasado', className: 'status-badge-novo atrasado' };
    }
    return { label: 'Ativo', className: 'status-badge-novo ativo' };
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

  if (!['admin', 'gerente'].includes(user?.role)) {
    return (
      <LayoutNovo>
        <div className="projetos-visao-container">
          <div className="empty-state-projetos">
            <div className="empty-icon-projetos">
              <LayoutGrid size={48} />
            </div>
            <h3>Acesso restrito</h3>
            <p>Somente administradores e gerentes podem ver a visao geral de projetos.</p>
          </div>
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="projetos-visao-container">
        {/* Header */}
        <div className="visao-header">
          <div>
            <h1 className="page-title">Visão Geral de Projetos</h1>
            <p className="page-description">Acompanhe o status e atrasos de todos os projetos</p>
          </div>
        </div>

        {/* Controls */}
        <div className="visao-controls">
          <div className="search-wrapper-projetos">
            <Search
              className={`search-icon-projetos ${searchTerm ? 'is-hidden' : ''}`}
              size={18}
            />
            <Input
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-projetos"
            />
          </div>

          <div className="filtros-status">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`filtro-btn ${filterStatus === 'todos' ? 'active' : ''}`}
            >
              Todos ({counts.todos})
            </button>
            <button
              onClick={() => setFilterStatus('ativos')}
              className={`filtro-btn em-dia ${filterStatus === 'ativos' ? 'active' : ''}`}
            >
              Ativos ({counts.ativos})
            </button>
            <button
              onClick={() => setFilterStatus('atrasados')}
              className={`filtro-btn atrasados ${filterStatus === 'atrasados' ? 'active' : ''}`}
            >
              Atrasados ({counts.atrasados})
            </button>
            <button
              onClick={() => setFilterStatus('concluidos')}
              className={`filtro-btn concluidos ${filterStatus === 'concluidos' ? 'active' : ''}`}
            >
              Concluídos ({counts.concluidos})
            </button>
          </div>

          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label="Visualizar em grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label="Visualizar em lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className={`projetos-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {projetosFiltrados.map((projeto) => {
            const statusBadge = getStatusBadge(projeto);
            
            return (
              <Card key={projeto.id} className="projeto-card-novo">
                <CardContent className="projeto-card-content-novo">
                  <div className="card-header-novo">
                    <div className="cliente-info">
                      <h3 className="cliente-nome">{projeto.cliente}</h3>
                      <div className="instituicao">
                        <Building2 size={16} />
                        <span>UFMG</span>
                      </div>
                    </div>
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                  </div>

                  <div className="etapa-atual-info">
                    <div className="dept-icon">
                      <FileText size={18} />
                    </div>
                    <div className="etapa-details">
                      <span className="dept-label">Etapa atual</span>
                      <div className="etapa-nome">{projeto.etapa_atual}</div>
                    </div>
                  </div>

                  <div className="progresso-section">
                    <div className="progresso-header">
                      <span className="progresso-label">Progresso geral</span>
                      <span className="progresso-value">{projeto.progresso}%</span>
                    </div>
                    <div className={`progresso-bar ${projeto.tarefas_atrasadas > 0 ? 'atrasado' : ''}`}>
                      <div className="progress-indicator" style={{ width: `${projeto.progresso}%` }} />
                    </div>
                  </div>

                  <div className="card-footer-novo">
                    <div className="prazo-info">
                      <Calendar size={16} />
                      <span>Entrega: {formatDate(projeto.data_fim_prevista)}</span>
                    </div>
                    <Button
                      className="ver-detalhes-btn"
                      onClick={() => navigate(`/projetos/${projeto.id}`)}
                    >
                      Ver detalhes
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {projetosFiltrados.length === 0 && (
          <div className="empty-state-projetos">
            <div className="empty-icon-projetos">
              <LayoutGrid size={48} />
            </div>
            <h3>Nenhum projeto encontrado</h3>
            <p>Tente ajustar os filtros ou busque por outro termo</p>
          </div>
        )}
      </div>

    </LayoutNovo>
  );
};

export default ProjetosVisaoGeralNovo;
