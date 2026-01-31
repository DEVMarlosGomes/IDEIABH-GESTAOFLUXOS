import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
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
            <form onSubmit={handleSubmit} className="login-form">
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
                    type="text"
                    placeholder="seu.usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-with-icon"
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
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-with-icon"
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
                  <input type="checkbox" />
                  <span>Lembrar-me</span>
                </label>
              </div>

              <Button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
