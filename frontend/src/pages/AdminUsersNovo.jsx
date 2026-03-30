import React, { useState, useEffect } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  UserPlus,
  Clock
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import './AdminUsers.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminUsersNovo = () => {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPending, setShowPending] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    nome: '',
    email: '',
    password: '',
    role: 'operador',
    setor: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/api/users?user_role=admin`),
        axios.get(`${API_URL}/api/users/pending?user_role=admin`)
      ]);
      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRole === 'todos' || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getRoleInfo = (role) => {
    const roles = {
      'admin': { label: 'Administrador', color: 'bg-red-100 text-red-800', icon: ShieldAlert },
      'gerente': { label: 'Gerente', color: 'bg-purple-100 text-purple-800', icon: ShieldCheck },
      'operador': { label: 'Operador', color: 'bg-blue-100 text-blue-800', icon: Shield }
    };
    return roles[role] || roles['operador'];
  };

  const getSetorLabel = (setor) => {
    const setores = {
      'atendimento': 'Atendimento',
      'criacao': 'Criação',
      'pre-producao': 'Pré-Produção',
      'producao': 'Produção'
    };
    return setores[setor] || setor;
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        nome: user.nome,
        email: user.email,
        password: '',
        role: user.role,
        setor: user.setor || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        nome: '',
        email: '',
        password: '',
        role: 'operador',
        setor: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Validação
    if (!formData.nome || !formData.email || !formData.username) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('Senha é obrigatória para novos usuários');
      return;
    }

    if (formData.role === 'operador' && !formData.setor) {
      toast.error('Operadores devem ter um setor definido');
      return;
    }

    try {
      if (editingUser) {
        // Atualizar usuário
        await axios.put(
          `${API_URL}/api/users/${editingUser.id}?admin_role=admin`,
          {
            nome: formData.nome,
            email: formData.email,
            role: formData.role,
            setor: formData.setor || null,
            password: formData.password || undefined
          }
        );
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        await axios.post(
          `${API_URL}/api/users?admin_role=admin`,
          formData
        );
        toast.success('Usuário criado com sucesso!');
      }
      
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/users/${userId}?admin_role=admin`);
      toast.success('Usuário deletado com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário');
    }
  };

  const handleApprove = async (userId, approve) => {
    try {
      await axios.post(
        `${API_URL}/api/users/${userId}/approve?admin_role=admin`,
        {
          aprovado: approve,
          aprovado_por: 'admin'
        }
      );
      toast.success(approve ? 'Usuário aprovado!' : 'Usuário rejeitado');
      loadData();
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      toast.error('Erro ao processar aprovação');
    }
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Usuários</h1>
            <p className="text-gray-600">Gerencie usuários, permissões e aprovações</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Pending Users Alert */}
        {pendingUsers.length > 0 && (
          <Card className="mb-6 border-orange-300 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-orange-600" size={24} />
                  <div>
                    <p className="font-semibold text-orange-900">
                      {pendingUsers.length} usuário(s) aguardando aprovação
                    </p>
                    <p className="text-sm text-orange-800">
                      Novos cadastros precisam da sua aprovação para acessar o sistema
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPending(!showPending)}
                  className="border-orange-300"
                >
                  {showPending ? 'Ocultar' : 'Ver Pendentes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Users List */}
        {showPending && pendingUsers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Usuários Pendentes de Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-semibold">{user.nome}</h4>
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>@{user.username}</span>
                        <span>{user.email}</span>
                        <Badge className={getRoleInfo(user.role).color}>
                          {getRoleInfo(user.role).label}
                        </Badge>
                        {user.setor && (
                          <Badge variant="outline">{getSetorLabel(user.setor)}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(user.id, false)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={16} className="mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os papéis</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="gerente">Gerentes</SelectItem>
              <SelectItem value="operador">Operadores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Usuários Ativos ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const roleInfo = getRoleInfo(user.role);
                const RoleIcon = roleInfo.icon;
                
                return (
                  <div key={user.id} className="user-row flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <RoleIcon className="text-blue-600" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{user.nome}</h4>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            @{user.username}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {user.email}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={roleInfo.color}>
                          {roleInfo.label}
                        </Badge>
                        {user.setor && (
                          <Badge variant="outline" className="capitalize">
                            {getSetorLabel(user.setor)}
                          </Badge>
                        )}
                        <Badge className={user.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(user)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="action-ghost action-ghost-red"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal Create/Edit User */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="João da Silva"
                  />
                </div>
                <div>
                  <Label>Username *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="joao.silva"
                    disabled={editingUser}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@ideiabh.com.br"
                  />
                </div>
                <div>
                  <Label>Senha {!editingUser && '*'}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingUser ? "Deixe em branco para manter" : "Digite a senha"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Papel *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'operador' && (
                  <div>
                    <Label>Setor * (obrigatório para operadores)</Label>
                    <Select value={formData.setor} onValueChange={(value) => setFormData({...formData, setor: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="atendimento">Atendimento</SelectItem>
                        <SelectItem value="criacao">Criação</SelectItem>
                        <SelectItem value="pre-producao">Pré-Produção</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {formData.role === 'operador' && !formData.setor && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Operadores devem ter um setor definido para acessar e concluir suas etapas
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                {editingUser ? 'Atualizar' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutNovo>
  );
};

export default AdminUsersNovo;
