import logging
import json
from typing import Generator

from .orchestrator import LLMOrchestrator
from .vector_store import QdrantVectorStore

logger = logging.getLogger(__name__)

DEBATE_COLLECTION = "user_context"

AGENTS = {
    "ats": {
        "id": "ats",
        "name": "ATS Specialist",
        "role": "Especialista em ATS e Triagem Automatizada",
        "color": "indigo",
    },
    "gap": {
        "id": "gap",
        "name": "Gap & Objection Specialist",
        "role": "Especialista em Gaps e Riscos",
        "color": "rose",
    },
    "judge": {
        "id": "judge",
        "name": "Debate Judge",
        "role": "Moderador e Analista de Probabilidade",
        "color": "violet",
    },
}

ATS_SYSTEM_PROMPT = """Voce e um especialista em ATS (Applicant Tracking System) e recrutamento automatizado com 15 anos de experiencia.
Sua tarefa e analisar a compatibilidade entre o curriculo do candidato e a vaga descrita.

Voce deve avaliar:
- Palavras-chave do curriculo vs palavras-chave da vaga
- Tecnologias exigidas vs tecnologias do candidato
- Senioridade pretendida vs nivel percebido
- Experiencia minima vs experiencia comprovada
- Formato e estrutura do curriculo (ATS-friendly?)
- Clareza e impacto das experiencias descritas
- Compatibilidade com filtros automaticos de triagem
- Pontos fortes do candidato para passar na triagem

REGRAS:
- Seja honesto e fundamentado em evidencias do curriculo
- Nao invente informacoes que nao estejam no curriculo
- Quantifique quando possivel (anos de experiencia, numero de projetos, etc.)
- Identifique palavras-chave especificas encontradas e faltantes
- Responda APENAS com o JSON puro, sem explicacoes

Formato JSON:
{
  "analysis": "Analise detalhada da compatibilidade ATS (2-3 paragrafos)",
  "keywords_found": ["palavra-chave encontrada 1", "palavra-chave encontrada 2"],
  "keywords_missing": ["palavra-chave faltante 1", "palavra-chave faltante 2"],
  "ats_score_raw": <numero de 0 a 15>,
  "technical_match_raw": <numero de 0 a 30>,
  "clarity_raw": <numero de 0 a 5>
}"""

GAP_SYSTEM_PROMPT = """Voce e um especialista em identificacao de gaps, riscos e objecoes em processos seletivos.
Sua tarefa e encontrar TODOS os pontos fracos e riscos que um recrutador poderia usar para recusar o candidato.

Voce deve avaliar:
- O que falta no curriculo em relacao a vaga
- Experiencias fracas, vagas ou pouco comprovadas
- Tecnologias ausentes que sao obrigatorias na vaga
- Riscos de senioridade (muito junior para vaga senior, ou vice-versa)
- Riscos de ingles, localizacao, modelo de trabalho ou pretensao salarial
- Possiveis motivos concretos para o candidato ser recusado
- Perguntas dificeis que o recrutador poderia fazer em entrevista

REGRAS:
- Seja critico mas justo - baseie cada risco em evidencia real do curriculo
- Nao invente gaps que nao existem
- Classifique cada risco por severidade (alto, medio, baixo)
- Considere informacoes extras fornecidas (ingles, salario, localizacao)
- Responda APENAS com o JSON puro, sem explicacoes

Formato JSON:
{
  "analysis": "Analise detalhada dos gaps e riscos (2-3 paragrafos)",
  "gaps": [
    {"description": "Descricao do gap", "severity": "alto|medio|baixo", "impact": "Como isso afeta a candidatura"}
  ],
  "objections": [
    {"objection": "Objecao provavel do recrutador", "likelihood": "alta|media|baixa"}
  ],
  "seniority_risk_raw": <numero de 0 a 20 - quanto maior, mais risco de senioridade>,
  "experience_risk_raw": <numero de 0 a 20 - quanto maior, mais risco de experiencia>,
  "logistics_risk_raw": <numero de 0 a 10 - quanto maior, mais risco logistico>
}"""

