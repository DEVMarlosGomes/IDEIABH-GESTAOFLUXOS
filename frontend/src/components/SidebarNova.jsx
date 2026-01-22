import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  Users,
  Palette,
  ClipboardList,
  Package,
  FileText,
  UserCircle,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  FolderKanban,
  X,
  BarChart3,
  Calendar
} from 'lucide-react';
import './SidebarNova.css';

const SidebarNova = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const menuPrincipal = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/dashboard',
      permission: 'dashboard'
    },
  ];

  const menuDepartamentos = [
    { 
      icon: Users, 
      label: 'Atendimento', 
      path: '/departamento/atendimento',
      cor: '#3b82f6'
    },
    { 
      icon: Palette, 
      label: 'Criação', 
      path: '/departamento/criacao',
      cor: '#8b5cf6'
    },
    { 
      icon: ClipboardList, 
      label: 'Pré-Produção', 
      path: '/departamento/pre-producao',
      cor: '#f59e0b'
    },
    { 
      icon: Package, 
      label: 'Produção', 
      path: '/departamento/producao',
      cor: '#10b981'
    },
  ];

  const menuGestao = [
    { 
      icon: FolderKanban, 
      label: 'Projetos', 
      path: '/projetos',
      permission: 'projetos_visualizar'
    },
    { 
      icon: FileText, 
      label: 'Contratos', 
      path: '/contratos',
      permission: 'contratos_visualizar'
    },
    { 
      icon: BarChart3, 
      label: 'Relatórios', 
      path: '/relatorios',
      cor: '#ef4444'
    },
    { 
      icon: Calendar, 
      label: 'Templates Prazos', 
      path: '/templates-prazos',
      cor: '#8b5cf6'
    },
  ];

  const menuAdmin = [
    { 
      icon: UserCircle, 
      label: 'Funcionários', 
      path: '/admin/users',
      permission: 'admin'
    },
    { 
      icon: Settings, 
      label: 'Configurações', 
      path: '/configuracoes',
      permission: 'admin'
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const MenuItem = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <button
        className={`sidebar-menu-item ${active ? 'active' : ''}`}
        onClick={() => {
          navigate(item.path);
          if (onClose) onClose(); // Close sidebar on mobile
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
      {/* Close button for mobile */}
      <button className="sidebar-close-btn" onClick={onClose}>
        <X size={24} />
      </button>

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <span>IB</span>
        </div>
        <div className="logo-text">
          <span className="logo-title">IdeiaBH</span>
          <span className="logo-subtitle">Gestão de Projetos</span>
        </div>
      </div>

      {/* Menu Principal */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {menuPrincipal.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}
        </div>

        <div className="nav-section">
          <span className="section-title">Departamentos</span>
          {menuDepartamentos.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}
        </div>

        <div className="nav-section">
          <span className="section-title">Gestão</span>
          {menuGestao.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}
        </div>

        {hasPermission('admin') && (
          <div className="nav-section">
            <span className="section-title">Administração</span>
            {menuAdmin.filter(item => !item.permission || hasPermission(item.permission)).map((item) => (
              <MenuItem key={item.path} item={item} />
            ))}
          </div>
        )}
      </nav>

      {/* Footer com Usuário */}
      <div className="sidebar-footer">
        <div className="theme-toggle-wrapper">
          <ThemeToggle />
        </div>
        
        <button className="help-button">
          <HelpCircle size={18} />
          <span>Ajuda</span>
        </button>
        
        <div className="user-section">
          <div className="user-avatar">
            {user?.nome?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.nome || 'Usuário'}</span>
            <span className="user-role">{user?.departamento || user?.role || 'Operador'}</span>
          </div>
          <button className="logout-button" onClick={handleLogout} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNova;
