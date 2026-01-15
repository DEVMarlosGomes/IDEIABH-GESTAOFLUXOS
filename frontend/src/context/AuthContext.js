import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockUsers } from '../data/mock';

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
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Mock login - in real app, this would call the API
    const foundUser = mockUsers.find(u => u.email === email);
    
    if (foundUser && password === '123456') {
      const mockToken = 'mock-jwt-token-' + Date.now();
      setUser(foundUser);
      setToken(mockToken);
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(foundUser));
      return { success: true, user: foundUser };
    }
    
    return { success: false, error: 'Email ou senha incorretos' };
  };

  const register = async (nome, email, password) => {
    // Mock register
    const newUser = {
      id: 'user-' + Date.now(),
      nome,
      email,
      role: 'operador',
      ativo: true,
      permissoes: {
        dashboard: true,
        contratos_visualizar: true,
        projetos_visualizar: true,
        tarefas_visualizar: true,
        tarefas_concluir: true,
        admin: false
      }
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    setUser(newUser);
    setToken(mockToken);
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    return user.permissoes?.[permission] === true;
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