JUDGE_SYSTEM_PROMPT = """Voce e o moderador de um debate entre dois especialistas de recrutamento.
Voce ouve os argumentos do ATS Specialist e do Gap Specialist, e precisa:
1. Fazer perguntas para esclarecer pontos
2. Criar um dialogo curto e dinamico entre os agentes
3. Comparar pontos positivos e negativos de forma imparcial
4. Gerar um resumo executivo da discussao
5. Listar pontos fortes, recomendacoes praticas e palavras-chave que deveriam aparecer mais

REGRAS:
- O debate deve ter entre 4 e 6 turnos (alternando entre os dois agentes)
- Cada turno deve ter entre 1 e 3 frases
- Seja imparcial - nao pender para nenhum lado
- Inclua pelo menos 1 pergunta do moderador durante o debate
- As recomendacoes devem ser especificas e acionaveis
- Responda APENAS com o JSON puro, sem explicacoes

Formato JSON:
{
  "debate_messages": [
    {"agent": "ATS Specialist", "message": "..."},
    {"agent": "Gap & Objection Specialist", "message": "..."},
    {"agent": "Debate Judge", "message": "..."}
  ],
  "summary": "Resumo executivo do debate (2-3 frases)",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "recommendations": ["recomendacao 1", "recomendacao 2", "recomendacao 3"],
  "keywords_to_add": ["palavra-chave 1", "palavra-chave 2"],
  "recruiter_message": "Mensagem sugerida para enviar ao recrutador (2-3 frases, profissional e personalizada)"
}"""


