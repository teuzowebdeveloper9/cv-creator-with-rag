from ai_services.cv_markdown import sanitize_cv_markdown


def test_sanitize_cv_markdown_removes_leading_ai_preamble():
    content = """
    Claro, aqui esta o curriculo otimizado:

    # Mateus da Silva Oliveira

    ## Resumo
    Desenvolvedor Full Stack.
    """

    clean = sanitize_cv_markdown(content)

    assert clean.startswith("# Mateus da Silva Oliveira")
    assert "Claro" not in clean


def test_sanitize_cv_markdown_preserves_cv_heading():
    content = """
    # Curriculo

    ## Experiencia
    - Python
    """

    clean = sanitize_cv_markdown(content)

    assert clean == "# Curriculo\n\n## Experiencia\n- Python"
