import logging
import json
import datetime
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from .orchestrator import LLMOrchestrator
from .vector_store import QdrantVectorStore
from .voice import elevenlabs_service

logger = logging.getLogger(__name__)

INTERVIEW_COLLECTION = "interviews"


class InterviewState(TypedDict):
    job_role: str
    tech_stack: str
    questions: list[dict]
    current_question_index: int
    user_answer: str
    evaluation: dict
    profile_context: str
    interview_id: int
    messages: Annotated[Sequence, lambda x, y: x + y]


class InterviewOrchestrator:
    def __init__(self):
        self.llm = LLMOrchestrator()
        self.vector_store = QdrantVectorStore()

    def generate_questions(self, job_role: str, tech_stack: str, profile_context: str) -> list[dict]:
        system_prompt = """Voce e um especialista em entrevistas tecnicas para vagas de tecnologia.
Sua tarefa e gerar 5 perguntas tecnicas relevantes para a vaga especificada.

REGRAS:
- Gere EXATAMENTE 5 perguntas
- Cada pergunta deve ser relevante para a vaga e stack informados
- Misture perguntas de conceitos, pratica e situacionais
- Formato JSON: [{"question": "...", "category": "...", "difficulty": "easy|medium|hard"}]
- Nao inclua explicações, apenas o JSON puro
- As perguntas devem ser em portugues"""

        prompt = f"""Vaga: {job_role}
Stack tecnica: {tech_stack}

Contexto do candidato:
{profile_context}

Gere 5 perguntas tecnicas para entrevista."""

        try:
            response = self.llm.generate(prompt, system_prompt)
            response = response.strip()
            if response.startswith("```"):
                response = response.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            questions = json.loads(response)
            return questions[:5]
        except Exception as e:
            logger.error(f"Failed to generate questions: {e}")
            return self._get_fallback_questions(job_role, tech_stack)

    def evaluate_answer(self, question: str, answer: str, job_role: str, tech_stack: str) -> dict:
        system_prompt = """Voce e um avaliador de entrevistas tecnicas experiencia.
Sua tarefa e avaliar a resposta do candidato e fornecer feedback detalhado.

REGRAS:
- Avalie a resposta de 0 a 10
- Identifique pontos fortes
- Identifique areas de melhoria
- Forneça dicas praticas
- Formato JSON: {"score": 0-10, "feedback": "...", "strengths": ["..."], "improvements": ["..."], "correct_answer": "..."}
- Nao inclua explicações, apenas o JSON puro
- Respostas em portugues"""

        prompt = f"""Pergunta: {question}
Resposta do candidato: {answer}
Vaga: {job_role}
Stack: {tech_stack}

Avalie a resposta e forneça feedback detalhado."""

        try:
            response = self.llm.generate(prompt, system_prompt)
            response = response.strip()
            if response.startswith("```"):
                response = response.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            evaluation = json.loads(response)
            return evaluation
        except Exception as e:
            logger.error(f"Failed to evaluate answer: {e}")
            return {
                "score": 5,
                "feedback": "Nao foi possivel avaliar a resposta automaticamente.",
                "strengths": [],
                "improvements": ["Tente ser mais especifico na sua resposta"],
                "correct_answer": ""
            }

    def search_web(self, query: str) -> str:
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=3))
                return "\n".join([r.get("body", "") for r in results])
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return ""

    def generate_feedback(self, interview_data: list[dict]) -> dict:
        system_prompt = """Voce e um coach de carreira especialista em tecnologia.
Analise o historico de entrevistas e gere um feedback semanal detalhado.

REGRAS:
- Analise todas as respostas e notas
- Identifique padroes de desempenho
- Forneça recomendacoes especificas
- Formato JSON: {"summary": "...", "overall_score": 0-10, "strengths": ["..."], "improvements": ["..."], "recommendations": ["..."]}
- Nao inclua explicações, apenas o JSON puro
- Respostas em portugues"""

        prompt = f"""Historico de entrevistas da semana:
{json.dumps(interview_data, indent=2, ensure_ascii=False)}

Gere um feedback semanal completo."""

        try:
            response = self.llm.generate(prompt, system_prompt)
            response = response.strip()
            if response.startswith("```"):
                response = response.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(response)
        except Exception as e:
            logger.error(f"Failed to generate feedback: {e}")
            return {
                "summary": "Nao foi possivel gerar feedback automatico.",
                "overall_score": 0,
                "strengths": [],
                "improvements": [],
                "recommendations": []
            }

    def _get_fallback_questions(self, job_role: str, tech_stack: str) -> list[dict]:
        return [
            {"question": f"Qual e sua experiencia com {tech_stack.split(',')[0].strip() if tech_stack else 'tecnologias modernas'}?", "category": "experiencia", "difficulty": "easy"},
            {"question": "Descreva um projeto desafiador que voce trabalhou recentemente.", "category": "comportamental", "difficulty": "medium"},
            {"question": "Como voce aborda a resolucao de problemas complexos?", "category": "comportamental", "difficulty": "medium"},
            {"question": f"Quais sao as melhores praticas para desenvolvimento com {tech_stack.split(',')[0].strip() if tech_stack else 'sua stack'}?", "category": "tecnica", "difficulty": "medium"},
            {"question": "Como voce se mantem atualizado com as novas tecnologias?", "category": "comportamental", "difficulty": "easy"},
        ]

    def save_to_vector_store(self, interview_id: int, question_data: dict):
        try:
            text = f"Pergunta: {question_data['question']}\nResposta: {question_data.get('answer', '')}\nNota: {question_data.get('score', 0)}"
            metadata = {
                "interview_id": interview_id,
                "question_order": question_data.get("order", 0),
                "score": question_data.get("score", 0),
                "created_at": datetime.datetime.now().isoformat(),
            }
            self.vector_store.upsert(
                collection_name=INTERVIEW_COLLECTION,
                texts=[text],
                metadatas=[metadata],
            )
        except Exception as e:
            logger.error(f"Failed to save to vector store: {e}")

    def search_interview_history(self, query: str, limit: int = 5) -> list[dict]:
        try:
            results = self.vector_store.search(
                collection_name=INTERVIEW_COLLECTION,
                query=query,
                limit=limit,
            )
            return results
        except Exception as e:
            logger.error(f"Failed to search interview history: {e}")
            return []


interview_orchestrator = InterviewOrchestrator()
