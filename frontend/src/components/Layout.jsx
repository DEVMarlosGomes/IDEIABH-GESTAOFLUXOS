import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { mockNotificacoes } from '../data/mock';
import './Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);

  const unreadCount = mockNotificacoes.filter(n => !n.lida).length;

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/dashboard',
      permission: 'dashboard'
    },
    { 
      icon: FileText, 
      label: 'Contratos', 
      path: '/contratos',
      permission: 'contratos_visualizar'
    },
    { 
      icon: FolderKanban, 
      label: 'Projetos', 
      path: '/projetos',
      permission: 'projetos_visualizar'
    },
    { 
      icon: CheckSquare, 
      label: 'Tarefas', 
      path: '/tarefas',
      permission: 'tarefas_visualizar'
    },
  ];

  if (hasPermission('admin')) {
    menuItems.push({ 
      icon: Users, 
      label: 'Usuários', 
      path: '/admin/users',
      permission: 'admin'
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            {sidebarOpen && (
              <>
                <div className="logo-icon">IB</div>
                <span className="logo-text">IDEIABH</span>
              </>
            )}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
              {isActive(item.path) && sidebarOpen && (
                <ChevronRight size={16} className="nav-arrow" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="user-info">
              <div className="user-avatar">
                {user?.nome?.charAt(0) || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.nome || 'Usuário'}</span>
                <span className="user-role">{user?.role || 'Operador'}</span>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
        {/* Top Bar */}
        <header className="top-bar">
          <div className="page-title">
            <h1>{menuItems.find(m => isActive(m.path))?.label || 'IDEIABH'}</h1>
          </div>
          <div className="top-bar-actions">
            <div className="notification-wrapper">
              <Button 
                variant="ghost" 
                size="icon"
                className="notification-btn"
                onClick={() => setNotificacoesOpen(!notificacoesOpen)}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <Badge className="notification-badge">{unreadCount}</Badge>
                )}
              </Button>
              
              {notificacoesOpen && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>Notificações</span>
                    <button className="mark-all-read">Marcar todas como lidas</button>
                  </div>
                  <div className="notification-list">
                    {mockNotificacoes.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`notification-item ${notif.lida ? 'read' : 'unread'}`}
                      >
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
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
