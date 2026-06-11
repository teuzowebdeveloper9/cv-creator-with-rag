# CV Generator RAG Platform

Uma plataforma completa de geração de currículos personalizados baseada em RAG (Retrieval-Augmented Generation).

## 🚀 Como Iniciar

Toda a aplicação é orquestrada via Docker. Certifique-se de ter o Docker e o Docker Compose instalados.

1.  **Configure o Ambiente:**
    Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base) e insira suas chaves de API para os provedores de IA.

2.  **Suba os Serviços:**
    ```bash
    docker-compose up --build
    ```

3.  **Acesse a Aplicação:**
    - **Frontend:** [http://localhost:5173](http://localhost:5173)
    - **Backend API:** [http://localhost:8000/api/](http://localhost:8000/api/)
    - **Qdrant Dashboard:** [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

## 🏗️ Arquitetura

-   **Frontend:** React + Vite + Tailwind CSS.
-   **Backend:** Django REST Framework (Python).
-   **Banco de Dados Relacional:** SQLite (persistido em volume).
-   **Banco de Dados Vetorial:** Qdrant (persistido em volume).
-   **IA/RAG:** LangChain/LlamaIndex (ou implementação customizada) com sistema de fallback de LLMs.

## 🤖 Sistema de Fallback de LLM

O sistema prioriza os seguintes modelos em ordem de disponibilidade e configuração:
1.  **Anthropic (Claude)**
2.  **OpenAI (GPT)**
3.  **Google (Gemini)**
4.  **Mistral AI**

## 📂 Estrutura do Projeto

-   `backend/`: Código fonte do servidor Django, lógica de processamento de documentos e integração com IAs.
-   `frontend/`: Interface do usuário construída com React.
-   `docker-compose.yml`: Orquestração de containers.

## 📊 Inspeção de Vetores

Você pode inspecionar os vetores e contextos salvos pelo pipeline RAG acessando o painel visual do Qdrant em [http://localhost:6333/dashboard](http://localhost:6333/dashboard).
