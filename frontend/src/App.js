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
const normalizeSetor = (setor) => {
  if (!setor) return "";
  const key = setor.toLowerCase().replace("-", "").replace("_", "").replace(" ", "");
  const setorMap = {
    atendimento: "atendimento",
    criacao: "criacao",
    criação: "criacao",
    preproducao: "pre-producao",
    préproducao: "pre-producao",
    "pre-producao": "pre-producao",
    "pré-produção": "pre-producao",
    producao: "producao",
    produção: "producao",
  };
  return setorMap[key] || setor;
};

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

const RoleRoute = ({ children, allowRoles, allowSetores }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    const setor = normalizeSetor(user.setor);
    return <Navigate to={`/departamento/${setor || "atendimento"}`} replace />;
  }

  if (allowSetores && user.role === "operador") {
    const setor = normalizeSetor(user.setor);
    if (!allowSetores.includes(setor)) {
      return <Navigate to={`/departamento/${setor || "atendimento"}`} replace />;
    }
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
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <ProjetosVisaoGeralNovo />
          </RoleRoute>
        }
      />
      <Route
        path="/projetos/:id"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <ProjetoDetalhes />
          </RoleRoute>
        }
      />
      <Route
        path="/projetos-old"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <ProjetosVisaoGeral />
          </RoleRoute>
        }
      />
      <Route
        path="/contratos"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <ContratosListaNova />
          </RoleRoute>
        }
      />
      <Route
        path="/contratos-old"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <ContratosVisaoGeral />
          </RoleRoute>
        }
      />
      
      {/* Departamentos */}
      <Route
        path="/departamento/atendimento"
        element={
          <RoleRoute allowRoles={["admin", "gerente", "operador"]} allowSetores={["atendimento"]}>
            <DepartamentoViewNovo departamento="atendimento" />
          </RoleRoute>
        }
      />
      <Route
        path="/departamento/criacao"
        element={
          <RoleRoute allowRoles={["admin", "gerente", "operador"]} allowSetores={["criacao"]}>
            <DepartamentoViewNovo departamento="criacao" />
          </RoleRoute>
        }
      />
      <Route
        path="/departamento/pre-producao"
        element={
          <RoleRoute allowRoles={["admin", "gerente", "operador"]} allowSetores={["pre-producao"]}>
            <DepartamentoViewNovo departamento="pre-producao" />
          </RoleRoute>
        }
      />
      <Route
        path="/departamento/producao"
        element={
          <RoleRoute allowRoles={["admin", "gerente", "operador"]} allowSetores={["producao"]}>
            <DepartamentoViewNovo departamento="producao" />
          </RoleRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <RoleRoute allowRoles={["admin"]}>
            <AdminUsersNovo />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/users-old"
        element={
          <RoleRoute allowRoles={["admin"]}>
            <AdminUsers />
          </RoleRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <RoleRoute allowRoles={["admin"]}>
            <Configuracoes />
          </RoleRoute>
        }
      />

      {/* Relatórios e Templates */}
      <Route
        path="/relatorios"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <RelatoriosNovo />
          </RoleRoute>
        }
      />
      <Route
        path="/relatorios-old"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <RelatoriosCompleto />
          </RoleRoute>
        }
      />
      <Route
        path="/templates-prazos"
        element={
          <RoleRoute allowRoles={["admin", "gerente"]}>
            <TemplatesPrazos />
          </RoleRoute>
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
