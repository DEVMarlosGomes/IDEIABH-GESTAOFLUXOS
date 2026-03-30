import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FolderOpen,
  Loader2,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';
import { getProjetos } from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import './ProjetosVisaoGeral.css';

const statusFiltroDaTarefa = (tarefa) => {
  if (tarefa?.finalizada) return 'concluida';
  const status = (tarefa?.status_nome || '').toLowerCase();
  if (status.includes('andamento')) return 'em_andamento';
  return 'pendente';
};

const getPeriodoPasta = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sem periodo';
  const semestre = date.getMonth() < 6 ? 1 : 2;
  return `${date.getFullYear()}.${semestre}`;
};

const getPeriodoSortValue = (periodo) => {
  const match = /^(\d{4})\.(1|2)$/.exec(periodo || '');
  if (!match) return -1;
  return Number(match[1]) * 10 + Number(match[2]);
};

const getPeriodoProjeto = (projeto) => {
  const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
  return getPeriodoPasta(
    contrato?.data_fim || contrato?.data_inicio || projeto?.data_fim_prevista || projeto?.data_inicio
  );
};

const getNomePastaContrato = (projeto) => {
  const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
  const partes = [
    contrato.numero_contrato,
    contrato.curso,
    contrato.faculdade,
  ].filter(Boolean);

  if (partes.length > 0) {
    return partes.join(' ').toUpperCase();
  }

  return (projeto?.cliente || 'CONTRATO').toUpperCase();
};

