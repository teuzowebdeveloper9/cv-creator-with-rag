# 🚀 RAG CV Creator — Geração Inteligente de Currículos

<div align="center">

![GitHub license](https://img.shields.io/github/license/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub stars](https://img.shields.io/github/stars/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub forks](https://img.shields.io/github/forks/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub issues](https://img.shields.io/github/issues/teuzowebdeveloper9/cv-creator-with-rag-)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

**Uma plataforma de ponta para criação de currículos personalizados usando Retrieval-Augmented Generation (RAG).**

[Visão Geral](#-visão-geral) • [Funcionalidades](#-funcionalidades) • [Tecnologias](#-tecnologias) • [Instalação](#-instalação) • [Como Usar](#-como-usar)

</div>

---

## 📱 Visualização da Interface

*(Nota: Uma captura de tela profissional da interface moderna seria exibida aqui)*

A interface foi projetada com foco em **UI/UX moderna**, utilizando conceitos de **Glassmorphism**, animações fluidas com **Framer Motion** e uma paleta de cores sofisticada para uma experiência de usuário premium.

---

## 🌟 Visão Geral

O **RAG CV Creator** não é apenas um gerador de currículos comum. Ele utiliza a potência da Inteligência Artificial combinada com seus dados reais para criar documentos que realmente convertem. Através do pipeline **RAG (Retrieval-Augmented Generation)**, o sistema busca em sua base de conhecimentos (currículos antigos, portfólios, certificados) as experiências que mais se conectam com a vaga que você deseja.

## ✨ Funcionalidades

-   🧠 **RAG Nativo:** Busca semântica inteligente no Qdrant para recuperar contextos relevantes.
-   🛡️ **Sistema de Fallback de LLM:** Garantia de funcionamento alternando entre Claude 3.5, GPT-4o, Gemini 1.5 Pro e Mistral.
-   📂 **Upload Inteligente:** Suporte para arquivos PDF/HTML individuais ou pastas completas.
-   🎨 **Interface Premium:** Design responsivo, moderno e intuitivo construído com Tailwind CSS.
-   📊 **Dashboard Vetorial:** Acesso direto ao Qdrant para inspeção de embeddings e contextos.
-   🐳 **Full Dockerized:** Orquestração completa com Docker Compose para fácil implantação.

## 🛠 Tecnologias

-   **Frontend:** [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
-   **Backend:** [Django](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
-   **IA/Orquestração:** [LangChain](https://www.langchain.com/) + [Sentence-Transformers](https://www.sbert.net/)
-   **Bancos de Dados:** [SQLite](https://www.sqlite.org/) (Relacional) + [Qdrant](https://qdrant.tech/) (Vetorial)
-   **Infraestrutura:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Instalação e Execução

### Pré-requisitos
-   Docker e Docker Compose instalados.
-   Chaves de API dos provedores de LLM (opcional, mas recomendado para o fallback).

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone git@github.com:teuzowebdeveloper9/cv-creator-with-rag-.git
    cd cv-creator-with-rag-
    ```

2.  **Configure o ambiente:**
    ```bash
    cp .env.example .env
    # Edite o .env com suas chaves de API
    ```

3.  **Suba os containers:**
    ```bash
    docker compose up -d --build
    ```

### Portas Disponíveis

-   **Frontend:** `http://localhost:5173`
-   **Backend:** `http://localhost:8000`
-   **Qdrant UI:** `http://localhost:6333/dashboard`

---

## 🤖 Sistema de Fallback

O sistema prioriza os modelos na seguinte ordem de disponibilidade:
1.  **Anthropic (Claude 3.5 Sonnet)** 🥇
2.  **OpenAI (GPT-4o)**
3.  **Google (Gemini 1.5 Pro)**
4.  **Mistral AI**

---

## 🤝 Contribuição

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Faça o Commit de suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça o Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

<div align="center">
Desenvolvido com ❤️ por <a href="https://github.com/teuzowebdeveloper9">teuzowebdeveloper9</a>
</div>
