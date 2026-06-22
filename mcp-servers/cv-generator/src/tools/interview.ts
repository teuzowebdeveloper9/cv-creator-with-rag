import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sessionFetch } from "../client.js";
import {
  successResult,
  errorResult,
  handleError,
  type MCPToolResult,
} from "../utils.js";

export function registerInterviewTools(server: McpServer): void {
  server.tool(
    "cv_start_interview",
    "Iniciar uma entrevista técnica simulada. Retorna a primeira pergunta.",
    {
      job_role: z.string().describe("Cargo alvo (ex: 'Desenvolvedor Full Stack')"),
      tech_stack: z
        .string()
        .optional()
        .describe("Stack tecnológica (ex: 'React, Node, PostgreSQL')"),
      job_description: z
        .string()
        .optional()
        .describe("Descrição completa da vaga"),
    },
    async ({ job_role, tech_stack, job_description }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/interview/start/", {
          job_role,
          tech_stack: tech_stack ?? "",
          job_description: job_description ?? "",
        });
        const data = await resp.json();
        if (!resp.ok)
          return errorResult(
            `Falha ao iniciar entrevista: ${data.error ?? resp.statusText}`,
            data,
          );

        const interview = data.interview;
        const firstQuestion = interview?.questions?.[0];
        return successResult({
          interview_id: interview?.id,
          total_questions: interview?.total_questions,
          first_question: firstQuestion
            ? { question_id: firstQuestion.id, text: firstQuestion.question_text }
            : null,
          conversation: data.conversation,
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_answer_question",
    "Enviar resposta para uma pergunta da entrevista. Retorna avaliação com nota e feedback.",
    {
      interview_id: z.number().describe("ID da entrevista"),
      question_id: z.number().describe("ID da pergunta"),
      answer_text: z.string().describe("Resposta do candidato"),
    },
    async ({ interview_id, question_id, answer_text }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/interview/answer/", {
          interview_id,
          question_id,
          answer_text,
        });
        const data = await resp.json();
        if (!resp.ok)
          return errorResult(
            `Falha ao enviar resposta: ${data.error ?? resp.statusText}`,
            data,
          );

        return successResult({
          evaluation: data.evaluation,
          interview: data.interview
            ? {
                id: data.interview.id,
                status: data.interview.status,
                current_question: data.interview.current_question,
                average_score: data.interview.average_score,
              }
            : undefined,
          conversation: data.conversation,
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_list_interviews",
    "Listar as últimas entrevistas realizadas.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("GET", "/api/interviews/");
        const data = await resp.json();
        if (!resp.ok)
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            isError: true,
          };
        return successResult(data);
      } catch (err) {
        return handleError(err);
      }
    },
  );
}
