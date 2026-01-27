import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        console.log('AuthContext - User loaded from localStorage:', parsedUser);
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const userData = response.data.user;
      
      console.log('AuthContext - Login successful, user:', userData);
      
      const mockToken = 'jwt-token-' + Date.now();
      setUser(userData);
      setToken(mockToken);
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      console.error('AuthContext - Login error:', err);
      const errorMsg = err.response?.data?.detail || 'Erro ao fazer login';
      return { success: false, error: errorMsg };
    }
  };

  const register = async (nome, email, username, password, role = 'operador', setor = null) => {
    try {
      const response = await api.post('/api/auth/register', {
        nome,
        email,
        username,
        password,
        role,
        setor
      });
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Erro ao registrar';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    console.log('AuthContext - Logout');
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    // Admin tem todas as permissões
    if (user.role === 'admin') return true;
    // Gerente tem permissões de gerente
    if (permission === 'gerente' && user.role === 'gerente') return true;
    return user.permissoes?.[permission] === true;
  };

  const isAdminOrGerente = () => {
    return user?.role === 'admin' || user?.role === 'gerente';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      logout,
      hasPermission,
      isAdminOrGerente,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
