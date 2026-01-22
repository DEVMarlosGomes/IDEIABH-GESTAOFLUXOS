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
BACKEND_URL = "https://theme-switcher-27.preview.emergentagent.com/api"

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
        
        # Test POST /api/tarefas - Create task
        try:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            new_task = {
                "titulo": "Tarefa de Teste Automatizado",
                "descricao": "Descrição detalhada da tarefa de teste",
                "projeto_id": "projeto-teste-001",
                "contrato_id": "contrato-teste-001", 
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
        
        # Create a task for deletion testing
        try:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            test_task = {
                "titulo": "Tarefa para Teste de Permissão",
                "descricao": "Esta tarefa será usada para testar permissões de deleção",
                "projeto_id": "projeto-permissao-001",
                "contrato_id": "contrato-permissao-001",
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
                else:
                    missing = [f for f in required_fields if f not in stats]
                    self.record_result("GET /api/dashboard-stats - General statistics", False, f"Missing fields: {missing}")
            else:
                self.record_result("GET /api/dashboard-stats - General statistics", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.record_result("GET /api/dashboard-stats - General statistics", False, f"Exception: {str(e)}")

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
        print(f"{Colors.BOLD}IDEIABH Backend API Testing{Colors.ENDC}")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Run test suites in order
        if self.test_health_check():
            self.test_status_tarefas_crud()
            self.test_tarefas_crud()
            self.test_finalizar_tarefa()
            self.test_permissions()
            self.test_relatorios_atrasos()
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