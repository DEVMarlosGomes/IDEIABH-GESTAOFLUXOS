"""
Etapas padrão do fluxo de processos IDEIABH - Versão 2026.01
Atualizado conforme documento oficial
"""

ETAPAS_PADRAO = [
    # =====================================================
    # 🟦 ATENDIMENTO - Ana, Larissa, Keyla, Mickaela
    # =====================================================
    {
        "etapa_id": 1,
        "etapa_nome": "Informar que recebeu o contrato",
        "departamento": "atendimento",
        "prazo_dias": 0,
        "descricao": "Informar no mesmo dia que receber o contrato"
    },
    {
        "etapa_id": 2,
        "etapa_nome": "Ativar contrato no site",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após receber o contrato"
    },
    {
        "etapa_id": 3,
        "etapa_nome": "1º contato com a comissão",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após receber o contrato"
    },
    {
        "etapa_id": 4,
        "etapa_nome": "Reunião de atendimento",
        "departamento": "atendimento",
        "prazo_dias": 15,
        "descricao": "15 dias após o primeiro contato com a comissão. Campo de interação com Criação."
    },
    {
        "etapa_id": 5,
        "etapa_nome": "Envio do questionário de criação à comissão",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após a reunião de atendimento"
    },
    {
        "etapa_id": 6,
        "etapa_nome": "Recebimento do questionário de criação preenchido",
        "departamento": "atendimento",
        "prazo_dias": 60,
        "descricao": "2 meses. Lembretes: 1 dia antes para cobrar, no mesmo dia para enviar à Criação"
    },
    {
        "etapa_id": 7,
        "etapa_nome": "Envio do e-mail de layout de fotos à comissão",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após a reunião de atendimento. Flag para Criação confirmar recebimento."
    },
    {
        "etapa_id": 8,
        "etapa_nome": "Enviar layout de fotos para a comissão",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após receber o documento layout de fotos da criação"
    },
    {
        "etapa_id": 9,
        "etapa_nome": "Agendar reunião de criação",
        "departamento": "atendimento",
        "prazo_dias": 10,
        "descricao": "10 dias antes da entrega de textos e fotos (data contratual). Interação com Criação."
    },
    {
        "etapa_id": 10,
        "etapa_nome": "Liberação das fotos para a pré produção",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após o recebimento dentro do prazo contratual"
    },
    {
        "etapa_id": 11,
        "etapa_nome": "Cadastro de textos / REV1 (1ª revisão)",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após o cadastro dos textos dentro do prazo contratual"
    },
    {
        "etapa_id": 12,
        "etapa_nome": "Acompanhar aprovação e fazer cobrança",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia antes do site fechar e no mesmo dia também"
    },
    {
        "etapa_id": 13,
        "etapa_nome": "Aditivo contratual (se prazo perdido)",
        "departamento": "atendimento",
        "prazo_dias": 0,
        "descricao": "No mesmo dia que o prazo contratual vencer. Lembrete 1 semana antes."
    },
    {
        "etapa_id": 14,
        "etapa_nome": "Cobrança e direcionamento para diretoria",
        "departamento": "atendimento",
        "prazo_dias": 7,
        "descricao": "1 semana sem movimentação no site por parte da Criação"
    },
    {
        "etapa_id": 15,
        "etapa_nome": "Envio do e-mail de conferência de lista de quantidades",
        "departamento": "atendimento",
        "prazo_dias": 1,
        "descricao": "1 dia após apresentação do convite. Verificar retorno do Financeiro em até 3 dias."
    },
    {
        "etapa_id": 16,
        "etapa_nome": "Liberação do envelope de saída para pré produção",
        "departamento": "atendimento",
        "prazo_dias": 2,
        "descricao": "2 dias. Campo de justificativa caso ultrapasse."
    },
    {
        "etapa_id": 17,
        "etapa_nome": "Atualização da planilha geral e relatório semanal",
        "departamento": "atendimento",
        "prazo_dias": 7,
        "descricao": "Semanal - Toda quinta-feira até às 17hrs. Lembretes 1 dia antes e no mesmo dia."
    },
    
    # =====================================================
    # 🟨 CRIAÇÃO - Taelsei, Juliana, Clara, Suelen, Marcus, Fagner, Ketlen, Gabi
    # =====================================================
    {
        "etapa_id": 18,
        "etapa_nome": "RC - Reunião de criação (conceito e referência)",
        "departamento": "criacao",
        "prazo_dias": 1,
        "descricao": "Realizada após Atendimento marcar. Confirmar 1 dia antes e no dia."
    },
    {
        "etapa_id": 19,
        "etapa_nome": "Envio do briefing de criação para atendimento",
        "departamento": "criacao",
        "prazo_dias": 2,
        "descricao": "2 dias. Flag de interação: Atendimento confirma recebimento."
    },
    {
        "etapa_id": 20,
        "etapa_nome": "Layout de Fotos (montagem e ajustes)",
        "departamento": "criacao",
        "prazo_dias": 3,
        "descricao": "3 dias após receber e-mail do Atendimento solicitando"
    },
    {
        "etapa_id": 21,
        "etapa_nome": "Arte da Camisa (quando aplicável)",
        "departamento": "criacao",
        "prazo_dias": 3,
        "descricao": "3 dias após receber e-mail do Atendimento solicitando"
    },
    {
        "etapa_id": 22,
        "etapa_nome": "Textos cadastrados - ciente para iniciar criação",
        "departamento": "criacao",
        "prazo_dias": 0,
        "descricao": "Campo para Criação ficar ciente que textos estão cadastrados e revisados"
    },
    {
        "etapa_id": 23,
        "etapa_nome": "Recebimento das fotos da pré-produção",
        "departamento": "criacao",
        "prazo_dias": 0,
        "descricao": "Campo para Criação ficar ciente que fotos estão recortadas"
    },
    {
        "etapa_id": 24,
        "etapa_nome": "Início da criação do convite",
        "departamento": "criacao",
        "prazo_dias": 10,
        "descricao": "10 dias após entrega de textos e fotos"
    },
    {
        "etapa_id": 25,
        "etapa_nome": "Dias de criação do convite",
        "departamento": "criacao",
        "prazo_dias": 3,
        "descricao": "3 dias de criação"
    },
    {
        "etapa_id": 26,
        "etapa_nome": "Correções (ajustes de layout e textos)",
        "departamento": "criacao",
        "prazo_dias": 3,
        "descricao": "3 dias após liberar site para correções"
    },
    {
        "etapa_id": 27,
        "etapa_nome": "Liberar demais peças para aprovação",
        "departamento": "criacao",
        "prazo_dias": 0,
        "descricao": "No mesmo dia em que liberar as demais peças no site"
    },
    {
        "etapa_id": 28,
        "etapa_nome": "Informar miolo do convite aprovado",
        "departamento": "criacao",
        "prazo_dias": 1,
        "descricao": "1 dia para informar aprovação do miolo"
    },
    {
        "etapa_id": 29,
        "etapa_nome": "Informar capa aprovada",
        "departamento": "criacao",
        "prazo_dias": 1,
        "descricao": "1 dia para informar aprovação da capa"
    },
    {
        "etapa_id": 30,
        "etapa_nome": "Demais Peças (caixas, tags, folders, etc.)",
        "departamento": "criacao",
        "prazo_dias": 3,
        "descricao": "3 dias de acordo com prazo do site fechar"
    },
    {
        "etapa_id": 31,
        "etapa_nome": "Aprovação das páginas individuais (alunos)",
        "departamento": "criacao",
        "prazo_dias": 0,
        "descricao": "Depende da aprovação da CDC para liberação"
    },
    {
        "etapa_id": 32,
        "etapa_nome": "Revisão - REV (verificação final)",
        "departamento": "criacao",
        "prazo_dias": 1,
        "descricao": "1 dia após miolo do convite totalmente aprovado"
    },
    {
        "etapa_id": 33,
        "etapa_nome": "Saída - Finalização e envio dos arquivos",
        "departamento": "criacao",
        "prazo_dias": 3,
        "descricao": "3 dias após convite totalmente aprovado. Flag de pendências."
    },
    
    # =====================================================
    # 🟩 PRÉ-PRODUÇÃO - Carlos, Emanuel, Julio
    # =====================================================
    {
        "etapa_id": 34,
        "etapa_nome": "Recorte e tratamento das fotos",
        "departamento": "pre-producao",
        "prazo_dias": 10,
        "descricao": "10 dias. Campo de justificativa para pendências. Flag interação com Criação."
    },
    {
        "etapa_id": 35,
        "etapa_nome": "Recebimento do envelope de saída",
        "departamento": "pre-producao",
        "prazo_dias": 5,
        "descricao": "5 dias para iniciar e finalizar a saída. Campo de justificativa."
    },
    {
        "etapa_id": 36,
        "etapa_nome": "Conferir textos e revisão ortográfica",
        "departamento": "pre-producao",
        "prazo_dias": 2,
        "descricao": "Após receber envelope do atendimento"
    },
    {
        "etapa_id": 37,
        "etapa_nome": "Envio dos arquivos para gráfica",
        "departamento": "pre-producao",
        "prazo_dias": 1,
        "descricao": "Campo de justificativa"
    },
    {
        "etapa_id": 38,
        "etapa_nome": "Conferência de xerox (impressão externa)",
        "departamento": "pre-producao",
        "prazo_dias": 2,
        "descricao": "Campo de justificativa"
    },
    {
        "etapa_id": 39,
        "etapa_nome": "Controle de impressões internas",
        "departamento": "pre-producao",
        "prazo_dias": 1,
        "descricao": "Campo de justificativa"
    },
    
    # =====================================================
    # 🟥 PRODUÇÃO / ENTREGA - Ricardo
    # =====================================================
    {
        "etapa_id": 40,
        "etapa_nome": "Triagem de materiais",
        "departamento": "producao",
        "prazo_dias": 3,
        "descricao": "3 dias. Campo de justificativa."
    },
    {
        "etapa_id": 41,
        "etapa_nome": "Orçamentos nos fornecedores",
        "departamento": "producao",
        "prazo_dias": 2,
        "descricao": "Campo de justificativa"
    },
    {
        "etapa_id": 42,
        "etapa_nome": "Envio do arquivo à gráfica",
        "departamento": "producao",
        "prazo_dias": 1,
        "descricao": "Depende da Pré-produção"
    },
    {
        "etapa_id": 43,
        "etapa_nome": "Ordem de produção",
        "departamento": "producao",
        "prazo_dias": 1,
        "descricao": "Gerar ordem de produção"
    },
    {
        "etapa_id": 44,
        "etapa_nome": "Alinhar prazos com prestadores de serviços",
        "departamento": "producao",
        "prazo_dias": 2,
        "descricao": "Alinhamento de prazos"
    },
    {
        "etapa_id": 45,
        "etapa_nome": "Costura e acabamento interno",
        "departamento": "producao",
        "prazo_dias": 5,
        "descricao": "Processo de costura e acabamento"
    },
    {
        "etapa_id": 46,
        "etapa_nome": "Conferência final de qualidade",
        "departamento": "producao",
        "prazo_dias": 1,
        "descricao": "Verificação de qualidade final"
    },
    {
        "etapa_id": 47,
        "etapa_nome": "Solicitar liberação de entrega ao financeiro",
        "departamento": "producao",
        "prazo_dias": 1,
        "descricao": "Solicitar liberação"
    },
    {
        "etapa_id": 48,
        "etapa_nome": "Cotar fretes (custos e prazos)",
        "departamento": "producao",
        "prazo_dias": 2,
        "descricao": "Cotação de fretes"
    },
    {
        "etapa_id": 49,
        "etapa_nome": "Enviar convites e informar rastreio",
        "departamento": "producao",
        "prazo_dias": 1,
        "descricao": "Enviar convites e informar rastreio para diretoria e atendimento"
    },
    {
        "etapa_id": 50,
        "etapa_nome": "Entrega dos convites à comissão",
        "departamento": "producao",
        "prazo_dias": 3,
        "descricao": "Entrega final"
    },
    {
        "etapa_id": 51,
        "etapa_nome": "Pós entrega (correções e/ou compras extras)",
        "departamento": "producao",
        "prazo_dias": 5,
        "descricao": "Campo de justificativa para correções ou compras extras"
    }
]

def calcular_prazo_total():
    """Calcula o prazo total em dias de todas as etapas"""
    return sum(e["prazo_dias"] for e in ETAPAS_PADRAO)

def get_etapas_por_departamento(departamento):
    """Retorna etapas filtradas por departamento"""
    return [e for e in ETAPAS_PADRAO if e["departamento"] == departamento]
