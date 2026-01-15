import React, { useState } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Settings,
  Bell,
  Lock,
  User,
  Mail,
  Save,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Configuracoes.css';

const Configuracoes = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  
  const [notificacoes, setNotificacoes] = useState({
    emailNotifications: true,
    projectUpdates: true,
    taskReminders: true,
    weeklyReport: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotificacoes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePerfil = () => {
    console.log('Salvando perfil:', formData);
    // Aqui você implementaria a lógica de salvar
  };

  const handleChangePassword = () => {
    if (formData.novaSenha !== formData.confirmarSenha) {
      alert('As senhas não coincidem!');
      return;
    }
    console.log('Alterando senha');
    // Aqui você implementaria a lógica de alterar senha
  };

  return (
    <LayoutNovo 
      title="Configurações" 
      subtitle="Gerencie suas preferências e configurações da conta"
    >
      <div className="configuracoes-container">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="configuracoes-tabs">
          <TabsList className="configuracoes-tabs-list">
            <TabsTrigger value="perfil" className="tab-trigger">
              <User size={18} />
              <span>Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="tab-trigger">
              <Lock size={18} />
              <span>Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="tab-trigger">
              <Bell size={18} />
              <span>Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="sistema" className="tab-trigger">
              <Settings size={18} />
              <span>Sistema</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Perfil */}
          <TabsContent value="perfil" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="config-form">
                  <div className="form-group">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <Label>Departamento</Label>
                    <Input
                      value={user?.departamento || 'Não atribuído'}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <Label>Função</Label>
                    <Input
                      value={user?.role || 'Operador'}
                      disabled
                    />
                  </div>

                  <Button onClick={handleSavePerfil} className="save-btn">
                    <Save size={18} />
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Segurança */}
          <TabsContent value="seguranca" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="config-form">
                  <div className="form-group">
                    <Label htmlFor="senhaAtual">Senha Atual</Label>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <Input
                        id="senhaAtual"
                        name="senhaAtual"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.senhaAtual}
                        onChange={handleInputChange}
                        placeholder="Digite sua senha atual"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <Label htmlFor="novaSenha">Nova Senha</Label>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <Input
                        id="novaSenha"
                        name="novaSenha"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.novaSenha}
                        onChange={handleInputChange}
                        placeholder="Digite a nova senha"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <Input
                        id="confirmarSenha"
                        name="confirmarSenha"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmarSenha}
                        onChange={handleInputChange}
                        placeholder="Confirme a nova senha"
                      />
                    </div>
                  </div>

                  <Button onClick={handleChangePassword} className="save-btn">
                    <RefreshCw size={18} />
                    Alterar Senha
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Notificações */}
          <TabsContent value="notificacoes" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="config-form">
                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Notificações por E-mail</h4>
                      <p>Receba atualizações importantes por e-mail</p>
                    </div>
                    <Switch
                      checked={notificacoes.emailNotifications}
                      onCheckedChange={() => handleNotificationChange('emailNotifications')}
                    />
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Atualizações de Projetos</h4>
                      <p>Seja notificado quando um projeto for atualizado</p>
                    </div>
                    <Switch
                      checked={notificacoes.projectUpdates}
                      onCheckedChange={() => handleNotificationChange('projectUpdates')}
                    />
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Lembretes de Tarefas</h4>
                      <p>Receba lembretes de tarefas pendentes</p>
                    </div>
                    <Switch
                      checked={notificacoes.taskReminders}
                      onCheckedChange={() => handleNotificationChange('taskReminders')}
                    />
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Relatório Semanal</h4>
                      <p>Receba um resumo semanal das atividades</p>
                    </div>
                    <Switch
                      checked={notificacoes.weeklyReport}
                      onCheckedChange={() => handleNotificationChange('weeklyReport')}
                    />
                  </div>

                  <Button className="save-btn">
                    <Save size={18} />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Sistema */}
          <TabsContent value="sistema" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="config-form">
                  <div className="system-info">
                    <div className="info-row">
                      <span className="info-label">Versão do Sistema:</span>
                      <span className="info-value">1.0.0</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Último Backup:</span>
                      <span className="info-value">15/05/2024 14:30</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Usuários Ativos:</span>
                      <span className="info-value">4</span>
                    </div>
                  </div>

                  <div className="system-actions">
                    <Button variant="outline" className="action-btn">
                      <RefreshCw size={18} />
                      Limpar Cache
                    </Button>
                    <Button variant="outline" className="action-btn">
                      <Save size={18} />
                      Fazer Backup
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutNovo>
  );
};

export default Configuracoes;