class DebateOrchestrator:
    def __init__(self):
        self.llm = LLMOrchestrator()
        self.vector_store = QdrantVectorStore()

    def _search_user_context(self, cv_text: str, job_description: str, limit: int = 8) -> str:
        try:
            query = f"{job_description} {cv_text[:500]}"
            logger.debug("Debate vector search: query=%d chars, limit=%d", len(query), limit)
            fragments = self.vector_store.search(
                collection_name=DEBATE_COLLECTION,
                query=query,
                limit=limit,
                max_per_source=2,
            )
            if not fragments:
                logger.debug("Debate vector search: no fragments found")
                return ""
            blocks = []
            for i, frag in enumerate(fragments, 1):
                text = str(frag.get("text", "")).strip()
                if text:
                    blocks.append(f"[Fragmento {i}]\n{text}")
            logger.info("Debate vector search: %d fragments found", len(blocks))
            return "\n\n".join(blocks)
        except Exception as e:
            logger.warning(f"Vector search failed for debate: {e}")
            return ""

    def _call_llm(self, prompt: str, system_prompt: str) -> dict:
        response = self.llm.generate(prompt, system_prompt)
        response = response.strip()
        if response.startswith("```"):
            response = response.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(response)

    def _run_ats_specialist(self, cv_text: str, job_description: str, context: str) -> dict:
        prompt = f"""Curriculo do candidato:
{cv_text}

Descricao da vaga:
{job_description}

{"Contexto adicional da base de conhecimento:" if context else ""}
{context}

Analise a compatibilidade ATS entre o curriculo e a vaga. Retorne o JSON solicitado."""

        logger.info("ATS Specialist analysis started")
        try:
            result = self._call_llm(prompt, ATS_SYSTEM_PROMPT)
            logger.info("ATS Specialist completed: score=%d, keywords_found=%d", result.get("ats_score_raw", 0), len(result.get("keywords_found", [])))
            return self._normalize_ats_result(result)
        except Exception as e:
            logger.error(f"ATS Specialist failed: {e}")
            return self._get_fallback_ats_result()

    def _run_gap_specialist(self, cv_text: str, job_description: str, extra_info: dict, context: str) -> dict:
        extra_text = ""
        if extra_info:
            parts = []
            if extra_info.get("english_level"):
                parts.append(f"Nivel de ingles: {extra_info['english_level']}")
            if extra_info.get("salary_expectation"):
                parts.append(f"Pretensao salarial: {extra_info['salary_expectation']}")
            if extra_info.get("location"):
                parts.append(f"Localizacao: {extra_info['location']}")
            if extra_info.get("work_model"):
                parts.append(f"Modelo de trabalho: {extra_info['work_model']}")
            extra_text = "\n".join(parts)

        prompt = f"""Curriculo do candidato:
{cv_text}

Descricao da vaga:
{job_description}

{"Informacoes extras do candidato:" if extra_text else ""}
{extra_text}

{"Contexto adicional:" if context else ""}
{context}

Identifique todos os gaps, riscos e objecoes. Retorne o JSON solicitado."""

        logger.info("Gap Specialist analysis started")
        try:
            result = self._call_llm(prompt, GAP_SYSTEM_PROMPT)
            logger.info("Gap Specialist completed: %d gaps, %d objections", len(result.get("gaps", [])), len(result.get("objections", [])))
            return self._normalize_gap_result(result)
        except Exception as e:
            logger.error(f"Gap Specialist failed: {e}")
            return self._get_fallback_gap_result()

    def _run_debate_judge(self, ats_result: dict, gap_result: dict, cv_text: str, job_description: str) -> dict:
        prompt = f"""=== ARGUMENTO DO ATS SPECIALIST ===
{ats_result['analysis']}

Palavras-chave encontradas: {json.dumps(ats_result.get('keywords_found', []), ensure_ascii=False)}
Palavras-chave faltantes: {json.dumps(ats_result.get('keywords_missing', []), ensure_ascii=False)}

=== ARGUMENTO DO GAP & OBJECTION SPECIALIST ===
{gap_result['analysis']}

Gaps identificados: {json.dumps(gap_result.get('gaps', []), ensure_ascii=False, indent=2)}
Objecoes provaveis: {json.dumps(gap_result.get('objections', []), ensure_ascii=False, indent=2)}

=== CONTEXTO ===
Vaga: {job_description[:300]}

Modere o debate. Faca perguntas, crie dialogo e gere o JSON solicitado."""

        logger.info("Debate Judge started")
        try:
            result = self._call_llm(prompt, JUDGE_SYSTEM_PROMPT)
            logger.info("Debate Judge completed: %d debate messages", len(result.get("debate_messages", [])))
            return self._normalize_debate_result(result)
        except Exception as e:
            logger.error(f"Debate Judge failed: {e}")
            return self._get_fallback_debate_result()

    def _calculate_scores(self, ats: dict, gap: dict) -> dict:
        technical_match = max(0, min(30, int(ats.get("technical_match_raw", 15))))
        seniority_match = max(0, min(20, 20 - int(gap.get("seniority_risk_raw", 10))))
        experience_proof = max(0, min(20, 20 - int(gap.get("experience_risk_raw", 10))))
        ats_keywords = max(0, min(15, int(ats.get("ats_score_raw", 7))))
        logistics = max(0, min(10, 10 - int(gap.get("logistics_risk_raw", 5))))
        cv_clarity = max(0, min(5, int(ats.get("clarity_raw", 2))))

        total = technical_match + seniority_match + experience_proof + ats_keywords + logistics + cv_clarity
        final_percentage = max(0, min(100, total))

        return {
            "technical_match": technical_match,
            "seniority_match": seniority_match,
            "experience_proof": experience_proof,
            "ats_keywords": ats_keywords,
            "logistics": logistics,
            "cv_clarity": cv_clarity,
            "final_percentage": final_percentage,
        }

    def _get_classification(self, percentage: int) -> str:
        if percentage >= 90:
            return "Excelente"
        elif percentage >= 80:
            return "Muito Boa"
        elif percentage >= 65:
            return "Boa"
        elif percentage >= 50:
            return "Media"
        elif percentage >= 30:
            return "Baixa"
        return "Muito Baixa"

    def _build_final_result(
        self, ats: dict, gap: dict, debate: dict, scores: dict
    ) -> dict:
        percentage = scores["final_percentage"]
        classification = self._get_classification(percentage)

        confidence = "alta"
        if percentage < 30 or percentage > 90:
            confidence = "media"

        disclaimer = (
            f"Esta e uma estimativa baseada nas informacoes fornecidas. "
            f"A precisao e {confidence} - "
            f"{'poucas informacoes foram fornecidas, resultando em menor precisao.' if confidence == 'media' else 'o curriculo e a vaga foram analisados em detalhe.'} "
            f"Nao e garantia de contratacao. Resultados reais podem variar dependendo do processo seletivo, "
            f"entrevista presencial, cultura da empresa e outros fatores subjetivos."
        )

        return {
            "percentage": percentage,
            "classification": classification,
            "summary": debate.get("summary", "Analise concluida."),
            "strengths": debate.get("strengths", []),
            "gaps": [g.get("description", str(g)) if isinstance(g, dict) else str(g) for g in gap.get("gaps", [])],
            "objections": [o.get("objection", str(o)) if isinstance(o, dict) else str(o) for o in gap.get("objections", [])],
            "recommendations": debate.get("recommendations", []),
            "keywords_to_add": debate.get("keywords_to_add", []),
            "recruiter_message": debate.get("recruiter_message", ""),
            "disclaimer": disclaimer,
        }

    def run_debate_stream(
        self, cv_text: str, job_description: str, extra_info: dict
    ) -> Generator[dict, None, None]:
        logger.info("Debate stream started: cv=%d chars, job=%d chars", len(cv_text), len(job_description))
        context = self._search_user_context(cv_text, job_description)

        yield {"type": "stage", "data": {"id": "reading_cv", "label": "Lendo curriculo", "agent": "ATS Specialist", "message": "Analisando a estrutura do curriculo e extraindo informacoes-chave..."}}

        ats_result = self._run_ats_specialist(cv_text, job_description, context)
        yield {"type": "stage", "data": {"id": "ats_analysis", "label": "Analisando compatibilidade ATS", "agent": "ATS Specialist", "message": ats_result["analysis"]}}
        yield {"type": "score_update", "data": {"ats_score": ats_result["ats_score_raw"], "technical_match": ats_result["technical_match_raw"]}}

        yield {"type": "stage", "data": {"id": "comparing_keywords", "label": "Comparando palavras-chave", "agent": "ATS Specialist", "message": f"Encontradas {len(ats_result.get('keywords_found', []))} palavras-chave relevantes. Identificadas {len(ats_result.get('keywords_missing', []))} palavras-chave ausentes."}}

        yield {"type": "stage", "data": {"id": "finding_gaps", "label": "Encontrando gaps e riscos", "agent": "Gap & Objection Specialist", "message": "Investigando possiveis gaps, objecoes e riscos para a candidatura..."}}

        gap_result = self._run_gap_specialist(cv_text, job_description, extra_info, context)
        yield {"type": "stage", "data": {"id": "gap_analysis", "label": "Gaps identificados", "agent": "Gap & Objection Specialist", "message": gap_result["analysis"]}}
        yield {"type": "score_update", "data": {"gap_risk": gap_result.get("seniority_risk_raw", 10) + gap_result.get("experience_risk_raw", 10)}}

        yield {"type": "stage", "data": {"id": "debate", "label": "Debate entre especialistas", "agent": "Debate Judge", "message": "Iniciando debate entre os especialistas..."}}

        debate_result = self._run_debate_judge(ats_result, gap_result, cv_text, job_description)
        for msg in debate_result.get("debate_messages", []):
            yield {"type": "debate_message", "data": msg}

        yield {"type": "stage", "data": {"id": "calculating", "label": "Calculando probabilidade final", "agent": "Debate Judge", "message": "Consolidando analises e calculando a probabilidade de aprovacao..."}}

        scores = self._calculate_scores(ats_result, gap_result)
        logger.info("Debate scores calculated: final=%d%%", scores["final_percentage"])
        yield {"type": "scores", "data": scores}

        final_result = self._build_final_result(ats_result, gap_result, debate_result, scores)
        logger.info("Debate completed: %s (%d%%)", final_result["classification"], final_result["percentage"])
        yield {"type": "complete", "data": final_result}

    def _normalize_ats_result(self, data: dict) -> dict:
        return {
            "analysis": str(data.get("analysis", "")).strip(),
            "keywords_found": [str(k).strip() for k in (data.get("keywords_found", []) or []) if str(k).strip()][:20],
            "keywords_missing": [str(k).strip() for k in (data.get("keywords_missing", []) or []) if str(k).strip()][:20],
            "ats_score_raw": max(0, min(15, int(data.get("ats_score_raw", 7)))),
            "technical_match_raw": max(0, min(30, int(data.get("technical_match_raw", 15)))),
            "clarity_raw": max(0, min(5, int(data.get("clarity_raw", 2)))),
        }

    def _normalize_gap_result(self, data: dict) -> dict:
        gaps = []
        for g in (data.get("gaps", []) or [])[:10]:
            if isinstance(g, dict):
                gaps.append({
                    "description": str(g.get("description", "")).strip(),
                    "severity": str(g.get("severity", "medio")).strip(),
                    "impact": str(g.get("impact", "")).strip(),
                })
            elif isinstance(g, str) and g.strip():
                gaps.append({"description": g.strip(), "severity": "medio", "impact": ""})

        objections = []
        for o in (data.get("objections", []) or [])[:10]:
            if isinstance(o, dict):
                objections.append({
                    "objection": str(o.get("objection", "")).strip(),
                    "likelihood": str(o.get("likelihood", "media")).strip(),
                })
            elif isinstance(o, str) and o.strip():
                objections.append({"objection": o.strip(), "likelihood": "media"})

        return {
            "analysis": str(data.get("analysis", "")).strip(),
            "gaps": gaps,
            "objections": objections,
            "seniority_risk_raw": max(0, min(20, int(data.get("seniority_risk_raw", 10)))),
            "experience_risk_raw": max(0, min(20, int(data.get("experience_risk_raw", 10)))),
            "logistics_risk_raw": max(0, min(10, int(data.get("logistics_risk_raw", 5)))),
        }

    def _normalize_debate_result(self, data: dict) -> dict:
        messages = []
        for m in (data.get("debate_messages", []) or [])[:10]:
            if isinstance(m, dict):
                agent = str(m.get("agent", "")).strip()
                msg = str(m.get("message", "")).strip()
                if agent and msg:
                    messages.append({"agent": agent, "message": msg})

        return {
            "debate_messages": messages,
            "summary": str(data.get("summary", "")).strip(),
            "strengths": [str(s).strip() for s in (data.get("strengths", []) or []) if str(s).strip()][:10],
            "recommendations": [str(r).strip() for r in (data.get("recommendations", []) or []) if str(r).strip()][:10],
            "keywords_to_add": [str(k).strip() for k in (data.get("keywords_to_add", []) or []) if str(k).strip()][:20],
            "recruiter_message": str(data.get("recruiter_message", "")).strip(),
        }

    def _get_fallback_ats_result(self) -> dict:
        return {
            "analysis": "Nao foi possivel realizar a analise ATS completa devido a limitacoes tecnicas. A avaliacao abaixo e uma estimativa baseada nos dados disponiveis.",
            "keywords_found": [],
            "keywords_missing": [],
            "ats_score_raw": 5,
            "technical_match_raw": 15,
            "clarity_raw": 2,
        }

    def _get_fallback_gap_result(self) -> dict:
        return {
            "analysis": "Nao foi possivel realizar a analise de gaps completa. A avaliacao abaixo e uma estimativa conservadora.",
            "gaps": [{"description": "Analise limitada - revise manualmente", "severity": "medio", "impact": "Nao foi possivel identificar gaps automaticamente"}],
            "objections": [],
            "seniority_risk_raw": 10,
            "experience_risk_raw": 10,
            "logistics_risk_raw": 5,
        }

    def _get_fallback_debate_result(self) -> dict:
        return {
            "debate_messages": [
                {"agent": "ATS Specialist", "message": "A analise automatizada nao pôde ser concluida completamente."},
                {"agent": "Gap & Objection Specialist", "message": "Recomendo uma revisao manual do curriculo para esta vaga."},
                {"agent": "Debate Judge", "message": "A probabilidade estimada e baseada em dados limitados. Revise as recomendacoes acima."},
            ],
            "summary": "A analise foi concluida com dados limitados. Recomenda-se revisao manual.",
            "strengths": ["Curriculo foi processado com sucesso"],
            "recommendations": ["Revise o curriculo manualmente para esta vaga especifica", "Adicione mais detalhes sobre experiencia relevante"],
            "keywords_to_add": [],
            "recruiter_message": "Tenho interesse nesta oportunidade e acredito que meu perfil pode contribuir com a equipe.",
        }


debate_orchestrator = DebateOrchestrator()
