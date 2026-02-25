import unicodedata
from typing import Optional, Tuple


SETOR_ALIASES = {
    "atendimento": "atendimento",
    "criacao": "criacao",
    "preproducao": "pre-producao",
    "producao": "producao",
}


def _setor_key(value: Optional[str]) -> str:
    if not value:
        return ""
    sem_acento = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return sem_acento.lower().replace("-", "").replace("_", "").replace(" ", "")


def normalize_setor(setor: Optional[str]) -> str:
    if not setor:
        return ""
    key = _setor_key(setor)
    return SETOR_ALIASES.get(key, setor.lower())


def operador_tem_acesso_tarefa(
    *,
    tarefa_operador_id: Optional[str],
    tarefa_setor: Optional[str],
    usuario_id: Optional[str],
    usuario_setor: Optional[str],
) -> bool:
    if not usuario_id or not usuario_setor:
        return False
    if not tarefa_operador_id or tarefa_operador_id != usuario_id:
        return False
    return normalize_setor(tarefa_setor) == normalize_setor(usuario_setor)


def validar_contexto_finalizacao_operador(
    *,
    tarefa_operador_id: Optional[str],
    tarefa_setor: Optional[str],
    tarefa_contrato_id: Optional[str],
    usuario_id: Optional[str],
    usuario_setor: Optional[str],
    contrato_id_selecionado: Optional[str],
) -> Tuple[bool, str]:
    if not operador_tem_acesso_tarefa(
        tarefa_operador_id=tarefa_operador_id,
        tarefa_setor=tarefa_setor,
        usuario_id=usuario_id,
        usuario_setor=usuario_setor,
    ):
        return False, "A tarefa nao pertence ao operador logado ou ao setor do operador."

    contrato_referencia = contrato_id_selecionado or tarefa_contrato_id
    if not tarefa_contrato_id or contrato_referencia != tarefa_contrato_id:
        return False, "A tarefa so pode ser finalizada dentro do contrato correto."

    return True, ""
