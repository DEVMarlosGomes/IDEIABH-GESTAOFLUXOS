#!/usr/bin/env python3
"""
Script de verificação rápida dos endpoints do IDEIABH
"""

import requests
import json
from datetime import datetime

class bcolors:
    OKGREEN = '\033[92m'
    FAIL = '\033[91m'
    OKBLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

BACKEND_URL = "http://localhost:8001"
ENDPOINTS = [
    ("/api/health", "GET", "Health Check"),
    ("/api/status-tarefas", "GET", "Status de Tarefas"),
    ("/api/dashboard-avancado", "GET", "Dashboard Avançado"),
    ("/api/projetos", "GET", "Projetos"),
    ("/api/tarefas", "GET", "Tarefas"),
]

def print_header(text):
    print(f"\n{bcolors.BOLD}{bcolors.OKBLUE}{'='*60}{bcolors.ENDC}")
    print(f"{bcolors.BOLD}{bcolors.OKBLUE}{text}{bcolors.ENDC}")
    print(f"{bcolors.BOLD}{bcolors.OKBLUE}{'='*60}{bcolors.ENDC}\n")

def print_success(text):
    print(f"{bcolors.OKGREEN}✓ {text}{bcolors.ENDC}")

def print_error(text):
    print(f"{bcolors.FAIL}✗ {text}{bcolors.ENDC}")

def test_endpoint(method, endpoint, description):
    """Test a single endpoint"""
    url = f"{BACKEND_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        else:
            response = requests.post(url, timeout=5)
        
        if response.status_code == 200:
            print_success(f"{description}: {response.status_code}")
            try:
                data = response.json()
                print(f"  └─ Dados: {json.dumps(data, indent=2, default=str)[:200]}...")
            except:
                print(f"  └─ Response: {response.text[:200]}...")
            return True
        else:
            print_error(f"{description}: {response.status_code}")
            print(f"  └─ Response: {response.text[:200]}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"{description}: Não conseguiu conectar em {url}")
        return False
    except Exception as e:
        print_error(f"{description}: {str(e)}")
        return False

def main():
    print_header("VERIFICAÇÃO DE ENDPOINTS - IDEIABH")
    print(f"Testando em: {BACKEND_URL}\n")
    
    results = []
    
    for endpoint, method, description in ENDPOINTS:
        print(f"Testando {method} {endpoint}...")
        result = test_endpoint(method, endpoint, description)
        results.append((description, result))
        print()
    
    # Summary
    print_header("RESUMO")
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for description, result in results:
        status = "✓" if result else "✗"
        print(f"{status} {description}")
    
    print(f"\n{bcolors.BOLD}Total: {passed}/{total} endpoints respondendo{bcolors.ENDC}\n")
    
    if passed == total:
        print_success("Todos os endpoints estão funcionando!")
    else:
        print_error(f"{total - passed} endpoint(s) com problema. Verifique o backend!")

if __name__ == "__main__":
    main()
