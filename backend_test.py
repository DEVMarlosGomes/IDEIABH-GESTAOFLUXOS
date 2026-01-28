#!/usr/bin/env python3
"""
Backend API Tests for IDEIABH Task Management System
Tests all endpoints according to the review request specifications
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys

# Get backend URL from frontend .env
BACKEND_URL = "https://git-postgres-sync.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log_test(test_name, status, details=""):
    color = Colors.GREEN if status == "PASS" else Colors.RED if status == "FAIL" else Colors.YELLOW
    print(f"{color}[{status}]{Colors.ENDC} {test_name}")
    if details:
        print(f"    {details}")

def log_section(section_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}=== {section_name} ==={Colors.ENDC}")

class IDEIABHAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.created_status_ids = []
        self.created_task_ids = []
        self.created_template_id = None
        self.created_contract_id = None
        self.created_project_id = None
        self.test_results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def record_result(self, test_name, passed, error_msg=""):
        self.test_results["total"] += 1
        if passed:
            self.test_results["passed"] += 1
            log_test(test_name, "PASS")
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {error_msg}")
            log_test(test_name, "FAIL", error_msg)

    def test_health_check(self):
        """Test GET /api/health"""
        log_section("Health Check")
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.record_result("Health Check", True)
                    return True
                else:
                    self.record_result("Health Check", False, f"Invalid response format: {data}")
            else:
                self.record_result("Health Check", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("Health Check", False, f"Exception: {str(e)}")
        return False

    def test_status_tarefas_crud(self):
        """Test Status de Tarefas CRUD operations"""
        log_section("Status de Tarefas CRUD")
        
        # Test GET /api/status-tarefas (should return default statuses)
        try:
            response = self.session.get(f"{self.base_url}/status-tarefas")
            if response.status_code == 200:
                statuses = response.json()
                if isinstance(statuses, list) and len(statuses) >= 4:
                    # Check for default statuses
                    status_names = [s.get("nome") for s in statuses]
                    expected = ["Pendente", "Em Andamento", "Aguardando", "Concluído"]
                    if all(name in status_names for name in expected):
                        self.record_result("GET /api/status-tarefas - Default statuses", True)
                    else:
                        self.record_result("GET /api/status-tarefas - Default statuses", False, f"Missing default statuses. Found: {status_names}")
                else:
                    self.record_result("GET /api/status-tarefas - Default statuses", False, f"Expected list with >=4 items, got: {len(statuses) if isinstance(statuses, list) else 'not a list'}")
            else:
                self.record_result("GET /api/status-tarefas - Default statuses", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/status-tarefas - Default statuses", False, f"Exception: {str(e)}")

        # Test POST /api/status-tarefas (admin only)
        try:
            new_status = {
                "nome": "Status Teste Admin",
                "cor": "#ff5722",
                "ordem": 10
            }
            response = self.session.post(
                f"{self.base_url}/status-tarefas?user_role=admin&user_id=admin-test-001",
                json=new_status
            )
            if response.status_code == 200:
                created_status = response.json()
                if created_status.get("nome") == new_status["nome"]:
                    self.created_status_ids.append(created_status["id"])
                    self.record_result("POST /api/status-tarefas - Admin create", True)
                else:
                    self.record_result("POST /api/status-tarefas - Admin create", False, f"Response mismatch: {created_status}")
            else:
                self.record_result("POST /api/status-tarefas - Admin create", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("POST /api/status-tarefas - Admin create", False, f"Exception: {str(e)}")

        # Test POST /api/status-tarefas (non-admin should fail)
        try:
            new_status = {
                "nome": "Status Teste Operador",
                "cor": "#ff5722",
                "ordem": 11
            }
            response = self.session.post(
                f"{self.base_url}/status-tarefas?user_role=operador&user_id=operador-test-001",
                json=new_status
            )
            if response.status_code == 403:
                self.record_result("POST /api/status-tarefas - Non-admin forbidden", True)
            else:
                self.record_result("POST /api/status-tarefas - Non-admin forbidden", False, f"Expected 403, got {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("POST /api/status-tarefas - Non-admin forbidden", False, f"Exception: {str(e)}")

        # Test DELETE /api/status-tarefas (admin only, custom status only)
        if self.created_status_ids:
            try:
                status_id = self.created_status_ids[0]
                response = self.session.delete(f"{self.base_url}/status-tarefas/{status_id}?user_role=admin")
                if response.status_code == 200:
                    self.record_result("DELETE /api/status-tarefas - Admin delete custom", True)
                else:
                    self.record_result("DELETE /api/status-tarefas - Admin delete custom", False, f"Status {response.status_code}: {response.text}")
            except Exception as e:
                self.record_result("DELETE /api/status-tarefas - Admin delete custom", False, f"Exception: {str(e)}")

        # Test DELETE system status (should fail)
        try:
            # Get a system status ID
            response = self.session.get(f"{self.base_url}/status-tarefas")
            if response.status_code == 200:
                statuses = response.json()
                system_status = next((s for s in statuses if s.get("tipo") == "sistema"), None)
                if system_status:
                    response = self.session.delete(f"{self.base_url}/status-tarefas/{system_status['id']}?user_role=admin")
                    if response.status_code == 400:
                        self.record_result("DELETE /api/status-tarefas - System status forbidden", True)
                    else:
                        self.record_result("DELETE /api/status-tarefas - System status forbidden", False, f"Expected 400, got {response.status_code}: {response.text}")
                else:
                    self.record_result("DELETE /api/status-tarefas - System status forbidden", False, "No system status found")
        except Exception as e:
            self.record_result("DELETE /api/status-tarefas - System status forbidden", False, f"Exception: {str(e)}")

    def test_tarefas_crud(self):
        """Test Tarefas CRUD operations"""
        log_section("Tarefas CRUD")
        
        # Test POST /api/tarefas - Create task (use existing project if available)
        try:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            # Use existing project/contract if available, otherwise skip this test
            projeto_id = getattr(self, 'created_project_id', None)
            contrato_id = getattr(self, 'created_contract_id', None)
            
            if not projeto_id or not contrato_id:
                self.record_result("POST /api/tarefas - Create task", False, "No existing project/contract for testing - skipped due to FK constraints")
                self.record_result("POST /api/tarefas - History created", False, "Skipped - no task created")
                return
            
            new_task = {
                "titulo": "Tarefa de Teste Automatizado",
                "descricao": "Descrição detalhada da tarefa de teste",
                "projeto_id": projeto_id,
                "contrato_id": contrato_id, 
                "setor": "atendimento",
                "responsavel_nome": "João Silva",
                "prazo": tomorrow,
                "prioridade": "alta",
                "criado_por_id": "user-admin-001",
                "criado_por_nome": "Administrador Teste",
                "criado_por_setor": "Geral"
            }
            response = self.session.post(f"{self.base_url}/tarefas", json=new_task)
            if response.status_code == 200:
                created_task = response.json()
                if created_task.get("titulo") == new_task["titulo"]:
                    self.created_task_ids.append(created_task["id"])
                    self.record_result("POST /api/tarefas - Create task", True)
                    
                    # Verify task has history
                    if created_task.get("historico") and len(created_task["historico"]) > 0:
                        first_action = created_task["historico"][0]
                        if first_action.get("acao") == "criada":
                            self.record_result("POST /api/tarefas - History created", True)
                        else:
                            self.record_result("POST /api/tarefas - History created", False, f"Expected 'criada' action, got: {first_action.get('acao')}")
                    else:
                        self.record_result("POST /api/tarefas - History created", False, "No history found in created task")
                else:
                    self.record_result("POST /api/tarefas - Create task", False, f"Title mismatch: expected '{new_task['titulo']}', got '{created_task.get('titulo')}'")
            else:
                self.record_result("POST /api/tarefas - Create task", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("POST /api/tarefas - Create task", False, f"Exception: {str(e)}")

        # Test GET /api/tarefas - List tasks
        try:
            response = self.session.get(f"{self.base_url}/tarefas")
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    self.record_result("GET /api/tarefas - List tasks", True)
                    
                    # Test with filters
                    response = self.session.get(f"{self.base_url}/tarefas?setor=atendimento")
                    if response.status_code == 200:
                        filtered_tasks = response.json()
                        if isinstance(filtered_tasks, list):
                            self.record_result("GET /api/tarefas - Filter by setor", True)
                        else:
                            self.record_result("GET /api/tarefas - Filter by setor", False, "Response not a list")
                    else:
                        self.record_result("GET /api/tarefas - Filter by setor", False, f"Status {response.status_code}: {response.text}")
                else:
                    self.record_result("GET /api/tarefas - List tasks", False, "Response not a list")
            else:
                self.record_result("GET /api/tarefas - List tasks", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/tarefas - List tasks", False, f"Exception: {str(e)}")

        # Test GET /api/tarefas/{id} - Get specific task
        if self.created_task_ids:
            try:
                task_id = self.created_task_ids[0]
                response = self.session.get(f"{self.base_url}/tarefas/{task_id}")
                if response.status_code == 200:
                    task = response.json()
                    if task.get("id") == task_id:
                        self.record_result("GET /api/tarefas/{id} - Get specific task", True)
                    else:
                        self.record_result("GET /api/tarefas/{id} - Get specific task", False, f"ID mismatch: expected {task_id}, got {task.get('id')}")
                else:
                    self.record_result("GET /api/tarefas/{id} - Get specific task", False, f"Status {response.status_code}: {response.text}")
            except Exception as e:
                self.record_result("GET /api/tarefas/{id} - Get specific task", False, f"Exception: {str(e)}")

    def test_finalizar_tarefa(self):
        """Test POST /api/tarefas/{id}/finalizar"""
        log_section("Finalizar Tarefa")
        
        if not self.created_task_ids:
            self.record_result("POST /api/tarefas/{id}/finalizar - No task to test", False, "No task created for testing")
            return

        try:
            task_id = self.created_task_ids[0]
            finalize_data = {
                "observacao": "Tarefa concluída com sucesso durante teste automatizado",
                "usuario_id": "user-admin-001",
                "usuario_nome": "Administrador Teste",
                "usuario_setor": "Geral"
            }
            response = self.session.post(f"{self.base_url}/tarefas/{task_id}/finalizar", json=finalize_data)
            if response.status_code == 200:
                finalized_task = response.json()
                if finalized_task.get("finalizada") == True:
                    self.record_result("POST /api/tarefas/{id}/finalizar - Task finalized", True)
                    
                    # Check if observacao was saved
                    if finalized_task.get("observacao_finalizacao") == finalize_data["observacao"]:
                        self.record_result("POST /api/tarefas/{id}/finalizar - Observacao saved", True)
                    else:
                        self.record_result("POST /api/tarefas/{id}/finalizar - Observacao saved", False, f"Observacao mismatch")
                    
                    # Check if status changed to "Concluído"
                    if finalized_task.get("status_nome") == "Concluído":
                        self.record_result("POST /api/tarefas/{id}/finalizar - Status changed to Concluído", True)
                    else:
                        self.record_result("POST /api/tarefas/{id}/finalizar - Status changed to Concluído", False, f"Status is '{finalized_task.get('status_nome')}', expected 'Concluído'")
                    
                    # Check history
                    if finalized_task.get("historico"):
                        last_action = finalized_task["historico"][-1]
                        if last_action.get("acao") == "finalizada":
                            self.record_result("POST /api/tarefas/{id}/finalizar - History updated", True)
                        else:
                            self.record_result("POST /api/tarefas/{id}/finalizar - History updated", False, f"Last action is '{last_action.get('acao')}', expected 'finalizada'")
                    else:
                        self.record_result("POST /api/tarefas/{id}/finalizar - History updated", False, "No history found")
                else:
                    self.record_result("POST /api/tarefas/{id}/finalizar - Task finalized", False, f"Task not marked as finalized: {finalized_task.get('finalizada')}")
            else:
                self.record_result("POST /api/tarefas/{id}/finalizar - Task finalized", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("POST /api/tarefas/{id}/finalizar - Task finalized", False, f"Exception: {str(e)}")

        # Test finalizing already finalized task (should fail)
        if self.created_task_ids:
            try:
                task_id = self.created_task_ids[0]
                finalize_data = {
                    "observacao": "Tentativa de finalizar novamente",
                    "usuario_id": "user-admin-001",
                    "usuario_nome": "Administrador Teste",
                    "usuario_setor": "Geral"
                }
                response = self.session.post(f"{self.base_url}/tarefas/{task_id}/finalizar", json=finalize_data)
                if response.status_code == 400:
                    self.record_result("POST /api/tarefas/{id}/finalizar - Already finalized", True)
                else:
                    self.record_result("POST /api/tarefas/{id}/finalizar - Already finalized", False, f"Expected 400, got {response.status_code}: {response.text}")
            except Exception as e:
                self.record_result("POST /api/tarefas/{id}/finalizar - Already finalized", False, f"Exception: {str(e)}")

    def test_permissions(self):
        """Test permission controls"""
        log_section("Permissions Testing")
        
        # Create a task for deletion testing (use existing project/contract)
        try:
            projeto_id = getattr(self, 'created_project_id', None)
            contrato_id = getattr(self, 'created_contract_id', None)
            
            if not projeto_id or not contrato_id:
                self.record_result("DELETE /api/tarefas - Permission testing", False, "No existing project/contract for testing - skipped due to FK constraints")
                return
            
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            test_task = {
                "titulo": "Tarefa para Teste de Permissão",
                "descricao": "Esta tarefa será usada para testar permissões de deleção",
                "projeto_id": projeto_id,
                "contrato_id": contrato_id,
                "setor": "atendimento",
                "responsavel_nome": "Maria Santos",
                "prazo": tomorrow,
                "prioridade": "media",
                "criado_por_id": "user-operador-001",
                "criado_por_nome": "Operador Teste",
                "criado_por_setor": "Atendimento"
            }
            response = self.session.post(f"{self.base_url}/tarefas", json=test_task)
            if response.status_code == 200:
                permission_task = response.json()
                permission_task_id = permission_task["id"]
                
                # Test DELETE as operador (should fail)
                response = self.session.delete(f"{self.base_url}/tarefas/{permission_task_id}?user_role=operador&user_id=operador-test-001")
                if response.status_code == 403:
                    self.record_result("DELETE /api/tarefas/{id} - Operador forbidden", True)
                else:
                    self.record_result("DELETE /api/tarefas/{id} - Operador forbidden", False, f"Expected 403, got {response.status_code}: {response.text}")
                
                # Test DELETE as admin (should succeed)
                response = self.session.delete(f"{self.base_url}/tarefas/{permission_task_id}?user_role=admin&user_id=admin-test-001")
                if response.status_code == 200:
                    self.record_result("DELETE /api/tarefas/{id} - Admin allowed", True)
                else:
                    self.record_result("DELETE /api/tarefas/{id} - Admin allowed", False, f"Status {response.status_code}: {response.text}")
            else:
                self.record_result("DELETE /api/tarefas - Setup task creation", False, f"Failed to create test task: {response.status_code}")
        except Exception as e:
            self.record_result("DELETE /api/tarefas - Permission testing", False, f"Exception: {str(e)}")

    def test_root_endpoint(self):
        """Test GET /api/"""
        log_section("Root Endpoint")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "IDEIABH" in data["message"]:
                    self.record_result("GET /api/ - Root endpoint", True)
                else:
                    self.record_result("GET /api/ - Root endpoint", False, f"Invalid response: {data}")
            else:
                self.record_result("GET /api/ - Root endpoint", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/ - Root endpoint", False, f"Exception: {str(e)}")

    def test_templates_prazos(self):
        """Test Templates de Prazos endpoints"""
        log_section("Templates de Prazos")
        
        # Test GET /api/templates-prazos (list templates)
        try:
            response = self.session.get(f"{self.base_url}/templates-prazos")
            if response.status_code == 200:
                templates = response.json()
                if isinstance(templates, list):
                    self.record_result("GET /api/templates-prazos - List templates", True)
                    print(f"    Found {len(templates)} templates")
                else:
                    self.record_result("GET /api/templates-prazos - List templates", False, "Response not a list")
            else:
                self.record_result("GET /api/templates-prazos - List templates", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/templates-prazos - List templates", False, f"Exception: {str(e)}")

        # Test POST /api/templates-prazos/criar-padrao (create default template with 31 steps)
        try:
            response = self.session.post(f"{self.base_url}/templates-prazos/criar-padrao?user_id=admin&user_role=admin")
            if response.status_code == 200:
                template_result = response.json()
                if "template" in template_result and "etapas" in template_result["template"]:
                    etapas_count = len(template_result["template"]["etapas"])
                    if etapas_count >= 30:  # Accept 30+ steps as valid
                        self.record_result("POST /api/templates-prazos/criar-padrao - Create default template", True)
                        print(f"    Created template with {etapas_count} steps")
                        self.created_template_id = template_result["template"]["id"]
                        return template_result["template"]["id"]
                    else:
                        self.record_result("POST /api/templates-prazos/criar-padrao - Create default template", False, f"Expected 30+ steps, got {etapas_count}")
                else:
                    self.record_result("POST /api/templates-prazos/criar-padrao - Create default template", False, f"Invalid response structure: {list(template_result.keys())}")
            else:
                self.record_result("POST /api/templates-prazos/criar-padrao - Create default template", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("POST /api/templates-prazos/criar-padrao - Create default template", False, f"Exception: {str(e)}")
        
        return None

    def test_contratos_creation(self):
        """Test Contract creation with automatic project and task generation"""
        log_section("Criação de Contratos (FUNCIONALIDADE PRINCIPAL)")
        
        # First ensure we have a template
        template_id = self.test_templates_prazos()
        if not template_id:
            # Try to get existing template
            try:
                response = self.session.get(f"{self.base_url}/templates-prazos")
                if response.status_code == 200:
                    templates = response.json()
                    if templates and len(templates) > 0:
                        template_id = templates[0]["id"]
                        print(f"    Using existing template: {template_id}")
                    else:
                        self.record_result("Contract Creation - No template available", False, "No templates found for testing")
                        return
            except Exception as e:
                self.record_result("Contract Creation - Template lookup", False, f"Exception: {str(e)}")
                return

        # Test POST /api/contratos with contract data
        try:
            contract_data = {
                "cliente": "Universidade Federal de MG",
                "faculdade": "Engenharia Civil", 
                "numero_contrato": "2025-001",
                "valor": 45000.00,
                "data_inicio": "2025-02-01",
                "template_id": template_id,
                "criado_por": "admin"
            }
            
            response = self.session.post(f"{self.base_url}/contratos", json=contract_data)
            if response.status_code == 200:
                contract_result = response.json()
                
                # Verify contract was created
                if "contrato" in contract_result and contract_result["contrato"]["cliente"] == contract_data["cliente"]:
                    self.record_result("POST /api/contratos - Contract created", True)
                    self.created_contract_id = contract_result["contrato"]["id"]
                    
                    # Verify project was created automatically
                    if "projeto" in contract_result:
                        self.record_result("POST /api/contratos - Project created automatically", True)
                        self.created_project_id = contract_result["projeto"]["id"]
                        
                        # Verify 31 tasks were created
                        tasks_created = contract_result.get("tarefas_criadas", 0)
                        if tasks_created >= 30:  # Accept 30+ tasks as valid
                            self.record_result("POST /api/contratos - Tasks created automatically", True)
                            print(f"    ✅ Contract, project and {tasks_created} tasks created successfully!")
                        else:
                            self.record_result("POST /api/contratos - Tasks created automatically", False, f"Expected 30+ tasks, got {tasks_created}")
                    else:
                        self.record_result("POST /api/contratos - Project created automatically", False, "No project in response")
                else:
                    self.record_result("POST /api/contratos - Contract created", False, f"Contract data mismatch")
            else:
                self.record_result("POST /api/contratos - Contract created", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("POST /api/contratos - Contract created", False, f"Exception: {str(e)}")

    def test_listar_dados_criados(self):
        """Test listing created data"""
        log_section("Listar Dados Criados")
        
        # Test GET /api/contratos (verify contract appears)
        try:
            response = self.session.get(f"{self.base_url}/contratos")
            if response.status_code == 200:
                contracts = response.json()
                if isinstance(contracts, list):
                    self.record_result("GET /api/contratos - List contracts", True)
                    print(f"    Found {len(contracts)} contracts")
                    
                    # Check if our created contract is in the list
                    if hasattr(self, 'created_contract_id'):
                        contract_found = any(c.get("id") == self.created_contract_id for c in contracts)
                        if contract_found:
                            self.record_result("GET /api/contratos - Created contract found", True)
                        else:
                            self.record_result("GET /api/contratos - Created contract found", False, "Created contract not found in list")
                else:
                    self.record_result("GET /api/contratos - List contracts", False, "Response not a list")
            else:
                self.record_result("GET /api/contratos - List contracts", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/contratos - List contracts", False, f"Exception: {str(e)}")

        # Test GET /api/projetos (verify project was created)
        try:
            response = self.session.get(f"{self.base_url}/projetos")
            if response.status_code == 200:
                projects = response.json()
                if isinstance(projects, list):
                    self.record_result("GET /api/projetos - List projects", True)
                    print(f"    Found {len(projects)} projects")
                    
                    # Check if our created project is in the list
                    if hasattr(self, 'created_project_id'):
                        project_found = any(p.get("id") == self.created_project_id for p in projects)
                        if project_found:
                            self.record_result("GET /api/projetos - Created project found", True)
                        else:
                            self.record_result("GET /api/projetos - Created project found", False, "Created project not found in list")
                else:
                    self.record_result("GET /api/projetos - List projects", False, "Response not a list")
            else:
                self.record_result("GET /api/projetos - List projects", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/projetos - List projects", False, f"Exception: {str(e)}")

        # Test GET /api/tarefas (verify 31 tasks were created)
        try:
            response = self.session.get(f"{self.base_url}/tarefas")
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    self.record_result("GET /api/tarefas - List tasks", True)
                    print(f"    Found {len(tasks)} total tasks")
                    
                    # Count tasks for our project
                    if hasattr(self, 'created_project_id'):
                        project_tasks = [t for t in tasks if t.get("projeto_id") == self.created_project_id]
                        if len(project_tasks) >= 30:  # Accept 30+ tasks as valid
                            self.record_result("GET /api/tarefas - Tasks for project", True)
                            print(f"    ✅ Found {len(project_tasks)} tasks for the created project")
                        else:
                            self.record_result("GET /api/tarefas - Tasks for project", False, f"Expected 30+ tasks for project, found {len(project_tasks)}")
                else:
                    self.record_result("GET /api/tarefas - List tasks", False, "Response not a list")
            else:
                self.record_result("GET /api/tarefas - List tasks", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/tarefas - List tasks", False, f"Exception: {str(e)}")

    def test_dashboard_avancado(self):
        """Test GET /api/dashboard-avancado"""
        log_section("Dashboard Avançado")
        
        try:
            response = self.session.get(f"{self.base_url}/dashboard-avancado")
            if response.status_code == 200:
                dashboard_data = response.json()
                
                # Check for expected dashboard fields
                expected_sections = ["resumo", "projetos_em_andamento", "alertas_atrasos", "carga_por_responsavel"]
                found_sections = [section for section in expected_sections if section in dashboard_data]
                
                if len(found_sections) >= 3:  # At least 3 sections should be present
                    self.record_result("GET /api/dashboard-avancado - Advanced dashboard", True)
                    print(f"    Dashboard sections found: {found_sections}")
                    
                    # Verify specific content
                    if "resumo" in dashboard_data and "total_projetos" in dashboard_data["resumo"]:
                        self.record_result("GET /api/dashboard-avancado - Dashboard resumo", True)
                    else:
                        self.record_result("GET /api/dashboard-avancado - Dashboard resumo", False, "Missing resumo section")
                        
                    if "projetos_em_andamento" in dashboard_data and isinstance(dashboard_data["projetos_em_andamento"], list):
                        self.record_result("GET /api/dashboard-avancado - Projects list", True)
                    else:
                        self.record_result("GET /api/dashboard-avancado - Projects list", False, "Missing or invalid projetos_em_andamento")
                else:
                    self.record_result("GET /api/dashboard-avancado - Advanced dashboard", False, f"Expected dashboard sections, found: {list(dashboard_data.keys())}")
            else:
                self.record_result("GET /api/dashboard-avancado - Advanced dashboard", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/dashboard-avancado - Advanced dashboard", False, f"Exception: {str(e)}")

    def test_relatorios_atrasos(self):
        """Test delay reports endpoints"""
        log_section("Relatórios de Atrasos")
        
        # Create an overdue task for testing
        try:
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            overdue_task = {
                "titulo": "Tarefa Atrasada para Teste",
                "descricao": "Esta tarefa tem prazo vencido para testar relatórios",
                "projeto_id": "projeto-atraso-001",
                "contrato_id": "contrato-atraso-001",
                "setor": "financeiro",
                "responsavel_nome": "Carlos Oliveira",
                "prazo": yesterday,
                "prioridade": "alta",
                "criado_por_id": "user-admin-001",
                "criado_por_nome": "Admin Teste",
                "criado_por_setor": "Geral"
            }
            response = self.session.post(f"{self.base_url}/tarefas", json=overdue_task)
            if response.status_code == 200:
                overdue_task_data = response.json()
                self.created_task_ids.append(overdue_task_data["id"])
        except Exception as e:
            print(f"Warning: Could not create overdue task for testing: {e}")

        # Test GET /api/tarefas-atrasadas
        try:
            response = self.session.get(f"{self.base_url}/tarefas-atrasadas")
            if response.status_code == 200:
                overdue_tasks = response.json()
                if isinstance(overdue_tasks, list):
                    self.record_result("GET /api/tarefas-atrasadas - List overdue tasks", True)
                    print(f"    Found {len(overdue_tasks)} overdue tasks")
                else:
                    self.record_result("GET /api/tarefas-atrasadas - List overdue tasks", False, "Response not a list")
            else:
                self.record_result("GET /api/tarefas-atrasadas - List overdue tasks", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/tarefas-atrasadas - List overdue tasks", False, f"Exception: {str(e)}")

        # Test GET /api/atrasos-por-setor
        try:
            response = self.session.get(f"{self.base_url}/atrasos-por-setor")
            if response.status_code == 200:
                delays_by_sector = response.json()
                if isinstance(delays_by_sector, list):
                    self.record_result("GET /api/atrasos-por-setor - Group by sector", True)
                    print(f"    Found delays in {len(delays_by_sector)} sectors")
                else:
                    self.record_result("GET /api/atrasos-por-setor - Group by sector", False, "Response not a list")
            else:
                self.record_result("GET /api/atrasos-por-setor - Group by sector", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/atrasos-por-setor - Group by sector", False, f"Exception: {str(e)}")

        # Test GET /api/dashboard-stats
        try:
            response = self.session.get(f"{self.base_url}/dashboard-stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_tarefas", "tarefas_finalizadas", "tarefas_em_andamento", "tarefas_atrasadas"]
                if all(field in stats for field in required_fields):
                    self.record_result("GET /api/dashboard-stats - General statistics", True)
                    print(f"    Stats: {stats['total_tarefas']} total, {stats['tarefas_finalizadas']} finished, {stats['tarefas_atrasadas']} overdue")
                else:
                    missing = [f for f in required_fields if f not in stats]
                    self.record_result("GET /api/dashboard-stats - General statistics", False, f"Missing fields: {missing}")
            else:
                self.record_result("GET /api/dashboard-stats - General statistics", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/dashboard-stats - General statistics", False, f"Exception: {str(e)}")

    def test_edicao_tarefas_permissao(self):
        """Test task editing with permission control (NEW FUNCTIONALITY)"""
        log_section("Edição de Tarefas com Permissão")
        
        # First create a task for testing (use existing project/contract)
        try:
            projeto_id = getattr(self, 'created_project_id', None)
            contrato_id = getattr(self, 'created_contract_id', None)
            
            if not projeto_id or not contrato_id:
                self.record_result("Task editing with permissions", False, "No existing project/contract for testing - skipped due to FK constraints")
                return
            
            tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
            test_task = {
                "titulo": "Tarefa para Teste de Edição",
                "descricao": "Esta tarefa será editada para testar permissões",
                "projeto_id": projeto_id,
                "contrato_id": contrato_id,
                "setor": "atendimento",
                "responsavel_nome": "Ana Silva",
                "prazo": tomorrow,
                "prioridade": "media",
                "criado_por_id": "user-admin-001",
                "criado_por_nome": "Admin Teste",
                "criado_por_setor": "Geral"
            }
            response = self.session.post(f"{self.base_url}/tarefas", json=test_task)
            if response.status_code == 200:
                created_task = response.json()
                task_id = created_task["id"]
                self.created_task_ids.append(task_id)
                
                # Test PUT /api/tarefas/{id} with operador role (should return 403)
                update_data = {
                    "titulo": "Título Alterado por Operador",
                    "prioridade": "alta",
                    "usuario_id": "operador-001",
                    "usuario_nome": "Operador Teste",
                    "usuario_setor": "Atendimento",
                    "usuario_role": "operador"
                }
                response = self.session.put(f"{self.base_url}/tarefas/{task_id}", json=update_data)
                if response.status_code == 403:
                    self.record_result("PUT /api/tarefas/{id} - Operador forbidden", True)
                else:
                    self.record_result("PUT /api/tarefas/{id} - Operador forbidden", False, f"Expected 403, got {response.status_code}: {response.text}")
                
                # Test PUT /api/tarefas/{id} with gerente role (should work)
                update_data_gerente = {
                    "titulo": "Título Alterado por Gerente",
                    "prioridade": "alta",
                    "prazo": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                    "usuario_id": "gerente-001",
                    "usuario_nome": "Gerente Teste",
                    "usuario_setor": "Gestão",
                    "usuario_role": "gerente"
                }
                response = self.session.put(f"{self.base_url}/tarefas/{task_id}", json=update_data_gerente)
                if response.status_code == 200:
                    updated_task = response.json()
                    if updated_task.get("titulo") == "Título Alterado por Gerente":
                        self.record_result("PUT /api/tarefas/{id} - Gerente allowed", True)
                    else:
                        self.record_result("PUT /api/tarefas/{id} - Gerente allowed", False, f"Title not updated correctly")
                else:
                    self.record_result("PUT /api/tarefas/{id} - Gerente allowed", False, f"Status {response.status_code}: {response.text}")
                
                # Test PUT /api/tarefas/{id} with admin role (should work)
                update_data_admin = {
                    "titulo": "Título Alterado por Admin",
                    "prioridade": "critica",
                    "usuario_id": "admin-001",
                    "usuario_nome": "Admin Teste",
                    "usuario_setor": "Administração",
                    "usuario_role": "admin"
                }
                response = self.session.put(f"{self.base_url}/tarefas/{task_id}", json=update_data_admin)
                if response.status_code == 200:
                    updated_task = response.json()
                    if updated_task.get("titulo") == "Título Alterado por Admin" and updated_task.get("prioridade") == "critica":
                        self.record_result("PUT /api/tarefas/{id} - Admin allowed", True)
                    else:
                        self.record_result("PUT /api/tarefas/{id} - Admin allowed", False, f"Task not updated correctly")
                else:
                    self.record_result("PUT /api/tarefas/{id} - Admin allowed", False, f"Status {response.status_code}: {response.text}")
                    
            else:
                self.record_result("Task editing setup", False, f"Failed to create test task: {response.status_code}")
        except Exception as e:
            self.record_result("Task editing with permissions", False, f"Exception: {str(e)}")

    def test_recalculo_automatico_prazos(self):
        """Test automatic deadline recalculation when finishing tasks (NEW FUNCTIONALITY)"""
        log_section("Recálculo Automático de Prazos ao Finalizar")
        
        # First create a contract with template to generate multiple tasks
        try:
            # Get or create template
            response = self.session.get(f"{self.base_url}/templates-prazos")
            template_id = None
            if response.status_code == 200:
                templates = response.json()
                if templates and len(templates) > 0:
                    template_id = templates[0]["id"]
                else:
                    # Create template if none exists
                    response = self.session.post(f"{self.base_url}/templates-prazos/criar-padrao?user_id=admin&user_role=admin")
                    if response.status_code == 200:
                        template_result = response.json()
                        template_id = template_result["template"]["id"]
            
            if not template_id:
                self.record_result("Recálculo de prazos - Template setup", False, "No template available")
                return
            
            # Create contract with multiple tasks
            contract_data = {
                "cliente": "Universidade Teste Prazos",
                "faculdade": "Administração",
                "numero_contrato": "2025-PRAZOS-001",
                "valor": 25000.00,
                "data_inicio": "2025-02-01",
                "template_id": template_id,
                "criado_por": "admin"
            }
            
            response = self.session.post(f"{self.base_url}/contratos", json=contract_data)
            if response.status_code == 200:
                contract_result = response.json()
                projeto_id = contract_result["projeto"]["id"]
                
                # Get tasks created for this project
                response = self.session.get(f"{self.base_url}/tarefas?projeto_id={projeto_id}")
                if response.status_code == 200:
                    project_tasks = response.json()
                    if len(project_tasks) >= 2:
                        # Sort tasks by original deadline to get the first one
                        project_tasks.sort(key=lambda x: x.get("prazo_original", x.get("prazo", "")))
                        
                        first_task = project_tasks[0]
                        second_task = project_tasks[1] if len(project_tasks) > 1 else None
                        
                        # Store original deadlines
                        original_deadlines = {}
                        for task in project_tasks:
                            original_deadlines[task["id"]] = task.get("prazo")
                        
                        # Finalize the first task
                        finalize_data = {
                            "observacao": "Primeira tarefa finalizada para teste de recálculo de prazos",
                            "usuario_id": "admin-001",
                            "usuario_nome": "Admin Teste",
                            "usuario_setor": "Administração"
                        }
                        
                        response = self.session.post(f"{self.base_url}/tarefas/{first_task['id']}/finalizar", json=finalize_data)
                        if response.status_code == 200:
                            finalized_result = response.json()
                            
                            # Check if response contains "prazos_recalculados"
                            if "prazos_recalculados" in finalized_result:
                                prazos_recalculados = finalized_result["prazos_recalculados"]
                                if isinstance(prazos_recalculados, list) and len(prazos_recalculados) > 0:
                                    self.record_result("POST /api/tarefas/{id}/finalizar - Prazos recalculados returned", True)
                                    print(f"    ✅ {len(prazos_recalculados)} tasks had their deadlines recalculated")
                                    
                                    # Verify that subsequent tasks had their deadlines updated
                                    response = self.session.get(f"{self.base_url}/tarefas?projeto_id={projeto_id}")
                                    if response.status_code == 200:
                                        updated_tasks = response.json()
                                        recalculated_count = 0
                                        
                                        for updated_task in updated_tasks:
                                            if not updated_task.get("finalizada") and updated_task["id"] in original_deadlines:
                                                original_deadline = original_deadlines[updated_task["id"]]
                                                new_deadline = updated_task.get("prazo")
                                                if original_deadline != new_deadline:
                                                    recalculated_count += 1
                                        
                                        if recalculated_count > 0:
                                            self.record_result("Recálculo automático - Deadlines actually updated", True)
                                            print(f"    ✅ {recalculated_count} tasks had their actual deadlines updated")
                                        else:
                                            self.record_result("Recálculo automático - Deadlines actually updated", False, "No tasks had updated deadlines")
                                    else:
                                        self.record_result("Recálculo automático - Verification", False, f"Failed to get updated tasks: {response.status_code}")
                                else:
                                    self.record_result("POST /api/tarefas/{id}/finalizar - Prazos recalculados returned", False, "Empty prazos_recalculados array")
                            else:
                                self.record_result("POST /api/tarefas/{id}/finalizar - Prazos recalculados returned", False, "No prazos_recalculados in response")
                        else:
                            self.record_result("POST /api/tarefas/{id}/finalizar - Finalize task", False, f"Status {response.status_code}: {response.text}")
                    else:
                        self.record_result("Recálculo de prazos - Multiple tasks", False, f"Expected multiple tasks, got {len(project_tasks)}")
                else:
                    self.record_result("Recálculo de prazos - Get project tasks", False, f"Status {response.status_code}: {response.text}")
            else:
                self.record_result("Recálculo de prazos - Contract creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.record_result("Recálculo automático de prazos", False, f"Exception: {str(e)}")

    def test_criar_tarefa_projeto_andamento(self):
        """Test creating tasks during ongoing projects (NEW FUNCTIONALITY)"""
        log_section("Criar Tarefa Durante Projeto em Andamento")
        
        try:
            # Use existing project if available, or create one
            projeto_id = None
            if hasattr(self, 'created_project_id') and self.created_project_id:
                projeto_id = self.created_project_id
            else:
                # Create a simple project for testing
                contract_data = {
                    "cliente": "Cliente Projeto Andamento",
                    "faculdade": "Engenharia",
                    "numero_contrato": "2025-ANDAMENTO-001",
                    "valor": 15000.00,
                    "data_inicio": "2025-02-01",
                    "template_id": self.created_template_id or "template-default",
                    "criado_por": "admin"
                }
                
                response = self.session.post(f"{self.base_url}/contratos", json=contract_data)
                if response.status_code == 200:
                    contract_result = response.json()
                    projeto_id = contract_result["projeto"]["id"]
                    self.created_project_id = projeto_id
            
            if projeto_id:
                # Create a new task for the existing project
                new_task_data = {
                    "titulo": "Nova Tarefa Criada Durante Projeto",
                    "descricao": "Esta tarefa foi criada após o projeto já estar em andamento",
                    "projeto_id": projeto_id,
                    "contrato_id": self.created_contract_id or "contrato-andamento-001",
                    "setor": "criacao",
                    "responsavel_nome": "Designer Responsável",
                    "prazo": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
                    "prioridade": "media",
                    "criado_por_id": "gerente-001",
                    "criado_por_nome": "Gerente Projeto",
                    "criado_por_setor": "Gestão"
                }
                
                response = self.session.post(f"{self.base_url}/tarefas", json=new_task_data)
                if response.status_code == 200:
                    created_task = response.json()
                    
                    # Verify task was linked to the correct project
                    if created_task.get("projeto_id") == projeto_id:
                        self.record_result("POST /api/tarefas - Create task for existing project", True)
                        self.created_task_ids.append(created_task["id"])
                        
                        # Verify task appears in project task list
                        response = self.session.get(f"{self.base_url}/tarefas?projeto_id={projeto_id}")
                        if response.status_code == 200:
                            project_tasks = response.json()
                            task_found = any(t.get("id") == created_task["id"] for t in project_tasks)
                            if task_found:
                                self.record_result("Criar tarefa - Task linked to project", True)
                                print(f"    ✅ Task successfully linked to project {projeto_id}")
                            else:
                                self.record_result("Criar tarefa - Task linked to project", False, "Task not found in project task list")
                        else:
                            self.record_result("Criar tarefa - Verify project link", False, f"Failed to get project tasks: {response.status_code}")
                    else:
                        self.record_result("POST /api/tarefas - Create task for existing project", False, f"Task not linked to correct project")
                else:
                    self.record_result("POST /api/tarefas - Create task for existing project", False, f"Status {response.status_code}: {response.text}")
            else:
                self.record_result("Criar tarefa projeto andamento - Setup", False, "No project available for testing")
                
        except Exception as e:
            self.record_result("Criar tarefa durante projeto em andamento", False, f"Exception: {str(e)}")

    def cleanup(self):
        """Clean up created test data"""
        log_section("Cleanup")
        
        # Delete created tasks (as admin)
        for task_id in self.created_task_ids:
            try:
                response = self.session.delete(f"{self.base_url}/tarefas/{task_id}?user_role=admin&user_id=admin-test-cleanup")
                if response.status_code == 200:
                    print(f"    Cleaned up task: {task_id}")
                else:
                    print(f"    Failed to cleanup task {task_id}: {response.status_code}")
            except Exception as e:
                print(f"    Error cleaning up task {task_id}: {e}")

        # Delete created statuses (as admin)
        for status_id in self.created_status_ids:
            try:
                response = self.session.delete(f"{self.base_url}/status-tarefas/{status_id}?user_role=admin")
                if response.status_code == 200:
                    print(f"    Cleaned up status: {status_id}")
                else:
                    print(f"    Failed to cleanup status {status_id}: {response.status_code}")
            except Exception as e:
                print(f"    Error cleaning up status {status_id}: {e}")

    def run_all_tests(self):
        """Run all test suites"""
        print(f"{Colors.BOLD}IDEIABH Backend API Testing - Novas Funcionalidades{Colors.ENDC}")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Run test suites in order as requested in review
        if self.test_health_check():
            self.test_root_endpoint()
            self.test_templates_prazos()
            self.test_contratos_creation()
            self.test_listar_dados_criados()
            
            # NEW FUNCTIONALITY TESTS (as requested in review)
            self.test_edicao_tarefas_permissao()
            self.test_recalculo_automatico_prazos()
            self.test_criar_tarefa_projeto_andamento()
            
            # Additional comprehensive tests
            self.test_dashboard_avancado()
            self.test_relatorios_atrasos()
            self.test_status_tarefas_crud()
            self.test_tarefas_crud()
            self.test_finalizar_tarefa()
            self.test_permissions()
        else:
            print(f"{Colors.RED}Health check failed - skipping other tests{Colors.ENDC}")

        # Cleanup
        self.cleanup()

        # Print summary
        log_section("Test Summary")
        total = self.test_results["total"]
        passed = self.test_results["passed"]
        failed = self.test_results["failed"]
        
        print(f"Total Tests: {total}")
        print(f"{Colors.GREEN}Passed: {passed}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {failed}{Colors.ENDC}")
        
        if failed > 0:
            print(f"\n{Colors.RED}Failed Tests:{Colors.ENDC}")
            for error in self.test_results["errors"]:
                print(f"  - {error}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return failed == 0

if __name__ == "__main__":
    tester = IDEIABHAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)