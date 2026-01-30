# Funcionalidade de Atribuição de Tarefas - Guia de Implementação

## Visão Geral

A funcionalidade de atribuição de tarefas permite que **administradores (admin)** e **gerentes** atribuam tarefas/etapas a usuários do seu setor. Esta é uma funcionalidade essencial para o sistema de gestão de fluxos de trabalho.

## Endpoints da API

### 1. Listar Usuários do Setor
**GET** `/api/usuarios/setor/{setor}`

Retorna a lista de usuários disponíveis em um setor específico para atribuição.

**Parâmetros Query:**
- `usuario_role` (obrigatório): Role do usuário autenticado (admin, gerente, operador)
- `usuario_setor` (opcional): Setor do usuário (necessário apenas para gerentes)

**Resposta (200):**
```json
[
  {
    "id": "uuid-1",
    "username": "joao.silva",
    "email": "joao@example.com",
    "nome": "João Silva",
    "role": "operador",
    "setor": "atendimento",
    "ativo": true,
    "aprovado": true
  },
  ...
]
```

**Erros:**
- `403`: Usuário não tem permissão (apenas admin/gerente)
- `403`: Gerente tentando acessar outro setor

---

### 2. Atribuir Tarefa a Usuário
**POST** `/api/tarefas/{tarefa_id}/atribuir`

Atribui uma tarefa a um usuário específico.

**Parâmetros Query:**
- `atribuidor_id` (obrigatório): ID do usuário que está fazendo a atribuição
- `atribuidor_nome` (obrigatório): Nome do atribuidor
- `atribuidor_setor` (obrigatório): Setor do atribuidor
- `atribuidor_role` (obrigatório): Role do atribuidor (admin, gerente)

**Request Body:**
```json
{
  "usuario_id": "uuid-user-id",
  "usuario_nome": "Nome do Usuário",
  "usuario_setor": "atendimento"
}
```

**Resposta (200):**
```json
{
  "message": "Tarefa atribuída com sucesso para João Silva",
  "tarefa": {
    "id": "tarefa-id",
    "titulo": "Atualizar layout de fotos",
    "responsavel_id": "uuid-user-id",
    "responsavel_nome": "João Silva",
    "setor": "atendimento",
    "historico": [
      {
        "id": "hist-id",
        "acao": "atribuida",
        "usuario_id": "gerente-id",
        "usuario_nome": "Maria Gerente",
        "setor": "atendimento",
        "data": "2024-01-15T10:30:00Z",
        "detalhes": "Tarefa atribuída de 'Não atribuído' para 'João Silva' (atendimento)"
      }
    ]
  },
  "notificacao_enviada": true
}
```

**Erros:**
- `403`: Usuário não tem permissão (apenas admin/gerente)
- `403`: Gerente tentando atribuir fora de seu setor
- `400`: Tarefa e usuário em setores diferentes
- `400`: Tarefa finalizada
- `404`: Tarefa não encontrada
- `404`: Usuário não encontrado
- `400`: Usuário não está ativo ou aprovado

---

## Funcionalidades Frontend

### Componente: `AtribuirTarefaModal`

Modal para seleção e atribuição de tarefas.

**Localização:** `/frontend/src/components/AtribuirTarefaModal.jsx`

**Props:**
```jsx
<AtribuirTarefaModal
  isOpen={boolean}              // Controla se o modal está aberto
  onClose={() => void}          // Callback quando fechado
  tarefa={object}               // Objeto da tarefa a atribuir
  onSuccess={() => void}        // Callback após atribuição bem-sucedida
/>
```

**Funcionalidades:**
- ✅ Carrega automaticamente usuários do setor da tarefa
- ✅ Mostra informações da tarefa selecionada
- ✅ Mostra responsável atual (se houver)
- ✅ Permite selecionar novo responsável
- ✅ Mostra informações do usuário selecionado
- ✅ Envia notificação ao usuário atribuído
- ✅ Rastreia alteração no histórico da tarefa

---

### Funções Frontend (`api.js`)

**`listarUsuariosSetor(setor, userRole, userSetor)`**
- Retorna: `Promise<Array>`
- Busca usuários disponíveis em um setor

**`atribuirTarefa(tarefaId, usuarioId, usuarioNome, usuarioSetor, atribuidorId, atribuidorNome, atribuidorSetor, atribuidorRole)`**
- Retorna: `Promise<Object>`
- Atribui a tarefa ao usuário selecionado

---

## Integração no `DepartamentoViewNovo`

### Botão de Atribuição
Um novo botão "Atribuir" foi adicionado à lista de tarefas. Ele é exibido apenas para admin/gerente.

```jsx
{['admin', 'gerente'].includes(user?.role) && (
  <Button
    onClick={() => handleAbrirAtribuir(tarefa)}
    variant="outline"
    className="border-blue-200 text-blue-600 hover:bg-blue-50"
  >
    <UserPlus size={16} className="mr-2" />
    Atribuir
  </Button>
)}
```

### Fluxo de Uso

1. **Admin/Gerente** abre a seção de Departamento
2. Clica no botão "Atribuir" em uma tarefa
3. Modal `AtribuirTarefaModal` abre automaticamente
4. Modal carrega usuários disponíveis no setor
5. Admin/Gerente seleciona um usuário
6. Clica em "Atribuir Tarefa"
7. Tarefa é atribuída e notificação é enviada ao usuário
8. Histórico é registrado automaticamente
9. Modal fecha e lista de tarefas é recarregada

---

