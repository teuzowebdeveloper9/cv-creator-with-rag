import re
import textwrap
import unicodedata
import logging

logger = logging.getLogger(__name__)


CV_OUTPUT_RULES = """
REGRAS OBRIGATORIAS PARA A SAIDA:
- Retorne exclusivamente o curriculo final em Markdown.
- A primeira linha deve ser o titulo do curriculo, preferencialmente "# Nome da Pessoa" quando o nome existir no contexto.
- Nunca escreva introducoes, comentarios, explicacoes, saudacoes ou frases de IA.
- Nunca use frases como "Claro", "Aqui esta", "Segue", "Preparei", "Curriculo gerado" ou equivalentes.
- Nunca use blocos de codigo Markdown.
- Nao invente dados, empresas, datas, formacoes, certificacoes ou contatos.
- Nao deixe placeholders como "[Seu nome]", "[Empresa]" ou "[Data]".
- Se uma informacao nao estiver disponivel, omita a informacao em vez de criar texto falso.

ESTRUTURA OBRIGATORIA DO CURRICULO (todas as secoes devem estar presentes):

1. **Cabecalho** (obrigatorio):
   - Nome completo em destaque
   - Titulo profissional/resumo curto (1 linha)
   - Contatos: email, GitHub, LinkedIn, Portfolio, cidade/estado, idiomas

2. **Resumo Profissional** (obrigatorio, 2-3 paragrafos):
   - Apresentacao profissional com experiencia e areas de atuacao
   - Habilidades tecnicas e diferencias competitivos
   - Foco em resultados e valor para a empresa

3. **Habilidades Tecnicas** (obrigatorio, organizado por categorias):
   - Cada categoria com titulo e lista de habilidades em formato pill/lista
   - Exemplos de categorias: IA/Agentes, Frontend, Backend, Dados, Cloud/DevOps, Qualidade
   - Incluir apenas tecnologias mencionadas no contexto do usuario

4. **Experiencia Profissional** (obrigatorio, todas as experiencias do contexto):
   - Cada experiencia com: Titulo da vaga - Empresa
   - Periodo (Mes Ano - Mes Ano ou Atual)
   - Descricao detalhada (3-5 frases) com:
     - Principais responsabilidades
     - Tecnologias utilizadas
     - Resultados alcancados (numeros quando possivel)
     - Impacto no negocio

5. **Projetos Relevantes** (obrigatorio, se houver informacoes):
   - Descricao de projetos importantes com tecnologias usadas
   - Impacto e resultados

6. **Formacao Academica** (obrigatorio):
   - Curso - Instituicao (Periodo)
   - Incluir se houver informacoes no contexto

7. **Formacao Complementar** (obrigatorio, se houver):
   - Cursos, certificacoes, workshop

8. **Comunicacao e Estilo de Trabalho** (obrigatorio):
   - Idiomas, soft skills, metodologias

9. **Disponibilidade** (obrigatorio):
   - Tipo de oportunidade pretendida

FORMATO VISUAL:
- Use ## para titulos de secao
- Use **negrito** para destaques
- Use listas com - para itens
- Mantenha tom profissional e objetivo
- Cada secao deve ter conteudo real e detalhado, nunca apenas titulo
- O curriculo deve ter entre 400-800 palavras no total
""".strip()


_AI_PREAMBLE_PATTERNS = [
    r"^(claro|com certeza|certamente|perfeito|ok|segue|aqui esta|abaixo|pronto)\b",
    r"^(preparei|criei|gerei|montei|elaborei)\b",
    r"^curriculo\s+(gerado|otimizado|personalizado)\b",
    r"^(este|esse)\s+e\s+.*curriculo\b",
    r"^como\s+(ia|assistente)\b",
    r"^(sure|of course|here is|here's)\b",
]


def sanitize_cv_markdown(content: str) -> str:
    """Remove leading assistant chatter while preserving the CV body."""
    logger.debug("CV markdown sanitization started: %d chars input", len(content))
    clean = content.replace("```markdown", "").replace("```", "")
    clean = clean.replace("\r\n", "\n").replace("\r", "\n")
    clean = textwrap.dedent(clean).strip()
    lines = clean.splitlines()

    while lines and not lines[0].strip():
        lines.pop(0)

    removed_preamble = 0
    while lines and _is_ai_preamble(lines[0]):
        lines.pop(0)
        removed_preamble += 1
        while lines and not lines[0].strip():
            lines.pop(0)

    result = "\n".join(lines).strip()
    if removed_preamble:
        logger.info("CV markdown: removed %d AI preamble lines, %d chars output", removed_preamble, len(result))
    else:
        logger.debug("CV markdown sanitization completed: %d chars output", len(result))
    return result


def _is_ai_preamble(line: str) -> bool:
    folded = _fold(line).strip(" :!-")
    if not folded:
        return False

    return any(re.search(pattern, folded) for pattern in _AI_PREAMBLE_PATTERNS)


def _fold(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return without_accents.lower().strip()
