import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sessionFetch } from "../client.js";
import { successResult, handleError, type MCPToolResult } from "../utils.js";

export function registerProfileTools(server: McpServer): void {
  server.tool(
    "cv_get_profile",
    "Obter dados do perfil do usuário logado.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("GET", "/api/profile/");
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
    "cv_update_profile",
    "Atualizar campos do perfil do usuário. Apenas campos fornecidos serão atualizados.",
    {
      full_name: z.string().optional().describe("Nome completo"),
      email: z.string().optional().describe("Email de contato"),
      phone: z.string().optional().describe("Telefone"),
      linkedin: z.string().optional().describe("URL do LinkedIn"),
      github: z.string().optional().describe("URL do GitHub"),
      portfolio: z.string().optional().describe("URL do portfólio"),
      city: z.string().optional().describe("Cidade/Estado"),
      summary: z.string().optional().describe("Resumo profissional"),
    },
    async (fields): Promise<MCPToolResult> => {
      try {
        const filtered = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined),
        );
        const resp = await sessionFetch("PUT", "/api/profile/", filtered);
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
