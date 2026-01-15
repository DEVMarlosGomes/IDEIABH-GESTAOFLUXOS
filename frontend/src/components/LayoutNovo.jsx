import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SidebarNova from './SidebarNova';
import { Bell, Search, Share2, ChevronDown, User, Settings, LogOut, Check, Menu, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { mockNotificacoes, mockProjetos, mockContratos } from '../data/mockNovo';
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
  const [notificacoes, setNotificacoes] = useState(mockNotificacoes);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const unreadCount = notificacoes.filter(n => !n.lida).length;

  // Auto-hide navbar on scroll
  useEffect(() => {
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
  }, [lastScrollY]);

  // Search functionality
  useEffect(() => {
    if (searchTerm.length > 2) {
      const results = [];
      
      // Search in projects
      const projectResults = mockProjetos
        .filter(p => 
          p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.instituicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.etapa_atual_nome.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5)
        .map(p => ({ ...p, type: 'projeto' }));
      
      // Search in contracts
      const contractResults = mockContratos
        .filter(c => 
          c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.instituicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5)
        .map(c => ({ ...c, type: 'contrato' }));
      
      results.push(...projectResults, ...contractResults);
      setSearchResults(results.slice(0, 8));
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm]);

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

  const getNotificacaoIcon = (tipo) => {
    switch(tipo) {
      case 'alerta': return '⚠️';
      case 'sucesso': return '✅';
      default: return 'ℹ️';
    }
  };

  const handleMarkAsRead = (notifId) => {
    setNotificacoes(prev => 
      prev.map(n => n.id === notifId ? { ...n, lida: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif.id);
    if (notif.tipo === 'alerta' && notif.mensagem.includes('atras')) {
      navigate('/projetos');
      setNotificacoesOpen(false);
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
    <div className="layout-novo">
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
              {showSearchResults && searchResults.length > 0 && (
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
              
              {showSearchResults && searchResults.length === 0 && searchTerm.length > 2 && (
                <div className="search-results-dropdown">
                  <div className="no-results">
                    <p>Nenhum resultado encontrado para "{searchTerm}"</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn share-btn mobile-hide">
              <Share2 size={18} />
            </button>

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
    </div>
  );
};

export default LayoutNovo;
