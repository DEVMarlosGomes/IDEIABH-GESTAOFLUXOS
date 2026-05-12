"""
Testes unitários para as funções puras de server.py relacionadas a:
  1. Filtro de Semestres – lógica de período (inferido pelo frontend via lib/projetos.js)
  2. Aba "Finalizados" – is_tarefa_efetivamente_finalizada, resumir_status_projeto,
     calcular_dias_atraso_sync, obter_contexto_etapa_atual

conftest.py mocka database e models antes deste arquivo ser importado.
"""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

# conftest.py já registrou os mocks em sys.modules — importamos server depois
from server import (
    normalize_text,
    is_tarefa_efetivamente_finalizada,
    calcular_dias_atraso_sync,
    resumir_status_projeto,
    obter_contexto_etapa_atual,
    ordenar_tarefas_fluxo,
)


# ---------------------------------------------------------------------------
# Helper: cria objeto-tarefa com atributos via SimpleNamespace
# ---------------------------------------------------------------------------

def tarefa(**kwargs):
    """Cria um objeto tarefa com valores padrão, substituídos por kwargs."""
    defaults = {
        "id": "tarefa-teste",
        "titulo": "Tarefa de Teste",
        "finalizada": False,
        "data_finalizacao": None,
        "status_nome": "Pendente",
        "prazo": None,
        "prazo_original": None,
        "criado_em": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "setor": None,
        "atrasada": False,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# normalize_text
# ---------------------------------------------------------------------------

class TestNormalizeText:
    def test_remove_acentos(self):
        assert normalize_text("Concluído") == "concluido"
        assert normalize_text("Criação") == "criacao"
        assert normalize_text("Atualização") == "atualizacao"

    def test_converte_para_minusculo(self):
        assert normalize_text("EM ANDAMENTO") == "emandamento"

    def test_remove_caracteres_nao_alfanumericos(self):
        assert normalize_text("em andamento") == "emandamento"
        assert normalize_text("em-andamento") == "emandamento"
        assert normalize_text("Em_Andamento") == "emandamento"

    def test_vazio_e_none(self):
        assert normalize_text("") == ""
        assert normalize_text(None) == ""

    def test_apenas_digitos(self):
        assert normalize_text("2024.1") == "20241"


# ---------------------------------------------------------------------------
# is_tarefa_efetivamente_finalizada  (Aba "Finalizados")
# ---------------------------------------------------------------------------

class TestIsTarefaEfetivamenteFinalizada:
    def test_none_retorna_false(self):
        assert is_tarefa_efetivamente_finalizada(None) is False

    def test_finalizada_true_retorna_true(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(finalizada=True)) is True

    def test_data_finalizacao_preenchida_retorna_true(self):
        t = tarefa(data_finalizacao=datetime(2024, 3, 10, tzinfo=timezone.utc))
        assert is_tarefa_efetivamente_finalizada(t) is True

    def test_status_concluido_com_acento(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(status_nome="Concluído")) is True

    def test_status_concluido_sem_acento(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(status_nome="concluido")) is True

    def test_status_finalizado(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(status_nome="Finalizado")) is True

    def test_status_entregue(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(status_nome="Entregue")) is True

    def test_status_em_andamento_retorna_false(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(status_nome="Em Andamento")) is False

    def test_status_pendente_retorna_false(self):
        assert is_tarefa_efetivamente_finalizada(tarefa(status_nome="Pendente")) is False

    def test_objeto_vazio_retorna_false(self):
        assert is_tarefa_efetivamente_finalizada(SimpleNamespace()) is False


# ---------------------------------------------------------------------------
# calcular_dias_atraso_sync
# ---------------------------------------------------------------------------

class TestCalcularDiasAtrasoSync:
    def test_sem_prazo_retorna_zero_false(self):
        assert calcular_dias_atraso_sync(None) == (0, False)
        assert calcular_dias_atraso_sync("") == (0, False)

    def test_prazo_futuro_nao_e_atrasado(self):
        prazo_futuro = "2099-12-31"
        dias, atrasada = calcular_dias_atraso_sync(prazo_futuro)
        assert atrasada is False
        assert dias == 0

    def test_prazo_passado_e_atrasado(self):
        prazo_passado = "2020-01-01"
        dias, atrasada = calcular_dias_atraso_sync(prazo_passado)
        assert atrasada is True
        assert dias > 0

    def test_dias_atraso_calculados_corretamente(self):
        # prazo com exatamente 10 dias no passado a partir de hoje fictício
        # Usamos uma data bem no passado para garantir >0
        dias, atrasada = calcular_dias_atraso_sync("2020-06-01")
        assert dias > 365  # mais de um ano de atraso


# ---------------------------------------------------------------------------
# resumir_status_projeto  (Aba "Finalizados")
# ---------------------------------------------------------------------------

class TestResumirStatusProjeto:
    def test_sem_tarefas_retorna_pendente(self):
        result = resumir_status_projeto([])
        assert result["status"] == "Pendente"
        assert result["progresso"] == 0
        assert result["total_tarefas"] == 0

    def test_todas_finalizadas_retorna_concluido(self):
        tarefas = [
            tarefa(finalizada=True),
            tarefa(status_nome="Concluído"),
        ]
        result = resumir_status_projeto(tarefas)
        assert result["status"] == "Concluído"
        assert result["progresso"] == 100.0
        assert result["tarefas_concluidas"] == 2

    def test_mix_nao_retorna_concluido(self):
        tarefas = [
            tarefa(finalizada=True),
            tarefa(status_nome="Pendente"),
        ]
        result = resumir_status_projeto(tarefas)
        assert result["status"] != "Concluído"

    def test_tarefa_atrasada_retorna_atrasado(self):
        tarefas = [
            tarefa(status_nome="Em Andamento", prazo="2020-01-01"),
        ]
        result = resumir_status_projeto(tarefas)
        assert result["status"] == "Atrasado"
        assert result["tarefas_atrasadas"] == 1

    def test_tarefa_finalizada_com_prazo_vencido_nao_conta_como_atrasada(self):
        """Tarefa já finalizada não deve ser contabilizada como atrasada."""
        tarefas = [
            tarefa(finalizada=True, prazo="2020-01-01"),
        ]
        result = resumir_status_projeto(tarefas)
        assert result["status"] == "Concluído"
        assert result["tarefas_atrasadas"] == 0

    def test_progresso_parcial(self):
        tarefas = [
            tarefa(finalizada=True),
            tarefa(finalizada=True),
            tarefa(status_nome="Pendente"),
            tarefa(status_nome="Pendente"),
        ]
        result = resumir_status_projeto(tarefas)
        assert result["progresso"] == 50.0
        assert result["tarefas_concluidas"] == 2
        assert result["tarefas_pendentes"] == 2

    def test_em_andamento_detectado_corretamente(self):
        tarefas = [
            tarefa(status_nome="Em Andamento"),
        ]
        result = resumir_status_projeto(tarefas)
        assert result["status"] == "Em Andamento"
        assert result["tarefas_em_andamento"] == 1

    def test_contagem_total_de_tarefas(self):
        tarefas = [tarefa() for _ in range(5)]
        result = resumir_status_projeto(tarefas)
        assert result["total_tarefas"] == 5


# ---------------------------------------------------------------------------
# obter_contexto_etapa_atual  (fluxo de etapas do projeto)
# ---------------------------------------------------------------------------

class TestObterContextoEtapaAtual:
    def test_sem_tarefas_retorna_inicio(self):
        result = obter_contexto_etapa_atual([])
        assert result["titulo"] == "Início"
        assert result["tarefa"] is None

    def test_todas_finalizadas_retorna_projeto_concluido(self):
        tarefas = [tarefa(id="t1", finalizada=True, titulo="Etapa 1")]
        result = obter_contexto_etapa_atual(tarefas)
        assert result["titulo"] == "Projeto concluído"
        assert result["tarefa"] is None

    def test_retorna_primeira_tarefa_aberta(self):
        tarefas = [
            tarefa(id="t1", finalizada=True, titulo="Etapa 1", prazo="2024-01-10"),
            tarefa(id="t2", finalizada=False, titulo="Etapa 2", prazo="2024-02-10"),
        ]
        result = obter_contexto_etapa_atual(tarefas)
        assert result["titulo"] == "Etapa 2"

    def test_ignora_tarefas_finalizadas_no_meio(self):
        tarefas = [
            tarefa(id="t1", finalizada=True, titulo="Etapa 1", prazo="2024-01-10"),
            tarefa(id="t2", finalizada=True, titulo="Etapa 2", prazo="2024-02-10"),
            tarefa(id="t3", finalizada=False, titulo="Etapa 3", prazo="2024-03-10"),
        ]
        result = obter_contexto_etapa_atual(tarefas)
        assert result["titulo"] == "Etapa 3"
        assert result["ordem"] == 3

    def test_ordem_da_etapa_atual(self):
        tarefas = [
            tarefa(id="t1", finalizada=True, titulo="Etapa 1", prazo="2024-01-10"),
            tarefa(id="t2", finalizada=False, titulo="Etapa 2", prazo="2024-02-10"),
            tarefa(id="t3", finalizada=False, titulo="Etapa 3", prazo="2024-03-10"),
        ]
        result = obter_contexto_etapa_atual(tarefas)
        # Etapa 2 é a atual (índice 2 na lista ordenada)
        assert result["ordem"] == 2


# ---------------------------------------------------------------------------
# ordenar_tarefas_fluxo
# ---------------------------------------------------------------------------

class TestOrdenarTarefasFluxo:
    def test_lista_vazia(self):
        assert ordenar_tarefas_fluxo([]) == []

    def test_ordena_por_prazo(self):
        tarefas = [
            tarefa(id="t3", prazo="2024-03-01", prazo_original="2024-03-01"),
            tarefa(id="t1", prazo="2024-01-01", prazo_original="2024-01-01"),
            tarefa(id="t2", prazo="2024-02-01", prazo_original="2024-02-01"),
        ]
        ordenadas = ordenar_tarefas_fluxo(tarefas)
        ids = [t.id for t in ordenadas]
        assert ids == ["t1", "t2", "t3"]

    def test_none_retorna_vazio(self):
        assert ordenar_tarefas_fluxo(None) == []