## Controle de Permissões

### Admin
- ✅ Pode atribuir tarefas de **qualquer setor**
- ✅ Pode ver usuários de **qualquer setor**
- ✅ Pode atribuir a **qualquer usuário ativo/aprovado**

### Gerente
- ✅ Pode atribuir tarefas apenas do **seu próprio setor**
- ✅ Pode ver usuários apenas do **seu próprio setor**
- ✅ Pode atribuir a **qualquer usuário ativo/aprovado** do setor

### Operador
- ❌ **NÃO** pode atribuir tarefas
- ❌ Recebe erro "Apenas administradores e gerentes podem atribuir tarefas"

---

## Validações

### Validações Implementadas

1. **Permissão de Usuário**
   - Verifica se o atribuidor é admin ou gerente
   - Impede operadores de atribuir

2. **Escopo de Setor (Gerentes)**
   - Gerentes só podem atribuir no seu setor
   - Tenta atribuir outro setor → Erro

3. **Compatibilidade de Setor**
   - Tarefa e usuário devem estar no mesmo setor
   - Caso contrário → Erro

4. **Status da Tarefa**
   - Não permite atribuir tarefa finalizada
   - Caso contrário → Erro

5. **Status do Usuário**
   - Usuário deve estar ativo e aprovado
   - Caso contrário → Erro

6. **Existência de Recursos**
   - Verifica se tarefa existe
   - Verifica se usuário existe
   - Caso contrário → Erro 404

---

## Rastreamento de Alterações

### Histórico da Tarefa

Cada atribuição é registrada no histórico com:
- **ID**: UUID único
- **Ação**: "atribuida"
- **Usuario ID**: ID de quem fez a atribuição
- **Usuario Nome**: Nome de quem fez a atribuição
- **Setor**: Setor de quem fez a atribuição
- **Data**: Timestamp ISO de quando foi feito
- **Detalhes**: Descrição humana da alteração

Exemplo:
```json
{
  "id": "hist-uuid",
  "acao": "atribuida",
  "usuario_id": "gerente-uuid",
  "usuario_nome": "Maria Gerente",
  "setor": "atendimento",
  "data": "2024-01-15T10:30:00Z",
  "detalhes": "Tarefa atribuída de 'Não atribuído' para 'João Silva' (atendimento)"
}
```

---

## Notificações

### Tipo: "atribuicao"

Quando uma tarefa é atribuída, uma notificação é enviada ao usuário com:
- **Tipo**: "atribuicao"
- **Título**: "Nova tarefa atribuída por [Nome do Atribuidor]"
- **Mensagem**: "Você foi atribuído à tarefa: [Título da Tarefa]"
- **De**: Dados do atribuidor
- **Para**: Dados do novo responsável
- **Tarefa ID**: ID da tarefa atribuída
- **Projeto ID**: ID do projeto (se houver)

---

## Testes Sugeridos

### Teste 1: Atribuição Básica (Admin)
1. Login como admin
2. Abrir setor de atendimento
3. Clicar em "Atribuir" em uma tarefa
4. Selecionar um usuário
5. Confirmar atribuição
6. **Esperado**: Tarefa atribuída com sucesso, histórico atualizado

### Teste 2: Restrição de Gerente
1. Login como gerente de atendimento
2. Tentar atribuir tarefa de "pré-produção"
3. **Esperado**: Erro "Gerentes só podem atribuir tarefas de seu setor"

### Teste 3: Operador Não Pode Atribuir
1. Login como operador
2. Clicar em "Atribuir"
3. **Esperado**: Erro "Apenas administradores e gerentes podem atribuir tarefas"

### Teste 4: Compatibilidade de Setor
1. Admin cria atribuição manual com usuario de setor diferente
2. **Esperado**: Erro "Não é possível atribuir tarefa do setor X para usuário do setor Y"

### Teste 5: Notificação
1. Atribuir tarefa a usuário
2. Login como usuário atribuído
3. Verificar notificações
4. **Esperado**: Notificação de atribuição recebida

---

## Estrutura de Setores

O sistema reconhece os seguintes setores:
- `atendimento`: Atendimento ao cliente
- `criacao`: Criação de conteúdo
- `pre-producao`: Pré-produção (também aceita variações: pré-produção, préproducao)
- `producao`: Produção (também aceita variações: produção)

---

## Melhorias Futuras

- [ ] Atribuição em lote (múltiplas tarefas)
- [ ] Filtros avançados (por responsável atual, prioridade)
- [ ] Reatribuição com histórico de transferências
- [ ] Sugestões de responsável baseadas em histórico
- [ ] Limite de carga de trabalho por usuário
- [ ] Escalação automática se não houver responsável

---

## Troubleshooting

### Problema: "Nenhum usuário disponível neste setor"
**Solução**: Verifique se existem usuários cadastrados e aprovados no setor

### Problema: Gerente não consegue atribuir
**Solução**: Verifique se o gerente está tentando atribuir em seu próprio setor

### Problema: Erro "Tarefa não encontrada"
**Solução**: Verifique se a tarefa foi deletada ou se o ID está correto

### Problema: Usuário não recebe notificação
**Solução**: Verifique se o usuário está ativo/aprovado e se a notificação foi criada (verificar banco de dados)

---

## Contatos e Suporte

Para dúvidas ou problemas com a funcionalidade de atribuição:
- Verificar logs do backend em `/backend/server.py`
- Verificar console do navegador para erros frontend
- Revisar respostas da API para mensagens de erro específicas
