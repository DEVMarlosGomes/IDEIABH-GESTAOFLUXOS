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
import DashboardAvancado from "./pages/DashboardAvancado";
import ProjetosVisaoGeral from "./pages/ProjetosVisaoGeral";
import ProjetosVisaoGeralNovo from "./pages/ProjetosVisaoGeralNovo";
import ProjetoDetalhes from "./pages/ProjetoDetalhes";
import ContratosVisaoGeral from "./pages/ContratosVisaoGeral";
import ContratosListaNova from "./pages/ContratosListaNova";
import DepartamentoView from "./pages/DepartamentoView";
import DepartamentoViewNovo from "./pages/DepartamentoViewNovo";
import AdminUsers from "./pages/AdminUsers";
import AdminUsersNovo from "./pages/AdminUsersNovo";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import RelatoriosCompleto from "./pages/RelatoriosCompleto";
import RelatoriosNovo from "./pages/RelatoriosNovo";
import TemplatesPrazos from "./pages/TemplatesPrazos";
import { Toaster } from "./components/ui/sonner";

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
            <DashboardAvancado />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-old"
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
            <ProjetosVisaoGeralNovo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:id"
        element={
          <ProtectedRoute>
            <ProjetoDetalhes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos-old"
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
            <ContratosListaNova />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratos-old"
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
            <DepartamentoViewNovo departamento="atendimento" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departamento/criacao"
        element={
          <ProtectedRoute>
            <DepartamentoViewNovo departamento="criacao" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departamento/pre-producao"
        element={
          <ProtectedRoute>
            <DepartamentoViewNovo departamento="pre-producao" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departamento/producao"
        element={
          <ProtectedRoute>
            <DepartamentoViewNovo departamento="producao" />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsersNovo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users-old"
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
            <RelatoriosCompleto />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios-old"
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
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
