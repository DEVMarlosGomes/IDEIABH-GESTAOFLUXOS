import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SidebarNova from './SidebarNova';
import ThemeToggle from './ThemeToggle';
import { Bell, Search, ChevronDown, Settings, LogOut, Check, Menu } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button as UIButton } from './ui/button';
import { Input } from './ui/input';
import { getProjetos, getContratos, getNotificacoes, marcarNotificacaoLida, responderCobranca } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import './LayoutNovo.css';

const LayoutNovo = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [projetosCache, setProjetosCache] = useState([]);
  const [contratosCache, setContratosCache] = useState([]);
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

  // Search functionality
  useEffect(() => {
    const loadAndSearch = async () => {
      if (searchTerm.length <= 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        setSearchLoading(true);
        let projetos = projetosCache;
        let contratos = contratosCache;

        if (!projetos.length) {
          try {
            projetos = await getProjetos(user?.role || 'operador');
            setProjetosCache(projetos || []);
          } catch (err) {
            projetos = [];
          }
        }
        if (!contratos.length) {
          contratos = await getContratos();
          setContratosCache(contratos || []);
        }

        const term = searchTerm.toLowerCase();
        const results = [];

        const projectResults = (projetos || [])
          .filter(p => 
            (p.cliente || '').toLowerCase().includes(term) ||
            (p.instituicao || '').toLowerCase().includes(term) ||
            (p.etapa_atual_nome || '').toLowerCase().includes(term)
          )
          .slice(0, 5)
          .map(p => ({ ...p, type: 'projeto' }));

        const contractResults = (contratos || [])
          .filter(c => 
            (c.cliente || '').toLowerCase().includes(term) ||
            (c.instituicao || '').toLowerCase().includes(term) ||
            (c.numero_contrato || '').toLowerCase().includes(term)
          )
          .slice(0, 5)
          .map(c => ({ ...c, type: 'contrato' }));

        results.push(...projectResults, ...contractResults);
        setSearchResults(results.slice(0, 8));
        setShowSearchResults(true);
      } catch (e) {
        console.error('Erro ao buscar:', e);
        setSearchResults([]);
        setShowSearchResults(true);
      } finally {
        setSearchLoading(false);
      }
    };

    loadAndSearch();
  }, [searchTerm, projetosCache, contratosCache]);

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
    if (result.type === 'projeto') {
      navigate('/projetos');
    } else {
      navigate('/contratos');
    }
    setSearchTerm('');
    setShowSearchResults(false);
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
                placeholder="Buscar projetos, contratos, clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchLoading && (
                <div className="search-results-dropdown">
                  <div className="no-results">
                    <p>Carregando resultados...</p>
                  </div>
                </div>
              )}

              {showSearchResults && !searchLoading && searchResults.length > 0 && (
                <div className="search-results-dropdown">
                  <div className="search-results-header">
                    <span>Resultados da busca</span>
                    <span className="results-count">{searchResults.length} encontrado(s)</span>
                  </div>
                  <div className="search-results-list">
                    {searchResults.map((result, index) => (
                      <div 
                        key={index}
                        className="search-result-item"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <div className="result-icon">
                          {result.type === 'projeto' ? '📁' : '📄'}
                        </div>
                        <div className="result-content">
                          <span className="result-title">{result.cliente}</span>
                          <span className="result-subtitle">
                            {result.instituicao} • {result.type === 'projeto' ? result.etapa_atual_nome : result.numero_contrato}
                          </span>
                        </div>
                        <Badge className="result-badge">
                          {result.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {showSearchResults && !searchLoading && searchResults.length === 0 && searchTerm.length > 2 && (
                <div className="search-results-dropdown">
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