const ProjetosVisaoGeralNovo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterSemestre, setFilterSemestre] = useState('todos');
  const [viewMode, setViewMode] = useState('grid');

  const [filtroContrato, setFiltroContrato] = useState('todos');
  const [filtroStatusTarefa, setFiltroStatusTarefa] = useState('todos');
  const [filtroData, setFiltroData] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');

  const isOperador = user?.role === 'operador';

  const loadProjetos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjetos(
        user?.role || 'operador',
        user?.id || null,
        user?.setor || null
      );
      setProjetos(data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao carregar projetos');
      setProjetos([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.setor]);

  useEffect(() => {
    loadProjetos();
  }, [loadProjetos]);

  const contratosDisponiveis = useMemo(() => {
    const mapa = new Map();
    (projetos || []).forEach((projeto) => {
      (projeto.contratos || []).forEach((contrato) => {
        if (!contrato?.id) return;
        if (!mapa.has(contrato.id)) {
          mapa.set(contrato.id, contrato);
        }
      });
    });
    return Array.from(mapa.values());
  }, [projetos]);

  const semestresDisponiveis = useMemo(() => {
    return Array.from(new Set((projetos || []).map((projeto) => getPeriodoProjeto(projeto))))
      .sort((a, b) => getPeriodoSortValue(b) - getPeriodoSortValue(a));
  }, [projetos]);

  const projetosComContexto = useMemo(() => {
    return (projetos || []).map((projeto) => {
      const contratoPrincipal = projeto?.contrato || (projeto?.contratos || [])[0] || {};
      const tarefasOperador = projeto.tarefas_operador || [];
      const tarefasNoContexto = tarefasOperador.filter((tarefa) => {
        if (filtroContrato !== 'todos' && tarefa.contrato_id !== filtroContrato) {
          return false;
        }

        if (filtroStatusTarefa !== 'todos' && statusFiltroDaTarefa(tarefa) !== filtroStatusTarefa) {
          return false;
        }

        if (filtroData) {
          const dataPrazo = tarefa?.prazo ? new Date(tarefa.prazo).toISOString().slice(0, 10) : '';
          if (dataPrazo !== filtroData) {
            return false;
          }
        }

        if (filtroPrioridade !== 'todos' && (tarefa?.prioridade || 'media') !== filtroPrioridade) {
          return false;
        }

        return true;
      });

      return {
        ...projeto,
        _contratoPrincipal: contratoPrincipal,
        _semestre: getPeriodoProjeto(projeto),
        _tarefasNoContexto: tarefasNoContexto,
      };
    });
  }, [projetos, filtroContrato, filtroStatusTarefa, filtroData, filtroPrioridade]);

  const projetosBaseSemestre = useMemo(() => {
    return projetosComContexto.filter((projeto) => (
      filterSemestre === 'todos' || projeto._semestre === filterSemestre
    ));
  }, [filterSemestre, projetosComContexto]);

  const projetosFiltrados = useMemo(() => {
    return projetosBaseSemestre.filter((projeto) => {
      const matchSearch =
        (projeto.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (projeto.contratos || []).some((c) =>
          (c.numero_contrato || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

      if (!matchSearch) return false;

      let matchStatus = true;
      if (filterStatus === 'ativos') {
        matchStatus = projeto.status === 'Em Andamento' && (projeto.tarefas_atrasadas || 0) === 0;
      } else if (filterStatus === 'atrasados') {
        matchStatus = (projeto.tarefas_atrasadas || 0) > 0;
      } else if (filterStatus === 'concluidos') {
        matchStatus = (projeto.progresso || 0) === 100;
      }

      if (!matchStatus) return false;

      if (isOperador) {
        return (projeto._tarefasNoContexto || []).length > 0;
      }

      return true;
    });
  }, [projetosBaseSemestre, searchTerm, filterStatus, isOperador]);

  const pastasOperador = useMemo(() => {
    if (!isOperador) return [];

    const grupos = projetosFiltrados.reduce((acc, projeto) => {
      const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
      const periodo = getPeriodoPasta(
        contrato?.data_fim || contrato?.data_inicio || projeto?.data_fim_prevista || projeto?.data_inicio
      );

      if (!acc[periodo]) {
        acc[periodo] = [];
      }

      acc[periodo].push({
        ...projeto,
        _pastaNome: getNomePastaContrato(projeto),
      });
      return acc;
    }, {});

    return Object.entries(grupos)
      .sort((a, b) => getPeriodoSortValue(b[0]) - getPeriodoSortValue(a[0]))
      .map(([periodo, itens]) => ({
        periodo,
        itens: itens.sort((a, b) => a._pastaNome.localeCompare(b._pastaNome)),
      }));
  }, [isOperador, projetosFiltrados]);

  const counts = useMemo(() => {
    return {
      todos: projetosBaseSemestre.length,
      ativos: projetosBaseSemestre.filter((p) => p.status === 'Em Andamento' && (p.tarefas_atrasadas || 0) === 0).length,
      atrasados: projetosBaseSemestre.filter((p) => (p.tarefas_atrasadas || 0) > 0).length,
      concluidos: projetosBaseSemestre.filter((p) => (p.progresso || 0) === 100).length,
    };
  }, [projetosBaseSemestre]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleDragContratoStart = (event, projetoId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(projetoId));
    event.dataTransfer.setData('application/x-ideiabh-projeto', String(projetoId));
  };

  const getStatusBadge = (projeto) => {
    if (isOperador) {
      const tarefas = projeto._tarefasNoContexto || projeto.tarefas_operador || [];
      if (tarefas.length && tarefas.every((t) => t.finalizada)) {
        return { label: 'Concluido', className: 'status-badge-novo concluido' };
      }
      if (tarefas.some((t) => t.atrasada)) {
        return { label: 'Atrasado', className: 'status-badge-novo atrasado' };
      }
      if (tarefas.some((t) => (t.status_nome || '').toLowerCase() === 'em andamento')) {
        return { label: 'Em andamento', className: 'status-badge-novo ativo' };
      }
      return { label: 'Pendente', className: 'status-badge-novo ativo' };
    }

    if ((projeto.progresso || 0) === 100) {
      return { label: 'Concluido', className: 'status-badge-novo concluido' };
    }
    if ((projeto.tarefas_atrasadas || 0) > 0) {
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

  return (
    <LayoutNovo>
      <div className="projetos-visao-container">
        <div className="visao-header">
          <div>
            <h1 className="page-title">{isOperador ? 'Meus Contratos' : 'Visao Geral de Projetos'}</h1>
            <p className="page-description">
              {isOperador
                ? 'Cada contrato atribuido aparece como uma pasta. Entre nela para acompanhar as etapas.'
                : 'Acompanhe o status e atrasos de todos os projetos'}
            </p>
          </div>
        </div>

        <div className="visao-controls">
          <div className="search-wrapper-projetos">
            <Search className={`search-icon-projetos ${searchTerm ? 'is-hidden' : ''}`} size={18} />
            <Input
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-projetos"
            />
          </div>

          <div className="filtros-status">
            <select
              className="filtro-semestre-select"
              value={filterSemestre}
              onChange={(e) => setFilterSemestre(e.target.value)}
            >
              <option value="todos">Todos os semestres</option>
              {semestresDisponiveis.map((semestre) => (
                <option key={semestre} value={semestre}>
                  {semestre}
                </option>
              ))}
            </select>

            <button onClick={() => setFilterStatus('todos')} className={`filtro-btn ${filterStatus === 'todos' ? 'active' : ''}`}>
              Todos ({counts.todos})
            </button>
            <button onClick={() => setFilterStatus('ativos')} className={`filtro-btn em-dia ${filterStatus === 'ativos' ? 'active' : ''}`}>
              Ativos ({counts.ativos})
            </button>
            <button onClick={() => setFilterStatus('atrasados')} className={`filtro-btn atrasados ${filterStatus === 'atrasados' ? 'active' : ''}`}>
              Atrasados ({counts.atrasados})
            </button>
            <button onClick={() => setFilterStatus('concluidos')} className={`filtro-btn concluidos ${filterStatus === 'concluidos' ? 'active' : ''}`}>
              Concluidos ({counts.concluidos})
            </button>
          </div>

          {!isOperador && (
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
          )}
        </div>

        {isOperador && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                <Filter size={16} />
                Filtros essenciais do operador
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  className="w-full border rounded-md px-2 py-2 text-sm bg-white"
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                >
                  <option value="todos">Contrato: Todos</option>
                  {contratosDisponiveis.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato || contrato.id}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full border rounded-md px-2 py-2 text-sm bg-white"
                  value={filtroStatusTarefa}
                  onChange={(e) => setFiltroStatusTarefa(e.target.value)}
                >
                  <option value="todos">Status: Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluida</option>
                </select>

                <input
                  type="date"
                  className="w-full border rounded-md px-2 py-2 text-sm bg-white"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                />

                <select
                  className="w-full border rounded-md px-2 py-2 text-sm bg-white"
                  value={filtroPrioridade}
                  onChange={(e) => setFiltroPrioridade(e.target.value)}
                >
                  <option value="todos">Prioridade: Todas</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {isOperador ? (
          <div className="operador-pastas-wrapper">
            {pastasOperador.map((grupo) => (
              <Card key={grupo.periodo} className="operador-pasta-grupo">
                <CardContent className="operador-pasta-grupo-content">
                  <div className="operador-pasta-header">
                    <FolderOpen size={18} />
                    <span>{grupo.periodo}</span>
                  </div>

                  <div className="operador-pasta-lista">
                    {grupo.itens.map((projeto) => {
                      const statusBadge = getStatusBadge(projeto);
                      const contratoPrincipal = projeto?.contrato || (projeto.contratos || [])[0] || {};
                      const tarefasNoContexto = projeto._tarefasNoContexto || projeto.tarefas_operador || [];

                      return (
                        <button
                          key={projeto.id}
                          type="button"
                          className="operador-pasta-item"
                          draggable
                          onDragStart={(event) => handleDragContratoStart(event, projeto.id)}
                          onClick={() => navigate(`/projetos/${projeto.id}`)}
                          title="Arraste para uma pasta na sidebar ou clique para abrir"
                        >
                          <div className="operador-pasta-icon">
                            <FolderOpen size={18} />
                          </div>
                          <div className="operador-pasta-info">
                            <div className="operador-pasta-nome">{projeto._pastaNome}</div>
                            <div className="operador-pasta-meta">
                              <span>{contratoPrincipal?.cliente || projeto.cliente}</span>
                              <span>{tarefasNoContexto.length} etapa(s) no contexto</span>
                              <span>Entrega {formatDate(projeto.data_fim_prevista)}</span>
                            </div>
                          </div>
                          <div className="operador-pasta-status">
                            <span className={statusBadge.className}>{statusBadge.label}</span>
                            <ChevronRight size={16} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className={`projetos-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {projetosFiltrados.map((projeto) => {
              const statusBadge = getStatusBadge(projeto);
              const contratoPrincipal = projeto._contratoPrincipal || (projeto.contratos || [])[0] || {};
              const tarefasNoContexto = projeto._tarefasNoContexto || projeto.tarefas_operador || [];
              const nomeContratoDestaque = String(
                contratoPrincipal?.numero_contrato || `Projeto ${projeto.id}`
              ).toUpperCase();
              const detalheContrato = [contratoPrincipal?.faculdade, contratoPrincipal?.curso]
                .filter(Boolean)
                .join(' • ');

              return (
                <Card key={projeto.id} className="projeto-card-novo">
                  <CardContent className="projeto-card-content-novo">
                    <div className="card-header-novo">
                      <div className="cliente-info">
                        <h3 className="cliente-nome contrato-heading">{nomeContratoDestaque}</h3>
                        <div className="instituicao cliente-secundario">
                          <Building2 size={16} />
                          <span>{projeto.cliente}</span>
                        </div>
                        {detalheContrato && (
                          <div className="projeto-contrato-secundario">{detalheContrato}</div>
                        )}
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
                        <span className="progresso-label">Progresso</span>
                        <span className="progresso-value">{projeto.progresso || 0}%</span>
                      </div>
                      <div className={`progresso-bar ${(projeto.tarefas_atrasadas || 0) > 0 ? 'atrasado' : ''}`}>
                        <div className="progress-indicator" style={{ width: `${projeto.progresso || 0}%` }} />
                      </div>
                    </div>

                    {isOperador && (
                      <div className="text-sm text-gray-600 mb-2">
                        Tarefas no contexto: <strong>{tarefasNoContexto.length}</strong>
                      </div>
                    )}

                    <div className="card-footer-novo">
                      <div className="prazo-info">
                        <Calendar size={16} />
                        <span>Entrega: {formatDate(projeto.data_fim_prevista)}</span>
                      </div>
                      <Button className="ver-detalhes-btn" onClick={() => navigate(`/projetos/${projeto.id}`)}>
                        Ver detalhes
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

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
