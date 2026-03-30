from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from access_control import validar_contexto_finalizacao_operador
from access_control import operador_pode_visualizar_tarefa_compartilhada


def test_operador_finalizacao_permitida_no_contrato_correto():
    permitido, mensagem = validar_contexto_finalizacao_operador(
        tarefa_operador_id="op-1",
        tarefa_setor="criacao",
        tarefa_contrato_id="ctr-100",
        usuario_id="op-1",
        usuario_setor="criacao",
        contrato_id_selecionado="ctr-100",
    )

    assert permitido is True
    assert mensagem == ""


def test_operador_finalizacao_negada_para_outro_operador():
    permitido, mensagem = validar_contexto_finalizacao_operador(
        tarefa_operador_id="op-2",
        tarefa_setor="criacao",
        tarefa_contrato_id="ctr-100",
        usuario_id="op-1",
        usuario_setor="criacao",
        contrato_id_selecionado="ctr-100",
    )

    assert permitido is False
    assert "nao pertence ao operador" in mensagem.lower()


def test_operador_finalizacao_negada_para_outro_setor():
    permitido, mensagem = validar_contexto_finalizacao_operador(
        tarefa_operador_id="op-1",
        tarefa_setor="atendimento",
        tarefa_contrato_id="ctr-100",
        usuario_id="op-1",
        usuario_setor="criacao",
        contrato_id_selecionado="ctr-100",
    )

    assert permitido is False
    assert "setor" in mensagem.lower()


def test_compartilhamento_entre_atendimento_e_criacao_exige_contrato_compartilhado():
    permitido = operador_pode_visualizar_tarefa_compartilhada(
        tarefa_setor="criacao",
        usuario_setor="atendimento",
        compartilha_contrato=False,
    )

    assert permitido is False


def test_compartilhamento_entre_atendimento_e_criacao_e_permitido_no_mesmo_contrato():
    permitido = operador_pode_visualizar_tarefa_compartilhada(
        tarefa_setor="criacao",
        usuario_setor="atendimento",
        compartilha_contrato=True,
    )

    assert permitido is True
