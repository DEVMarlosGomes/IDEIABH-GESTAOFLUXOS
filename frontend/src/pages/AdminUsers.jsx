import React, { useState } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  User as UserIcon,
  CheckCircle,
  XCircle,
  UserCog,
  Filter
} from 'lucide-react';
import { mockUsers } from '../data/mock';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'operador',
    ativo: true,
    permissoes: {
      dashboard: true,
      contratos_visualizar: true,
      contratos_criar: false,
      contratos_editar: false,
      contratos_excluir: false,
      contratos_aprovar: false,
      projetos_visualizar: true,
      projetos_avancar: false,
      tarefas_visualizar: true,
      tarefas_criar: false,
      tarefas_editar: false,
      tarefas_concluir: true,
      admin: false
    }
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRole === 'todos' || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getRoleInfo = (role) => {
    const roles = {
      'admin': { label: 'Administrador', color: '#dc2626', bg: '#fef2f2', icon: ShieldAlert },
      'gerente': { label: 'Gerente', color: '#7c3aed', bg: '#f5f3ff', icon: ShieldCheck },
      'operador': { label: 'Operador', color: '#0ea5e9', bg: '#f0f9ff', icon: Shield }
    };
    return roles[role] || roles['operador'];
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        role: user.role,
        ativo: user.ativo,
        permissoes: { ...user.permissoes }
      });
    } else {
      setEditingUser(null);
      setFormData({
        nome: '',
        email: '',
        role: 'operador',
        ativo: true,
        permissoes: {
          dashboard: true,
          contratos_visualizar: true,
          contratos_criar: false,
          contratos_editar: false,
          contratos_excluir: false,
          contratos_aprovar: false,
          projetos_visualizar: true,
          projetos_avancar: false,
          tarefas_visualizar: true,
          tarefas_criar: false,
          tarefas_editar: false,
          tarefas_concluir: true,
          admin: false
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id ? { ...u, ...formData } : u
      ));
    } else {
      const newUser = {
        id: 'user-' + Date.now(),
        ...formData
      };
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const toggleUserStatus = (userId) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, ativo: !u.ativo } : u
    ));
  };

  const permissaoLabels = {
    dashboard: 'Dashboard',
    contratos_visualizar: 'Ver Contratos',
    contratos_criar: 'Criar Contratos',
    contratos_editar: 'Editar Contratos',
    contratos_excluir: 'Excluir Contratos',
    contratos_aprovar: 'Aprovar Contratos',
    projetos_visualizar: 'Ver Projetos',
    projetos_avancar: 'Avançar Projetos',
    tarefas_visualizar: 'Ver Tarefas',
    tarefas_criar: 'Criar Tarefas',
    tarefas_editar: 'Editar Tarefas',
    tarefas_concluir: 'Concluir Tarefas',
    admin: 'Administração'
  };

  return (
    <LayoutNovo 
      title="Gerenciamento de Usuários"
      subtitle="Gerencie os funcionários e suas permissões no sistema"
    >
      <div className="admin-users-container">
        {/* Stats Cards */}
        <div className="users-stats-grid">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
                  <Users size={24} style={{ color: '#1d4ed8' }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total de Usuários</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                  <CheckCircle size={24} style={{ color: '#15803d' }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {users.filter(u => u.ativo).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="stat-icon" style={{ backgroundColor: '#fef2f2' }}>
                  <ShieldAlert size={24} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Administradores</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="stat-icon" style={{ backgroundColor: '#f5f3ff' }}>
                  <ShieldCheck size={24} style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gerentes</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {users.filter(u => u.role === 'gerente').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="actions-bar">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <Input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            <Filter size={16} />
            {['todos', 'admin', 'gerente', 'operador'].map((role) => (
              <button
                key={role}
                className={`filter-btn ${filterRole === role ? 'active' : ''}`}
                onClick={() => setFilterRole(role)}
              >
                {role === 'todos' ? 'Todos' : getRoleInfo(role).label}
              </button>
            ))}
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={64} />
            </div>
            <h3>Nenhum usuário encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo usuário.</p>
            <Button onClick={() => handleOpenModal()} className="mt-4">
              <Plus size={18} className="mr-2" />
              Adicionar Usuário
            </Button>
          </div>
        ) : (
          <div className="users-grid">
            {filteredUsers.map((user) => {
              const roleInfo = getRoleInfo(user.role);
              const RoleIcon = roleInfo.icon;

            return (
              <Card key={user.id} className={`user-card ${!user.ativo ? 'inactive' : ''}`}>
                <CardContent className="user-card-content">
                  <div className="user-header">
                    <div className="user-avatar">
                      {user.nome.charAt(0)}
                    </div>
                    <div className="user-info">
                      <h3 className="user-name">{user.nome}</h3>
                      <span className="user-email">
                        <Mail size={12} />
                        {user.email}
                      </span>
                    </div>
                    <div className="user-status">
                      {user.ativo ? (
                        <Badge className="status-badge active">
                          <CheckCircle size={12} />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="status-badge inactive">
                          <XCircle size={12} />
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="user-role-section">
                    <Badge 
                      className="role-badge"
                      style={{ 
                        backgroundColor: roleInfo.bg,
                        color: roleInfo.color
                      }}
                    >
                      <RoleIcon size={14} />
                      {roleInfo.label}
                    </Badge>
                  </div>

                  <div className="user-permissions">
                    <span className="permissions-title">Permissões:</span>
                    <div className="permissions-list">
                      {Object.entries(user.permissoes || {}).filter(([_, v]) => v).slice(0, 4).map(([key]) => (
                        <Badge key={key} variant="outline" className="permission-badge">
                          {permissaoLabels[key]}
                        </Badge>
                      ))}
                      {Object.entries(user.permissoes || {}).filter(([_, v]) => v).length > 4 && (
                        <Badge variant="outline" className="permission-badge more">
                          +{Object.entries(user.permissoes || {}).filter(([_, v]) => v).length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="user-actions">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleOpenModal(user)}
                    >
                      <Edit2 size={16} />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleUserStatus(user.id)}
                    >
                      {user.ativo ? <XCircle size={16} /> : <CheckCircle size={16} />}
                      {user.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="delete-btn"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <h3>Nenhum usuário encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo usuário.</p>
          </div>
        )}

        {/* Modal de Criar/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="user-modal">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="form-group">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Label>Cargo</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <Label>Status</Label>
                  <div className="switch-wrapper">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                    />
                    <span>{formData.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </div>

              <div className="permissions-section">
                <Label>Permissões</Label>
                <div className="permissions-grid">
                  {Object.entries(permissaoLabels).map(([key, label]) => (
                    <div key={key} className="permission-item">
                      <Switch
                        checked={formData.permissoes?.[key] || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          permissoes: { ...formData.permissoes, [key]: checked }
                        })}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingUser ? 'Salvar' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminUsers;
