import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sessionFetch, config } from "../client.js";
import {
  successResult,
  errorResult,
  handleError,
  parseSSEStream,
  type MCPToolResult,
} from "../utils.js";
import { writeFile } from "node:fs/promises";

export function registerCVTools(server: McpServer): void {
  server.tool(
    "cv_generate",
    "Gerar um currículo personalizado via RAG. Forneça a descrição da vaga. Retorna o Markdown completo do CV.",
    {
      job_description: z
        .string()
        .describe("Descrição completa da vaga para direcionar o CV"),
      profile_data: z
        .object({
          full_name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          linkedin: z.string().optional(),
          github: z.string().optional(),
          portfolio: z.string().optional(),
          city: z.string().optional(),
          summary: z.string().optional(),
        })
        .optional()
        .describe("Dados do perfil para esta geração (opcional)"),
    },
    async ({ job_description, profile_data }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/generate/", {
          job_description,
          profile_data: profile_data ?? {},
        });

        if (!resp.ok) {
          const body = await resp.json();
          return errorResult(
            `Falha na geração do CV: ${body.error ?? resp.statusText}`,
            body,
          );
        }

        const data = await parseSSEStream(resp);
        const wordCount = data.chunk.split(/\s+/).length;

        let tip = "";
        if (wordCount < 300)
          tip = "CV curto. Considere enviar mais documentos ou refinar o perfil.";
        else if (wordCount > 900)
          tip = "CV longo. Considere usar cv_update_cv para encurtar.";
        else tip = "Tamanho adequado.";

        return successResult({
          markdown: data.chunk,
          photo_url: data.photo_url ?? null,
          word_count: wordCount,
          tip,
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_update_cv",
    "Refinar um CV existente com instrução em linguagem natural.",
    {
      current_cv: z.string().describe("Markdown do CV atual"),
      edit_instruction: z
        .string()
        .describe(
          "Instrução de edição em linguagem natural (ex: 'adicione mais detalhes na experiência X')",
        ),
      job_description: z
        .string()
        .optional()
        .describe("Descrição da vaga para referência"),
    },
    async ({ current_cv, edit_instruction, job_description }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/update-cv/", {
          current_cv,
          edit_instruction,
          job_description: job_description ?? "",
        });
        const data = await resp.json();
        if (!resp.ok)
          return errorResult(`Falha ao atualizar CV: ${data.error ?? resp.statusText}`, data);
        return successResult(data);
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_download_pdf",
    "Converter Markdown do CV em PDF. Opcionalmente salva no disco local.",
    {
      markdown: z.string().describe("Markdown do CV para converter em PDF"),
      photo_url: z
        .string()
        .optional()
        .describe("URL da foto de perfil para incluir no PDF"),
      job_description: z
        .string()
        .optional()
        .describe("Descrição da vaga para referência"),
      save_to: z
        .string()
        .optional()
        .describe("Caminho local para salvar o PDF (ex: ./meu-cv.pdf)"),
    },
    async ({ markdown, photo_url, job_description, save_to }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/download-pdf/", {
          markdown,
          photo_url: photo_url ?? "",
          job_description: job_description ?? "",
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          return errorResult(`Falha ao gerar PDF: ${body.error ?? resp.statusText}`, body);
        }

        const buffer = Buffer.from(await resp.arrayBuffer());

        if (save_to) {
          await writeFile(save_to, buffer);
          return successResult({
            file_path: save_to,
            size_bytes: buffer.length,
            message: `PDF salvo em ${save_to}`,
          });
        }

        return successResult({
          size_bytes: buffer.length,
          pdf_base64: buffer.toString("base64").slice(0, 200) + "...",
          message:
            "PDF gerado. Use save_to para salvar em disco, ou use o endpoint /api/generated-cvs/<id>/serve/ para download.",
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_list_cvs",
    "Listar todos os CVs gerados pelo usuário.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("GET", "/api/generated-cvs/");
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

  server.tool(
    "cv_delete_cv",
    "Excluir um CV gerado.",
    {
      cv_id: z.number().describe("ID do CV a ser excluído"),
    },
    async ({ cv_id }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("DELETE", `/api/generated-cvs/${cv_id}/`);
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          return errorResult(`Falha ao excluir CV`, body);
        }
        return successResult({ message: `CV ${cv_id} excluído com sucesso` });
      } catch (err) {
        return handleError(err);
      }
    },
  );
}
