import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SidebarNova from './SidebarNova';
import ThemeToggle from './ThemeToggle';
import { Bell, Search, ChevronDown, Settings, LogOut, Check, Menu } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button as UIButton } from './ui/button';
import { Input } from './ui/input';
import { getProjetos, getContratos, getNotificacoes, marcarNotificacaoLida, responderCobranca, getTarefas } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { getNomePastaContrato, getStatusProjetoEfetivo, isTarefaEfetivamenteFinalizada } from '../lib/projetos';
import './LayoutNovo.css';

const normalizeSearchText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const uniqueValues = (values) => Array.from(new Set(values.filter(Boolean)));

const tokenizeSuggestionValues = (values) => {
  const suggestions = [];

  values.filter(Boolean).forEach((value) => {
    const raw = String(value).trim();
    if (!raw) return;
    suggestions.push(raw);
    raw.split(/[\s,;/|()-]+/).forEach((chunk) => {
      const token = chunk.trim();
      if (token.length >= 3) {
        suggestions.push(token);
      }
    });
  });

  return uniqueValues(suggestions);
};

const LayoutNovo = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [projetosCache, setProjetosCache] = useState([]);
  const [contratosCache, setContratosCache] = useState([]);
  const [tarefasCache, setTarefasCache] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    tipo: 'todos',
    setor: 'todos',
    status: 'todos',
  });
  const [searchDataReady, setSearchDataReady] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const compactRoutes = new Set(['/contratos-old']);
  const isCompactLayout = compactRoutes.has(location.pathname);
  const disableNavbarAutoHideRoutes = new Set(['/templates-prazos']);
  const disableNavbarAutoHide = disableNavbarAutoHideRoutes.has(location.pathname);


  const [notificacoes, setNotificacoes] = useState([]);
  const [responderModalOpen, setResponderModalOpen] = useState(false);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState(null);
  const [enviandoResposta, setEnviandoResposta] = useState(false);

  const unreadCount = notificacoes.filter(n => !n.lida).length;
  const isOperador = user?.role === 'operador';
  const trimmedSearchTerm = deferredSearchTerm.trim();

  const carregarNotificacoes = async () => {
    if (!user?.id) return;
    try {
      const data = await getNotificacoes(user.id, false);
      setNotificacoes(data || []);
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
    }
  };

  // Auto-hide navbar on scroll
  useEffect(() => {
    if (disableNavbarAutoHide) {
      setIsNavbarVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsNavbarVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsNavbarVisible(false);
        setNotificacoesOpen(false);
        setUserMenuOpen(false);
        setShowSearchResults(false);
      } else {
        // Scrolling up
        setIsNavbarVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, disableNavbarAutoHide]);

  useEffect(() => {
    carregarNotificacoes();
    if (!user?.id) return;
    const interval = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    setProjetosCache([]);
    setContratosCache([]);
    setTarefasCache([]);
    setSearchDataReady(false);
    setSearchResults([]);
    setSearchSuggestions([]);
    setSearchFilters({ tipo: 'todos', setor: 'todos', status: 'todos' });
  }, [user?.id, user?.role, user?.setor]);

  const loadSearchData = useCallback(async () => {
    if (!user?.role || searchDataReady || searchLoading) return;

    try {
      setSearchLoading(true);

      const [projetosResult, contratosResult, tarefasResult] = await Promise.allSettled([
        getProjetos(user.role, user.id || null, user.setor || null),
        getContratos({
          user_role: user.role,
          user_id: user.id || null,
          user_setor: user.setor || null,
        }),
        getTarefas({
          usuario_role: user.role,
          usuario_id: user.id || null,
          usuario_setor: user.setor || null,
        }),
      ]);

      setProjetosCache(projetosResult.status === 'fulfilled' ? (projetosResult.value || []) : []);
      setContratosCache(contratosResult.status === 'fulfilled' ? (contratosResult.value || []) : []);
      setTarefasCache(tarefasResult.status === 'fulfilled' ? (tarefasResult.value || []) : []);
      setSearchDataReady(true);
    } catch (e) {
      console.error('Erro ao carregar dados da busca:', e);
      setSearchDataReady(true);
    } finally {
      setSearchLoading(false);
    }
  }, [searchDataReady, searchLoading, user?.id, user?.role, user?.setor]);

  const searchEntries = useMemo(() => {
    const projetosEntries = (projetosCache || []).map((projeto) => {
      const contrato = projeto?.contrato || (projeto?.contratos || [])[0] || {};
      const tarefasProjeto = isOperador ? (projeto.tarefas_operador || []) : [];
      const status = getStatusProjetoEfetivo(projeto, tarefasProjeto);
      const title = getNomePastaContrato(projeto);
      const subtitle = [projeto.cliente, projeto.etapa_atual].filter(Boolean).join(' • ');

      return {
        id: `projeto:${projeto.id}`,
        route: `/projetos/${projeto.id}`,
        tipo: 'projeto',
        title,
        subtitle,
        status,
        setor: tarefasProjeto[0]?.setor || null,
        rawLabel: contrato.numero_contrato || projeto.cliente || title,
        searchableText: [
          title,
          projeto.cliente,
          projeto.etapa_atual,
          contrato.numero_contrato,
          contrato.faculdade,
          contrato.curso,
          status,
        ].filter(Boolean).join(' '),
        suggestions: tokenizeSuggestionValues([
          projeto.cliente,
          contrato.numero_contrato,
          contrato.faculdade,
          contrato.curso,
          projeto.etapa_atual,
        ]),
        icon: '📁',
        badge: status,
      };
    });

    const contratosEntries = (contratosCache || []).map((contrato) => {
      const title = String(contrato.numero_contrato || contrato.cliente || 'Contrato').toUpperCase();
      const subtitle = [contrato.cliente, contrato.faculdade, contrato.curso].filter(Boolean).join(' • ');

      return {
        id: `contrato:${contrato.id}`,
        route: contrato.projeto_id ? `/projetos/${contrato.projeto_id}` : '/contratos',
        tipo: 'contrato',
        title,
        subtitle,
        status: contrato.status || 'Ativo',
        setor: null,
        rawLabel: contrato.numero_contrato || contrato.cliente || title,
        searchableText: [
          title,
          contrato.cliente,
          contrato.numero_contrato,
          contrato.faculdade,
          contrato.curso,
          contrato.status,
        ].filter(Boolean).join(' '),
        suggestions: tokenizeSuggestionValues([
          contrato.cliente,
          contrato.numero_contrato,
          contrato.faculdade,
          contrato.curso,
        ]),
        icon: '📄',
        badge: contrato.status || 'Ativo',
      };
    });

    const tarefasEntries = (tarefasCache || []).map((tarefa) => {
      const finalizada = isTarefaEfetivamenteFinalizada(tarefa);
      const status = finalizada ? 'Concluído' : (tarefa.status_nome || 'Pendente');
      const subtitle = [
        tarefa.contrato_resumo || tarefa.contrato_numero || tarefa.contrato_id,
        tarefa.setor,
        tarefa.responsavel_nome,
      ].filter(Boolean).join(' • ');

      return {
        id: `tarefa:${tarefa.id}`,
        route: tarefa.projeto_id ? `/projetos/${tarefa.projeto_id}` : '/projetos',
        tipo: 'tarefa',
        title: tarefa.titulo,
        subtitle,
        status,
        setor: tarefa.setor || null,
        rawLabel: tarefa.titulo,
        searchableText: [
          tarefa.titulo,
          tarefa.descricao,
          tarefa.setor,
          tarefa.responsavel_nome,
          tarefa.status_nome,
          tarefa.contrato_resumo,
          tarefa.contrato_numero,
          tarefa.contrato_faculdade,
          tarefa.contrato_curso,
        ].filter(Boolean).join(' '),
        suggestions: tokenizeSuggestionValues([
          tarefa.titulo,
          tarefa.responsavel_nome,
          tarefa.setor,
          tarefa.contrato_numero,
          tarefa.contrato_faculdade,
          tarefa.contrato_curso,
        ]),
        icon: '✅',
        badge: status,
      };
    });

    return [...projetosEntries, ...contratosEntries, ...tarefasEntries];
  }, [contratosCache, isOperador, projetosCache, tarefasCache]);

  const searchFilterOptions = useMemo(() => ({
    setores: uniqueValues(searchEntries.map((entry) => entry.setor)).sort((a, b) => a.localeCompare(b)),
    statuses: uniqueValues(searchEntries.map((entry) => entry.status)).sort((a, b) => a.localeCompare(b)),
  }), [searchEntries]);

  useEffect(() => {
    const query = normalizeSearchText(trimmedSearchTerm);

    if (!query) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setShowSearchResults(false);
      return;
    }

    if (!searchDataReady) {
      loadSearchData();
      setShowSearchResults(true);
      return;
    }

    const filteredEntries = searchEntries
      .filter((entry) => searchFilters.tipo === 'todos' || entry.tipo === searchFilters.tipo)
      .filter((entry) => searchFilters.setor === 'todos' || entry.setor === searchFilters.setor)
      .filter((entry) => searchFilters.status === 'todos' || entry.status === searchFilters.status);

    const results = filteredEntries
      .map((entry) => {
        const haystack = normalizeSearchText(entry.searchableText);
        if (!haystack.includes(query)) {
          const tokenHit = (entry.suggestions || []).some((suggestion) => normalizeSearchText(suggestion).includes(query));
          if (!tokenHit) return null;
        }

        const titleNorm = normalizeSearchText(entry.title);
        const labelNorm = normalizeSearchText(entry.rawLabel);
        let score = 0;
        if (titleNorm.startsWith(query)) score += 6;
        if (labelNorm.startsWith(query)) score += 4;
        if (haystack.includes(query)) score += 2;
        if ((entry.suggestions || []).some((suggestion) => normalizeSearchText(suggestion).startsWith(query))) score += 3;

        return { ...entry, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 8);

    const suggestionsMap = new Map();
    filteredEntries.forEach((entry) => {
      (entry.suggestions || []).forEach((suggestion) => {
        const normalized = normalizeSearchText(suggestion);
        if (!normalized || normalized === query || !normalized.includes(query)) return;
        const previous = suggestionsMap.get(normalized);
        suggestionsMap.set(normalized, {
          label: previous?.label || suggestion,
          count: (previous?.count || 0) + 1,
          startsWith: normalized.startsWith(query),
        });
      });
    });

    const suggestions = Array.from(suggestionsMap.values())
      .sort((a, b) => Number(b.startsWith) - Number(a.startsWith) || b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 6)
      .map((item) => item.label);

    setSearchResults(results);
    setSearchSuggestions(suggestions);
    setShowSearchResults(true);
  }, [loadSearchData, searchDataReady, searchEntries, searchFilters, trimmedSearchTerm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notification-wrapper')) {
        setNotificacoesOpen(false);
      }
      if (!e.target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
      if (!e.target.closest('.search-box')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const prevCompactRef = useRef(isCompactLayout);

  useEffect(() => {
    if (!prevCompactRef.current && isCompactLayout) {
      setSidebarOpen(false);
    }
    prevCompactRef.current = isCompactLayout;
  }, [isCompactLayout]);

  const getNotificacaoIcon = (tipo) => {
    switch(tipo) {
      case 'alerta': return '⚠️';
      case 'sucesso': return '✅';
      case 'cobranca': return '📣';
      case 'resposta_cobranca': return '💬';
      default: return 'ℹ️';
    }
  };

  const handleMarkAsRead = async (notifId) => {
    setNotificacoes(prev => prev.map(n => n.id === notifId ? { ...n, lida: true } : n));
    try {
      await marcarNotificacaoLida(notifId);
    } catch (e) {
      console.error('Erro ao marcar notificação como lida:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    const ids = notificacoes.filter(n => !n.lida).map(n => n.id);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    await Promise.all(ids.map(id => marcarNotificacaoLida(id).catch(() => null)));
  };

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif.id);
    
    // Se tiver projeto_id, navega para a página de projetos com destaque
    if (notif.projeto_id) {
      navigate(`/projetos?projeto_id=${notif.projeto_id}`);
      setNotificacoesOpen(false);
    } 
    // Se for notificação de atraso genérica, vai para projetos
    else if (notif.tipo === 'alerta' && notif.mensagem.includes('atras')) {
      navigate('/projetos');
      setNotificacoesOpen(false);
    }
  };

  const handleResponderCobranca = (notif) => {
    setCobrancaSelecionada(notif);
    setRespostaTexto('');
    setResponderModalOpen(true);
  };

  const enviarResposta = async () => {
    if (!respostaTexto.trim() || !cobrancaSelecionada) return;
    setEnviandoResposta(true);
    try {
      await responderCobranca({
        notificacao_id: cobrancaSelecionada.id,
        resposta: respostaTexto.trim(),
        operador_id: user?.id || 'unknown',
        operador_nome: user?.nome || user?.username || 'Operador',
      });
      setResponderModalOpen(false);
      setCobrancaSelecionada(null);
      setRespostaTexto('');
      await carregarNotificacoes();
      toast.success('Resposta enviada ao gestor');
    } catch (e) {
      console.error('Erro ao responder cobrança:', e);
      toast.error('Erro ao enviar resposta');
    } finally {
      setEnviandoResposta(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchResultClick = (result) => {
    navigate(result.route || '/projetos');
    setSearchTerm('');
    setSearchSuggestions([]);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSearchResults(true);
  };

  const handleSearchFocus = () => {
    if (!searchDataReady && !searchLoading) {
      loadSearchData();
    }
    if (trimmedSearchTerm) {
      setShowSearchResults(true);
    }
  };

  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchResults]);

  const handleSearchKeyDown = (e) => {
    if (!showSearchResults || searchResults.length === 0) {
      if (e.key === 'Escape') {
        setShowSearchResults(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectedResultIndex >= 0 ? searchResults[selectedResultIndex] : searchResults[0];
      if (target) handleSearchResultClick(target);
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSelectedResultIndex(-1);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`layout-novo ${isCompactLayout ? 'layout-compact' : ''}`}>
      <SidebarNova isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      <main className="main-novo">
        {/* Top Bar */}
        <header className={`topbar-novo ${!isNavbarVisible ? 'hidden' : ''}`}>
          <div className="topbar-left">
            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>

            <div className="search-box">
              <Search size={18} className="search-icon" />
              <Input
                type="text"
                placeholder="Buscar tarefas, projetos, contratos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleSearchFocus}
                onKeyDown={handleSearchKeyDown}
                className="search-input"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchLoading && !searchDataReady && (
                <div className="search-results-dropdown">
                  <div className="no-results">
                    <p>Carregando base de busca...</p>
                  </div>
                </div>
              )}

              {showSearchResults && !searchLoading && trimmedSearchTerm && searchResults.length > 0 && (
                <div className="search-results-dropdown">
                  <div className="search-results-header">
                    <span>Busca inteligente</span>
                    <span className="results-count">{searchResults.length} resultado(s)</span>
                  </div>
                  <div className="search-filters-row">
                    <select
                      className="search-filter-select"
                      value={searchFilters.tipo}
                      onChange={(e) => setSearchFilters((prev) => ({ ...prev, tipo: e.target.value }))}
                    >
                      <option value="todos">Todos os tipos</option>
                      <option value="tarefa">Tarefas</option>
                      <option value="projeto">Projetos</option>
                      <option value="contrato">Contratos</option>
                    </select>
                    <select
                      className="search-filter-select"
                      value={searchFilters.setor}
                      onChange={(e) => setSearchFilters((prev) => ({ ...prev, setor: e.target.value }))}
                    >
                      <option value="todos">Todos os setores</option>
                      {searchFilterOptions.setores.map((setor) => (
                        <option key={setor} value={setor}>
                          {setor}
                        </option>
                      ))}
                    </select>
                    <select
                      className="search-filter-select"
                      value={searchFilters.status}
                      onChange={(e) => setSearchFilters((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="todos">Todos os status</option>
                      {searchFilterOptions.statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  {searchSuggestions.length > 0 && (
                    <div className="search-suggestions">
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="search-suggestion-chip"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="search-results-list">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.id}-${index}`}
                        className={`search-result-item${index === selectedResultIndex ? ' search-result-item--active' : ''}`}
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <div className="result-icon">{result.icon}</div>
                        <div className="result-content">
                          <span className="result-title">{result.title}</span>
                          <span className="result-subtitle">
                            {result.subtitle || 'Sem detalhes adicionais'}
                          </span>
                          <span className="result-meta">
                            {result.tipo}{result.setor ? ` • ${result.setor}` : ''}
                          </span>
                        </div>
                        <Badge className="result-badge">
                          {result.badge}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {showSearchResults && !searchLoading && trimmedSearchTerm && searchResults.length === 0 && (
                <div className="search-results-dropdown">
                  <div className="search-results-header">
                    <span>Busca inteligente</span>
                    <span className="results-count">0 resultado(s)</span>
                  </div>
                  {searchSuggestions.length > 0 && (
                    <div className="search-suggestions">
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="search-suggestion-chip"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="no-results">
                    <p>Nenhum resultado encontrado para "{searchTerm}"</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {/* Theme Toggle */}
            <ThemeToggle compact={true} />
            

            <div className="notification-wrapper">
              <button 
                className="topbar-btn notification-btn"
                onClick={() => setNotificacoesOpen(!notificacoesOpen)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
              
              {notificacoesOpen && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>Notificações</span>
                    <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                      Marcar como lidas
                    </button>
                  </div>
                  <div className="notification-list">
                    {notificacoes.length === 0 ? (
                      <div className="no-notifications">
                        <p>Nenhuma notificação</p>
                      </div>
                    ) : (
                      notificacoes.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${notif.lida ? '' : 'unread'}`}
                          onClick={() => handleNotificationClick(notif)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="notification-icon">{getNotificacaoIcon(notif.tipo)}</span>
                          <div className="notification-content">
                            <span className="notification-title">{notif.titulo}</span>
                            <span className="notification-message">{notif.mensagem}</span>
                          </div>
                          {user?.role === 'operador' && notif.tipo === 'cobranca' && (
                            <button
                              className="mark-read-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResponderCobranca(notif);
                              }}
                              title="Responder cobrança"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {!notif.lida && (
                            <button 
                              className="mark-read-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notif.id);
                              }}
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu">
              <button 
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar-small">
                  {user?.nome?.charAt(0) || 'U'}
                </div>
                <span className="user-name-text mobile-hide">{user?.nome?.split(' ')[0] || 'Usuário'}</span>
                <ChevronDown size={16} className="chevron mobile-hide" />
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-avatar-large">
                      {user?.nome?.charAt(0) || 'U'}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user?.nome || 'Usuário'}</span>
                      <span className="user-email">{user?.email || 'email@exemplo.com'}</span>
                    </div>
                  </div>
                  <div className="user-menu-divider"></div>
                  <div className="user-menu-items">
                    <button 
                      className="user-menu-item"
                      onClick={() => {
                        navigate('/configuracoes');
                        setUserMenuOpen(false);
                      }}
                    >
                      <Settings size={18} />
                      <span>Configurações</span>
                    </button>
                    <button 
                      className="user-menu-item logout"
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Header */}
        {(title || subtitle) && (
          <div className="page-header-novo">
            {title && <h1 className="page-title-novo">{title}</h1>}
            {subtitle && <p className="page-subtitle-novo">{subtitle}</p>}
          </div>
        )}

        {/* Page Content */}
        <div className="page-content-novo">
          {children}
        </div>
      </main>

      <Dialog open={responderModalOpen} onOpenChange={setResponderModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Responda ao gestor/administrador sobre a cobrança recebida.
            </p>
            <Textarea
              rows={5}
              value={respostaTexto}
              onChange={(e) => setRespostaTexto(e.target.value)}
              placeholder="Digite sua resposta..."
            />
          </div>
          <DialogFooter className="mt-4">
            <UIButton variant="outline" onClick={() => setResponderModalOpen(false)} disabled={enviandoResposta}>
              Cancelar
            </UIButton>
            <UIButton onClick={enviarResposta} disabled={enviandoResposta || !respostaTexto.trim()}>
              {enviandoResposta ? 'Enviando...' : 'Enviar resposta'}
            </UIButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LayoutNovo;
