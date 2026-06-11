# Agentes de IA e Orquestração

Este documento descreve a lógica dos agentes utilizados na plataforma.

## 1. Agente de Ingestão (Context Specialist)
- **Função:** Extrair texto de PDFs e HTMLs, realizar a limpeza dos dados e criar chunks semânticos.
- **Ferramentas:** `pdfplumber`, `BeautifulSoup`, `sentence-transformers`.

## 2. Agente de Recuperação (Retrieval Specialist)
- **Função:** Transformar a descrição da vaga em um vetor de busca e recuperar os fragmentos mais relevantes do histórico do usuário no Qdrant.

## 3. Agente de Escrita (CV Generator)
- **Função:** Consolidar os dados recuperados e a descrição da vaga em um currículo otimizado.
- **Estratégia:** Prompt Engineering avançado para garantir que as palavras-chave da vaga sejam incorporadas naturalmente.

## 4. Orquestrador de Fallback
- **Função:** Gerenciar as chamadas de API e alternar entre provedores (Claude, GPT, Gemini, Mistral) em caso de falha ou falta de créditos/configuração.
