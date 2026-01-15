import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SidebarNova from './SidebarNova';
import { Bell, Search, Share2, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { mockNotificacoes } from '../data/mockNovo';
import './LayoutNovo.css';

const LayoutNovo = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const unreadCount = mockNotificacoes.filter(n => !n.lida).length;

  const getNotificacaoIcon = (tipo) => {
    switch(tipo) {
      case 'alerta': return '⚠️';
      case 'sucesso': return '✅';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="layout-novo">
      <SidebarNova />
      
      <main className="main-novo">
        {/* Top Bar */}
        <header className="topbar-novo">
          <div className="topbar-left">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <Input
                type="text"
                placeholder="Buscar projetos, contratos, clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn share-btn">
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
                    <button className="mark-all-read">Marcar como lidas</button>
                  </div>
                  <div className="notification-list">
                    {mockNotificacoes.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`notification-item ${notif.lida ? '' : 'unread'}`}
                      >
                        <span className="notification-icon">{getNotificacaoIcon(notif.tipo)}</span>
                        <div className="notification-content">
                          <span className="notification-title">{notif.titulo}</span>
                          <span className="notification-message">{notif.mensagem}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu">
              <div className="user-avatar-small">
                {user?.nome?.charAt(0) || 'U'}
              </div>
              <ChevronDown size={16} className="chevron" />
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
