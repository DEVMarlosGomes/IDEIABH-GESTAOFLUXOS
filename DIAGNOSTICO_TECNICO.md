# 📋 DIAGNÓSTICO TÉCNICO DETALHADO

**Data:** 26 de janeiro de 2026  
**Sistema:** IDEIABH - Gestão de Fluxos  
**Componente:** Tarefas & Dashboards

---

## 🔍 ANÁLISE DO CÓDIGO

### 1. Frontend - DashboardAvancado.jsx

**Localização:** `frontend/src/pages/DashboardAvancado.jsx`

#### Fluxo de Carregamento:
```
useEffect hook (linha ~34)
  ↓
loadDashboard()
  ↓
getDashboardAvancado() [API call]
  ↓
setDashboardData(data)
  ↓
Renderizar componentes com dados
```

#### Estados Críticos:
- `loading`: true → mostra spinner
- `dashboardData`: null → mostra erro
- `loading`: false + `dashboardData`: data → renderiza dashboard

#### Pontos de Falha Potenciais:
1. **API não responde**: `getDashboardAvancado()` rejeita
2. **CORS bloqueado**: Requisição não atinge backend
3. **Dados vazios**: API retorna estrutura vazia

---

### 2. Backend - Endpoint Dashboard Avançado

**Localização:** `backend/server.py` linha 2056

#### Implementação:
```python
@api_router.get("/dashboard-avancado", response_model=dict)
async def dashboard_avancado():
    # Busca projetos e tarefas
    # Calcula atrasos
    # Agrupa por responsável
    # Retorna estrutura completa
```

#### Lógica Principal:
1. ✓ Busca `projetos` collection
2. ✓ Busca `tarefas` collection
3. ✓ Itera cada tarefa e calcula `calcular_dias_atraso()`
4. ✓ Agrupa por responsável
5. ✓ Filtra projetos em andamento
6. ✓ Retorna JSON estruturado

#### Dependências:
- `calcular_dias_atraso()`: Função async que calcula dias
- Collections MongoDB: `projetos`, `tarefas`
- Timezone UTC para cálculos

---

### 3. Função Crítica: calcular_dias_atraso()

**Localização:** `backend/server.py` linha 393

```python
async def calcular_dias_atraso(prazo_str: Optional[str]) -> tuple:
    if not prazo_str:
        return 0, False
    try:
        prazo = datetime.fromisoformat(prazo_str).date()
        hoje = datetime.now(timezone.utc).date()
        if hoje > prazo:
            dias = (hoje - prazo).days
            return dias, True  # atrasado
        return 0, False  # no prazo
    except:
        return 0, False  # erro na conversão
```

#### ⚠️ Pontos de Atenção:
- **Formato esperado:** ISO format string (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS)
- **Timezone:** Usa UTC, verificar se dados estão em UTC
- **Erros silenciosos:** Exceções retornam (0, False)

---

### 4. API Client Frontend

**Localização:** `frontend/src/services/api.js`

#### Configuração:
```javascript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' }
})
```

#### Chamada Dashboard:
```javascript
export const getDashboardAvancado = async () => {
  const response = await api.get('/api/dashboard-avancado')
  return response.data
}
```

#### ⚠️ Pontos de Atenção:
- **Variável ambiente:** `REACT_APP_BACKEND_URL` deve estar definida
- **Padrão:** http://localhost:8001 (desenvolvimento)
- **Timeout:** Axios padrão é 0 (sem timeout)

---

## 🔌 FLUXO DE REQUISIÇÃO

```
Frontend (browser)
  │
  ├─ Faz GET /api/dashboard-avancado
  │
  └─→ Backend (uvicorn)
      │
      ├─ Conecta MongoDB
      │  ├─ db.projetos.find({})
      │  └─ db.tarefas.find({})
      │
      ├─ Processa dados
      │  ├─ Para cada tarefa:
      │  │  └─ calcular_dias_atraso(prazo)
      │  │
      │  ├─ Agrupa por responsável
      │  └─ Ordena por atraso
      │
      └─ Retorna JSON
         │
         └─→ Frontend renderiza
```

---

## 📊 ESTRUTURA DE RESPOSTA ESPERADA

