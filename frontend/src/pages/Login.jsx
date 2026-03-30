import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { recoverPassword } from '../services/api';
import './Login.css';

const REMEMBERED_USERNAME_KEY = 'remembered-username';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBERED_USERNAME_KEY)));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoveryForm, setRecoveryForm] = useState({
    username: '',
    email: '',
    nova_senha: '',
    confirmar_senha: '',
  });

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);

    if (!checked) {
      localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const normalizedUsername = String(formData.get('username') || username).trim();
    const currentPassword = String(formData.get('password') || password);

    try {
      setUsername(normalizedUsername);
      setPassword(currentPassword);

      const result = await login(normalizedUsername, currentPassword);
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_USERNAME_KEY, normalizedUsername);
        } else {
          localStorage.removeItem(REMEMBERED_USERNAME_KEY);
        }
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryChange = (field, value) => {
    setRecoveryForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenRecovery = () => {
    setRecoveryError('');
    setRecoverySuccess('');
    setRecoveryForm({
      username: username || '',
      email: '',
      nova_senha: '',
      confirmar_senha: '',
    });
    setRecoveryOpen(true);
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    if (!recoveryForm.username.trim() || !recoveryForm.email.trim() || !recoveryForm.nova_senha) {
      setRecoveryError('Preencha usuário, email e nova senha.');
      return;
    }
    if (recoveryForm.nova_senha.length < 6) {
      setRecoveryError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (recoveryForm.nova_senha !== recoveryForm.confirmar_senha) {
      setRecoveryError('A confirmação da senha não confere.');
      return;
    }

    try {
      setRecoveryLoading(true);
      const result = await recoverPassword({
        username: recoveryForm.username.trim(),
        email: recoveryForm.email.trim(),
        nova_senha: recoveryForm.nova_senha,
      });
      setRecoverySuccess(result?.message || 'Senha redefinida com sucesso.');
      setPassword('');
    } catch (err) {
      setRecoveryError(err?.response?.data?.detail || 'Não foi possível redefinir a senha.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Theme Toggle */}
      <div className="login-theme-toggle">
        <ThemeToggle compact={true} />
      </div>
      
      <div className="login-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>

      <div className="login-content">
        <div className="login-brand">
          <div className="brand-logo">
            <span className="logo-icon">IB</span>
          </div>
          <h1 className="brand-title">IDEIABH</h1>
          <p className="brand-subtitle">Sistema de Gestão Operacional</p>
        </div>

        <Card className="login-card">
          <CardHeader className="text-center">
            <CardTitle className="login-title">Bem-vindo de volta</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <Label htmlFor="username">Usuário</Label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="seu.usuario"
                    defaultValue={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-with-icon"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <Label htmlFor="password">Senha</Label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-with-icon"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                  />
                  <span>Lembrar-me</span>
                </label>
                <button type="button" className="forgot-password" onClick={handleOpenRecovery}>
                  Esqueci minha senha
                </button>
              </div>

              <Button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe seu usuário, email cadastrado e defina uma nova senha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecoverySubmit} className="login-form">
            {recoveryError && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoverySuccess && (
              <div className="recovery-success">
                <span>{recoverySuccess}</span>
              </div>
            )}

            <div className="form-group">
              <Label htmlFor="recovery-username">Usuário</Label>
              <Input
                id="recovery-username"
                value={recoveryForm.username}
                onChange={(e) => handleRecoveryChange('username', e.target.value)}
              />
            </div>

            <div className="form-group">
              <Label htmlFor="recovery-email">Email</Label>
              <Input
                id="recovery-email"
                type="email"
                value={recoveryForm.email}
                onChange={(e) => handleRecoveryChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <Label htmlFor="recovery-password">Nova senha</Label>
              <Input
                id="recovery-password"
                type="password"
                value={recoveryForm.nova_senha}
                onChange={(e) => handleRecoveryChange('nova_senha', e.target.value)}
              />
            </div>

            <div className="form-group">
              <Label htmlFor="recovery-confirm">Confirmar nova senha</Label>
              <Input
                id="recovery-confirm"
                type="password"
                value={recoveryForm.confirmar_senha}
                onChange={(e) => handleRecoveryChange('confirmar_senha', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecoveryOpen(false)} disabled={recoveryLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={recoveryLoading}>
                {recoveryLoading ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
