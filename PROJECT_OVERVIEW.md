# RAG CV Creator

Plataforma de geração inteligente de currículos com IA (RAG), entrevistas técnicas por voz e sistema multiusuário.

## Visão Geral

O RAG CV Creator combina Retrieval-Augmented Generation com LLMs para gerar currículos personalizados a partir de uma base de conhecimento do usuário. A plataforma inclui entrevistas técnicas com avaliação por IA, feedback semanal e suporte multiusuário com autenticação.

## Stack Tecnológica

- **Frontend**: React 18, Vite 5, Tailwind CSS, Framer Motion, Axios, TypeScript
- **Backend**: Django 4.2, DRF 3.14, Python 3.11+, LangChain, LangGraph, Celery
- **IA/Voz**: Anthropic Claude, OpenAI GPT-4o, Google Gemini, Mistral, ElevenLabs (TTS/STT)
- **Infra**: Docker Compose, Qdrant (vetor DB), Redis, MinIO (S3), SQLite, WeasyPrint

## Funcionalidades

- Geração de CV com RAG (upload de docs, indexação vetorial, geração otimizada)
- Entrevista técnica por voz (perguntas IA, gravação áudio, STT, avaliação 0-10)
- Feedback semanal de desempenho
- Sistema multiusuário com autenticação por sessão
- Fallback automático entre LLMs (Claude, GPT-4o, Gemini, Mistral)
- Geração de PDF profissional com WeasyPrint

## Arquitetura

```
Frontend (React/Vite) → Proxy → Backend (Django/DRF)
                                    ├── Celery Worker → Redis
                                    ├── Qdrant (vetores)
                                    ├── MinIO (arquivos)
                                    └── LLMs (Claude/GPT/Gemini/Mistral)
```

## Quick Start

```bash
git clone git@github.com:teuzowebdeveloper9/cv-creator-with-rag.git
cd cv-creator-with-rag
cp .env.example .env
docker compose up -d --build
```

| Serviço | Porta |
|---------|-------|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| Qdrant | http://localhost:6333/dashboard |
| MinIO | http://localhost:9001 |

## Licença

MIT License
