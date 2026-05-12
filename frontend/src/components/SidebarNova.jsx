import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjetos } from '../services/api';
import {
  getNomePastaContrato,
  getPeriodoProjeto,
  getPeriodoSortValue,
} from '../lib/projetos';
import {
  LayoutDashboard,
  Users,
  Palette,
  ClipboardList,
  Package,
  FileText,
  UserCircle,
  Settings,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderKanban,
  FolderOpen,
  FolderPlus,
  X,
  BarChart3,
  Calendar,
  Loader2,
} from 'lucide-react';
import './SidebarNova.css';

const SidebarNova = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const [projetosOperador, setProjetosOperador] = useState([]);
  const [carregandoProjetos, setCarregandoProjetos] = useState(false);
  const [pastasPersonalizadas, setPastasPersonalizadas] = useState({});
  const [organizacaoProjetos, setOrganizacaoProjetos] = useState({});
  const [periodosExpandidos, setPeriodosExpandidos] = useState({});
  const [pastasExpandidas, setPastasExpandidas] = useState({});
  const [periodoNovaPasta, setPeriodoNovaPasta] = useState('');
  const [periodoFiltroSidebar, setPeriodoFiltroSidebar] = useState('todos');
  const [nomeNovaPasta, setNomeNovaPasta] = useState('');
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [dropTarget, setDropTarget] = useState('');
  const [storageReady, setStorageReady] = useState(false);

  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[-_\s]/g, '');

  const normalizeSetor = (setor) => {
    if (!setor) return '';
    const key = normalizeText(setor);
    const setorMap = {
      atendimento: 'atendimento',
      criacao: 'criacao',
      preproducao: 'pre-producao',
      producao: 'producao',
    };
    return setorMap[key] || setor;
  };

  const menuPrincipal = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard',
      permission: 'dashboard',
    },
  ];

  const menuDepartamentos = [
    {
      icon: Users,
      label: 'Atendimento',
      path: '/departamento/atendimento',
      cor: '#3b82f6',
    },
    {
      icon: Palette,
      label: 'Criacao',
      path: '/departamento/criacao',
      cor: '#8b5cf6',
    },
    {
      icon: ClipboardList,
      label: 'Pre-Producao',
      path: '/departamento/pre-producao',
      cor: '#f59e0b',
    },
    {
      icon: Package,
      label: 'Producao',
      path: '/departamento/producao',
      cor: '#10b981',
    },
  ];

  const menuGestao = [
    {
      icon: FolderKanban,
      label: 'Projetos',
      path: '/projetos',
      permission: 'projetos_visualizar',
    },
    {
      icon: FileText,
      label: 'Contratos',
      path: '/contratos',
      permission: 'contratos_visualizar',
    },
    {
      icon: BarChart3,
      label: 'Relatorios',
      path: '/relatorios',
      cor: '#ef4444',
    },
    {
      icon: Calendar,
      label: 'Templates Prazos',
      path: '/templates-prazos',
      cor: '#8b5cf6',
    },
  ];

  const menuAdmin = [
    {
      icon: UserCircle,
      label: 'Funcionarios',
      path: '/admin/users',
      permission: 'admin',
    },
    {
      icon: Settings,
      label: 'Configuracoes',
      path: '/configuracoes',
      permission: 'admin',
    },
  ];

  const menuOperadorProjetos = [
    {
      icon: FolderKanban,
      label: 'Meus Contratos',
      path: '/projetos',
    },
  ];

  const isOperador = user?.role === 'operador';
  const setorOperador = normalizeSetor(user?.setor);
  const storageKey = user?.id ? `ideiabh:sidebar-operador:${user.id}` : null;
  const departamentosVisiveis = isOperador
    ? menuDepartamentos.filter((item) => normalizeSetor(item.path.split('/').pop()) === setorOperador)
    : menuDepartamentos;

  useEffect(() => {
    const carregarProjetosOperador = async () => {
      if (!isOperador || !user?.id || !user?.setor) {
        setProjetosOperador([]);
        return;
      }

      try {
        setCarregandoProjetos(true);
        const data = await getProjetos(user.role, user.id, user.setor);
        setProjetosOperador(data || []);
      } catch (error) {
        console.error('Erro ao carregar projetos do operador na sidebar:', error);
        setProjetosOperador([]);
      } finally {
        setCarregandoProjetos(false);
      }
    };

    carregarProjetosOperador();
  }, [isOperador, user?.id, user?.role, user?.setor]);

  useEffect(() => {
    if (!isOperador || !storageKey) {
      setPastasPersonalizadas({});
      setOrganizacaoProjetos({});
      setPeriodosExpandidos({});
      setPastasExpandidas({});
      setPeriodoNovaPasta('');
      setPeriodoFiltroSidebar('todos');
      setNomeNovaPasta('');
      setStorageReady(false);
      return;
    }

    setStorageReady(false);

    try {
      const rawState = window.localStorage.getItem(storageKey);
      if (!rawState) {
        setPastasPersonalizadas({});
        setOrganizacaoProjetos({});
        setPeriodosExpandidos({});
        setPastasExpandidas({});
        setPeriodoFiltroSidebar('todos');
        setStorageReady(true);
        return;
      }

      const state = JSON.parse(rawState);
      setPastasPersonalizadas(state.pastasPersonalizadas || {});
      setOrganizacaoProjetos(state.organizacaoProjetos || {});
      setPeriodosExpandidos(state.periodosExpandidos || {});
      setPastasExpandidas(state.pastasExpandidas || {});
      setPeriodoFiltroSidebar(state.periodoFiltroSidebar || 'todos');
      setStorageReady(true);
    } catch (error) {
      console.error('Erro ao recuperar organizacao da sidebar:', error);
      setPastasPersonalizadas({});
      setOrganizacaoProjetos({});
      setPeriodosExpandidos({});
      setPastasExpandidas({});
      setPeriodoFiltroSidebar('todos');
      setStorageReady(true);
    }
  }, [isOperador, storageKey]);

  useEffect(() => {
    if (!isOperador || !storageKey || !storageReady) return;

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          pastasPersonalizadas,
          organizacaoProjetos,
          periodosExpandidos,
          pastasExpandidas,
          periodoFiltroSidebar,
        })
      );
    } catch (error) {
      console.error('Erro ao salvar organizacao da sidebar:', error);
    }
  }, [
    isOperador,
    organizacaoProjetos,
    pastasExpandidas,
    pastasPersonalizadas,
    periodoFiltroSidebar,
    periodosExpandidos,
    storageKey,
    storageReady,
  ]);

  const getPeriodoProjetoBase = useCallback((projeto) => getPeriodoProjeto(projeto), []);

  const sortByNome = (a, b) => a.nome.localeCompare(b.nome);

  const pastasOperador = useMemo(() => {
    if (!isOperador) return [];

    const grupos = {};

    (projetosOperador || []).forEach((projeto) => {
      const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
      const organizacaoSalva = organizacaoProjetos[String(projeto.id)] || {};
      const periodo = organizacaoSalva.periodo || getPeriodoProjetoBase(projeto);

      if (!grupos[periodo]) {
        grupos[periodo] = {
          periodo,
          pastas: (pastasPersonalizadas[periodo] || []).map((pasta) => ({
            ...pasta,
            itens: [],
          })),
          projetosSemPasta: [],
        };
      }

      const itemProjeto = {
        id: projeto.id,
        nome: getNomePastaContrato(projeto),
        cliente: contrato?.cliente || projeto?.cliente,
        path: `/projetos/${projeto.id}`,
      };

      const pastaDestino = grupos[periodo].pastas.find((pasta) => pasta.id === organizacaoSalva.pastaId);
      if (pastaDestino) {
        pastaDestino.itens.push(itemProjeto);
      } else {
        grupos[periodo].projetosSemPasta.push(itemProjeto);
      }
    });

    Object.entries(pastasPersonalizadas || {}).forEach(([periodo, pastas]) => {
      if (!grupos[periodo]) {
        grupos[periodo] = {
          periodo,
          pastas: pastas.map((pasta) => ({
            ...pasta,
            itens: [],
          })),
          projetosSemPasta: [],
        };
      }
    });

    return Object.values(grupos)
      .sort((a, b) => getPeriodoSortValue(b.periodo) - getPeriodoSortValue(a.periodo))
      .map((grupo) => ({
        ...grupo,
        totalItens:
          grupo.projetosSemPasta.length + grupo.pastas.reduce((total, pasta) => total + pasta.itens.length, 0),
        projetosSemPasta: grupo.projetosSemPasta.sort(sortByNome),
        pastas: grupo.pastas.map((pasta) => ({
          ...pasta,
          itens: pasta.itens.sort(sortByNome),
        })),
      }));
  }, [getPeriodoProjetoBase, isOperador, organizacaoProjetos, pastasPersonalizadas, projetosOperador]);

  const periodosDisponiveisSidebar = useMemo(
    () => pastasOperador.map((grupo) => grupo.periodo),
    [pastasOperador]
  );

  const pastasOperadorFiltradas = useMemo(() => {
    if (periodoFiltroSidebar === 'todos') return pastasOperador;
    return pastasOperador.filter((grupo) => grupo.periodo === periodoFiltroSidebar);
  }, [pastasOperador, periodoFiltroSidebar]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isProjectPathActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const closeSidebar = () => {
    if (onClose) onClose();
  };

  const togglePeriodo = (periodo) => {
    setPeriodosExpandidos((current) => ({
      ...current,
      [periodo]: current[periodo] === false,
    }));
  };

  const togglePasta = (periodo, pastaId) => {
    const folderKey = `${periodo}:${pastaId}`;
    setPastasExpandidas((current) => ({
      ...current,
      [folderKey]: current[folderKey] === false,
    }));
  };

  const abrirFormularioPasta = (periodo) => {
    setPeriodoNovaPasta(periodo);
    setNomeNovaPasta('');
    setPeriodosExpandidos((current) => ({
      ...current,
      [periodo]: true,
    }));
  };

  const criarPasta = (event, periodo) => {
    event.preventDefault();
    const nome = nomeNovaPasta.trim();
    if (!nome) return;

    const novaPasta = {
      id: `pasta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nome: nome.toUpperCase(),
    };

    setPastasPersonalizadas((current) => ({
      ...current,
      [periodo]: [...(current[periodo] || []), novaPasta],
    }));

    setPastasExpandidas((current) => ({
      ...current,
      [`${periodo}:${novaPasta.id}`]: true,
    }));

    setPeriodoNovaPasta('');
    setNomeNovaPasta('');
  };

  const removerPasta = (periodo, pastaId) => {
    setPastasPersonalizadas((current) => {
      const pastasPeriodo = (current[periodo] || []).filter((pasta) => pasta.id !== pastaId);

      if (pastasPeriodo.length === 0) {
        const next = { ...current };
        delete next[periodo];
        return next;
      }

      return {
        ...current,
        [periodo]: pastasPeriodo,
      };
    });

    setOrganizacaoProjetos((current) => {
      const next = { ...current };

      (projetosOperador || []).forEach((projeto) => {
        const projetoId = String(projeto.id);
        const organizacaoAtual = next[projetoId];

        if (organizacaoAtual?.periodo === periodo && organizacaoAtual?.pastaId === pastaId) {
          const periodoBase = getPeriodoProjetoBase(projeto);

          if (periodoBase === periodo) {
            delete next[projetoId];
          } else {
            next[projetoId] = {
              periodo,
              pastaId: null,
            };
          }
        }
      });

      return next;
    });
  };

  const moverProjeto = (projetoId, periodo, pastaId = null) => {
    const projeto = (projetosOperador || []).find((item) => String(item.id) === String(projetoId));
    if (!projeto) return;

    const periodoBase = getPeriodoProjetoBase(projeto);

    setOrganizacaoProjetos((current) => {
      const next = { ...current };

      if (periodo === periodoBase && !pastaId) {
        delete next[String(projetoId)];
        return next;
      }

      next[String(projetoId)] = {
        periodo,
        pastaId,
      };
      return next;
    });
  };

  const iniciarDragProjeto = (event, projetoId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(projetoId));
    setDraggingProjectId(String(projetoId));
  };

  const finalizarDragProjeto = () => {
    setDraggingProjectId(null);
    setDropTarget('');
  };

  const permitirDrop = (event, destino) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget(destino);
  };

  const receberDrop = (event, periodo, pastaId = null) => {
    event.preventDefault();
    const projetoId = event.dataTransfer.getData('application/x-ideiabh-projeto')
      || event.dataTransfer.getData('text/plain')
      || draggingProjectId;
    if (!projetoId) return;

    moverProjeto(projetoId, periodo, pastaId);
    setDraggingProjectId(null);
    setDropTarget('');
  };

  const renderProjetoItem = (item) => {
    const active = isProjectPathActive(item.path);
    const dragging = draggingProjectId === String(item.id);

    return (
      <button
        key={item.path}
        type="button"
        draggable
        className={`sidebar-folder-item ${active ? 'active' : ''} ${dragging ? 'dragging' : ''}`}
        onDragStart={(event) => iniciarDragProjeto(event, item.id)}
        onDragEnd={finalizarDragProjeto}
        onClick={() => {
          navigate(item.path);
          closeSidebar();
        }}
        title={item.cliente || item.nome}
      >
        <div className="sidebar-folder-icon">
          <FolderOpen size={15} />
        </div>
        <span className="sidebar-folder-label">{item.nome}</span>
        {active && <ChevronRight size={14} className="sidebar-folder-arrow" />}
      </button>
    );
  };

  const MenuItem = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <button
        type="button"
        className={`sidebar-menu-item ${active ? 'active' : ''}`}
        onClick={() => {
          navigate(item.path);
          closeSidebar();
        }}
        style={active && item.cor ? { '--accent-color': item.cor } : {}}
      >
        <div className="menu-item-icon" style={item.cor ? { color: item.cor } : {}}>
          <Icon size={20} />
        </div>
        <span className="menu-item-label">{item.label}</span>
        {active && <ChevronRight size={16} className="menu-item-arrow" />}
      </button>
    );
  };

  return (
    <aside className={`sidebar-nova ${isOpen ? 'open' : ''}`}>
      <button type="button" className="sidebar-close-btn" onClick={onClose}>
        <X size={24} />
      </button>

      <div className="sidebar-logo">
        <div className="logo-icon">
          <span>IB</span>
        </div>
        <div className="logo-text">
          <span className="logo-title">IdeiaBH</span>
          <span className="logo-subtitle">Gestao de Projetos</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {menuPrincipal.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}
        </div>

        <div className="nav-section">
          <span className="section-title">Departamentos</span>
          {departamentosVisiveis.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}
        </div>

        {isOperador && (
          <div className="nav-section">
            <span className="section-title">Projetos</span>
            {menuOperadorProjetos.map((item) => (
              <MenuItem key={item.path} item={item} />
            ))}

            <div className="sidebar-folder-groups">
              {periodosDisponiveisSidebar.length > 0 && (
                <div className="sidebar-filter-box">
                  <label htmlFor="sidebar-semestre-filter" className="sidebar-filter-label">
                    Semestre
                  </label>
                  <select
                    id="sidebar-semestre-filter"
                    className="sidebar-filter-select"
                    value={periodoFiltroSidebar}
                    onChange={(event) => setPeriodoFiltroSidebar(event.target.value)}
                  >
                    <option value="todos">Todos</option>
                    {periodosDisponiveisSidebar.map((periodo) => (
                      <option key={periodo} value={periodo}>
                        {periodo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {carregandoProjetos && (
                <div className="sidebar-folder-loading">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Carregando pastas...</span>
                </div>
              )}

              {!carregandoProjetos &&
                pastasOperadorFiltradas.map((grupo) => {
                  const periodoExpandido = periodosExpandidos[grupo.periodo] !== false;

                  return (
                    <div key={grupo.periodo} className="sidebar-folder-group">
                      <div className="sidebar-folder-period-header">
                        <button
                          type="button"
                          className="sidebar-folder-period-toggle"
                          onClick={() => togglePeriodo(grupo.periodo)}
                        >
                          {periodoExpandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="sidebar-folder-period">{grupo.periodo}</span>
                          <span className="sidebar-folder-count">{grupo.totalItens}</span>
                        </button>

                        <button
                          type="button"
                          className="sidebar-folder-period-add"
                          onClick={() => abrirFormularioPasta(grupo.periodo)}
                          title="Criar pasta"
                        >
                          <FolderPlus size={14} />
                        </button>
                      </div>

                      {periodoNovaPasta === grupo.periodo && (
                        <form className="sidebar-folder-create-form" onSubmit={(event) => criarPasta(event, grupo.periodo)}>
                          <input
                            className="sidebar-folder-create-input"
                            type="text"
                            value={nomeNovaPasta}
                            onChange={(event) => setNomeNovaPasta(event.target.value)}
                            placeholder="Nome da pasta"
                            maxLength={40}
                          />
                          <div className="sidebar-folder-create-actions">
                            <button type="submit" className="sidebar-folder-create-submit">
                              Criar
                            </button>
                            <button
                              type="button"
                              className="sidebar-folder-create-cancel"
                              onClick={() => {
                                setPeriodoNovaPasta('');
                                setNomeNovaPasta('');
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}

                      {periodoExpandido && (
                        <div className="sidebar-folder-period-body">
                          {grupo.pastas.map((pasta) => {
                            const folderKey = `${grupo.periodo}:${pasta.id}`;
                            const pastaExpandida = pastasExpandidas[folderKey] !== false;

                            return (
                              <div
                                key={folderKey}
                                className={`sidebar-custom-folder ${dropTarget === folderKey ? 'drop-target' : ''}`}
                                onDragOver={(event) => permitirDrop(event, folderKey)}
                                onDrop={(event) => receberDrop(event, grupo.periodo, pasta.id)}
                              >
                                <div className="sidebar-custom-folder-header">
                                  <button
                                    type="button"
                                    className="sidebar-custom-folder-toggle"
                                    onClick={() => togglePasta(grupo.periodo, pasta.id)}
                                  >
                                    {pastaExpandida ? <FolderOpen size={14} /> : <Folder size={14} />}
                                    <span className="sidebar-custom-folder-name">{pasta.nome}</span>
                                    <span className="sidebar-custom-folder-count">{pasta.itens.length}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="sidebar-custom-folder-remove"
                                    onClick={() => removerPasta(grupo.periodo, pasta.id)}
                                    title="Remover pasta"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>

                                {pastaExpandida && (
                                  <div className="sidebar-custom-folder-body">
                                    {pasta.itens.length > 0 ? (
                                      pasta.itens.map((item) => renderProjetoItem(item))
                                    ) : (
                                      <div className="sidebar-folder-drop-hint">Arraste contratos para esta pasta</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <div
                            className={`sidebar-folder-unassigned ${
                              dropTarget === `${grupo.periodo}:sem-pasta` ? 'drop-target' : ''
                            }`}
                            onDragOver={(event) => permitirDrop(event, `${grupo.periodo}:sem-pasta`)}
                            onDrop={(event) => receberDrop(event, grupo.periodo, null)}
                          >
                            <div className="sidebar-folder-unassigned-title">Sem pasta</div>
                            <div className="sidebar-folder-list">
                              {grupo.projetosSemPasta.length > 0 ? (
                                grupo.projetosSemPasta.map((item) => renderProjetoItem(item))
                              ) : (
                                <div className="sidebar-folder-drop-hint">
                                  Solte aqui para deixar fora de uma pasta
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {!carregandoProjetos && pastasOperador.length === 0 && (
                <div className="sidebar-folder-empty">Nenhum contrato atribuido</div>
              )}

              {!carregandoProjetos && pastasOperador.length > 0 && pastasOperadorFiltradas.length === 0 && (
                <div className="sidebar-folder-empty">Nenhum contrato neste semestre</div>
              )}
            </div>
          </div>
        )}

        {!isOperador && (
          <div className="nav-section">
            <span className="section-title">Gestao</span>
            {menuGestao.map((item) => (
              <MenuItem key={item.path} item={item} />
            ))}
          </div>
        )}

        {hasPermission('admin') && (
          <div className="nav-section">
            <span className="section-title">Administracao</span>
            {menuAdmin
              .filter((item) => !item.permission || hasPermission(item.permission))
              .map((item) => (
                <MenuItem key={item.path} item={item} />
              ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div />
      </div>
    </aside>
  );
};

export default SidebarNova;
