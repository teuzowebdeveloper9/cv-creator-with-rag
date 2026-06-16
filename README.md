# RAG CV Creator

Plataforma de geração inteligente de currículos com IA (RAG), entrevistas técnicas por voz e sistema multiusuário.

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
