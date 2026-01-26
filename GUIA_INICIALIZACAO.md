# 🚀 GUIA DE INICIALIZAÇÃO - IDEIABH Gestão de Fluxos

## Pré-requisitos
- Python 3.8+
- Node.js 14+
- MongoDB em execução
- Variáveis de ambiente configuradas

---

## ✅ PASSO 1: Configurar Backend

### 1.1 Verificar dependências
```powershell
cd backend
pip install -r requirements.txt
```

### 1.2 Criar arquivo `.env` (se não existir)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=ideiabh
JWT_SECRET=sua-chave-secreta-super-segura
```

### 1.3 Iniciar servidor Backend
```powershell
python -m uvicorn server:app --reload --port 8001
```

**Esperar mensagem:**
```
Uvicorn running on http://127.0.0.1:8001
```

---

## ✅ PASSO 2: Configurar Frontend

### 2.1 Instalar dependências
```powershell
cd frontend
npm install
# ou
yarn install
```

### 2.2 Criar arquivo `.env.local` (se não existir)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 2.3 Iniciar servidor Frontend
```powershell
npm start
# ou
yarn start
```

**Esperar para:**
- Terminal mostrar: "webpack compiled"
- Navegador abrir em: `http://localhost:3000`

---

## 🧪 PASSO 3: Testar Endpoints

### 3.1 Executar script de teste (no workspace root)
```powershell
python test_endpoints.py
```

**Esperado:**
```
✓ Health Check: 200
✓ Status de Tarefas: 200
✓ Dashboard Avançado: 200
✓ Projetos: 200
✓ Tarefas: 200

Total: 5/5 endpoints respondendo
✓ Todos os endpoints estão funcionando!
```

### 3.2 Se algum endpoint falhar:
1. Verifique se o Backend está rodando
2. Verifique MONGO_URL no `.env`
3. Verifique conexão com MongoDB
4. Verifique se as coleções têm dados

---

## 🔐 PASSO 4: Fazer Login

### Credenciais Padrão
```
Email: admin@ideiabh.com
Senha: 123456
```

**Se não funcionar:**
1. Verifique se usuário existe no MongoDB
2. Verificar coleção `users` no banco
3. Criar usuário via script de seed se necessário

---

## 📊 PASSO 5: Acessar Dashboard

Após login:
1. Dashboard deve carregar automaticamente
2. Verificar console (F12) para erros
3. Verificar Network tab para requisições falhadas

---

## 🐛 Troubleshooting

### ❌ "Cannot GET /api/dashboard-avancado"
- Backend não está rodando
- Porta 8001 não está correta
- **Solução:** Iniciar backend com `python -m uvicorn server:app --reload --port 8001`

### ❌ "MongoError: connect ECONNREFUSED"
- MongoDB não está rodando
- MONGO_URL incorreta
- **Solução:** Verificar conexão com MongoDB

### ❌ "Network Error: cors"
- Frontend tentando acessar backend bloqueado por CORS
- **Verificar:** CORS middleware no server.py
- **Solução:** Adicionar `http://localhost:3000` ao CORS allowed origins

### ❌ "Dashboard carrega mas sem dados"
- Banco de dados vazio
- **Solução:** Inserir dados de teste via API ou seed script

---

## 📋 Checklist de Verificação

- [ ] MongoDB está rodando
- [ ] Backend iniciado em http://localhost:8001
- [ ] Frontend iniciado em http://localhost:3000
- [ ] Health check retorna 200
- [ ] Login funcionando
- [ ] Dashboard carregando dados
- [ ] Console sem erros vermelhos
- [ ] Network tab mostrando requisições 200

---

## 🆘 Suporte

Se ainda houver problemas:

1. **Executar teste completo:**
   ```
   python test_endpoints.py
   ```

2. **Verificar logs:**
   - Terminal do Backend: procurar por ERRORS
   - Console do Navegador: F12 → Console

3. **Documentar problema:**
   - Screenshot do erro
   - Output do `test_endpoints.py`
   - Logs do backend e console
   - Descrever os passos para reproduzir

---

**Última atualização:** 26/01/2026
