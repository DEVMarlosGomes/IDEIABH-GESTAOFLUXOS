"""
conftest.py – configuração pytest para testes unitários do backend.

Mocka os módulos que exigem conexão real com banco de dados (database, models)
antes que qualquer arquivo de teste importe server.py. Isso permite testar as
funções puras de server.py sem .env nem banco configurado.
"""
import sys
from unittest.mock import MagicMock

# Cria mocks para os módulos que dependem de banco de dados
_db_mock = MagicMock()
_db_mock.Base = MagicMock()
_db_mock.get_db = MagicMock()
_db_mock.init_db = MagicMock()
_db_mock.close_db = MagicMock()
_db_mock.async_session = MagicMock()
_db_mock.get_database_state = MagicMock(return_value=True)
_db_mock.set_database_state = MagicMock()

_models_mock = MagicMock()

# Registra os mocks antes que qualquer import de server.py aconteça
sys.modules["database"] = _db_mock
sys.modules["models"] = _models_mock
