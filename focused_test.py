#!/usr/bin/env python3
"""
Focused Backend API Tests for IDEIABH PostgreSQL Migration
Tests the specific endpoints mentioned in the review request
"""

import requests
import json
import uuid
from datetime import datetime, timedelta

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

class FocusedTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.template_id = None
        self.contract_id = None
        self.project_id = None
        self.task_id = None

    def test_health_endpoints(self):
        """Test Health Check endpoints"""
        log_section("1. Health Check")
        
        # Test GET /api/health
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("database") == "postgresql":
                    log_test("GET /api/health", "PASS", f"Status: {data['status']}, Database: {data['database']}")
                else:
                    log_test("GET /api/health", "FAIL", f"Unexpected response: {data}")
            else:
                log_test("GET /api/health", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/health", "FAIL", f"Exception: {str(e)}")

        # Test GET /api/
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "IDEIABH" in data.get("message", ""):
                    log_test("GET /api/", "PASS", f"Message: {data['message']}")
                else:
                    log_test("GET /api/", "FAIL", f"Unexpected message: {data}")
            else:
                log_test("GET /api/", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/", "FAIL", f"Exception: {str(e)}")

    def test_status_tarefas(self):
        """Test Status de Tarefas endpoints"""
        log_section("2. Status de Tarefas")
        
        # Test GET /api/status-tarefas
        try:
            response = self.session.get(f"{self.base_url}/status-tarefas")
            if response.status_code == 200:
                statuses = response.json()
                if isinstance(statuses, list) and len(statuses) >= 4:
                    status_names = [s.get("nome") for s in statuses]
                    expected = ["Pendente", "Em Andamento", "Aguardando", "Concluído"]
                    if all(name in status_names for name in expected):
                        log_test("GET /api/status-tarefas", "PASS", f"Found {len(statuses)} statuses including all 4 default ones")
                    else:
                        log_test("GET /api/status-tarefas", "FAIL", f"Missing default statuses. Found: {status_names}")
                else:
                    log_test("GET /api/status-tarefas", "FAIL", f"Expected >=4 statuses, got {len(statuses) if isinstance(statuses, list) else 'not a list'}")
            else:
                log_test("GET /api/status-tarefas", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/status-tarefas", "FAIL", f"Exception: {str(e)}")

        # Test POST /api/status-tarefas (admin)
        try:
            new_status = {
                "nome": "Status Teste PostgreSQL",
                "cor": "#9c27b0",
                "ordem": 15
            }
            response = self.session.post(
                f"{self.base_url}/status-tarefas?user_role=admin&user_id=test-admin",
                json=new_status
            )
            if response.status_code == 200:
                created = response.json()
                log_test("POST /api/status-tarefas (admin)", "PASS", f"Created status: {created.get('nome')}")
            else:
                log_test("POST /api/status-tarefas (admin)", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("POST /api/status-tarefas (admin)", "FAIL", f"Exception: {str(e)}")

    def test_templates_prazos(self):
        """Test Templates de Prazos endpoints"""
        log_section("3. Templates de Prazos")
        
        # Test POST /api/templates-prazos/criar-padrao
        try:
            response = self.session.post(f"{self.base_url}/templates-prazos/criar-padrao?user_id=admin&user_role=admin")
            if response.status_code == 200:
                result = response.json()
                if "template" in result and "etapas" in result["template"]:
                    etapas_count = len(result["template"]["etapas"])
                    self.template_id = result["template"]["id"]
                    log_test("POST /api/templates-prazos/criar-padrao", "PASS", f"Created template with {etapas_count} steps")
                else:
                    log_test("POST /api/templates-prazos/criar-padrao", "FAIL", f"Invalid response structure")
            else:
                log_test("POST /api/templates-prazos/criar-padrao", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("POST /api/templates-prazos/criar-padrao", "FAIL", f"Exception: {str(e)}")

        # Test GET /api/templates-prazos
        try:
            response = self.session.get(f"{self.base_url}/templates-prazos")
            if response.status_code == 200:
                templates = response.json()
                if isinstance(templates, list):
                    log_test("GET /api/templates-prazos", "PASS", f"Found {len(templates)} templates")
                    if not self.template_id and templates:
                        self.template_id = templates[0]["id"]
                else:
                    log_test("GET /api/templates-prazos", "FAIL", "Response not a list")
            else:
                log_test("GET /api/templates-prazos", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/templates-prazos", "FAIL", f"Exception: {str(e)}")

    def test_contratos_projetos(self):
        """Test Contratos e Projetos (MAIN FUNCTIONALITY)"""
        log_section("4. Contratos e Projetos (FUNCIONALIDADE PRINCIPAL)")
        
        if not self.template_id:
            log_test("Contract creation", "FAIL", "No template available")
            return

        # Test POST /api/contratos
        try:
            contract_data = {
                "cliente": "Universidade PostgreSQL Test",
                "faculdade": "Ciência da Computação",
                "numero_contrato": "2025-PG-001",
                "valor": 35000.00,
                "data_inicio": "2025-02-01",
                "template_id": self.template_id,
                "criado_por": "admin"
            }
            
            response = self.session.post(f"{self.base_url}/contratos", json=contract_data)
            if response.status_code == 200:
                result = response.json()
                if "contrato" in result and "projeto" in result:
                    self.contract_id = result["contrato"]["id"]
                    self.project_id = result["projeto"]["id"]
                    tasks_created = result.get("tarefas_criadas", 0)
                    log_test("POST /api/contratos", "PASS", f"Created contract + project + {tasks_created} tasks")
                else:
                    log_test("POST /api/contratos", "FAIL", f"Missing contract or project in response")
            else:
                log_test("POST /api/contratos", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("POST /api/contratos", "FAIL", f"Exception: {str(e)}")

        # Test GET /api/contratos
        try:
            response = self.session.get(f"{self.base_url}/contratos")
            if response.status_code == 200:
                contracts = response.json()
                if isinstance(contracts, list):
                    log_test("GET /api/contratos", "PASS", f"Listed {len(contracts)} contracts")
                else:
                    log_test("GET /api/contratos", "FAIL", "Response not a list")
            else:
                log_test("GET /api/contratos", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/contratos", "FAIL", f"Exception: {str(e)}")

        # Test GET /api/projetos
        try:
            response = self.session.get(f"{self.base_url}/projetos")
            if response.status_code == 200:
                projects = response.json()
                if isinstance(projects, list):
                    log_test("GET /api/projetos", "PASS", f"Listed {len(projects)} projects")
                else:
                    log_test("GET /api/projetos", "FAIL", "Response not a list")
            else:
                log_test("GET /api/projetos", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/projetos", "FAIL", f"Exception: {str(e)}")

    def test_tarefas(self):
        """Test Tarefas endpoints"""
        log_section("5. Tarefas")
        
        # Test GET /api/tarefas
        try:
            response = self.session.get(f"{self.base_url}/tarefas")
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    log_test("GET /api/tarefas", "PASS", f"Listed {len(tasks)} tasks")
                    if tasks and not self.task_id:
                        # Get a non-finalized task for testing
                        for task in tasks:
                            if not task.get("finalizada"):
                                self.task_id = task["id"]
                                break
                else:
                    log_test("GET /api/tarefas", "FAIL", "Response not a list")
            else:
                log_test("GET /api/tarefas", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/tarefas", "FAIL", f"Exception: {str(e)}")

        # Test POST /api/tarefas/{id}/finalizar
        if self.task_id:
            try:
                finalize_data = {
                    "observacao": "Tarefa finalizada durante teste PostgreSQL",
                    "usuario_id": "admin-test",
                    "usuario_nome": "Admin PostgreSQL Test",
                    "usuario_setor": "Administração"
                }
                response = self.session.post(f"{self.base_url}/tarefas/{self.task_id}/finalizar", json=finalize_data)
                if response.status_code == 200:
                    result = response.json()
                    if result.get("finalizada") and result.get("status_nome") == "Concluído":
                        log_test("POST /api/tarefas/{id}/finalizar", "PASS", f"Task finalized with observation")
                    else:
                        log_test("POST /api/tarefas/{id}/finalizar", "FAIL", f"Task not properly finalized")
                else:
                    log_test("POST /api/tarefas/{id}/finalizar", "FAIL", f"Status {response.status_code}: {response.text}")
            except Exception as e:
                log_test("POST /api/tarefas/{id}/finalizar", "FAIL", f"Exception: {str(e)}")

        # Test PUT /api/tarefas/{id} (admin/gerente only)
        if self.project_id and self.contract_id:
            try:
                # Create a new task for editing test
                new_task = {
                    "titulo": "Tarefa para Teste de Edição PostgreSQL",
                    "descricao": "Teste de edição com PostgreSQL",
                    "projeto_id": self.project_id,
                    "contrato_id": self.contract_id,
                    "setor": "atendimento",
                    "responsavel_nome": "Responsável Teste",
                    "prazo": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                    "prioridade": "media",
                    "criado_por_id": "admin-test",
                    "criado_por_nome": "Admin Test",
                    "criado_por_setor": "Administração"
                }
                
                response = self.session.post(f"{self.base_url}/tarefas", json=new_task)
                if response.status_code == 200:
                    created_task = response.json()
                    edit_task_id = created_task["id"]
                    
                    # Test editing with admin role
                    update_data = {
                        "titulo": "Título Editado PostgreSQL",
                        "prioridade": "alta",
                        "usuario_id": "admin-test",
                        "usuario_nome": "Admin Test",
                        "usuario_setor": "Administração",
                        "usuario_role": "admin"
                    }
                    
                    response = self.session.put(f"{self.base_url}/tarefas/{edit_task_id}", json=update_data)
                    if response.status_code == 200:
                        updated_task = response.json()
                        if updated_task.get("titulo") == "Título Editado PostgreSQL":
                            log_test("PUT /api/tarefas/{id} (admin)", "PASS", "Task edited successfully")
                        else:
                            log_test("PUT /api/tarefas/{id} (admin)", "FAIL", "Task not properly updated")
                    else:
                        log_test("PUT /api/tarefas/{id} (admin)", "FAIL", f"Status {response.status_code}: {response.text}")
                else:
                    log_test("PUT /api/tarefas/{id} (admin)", "FAIL", f"Failed to create test task: {response.status_code}")
            except Exception as e:
                log_test("PUT /api/tarefas/{id} (admin)", "FAIL", f"Exception: {str(e)}")

    def test_dashboard_relatorios(self):
        """Test Dashboard e Relatórios endpoints"""
        log_section("6. Dashboard e Relatórios")
        
        # Test GET /api/dashboard-stats
        try:
            response = self.session.get(f"{self.base_url}/dashboard-stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_tarefas", "tarefas_finalizadas", "tarefas_em_andamento", "tarefas_atrasadas"]
                if all(field in stats for field in required_fields):
                    log_test("GET /api/dashboard-stats", "PASS", f"Stats: {stats['total_tarefas']} total, {stats['tarefas_finalizadas']} finished")
                else:
                    log_test("GET /api/dashboard-stats", "FAIL", f"Missing required fields")
            else:
                log_test("GET /api/dashboard-stats", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/dashboard-stats", "FAIL", f"Exception: {str(e)}")

        # Test GET /api/dashboard-avancado
        try:
            response = self.session.get(f"{self.base_url}/dashboard-avancado")
            if response.status_code == 200:
                dashboard = response.json()
                expected_sections = ["resumo", "projetos_em_andamento", "alertas_atrasos"]
                found_sections = [s for s in expected_sections if s in dashboard]
                if len(found_sections) >= 2:
                    log_test("GET /api/dashboard-avancado", "PASS", f"Dashboard sections: {found_sections}")
                else:
                    log_test("GET /api/dashboard-avancado", "FAIL", f"Missing dashboard sections")
            else:
                log_test("GET /api/dashboard-avancado", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/dashboard-avancado", "FAIL", f"Exception: {str(e)}")

        # Test GET /api/relatorio-gargalos
        try:
            response = self.session.get(f"{self.base_url}/relatorio-gargalos")
            if response.status_code == 200:
                report = response.json()
                if "resumo" in report and "gargalos_por_setor" in report:
                    log_test("GET /api/relatorio-gargalos", "PASS", f"Bottleneck report generated")
                else:
                    log_test("GET /api/relatorio-gargalos", "FAIL", f"Invalid report structure")
            else:
                log_test("GET /api/relatorio-gargalos", "FAIL", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/relatorio-gargalos", "FAIL", f"Exception: {str(e)}")

    def test_permissions(self):
        """Test Permission controls"""
        log_section("7. Permissões")
        
        if not self.project_id or not self.contract_id:
            log_test("Permission tests", "FAIL", "No project/contract for testing")
            return

        # Create a task for permission testing
        try:
            test_task = {
                "titulo": "Tarefa Teste Permissão PostgreSQL",
                "descricao": "Teste de permissões com PostgreSQL",
                "projeto_id": self.project_id,
                "contrato_id": self.contract_id,
                "setor": "atendimento",
                "responsavel_nome": "Operador Teste",
                "prazo": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
                "prioridade": "media",
                "criado_por_id": "operador-test",
                "criado_por_nome": "Operador Test",
                "criado_por_setor": "Atendimento"
            }
            
            response = self.session.post(f"{self.base_url}/tarefas", json=test_task)
            if response.status_code == 200:
                created_task = response.json()
                perm_task_id = created_task["id"]
                
                # Test DELETE with operador role (should return 403)
                response = self.session.delete(f"{self.base_url}/tarefas/{perm_task_id}?user_role=operador&user_id=operador-test")
                if response.status_code == 403:
                    log_test("DELETE /api/tarefas/{id} (operador=403)", "PASS", "Operador correctly forbidden")
                else:
                    log_test("DELETE /api/tarefas/{id} (operador=403)", "FAIL", f"Expected 403, got {response.status_code}")
                
                # Test DELETE with admin role (should work)
                response = self.session.delete(f"{self.base_url}/tarefas/{perm_task_id}?user_role=admin&user_id=admin-test")
                if response.status_code == 200:
                    log_test("DELETE /api/tarefas/{id} (admin=allowed)", "PASS", "Admin correctly allowed")
                else:
                    log_test("DELETE /api/tarefas/{id} (admin=allowed)", "FAIL", f"Status {response.status_code}: {response.text}")
            else:
                log_test("Permission tests", "FAIL", f"Failed to create test task: {response.status_code}")
        except Exception as e:
            log_test("Permission tests", "FAIL", f"Exception: {str(e)}")

    def run_focused_tests(self):
        """Run focused tests for PostgreSQL migration verification"""
        print(f"{Colors.BOLD}IDEIABH PostgreSQL Migration - Focused Testing{Colors.ENDC}")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        self.test_health_endpoints()
        self.test_status_tarefas()
        self.test_templates_prazos()
        self.test_contratos_projetos()
        self.test_tarefas()
        self.test_dashboard_relatorios()
        self.test_permissions()

        print(f"\n{Colors.BOLD}✅ PostgreSQL Migration Testing Complete{Colors.ENDC}")

if __name__ == "__main__":
    tester = FocusedTester()
    tester.run_focused_tests()