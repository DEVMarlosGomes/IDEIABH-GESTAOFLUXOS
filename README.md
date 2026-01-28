# 🎓 IDEIABH - Sistema de Gestão Operacional

Sistema completo de gerenciamento de projetos e contratos para a IDEIABH, especializado em gestão de formaturas e eventos acadêmicos.

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.110.1-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</p>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Fluxo de Trabalho](#-fluxo-de-trabalho)
- [Permissões por Role](#-permissões-por-role)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **IDEIABH** é uma solução completa para gerenciamento de projetos de formaturas, integrando:

- ✅ **Gestão de Contratos**: Criação e acompanhamento de contratos com clientes
- 📊 **Projetos Automatizados**: Geração automática de projetos com todas as etapas
- 📅 **Templates de Prazos**: Sistema de templates personalizáveis (padrão: 51 etapas, 192 dias)
- 👥 **4 Departamentos**: Atendimento, Criação, Pré-Produção e Produção
- ⚡ **Alertas de Atrasos**: Monitoramento em tempo real de tarefas atrasadas
- 📧 **Sistema de Cobrança**: Notificações internas e por email para operadores
- 📈 **Relatórios Profissionais**: Dashboards completos com KPIs, gráficos e exportação PDF
- 🌙 **Dark/Light Mode**: Suporte completo a temas claro e escuro
- 🔐 **Permissões por Setor**: Operadores só acessam/finalizam tarefas do seu setor

---

## ✨ Funcionalidades

### 🔐 Autenticação e Autorização
- Sistema de login/registro seguro com bcrypt
- Três níveis de permissão:
  - **Admin**: Acesso total ao sistema
  - **Gerente**: Gestão de equipes e cobranças
  - **Operador**: Execução de tarefas (restrito ao seu setor)
- Aprovação de usuários por admin

### 🔒 Permissões por Setor (Operadores)
- **Visualização**: Operador vê apenas seu setor + setor anterior
- **Finalização**: Operador só finaliza tarefas do seu próprio setor
- **Fluxo de setores**: Atendimento → Criação → Pré-Produção → Produção

| Operador de | Pode VER | Pode FINALIZAR |
|------------|----------|----------------|
| Atendimento | Atendimento | Atendimento |
| Criação | Atendimento + Criação | Criação |
| Pré-produção | Criação + Pré-produção | Pré-produção |
| Produção | Pré-produção + Produção | Produção |

### 📝 Gestão de Contratos
- Criação de contratos com informações completas
- Seleção de template de prazos (padrão ou personalizado)
- Geração automática de projeto ao criar contrato
- Criação automática de 51 etapas (ou conforme template)
- Cálculo automático de datas e prazos
- Visualização em cards modernos

### 📊 Projetos e Etapas
- Acompanhamento de progresso em tempo real
- 51 etapas divididas em 4 departamentos:
  - **Atendimento**: 17 etapas
  - **Criação**: 16 etapas
  - **Pré-Produção**: 6 etapas
  - **Produção**: 12 etapas
- Cálculo automático de risco (baixo, médio, alto, crítico)
- Histórico completo de alterações
- Recálculo automático de prazos ao finalizar etapas

### 📅 Templates de Prazos
- Template padrão IDEIABH v2026.01 (192 dias, 51 etapas)
- Criação de templates personalizados
- Visualização detalhada de etapas e prazos
- Aplicação automática ao criar contratos

### 🚨 Sistema de Alertas e Cobrança
- Detecção automática de tarefas atrasadas
- Alertas visuais no dashboard
- Sistema de cobrança para gerentes/admins:
  - Notificação interna no sistema
  - Envio de email (opcional)
  - Mensagem personalizada
- Histórico de cobranças

### 📈 Dashboard Gerencial
- KPIs em tempo real:
  - Total de projetos
  - Projetos em andamento
  - Tarefas atrasadas
  - SLA (% no prazo)
  - Tempo médio de conclusão
- Projetos em andamento com detalhes:
  - Progresso percentual
  - Nível de risco
  - Tarefas atrasadas
  - Datas previstas
- Alertas de atrasos priorizados
- Carga de trabalho por responsável
- Botão de cobrança rápida

### 📊 Relatórios Avançados (NOVO!)
- **Dashboard de Relatórios** com gráficos interativos:
  - Gráfico de barras: Atrasos por Setor
  - Gráfico de pizza: Distribuição de Risco
  - Gráfico de área: Produtividade (7 e 30 dias)
  - Gráfico de barras: Tendência Mensal (6 meses)
- **Tabelas detalhadas**:
  - Performance por Setor (taxa de conclusão, no prazo)
  - Top Responsáveis com Atraso
  - Gargalos - Projetos Críticos
- **Comparação Semanal** com deltas
- **Exportação PDF Profissional**:
  - Design elegante com header personalizado
  - KPIs em cards coloridos
  - Tabelas com cores alternadas
  - Gráficos de barras nativos
  - Distribuição de risco visual
  - Rodapé com paginação
  - Nome do arquivo: `IDEIABH_Relatorio_YYYY-MM-DD.pdf`

### 🏢 Visualização por Departamento
- Visão específica para cada departamento
- Tarefas do setor com status
- Botão "Finalizar Etapa" (apenas para tarefas do próprio setor)
- Modal de feedback obrigatório ao finalizar
- Passagem automática para próxima etapa
- Timeline visual do andamento
- Fluxo do Projeto: visualização de todas etapas por departamento

### 🌙 Dark/Light Mode
- Toggle de tema em múltiplos locais (Sidebar, Topbar, Login)
- CSS com variáveis de tema
- Suporte completo em todas as páginas e modais
- Preferência salva no localStorage

### 📱 Responsividade
- Design mobile-first
- Breakpoints: mobile (<480px), tablet (640-1023px), desktop (>1024px)
- Modais otimizados para mobile
- Touch-friendly (min-height 44px em botões)
- Inputs com font-size 16px (previne zoom iOS)

---

## 🛠 Tecnologias

### Backend
- **FastAPI** (0.110.1) - Framework web moderno e rápido
- **SQLAlchemy** (2.0+) - ORM assíncrono
- **asyncpg** - Driver PostgreSQL assíncrono
- **Pydantic** (2.6.4) - Validação de dados
- **Bcrypt** - Criptografia de senhas
- **Uvicorn** - Servidor ASGI

### Frontend
- **React** (18.3.1) - Biblioteca UI
- **React Router** (6.x) - Roteamento
- **Tailwind CSS** (3.4) - Framework CSS
- **Shadcn/ui** - Componentes UI
- **Axios** - Cliente HTTP
- **Sonner** - Toast notifications
- **Lucide React** - Ícones
- **Recharts** - Gráficos interativos
- **jsPDF** - Geração de PDF

### Banco de Dados
- **PostgreSQL** (16) - Banco de dados relacional
- **Supabase** - PostgreSQL hospedado (opcional)
- Tabelas:
  - `users` - Usuários do sistema
  - `contratos` - Contratos de clientes
  - `projetos` - Projetos gerados
  - `tarefas` - Etapas dos projetos
  - `templates_prazos` - Templates de cronogramas
  - `prazos_contratos` - Prazos aplicados
  - `notificacoes` - Sistema de notificações
  - `status_tarefas` - Status personalizáveis

### DevOps
- **Supervisor** - Gerenciamento de processos
- **Nginx** - Reverse proxy
- **Docker** - Containerização (opcional)

---

## 🏗 Arquitetura

```
┌─────────────────┐
│   FRONTEND      │
│   React + UI    │
│   Port 3000     │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│   BACKEND       │
│   FastAPI       │
│   Port 8001     │
└────────┬────────┘
         │
         │ SQLAlchemy (async)
         │
┌────────▼────────┐
│   POSTGRESQL    │
│   Supabase      │
└─────────────────┘
```

### Fluxo de Dados

```mermaid
graph LR
    A[Cliente] --> B[React Frontend]
    B --> C[FastAPI Backend]
    C --> D[PostgreSQL/Supabase]
    C --> E[Sistema de Notificações]
    E --> F[Email Service]
    E --> B
```

---

## 📦 Instalação

### Pré-requisitos

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 16+ (ou Supabase)
- **Yarn** (recomendado) ou **npm**

### Passo a Passo

#### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/ideiabh.git
cd ideiabh
```

#### 2. Configure o Backend

```bash
cd backend

# Crie ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instale dependências
pip install -r requirements.txt

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações
```

#### 3. Configure o Frontend

```bash
cd frontend

# Instale dependências (use yarn, não npm)
yarn install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações
```

#### 4. Configure o PostgreSQL

**Opção A: PostgreSQL Local**
```bash
# Instale PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Crie o banco
sudo -u postgres createdb ideiabh_gestao_fluxos
sudo -u postgres createuser ideiabh_user -P
```

**Opção B: Supabase (Recomendado)**
1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a Connection String (Session Pooler)
4. Configure no `.env` do backend

---

## ⚙️ Configuração

### Backend (.env)

```env
# PostgreSQL (Supabase ou local)
POSTGRES_URL=postgresql+asyncpg://user:password@host:port/database

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Legado (não usado, mas mantido)
MONGO_URL=mongodb://localhost:27017
DB_NAME=ideiabh
```

### Frontend (.env)

```env
# Backend URL
REACT_APP_BACKEND_URL=http://localhost:8001

# App Config
REACT_APP_NAME=IDEIABH
REACT_APP_VERSION=2.0.0
```

---

## 🚀 Uso

### Desenvolvimento

#### Backend

```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend estará disponível em: `http://localhost:8001`

API Docs (Swagger): `http://localhost:8001/docs`

#### Frontend

```bash
cd frontend
yarn start
```

Frontend estará disponível em: `http://localhost:3000`

### Produção

#### Com Supervisor

```bash
# Instale supervisor
sudo apt-get install supervisor

# Copie configurações
sudo cp supervisord.conf /etc/supervisor/conf.d/ideiabh.conf

# Inicie serviços
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

---

## 📡 API Endpoints

### Autenticação

```
POST   /api/auth/login        - Login de usuário
POST   /api/auth/register     - Registro de usuário (aguarda aprovação)
```

### Usuários

```
GET    /api/users             - Listar usuários (admin)
GET    /api/users/pending     - Listar pendentes de aprovação
POST   /api/users             - Criar usuário (admin)
POST   /api/users/:id/approve - Aprovar/rejeitar usuário
PUT    /api/users/:id         - Atualizar usuário
DELETE /api/users/:id         - Deletar usuário (admin)
```

### Contratos

```
GET    /api/contratos         - Listar contratos
POST   /api/contratos         - Criar contrato (+ projeto + etapas)
GET    /api/contratos/:id     - Obter contrato específico
PUT    /api/contratos/:id     - Atualizar contrato
DELETE /api/contratos/:id     - Deletar contrato (admin)
```

### Projetos

```
GET    /api/projetos          - Listar projetos
GET    /api/projetos/:id      - Obter projeto com tarefas
```

### Tarefas (Etapas)

```
GET    /api/tarefas                    - Listar tarefas (com filtros)
GET    /api/tarefas-por-acesso         - Listar com filtro de permissão
GET    /api/setores-acessiveis         - Setores que o usuário pode acessar
POST   /api/tarefas                    - Criar tarefa manual
GET    /api/tarefas/:id                - Obter tarefa específica
PUT    /api/tarefas/:id                - Atualizar tarefa (admin/gerente)
POST   /api/tarefas/:id/finalizar      - Finalizar tarefa (verifica setor)
POST   /api/tarefas/:id/alterar-status - Alterar status
DELETE /api/tarefas/:id                - Deletar tarefa (admin/gerente)
```

### Templates de Prazos

```
GET    /api/templates-prazos              - Listar templates
POST   /api/templates-prazos              - Criar template (admin)
GET    /api/templates-prazos/:id          - Obter template
PUT    /api/templates-prazos/:id          - Atualizar template (admin)
DELETE /api/templates-prazos/:id          - Deletar template (admin)
POST   /api/templates-prazos/criar-padrao - Criar template padrão v2026.01
```

### Relatórios (NOVO!)

```
GET    /api/reports/overview    - Dashboard completo de relatórios
                                  Retorna: KPIs, gráficos, tabelas
                                  Params: days_lookback (7-180), user_role
GET    /api/reports/export/csv  - Exportar relatório em CSV
```

### Dashboard e Estatísticas

```
GET    /api/dashboard-avancado     - Dashboard completo
GET    /api/dashboard-stats        - Estatísticas gerais
GET    /api/tarefas-atrasadas      - Tarefas atrasadas
GET    /api/atrasos-por-setor      - Atrasos agrupados por setor
GET    /api/atrasos-por-projeto/:id - Atrasos de um projeto
GET    /api/relatorio-gargalos     - Relatório de gargalos
GET    /api/relatorio-semanal      - Análise semanal
GET    /api/relatorio-mensal       - Análise mensal
```

### Notificações

```
GET    /api/notificacoes/:usuario_id      - Listar notificações
POST   /api/notificacoes                  - Criar notificação
PUT    /api/notificacoes/:id/marcar-lida  - Marcar como lida
POST   /api/cobrar-operador               - Enviar cobrança (gerente/admin)
```

---

## 📁 Estrutura do Projeto

```
ideiabh/
│
├── backend/
│   ├── server.py              # Aplicação FastAPI principal (~3000 linhas)
│   ├── database.py            # Configuração SQLAlchemy/PostgreSQL
│   ├── models.py              # Modelos SQLAlchemy
│   ├── requirements.txt       # Dependências Python
│   └── .env                   # Variáveis de ambiente
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── ui/           # Componentes UI (Shadcn)
│   │   │   ├── LayoutNovo.jsx
│   │   │   ├── FinalizarTarefaModal.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── ...
│   │   ├── pages/            # Páginas da aplicação
│   │   │   ├── DashboardNovo.jsx
│   │   │   ├── ContratosVisaoGeral.jsx
│   │   │   ├── ProjetosVisaoGeralNovo.jsx
│   │   │   ├── DepartamentoViewNovo.jsx
│   │   │   ├── RelatoriosNovo.jsx      # Dashboard de relatórios
│   │   │   ├── TemplatesPrazos.jsx
│   │   │   ├── AdminUsersNovo.jsx
│   │   │   └── ...
│   │   ├── services/         # API services
│   │   │   └── api.js
│   │   ├── context/          # Contextos React
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   ├── styles/           # CSS adicional
│   │   │   ├── design-system.css
│   │   │   └── modals-detalhes.css
│   │   ├── App.js            # App principal
│   │   └── index.js          # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
│
├── tests/                     # Testes automatizados
├── test_result.md            # Resultados de testes
├── .gitignore
├── docker-compose.yml         # Docker compose
├── supervisord.conf           # Configuração Supervisor
└── README.md                  # Este arquivo
```

---

## 🔄 Fluxo de Trabalho

### 1. Criação de Contrato

```mermaid
graph TD
    A[Admin/Gerente cria contrato] --> B[Seleciona template de prazos]
    B --> C[Sistema cria projeto automaticamente]
    C --> D[Sistema cria 51 etapas sequenciais]
    D --> E[Calcula datas baseado no template]
    E --> F[Todas etapas iniciam como Pendente]
```

### 2. Execução de Etapas

```mermaid
graph TD
    A[Operador visualiza suas tarefas] --> B[Verifica permissão de setor]
    B --> C{É seu setor?}
    C -->|Sim| D[Executa a tarefa]
    C -->|Não| E[Apenas visualiza]
    D --> F[Clica em Finalizar]
    F --> G[Modal: Feedback obrigatório]
    G --> H[Sistema muda status para Concluído]
    H --> I[Recalcula prazos das próximas etapas]
    I --> J[Atualiza progresso do projeto]
```

### 3. Sistema de Cobrança

```mermaid
graph TD
    A[Sistema detecta atraso] --> B[Exibe alerta no dashboard]
    B --> C[Gerente visualiza atraso]
    C --> D[Clica em Cobrar]
    D --> E[Escreve mensagem personalizada]
    E --> F[Sistema envia notificação interna]
    F --> G[Sistema envia email opcional]
    G --> H[Operador recebe cobrança]
```

---

## 👥 Permissões por Role

### Admin
- ✅ Acesso total ao sistema
- ✅ Criar/editar/deletar usuários
- ✅ Aprovar novos usuários
- ✅ Criar/editar/deletar templates
- ✅ Criar/editar/deletar contratos
- ✅ Criar/editar/deletar tarefas
- ✅ Finalizar qualquer tarefa
- ✅ Acessar relatórios
- ✅ Enviar cobranças

### Gerente
- ✅ Visualizar todos os dados
- ✅ Criar/editar contratos
- ✅ Editar tarefas
- ✅ Finalizar qualquer tarefa
- ✅ Acessar relatórios
- ✅ Enviar cobranças

### Operador
- ✅ Visualizar tarefas (seu setor + anterior)
- ✅ Finalizar tarefas (apenas seu setor)
- ✅ Alterar status de tarefas
- ❌ Editar tarefas
- ❌ Acessar relatórios gerenciais
- ❌ Enviar cobranças

---

## 📝 Changelog

### [2.0.0] - 2026-01-28

#### Adicionado
- ✅ **Migração para PostgreSQL** (Supabase)
- ✅ **SQLAlchemy ORM** assíncrono
- ✅ **Relatórios Avançados** com gráficos Recharts
- ✅ **Exportação PDF Profissional** com jsPDF
- ✅ **Permissões por Setor** para operadores
- ✅ **51 etapas** no template padrão v2026.01
- ✅ **Dark/Light Mode** completo
- ✅ **Endpoint /api/reports/overview** com KPIs
- ✅ **Endpoint /api/tarefas-por-acesso** com filtro de permissão
- ✅ **Endpoint /api/setores-acessiveis**
- ✅ **Recálculo automático** de prazos ao finalizar

#### Melhorado
- 🔧 Responsividade dos modais
- 🔧 UI/UX geral
- 🔧 Performance com PostgreSQL

### [1.0.0] - 2025-01-23

#### Adicionado
- ✅ Sistema completo de contratos e projetos
- ✅ Criação automática de etapas ao criar contrato
- ✅ Templates de prazos personalizáveis
- ✅ Dashboard gerencial avançado
- ✅ Sistema de alertas e cobrança
- ✅ Visualização por departamento
- ✅ Relatórios gerenciais
- ✅ Sistema de notificações

---

## 🐛 Troubleshooting

### Backend não inicia

```bash
# Verifique logs
tail -f /var/log/supervisor/backend.err.log

# Teste conexão PostgreSQL
psql $POSTGRES_URL

# Reinstale dependências
pip install -r requirements.txt --force-reinstall
```

### Frontend não compila

```bash
# Limpe cache (use yarn, não npm!)
rm -rf node_modules yarn.lock
yarn install
```

### Erro de conexão PostgreSQL

```bash
# Verifique URL no .env
cat backend/.env | grep POSTGRES_URL

# Teste conexão
python -c "import asyncpg; print('OK')"
```

### Erro de permissão ao finalizar tarefa

```bash
# Verifique se está enviando usuario_role e usuario_setor corretos
# O operador só pode finalizar tarefas do seu próprio setor
```

---

## 📞 Suporte

- **Email**: suporte@ideiabh.com.br
- **Website**: https://www.ideiabh.com.br
- **Issues**: https://github.com/ideiabh/sistema/issues

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Equipe

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + Tailwind CSS + Shadcn/ui + Recharts
- **Database**: PostgreSQL (Supabase)
- **DevOps**: Docker + Supervisor + Nginx

---

<p align="center">
  Feito com ❤️ pela equipe IDEIABH
</p>

<p align="center">
  <a href="#-ideiabh---sistema-de-gestão-operacional">Voltar ao topo ⬆️</a>
</p>
