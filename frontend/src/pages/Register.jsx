import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Login.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const result = await register(nome, email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
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
            <CardTitle className="login-title">Criar Conta</CardTitle>
            <CardDescription>Preencha os dados abaixo para se cadastrar</CardDescription>
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
                <Label htmlFor="nome">Nome completo</Label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input-with-icon"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <Label htmlFor="email">E-mail</Label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

              <div className="form-group">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-with-icon"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>

              <div className="register-link">
                <span>Já tem uma conta?</span>
                <Link to="/login">Entrar</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
