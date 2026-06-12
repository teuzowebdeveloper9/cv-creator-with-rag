import re
import textwrap
import unicodedata


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
    clean = content.replace("```markdown", "").replace("```", "")
    clean = clean.replace("\r\n", "\n").replace("\r", "\n")
    clean = textwrap.dedent(clean).strip()
    lines = clean.splitlines()

    while lines and not lines[0].strip():
        lines.pop(0)

    while lines and _is_ai_preamble(lines[0]):
        lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)

    return "\n".join(lines).strip()


def _is_ai_preamble(line: str) -> bool:
    folded = _fold(line).strip(" :!-")
    if not folded:
        return False

    return any(re.search(pattern, folded) for pattern in _AI_PREAMBLE_PATTERNS)


def _fold(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return without_accents.lower().strip()