```json
{
  "timestamp": "2026-01-26T10:30:00+00:00",
  "resumo": {
    "total_projetos": 10,
    "projetos_em_andamento": 5,
    "total_tarefas_atrasadas": 3,
    "responsaveis_com_atraso": 2
  },
  "projetos_em_andamento": [
    {
      "id": "proj-123",
      "cliente": "Cliente A",
      "etapa_atual": "Criação",
      "progresso": 65.5,
      "total_tarefas": 20,
      "tarefas_concluidas": 13,
      "tarefas_atrasadas": 2,
      "risco": "medio",
      "data_inicio": "2026-01-01",
      "data_fim_prevista": "2026-02-15"
    }
  ],
  "alertas_atrasos": [
    {
      "tarefa_id": "tar-456",
      "titulo": "Revisão de Layout",
      "responsavel": "João Silva",
      "responsavel_id": "user-789",
      "dias_atraso": 5,
      "setor": "criacao",
      "projeto_id": "proj-123",
      "prioridade": "alta"
    }
  ],
  "carga_por_responsavel": [
    {
      "responsavel": "João Silva",
      "total_tarefas": 15,
      "tarefas_atrasadas": 2,
      "total_dias_atraso": 8,
      "tarefas": []
    }
  ]
}
```

---

## ✅ CHECKLIST DE DIAGNÓSTICO

### Backend
- [ ] Uvicorn iniciado: `python -m uvicorn server:app --reload --port 8001`
- [ ] MongoDB conectado: Verificar MONGO_URL em .env
- [ ] Collections criadas: `projetos`, `tarefas`, `status_tarefas`
- [ ] Dados inseridos: Verificar quantidade de documentos
- [ ] Endpoint responde: `curl http://localhost:8001/api/dashboard-avancado`
- [ ] Sem erros de conexão: Verificar logs do backend
- [ ] Response válido: JSON estruturado

### Frontend
- [ ] React iniciado: `npm start` ou `yarn start`
- [ ] Variável ambiente: `REACT_APP_BACKEND_URL` definida
- [ ] API client configurado: axios base URL correto
- [ ] Login funcionando: Autenticação JWT
- [ ] Console limpo: Sem erros vermelhos
- [ ] Network tab: Requisições retornando 200
- [ ] Dados renderizados: Componentes mostrando informações

### Network/Infraestrutura
- [ ] Portas abertas: 8001 (backend), 3000 (frontend)
- [ ] CORS habilitado: Headers permitindo requisições cross-origin
- [ ] Firewall: Sem bloqueios entre frontend/backend
- [ ] DNS: localhost resolvendo corretamente

---

## 🔧 TESTES RECOMENDADOS

### 1. Health Check
```bash
curl http://localhost:8001/api/health
# Esperado: {"status":"healthy"}
```

### 2. Status de Tarefas
```bash
curl http://localhost:8001/api/status-tarefas
# Esperado: Array com status padrão
```

### 3. Dashboard Avançado
```bash
curl http://localhost:8001/api/dashboard-avancado
# Esperado: JSON com estrutura completa
```

### 4. MongoDB Query
```javascript
// No mongo shell ou MongoDB Compass
db.tarefas.countDocuments()
db.projetos.countDocuments()
db.tarefas.findOne({})
```

---

## 🚨 ERROS COMUNS E SOLUÇÕES

| Erro | Causa | Solução |
|------|-------|--------|
| 500 Internal Server Error | Exception em calcular_dias_atraso | Verificar formato de prazo em DB |
| 404 Not Found | Rota não existe | Verificar se @api_router.get está correto |
| ECONNREFUSED | Backend não rodando | Iniciar uvicorn |
| CORS Error | Frontend bloqueado | Verificar CORSMiddleware no server.py |
| Empty Response | Collections vazias | Inserir dados de teste |
| Null Pointer | dashboardData é null | Verificar se API retorna dados |

---

## 📝 LOGS A VERIFICAR

### Backend Terminal
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete
GET /api/dashboard-avancado
HTTP/1.1 200 OK
```

### Frontend Console (F12)
```
GET http://localhost:8001/api/dashboard-avancado 200
dashboard_avancado @ DashboardAvancado.jsx:49
```

---

**Gerado em:** 26/01/2026
