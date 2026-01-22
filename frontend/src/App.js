import React from "react";
import "./App.css";
import "./styles/theme.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardNovo from "./pages/DashboardNovo";
import ProjetosVisaoGeral from "./pages/ProjetosVisaoGeral";
import ContratosVisaoGeral from "./pages/ContratosVisaoGeral";
import DepartamentoView from "./pages/DepartamentoView";
import AdminUsers from "./pages/AdminUsers";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import TemplatesPrazos from "./pages/TemplatesPrazos";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardNovo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute>
            <ProjetosVisaoGeral />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratos"
        element={
          <ProtectedRoute>
            <ContratosVisaoGeral />
          </ProtectedRoute>
        }
      />
      
      {/* Departamentos */}
      <Route
        path="/departamento/atendimento"
        element={
          <ProtectedRoute>
            <DepartamentoView departamento="atendimento" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departamento/criacao"
        element={
          <ProtectedRoute>
            <DepartamentoView departamento="criacao" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departamento/pre-producao"
        element={
          <ProtectedRoute>
            <DepartamentoView departamento="pre-producao" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departamento/producao"
        element={
          <ProtectedRoute>
            <DepartamentoView departamento="producao" />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <Configuracoes />
          </ProtectedRoute>
        }
      />

      {/* Relatórios e Templates */}
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <Relatorios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates-prazos"
        element={
          <ProtectedRoute>
            <TemplatesPrazos />
          </ProtectedRoute>
        }
      />

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
