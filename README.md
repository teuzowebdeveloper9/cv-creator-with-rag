# RAG CV Creator

<div align="center">

![GitHub license](https://img.shields.io/github/license/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub stars](https://img.shields.io/github/stars/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub forks](https://img.shields.io/github/forks/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub issues](https://img.shields.io/github/issues/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub pull requests](https://img.shields.io/github/issues-pr/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub last commit](https://img.shields.io/github/last-commit/teuzowebdeveloper9/cv-creator-with-rag-)
![GitHub language count](https://img.shields.io/github/languages/count/teuzowebdeveloper9/cv-creator-with-rag-)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)
![Django](https://img.shields.io/badge/Django-4.2+-092E20?logo=django&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.2+-black?logo=chainlink&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice-purple?logo=elevenlabs&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-red?logo=qdrant&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

Plataforma de geração inteligente de currículos com IA (RAG), entrevistas técnicas por voz e sistema multiusuário.

<div align="center">

![RAG](https://img.shields.io/badge/RAG-Retrieval-Augmented_Generation-blue)
![Multi-User](https://img.shields.io/badge/Multi--User-Auth-green)
![Voice](https://img.shields.io/badge/Voice--Interview-purple)
![PDF](https://img.shields.io/badge/PDF--Generation-orange)
![LLM](https://img.shields.io/badge/LLM--Fallback-yellow)

</div>

## Visão Geral

O RAG CV Creator combina Retrieval-Augmented Generation com LLMs para gerar currículos personalizados a partir de uma base de conhecimento do usuário. A plataforma inclui entrevistas técnicas com avaliação por IA, feedback semanal e suporte multiusuário com autenticação.

## Funcionalidades

- **Geração de CV com RAG**: Upload de documentos (PDF/HTML), indexação vetorial e geração de currículos otimizados para vagas específicas
- **Entrevista técnica por voz**: Perguntas geradas por IA, gravação de áudio, transcrição (STT) e avaliação com nota 0-10
- **Feedback semanal**: Análise consolidada de desempenho em entrevistas, desbloqueada toda sexta
- **Sistema multiusuário**: Autenticação por sessão, isolamento de dados por usuário
- **Fallback de LLMs**: Claude, GPT-4o, Gemini e Mistral com failover automático
- **PDF profissional**: Geração de PDF com HTML/CSS via WeasyPrint, links clicáveis e foto de perfil

## Tecnologias

### Frontend
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11+-black?style=for-the-badge&logo=framer&logoColor=blue)
![Axios](https://img.shields.io/badge/Axios-1+-5A29E4?style=for-the-badge&logo=axios&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Backend
![Django](https://img.shields.io/badge/Django-4.2+-092E20?style=for-the-badge&logo=django&logoColor=white)
![Django REST](https://img.shields.io/badge/DRF-3.14+-ff1709?style=for-the-badge&logo=django&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=ffdd54)
![LangChain](https://img.shields.io/badge/LangChain-0.2+-black?style=for-the-badge&logo=chainlink&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-red?style=for-the-badge&logo=graphqL&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5+-59A743?style=for-the-badge&logo=celery&logoColor=white)

### IA & Voz
![Anthropic](https://img.shields.io/badge/Claude-3.5-d97706?style=for-the-badge&logo=anthropic&logoColor=white)
![OpenAI](https://img.shields.io/badge/GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Google](https://img.shields.io/badge/Gemini-2.5-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Mistral](https://img.shields.io/badge/Mistral--Large-FF7000?style=for-the-badge&logo=mistral&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS--STT-purple?style=for-the-badge&logo=elevenlabs&logoColor=white)

### Infra & Data
![Docker](https://img.shields.io/badge/Docker-24+-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-DC2626?style=for-the-badge&logo=qdrant&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO--S3-C6272B?style=for-the-badge&logo=minio&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3+-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![WeasyPrint](https://img.shields.io/badge/WeasyPrint--PDF-E34F26?style=for-the-badge&logo=python&logoColor=white)

**Frontend**: React, Vite, Tailwind CSS, Framer Motion, Axios

**Backend**: Django, DRF, LangChain, LangGraph, Celery, Redis

**IA**: Anthropic, OpenAI, Google Gemini, Mistral, ElevenLabs (TTS/STT)

**Infra**: Docker Compose, Qdrant, MinIO (S3), SQLite

## Instalação

### Pré-requisitos
- Docker e Docker Compose
- Chaves de API: LLMs (pelo menos uma) e ElevenLabs (para voz)

### Setup

```bash
git clone git@github.com:teuzowebdeveloper9/cv-creator-with-rag-.git
cd cv-creator-with-rag-
cp .env.example .env
# Edite .env com suas chaves de API
docker compose up -d --build
```

### Portas

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| Qdrant | http://localhost:6333/dashboard |

## Variáveis de Ambiente

```env
# LLMs (pelo menos uma obrigatória)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
MISTRAL_API_KEY=

# ElevenLabs (para voz)
ELEVENLABS_API_KEY=

# Auth
INITIAL_ADMIN_PASSWORD=sua_senha_aqui

# Infra
QDRANT_HOST=qdrant
QDRANT_PORT=6333
```

## Arquitetura

```
Frontend (React/Vite) → Proxy → Backend (Django/DRF)
                                    ├── Celery Worker → Redis
                                    ├── Qdrant (vetores)
                                    ├── MinIO (arquivos)
                                    └── LLMs (Claude/GPT/Gemini/Mistral)
```

## Endpoints Principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register/` | Cadastro |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout |
| GET | `/api/auth/session/` | Verificar sessão |
| POST | `/api/upload/` | Upload de documentos |
| POST | `/api/generate/` | Gerar CV (SSE) |
| POST | `/api/download-pdf/` | Gerar PDF |
| POST | `/api/interview/start/` | Iniciar entrevista |
| POST | `/api/interview/answer/` | Enviar resposta |
| POST | `/api/voice/tts/` | Text to speech |
| POST | `/api/voice/stt/` | Speech to text |

## Contribuição

1. Faça um Fork
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas alterações
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

Desenvolvido por [teuzowebdeveloper9](https://github.com/teuzowebdeveloper9)
