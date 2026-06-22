import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sessionFetch, session } from "../client.js";
import {
  successResult,
  errorResult,
  handleError,
  type MCPToolResult,
} from "../utils.js";

export function registerAuthTools(server: McpServer): void {
  server.tool(
    "cv_login",
    "Autenticar no CV Generator. Email e senha.",
    {
      email: z.string().describe("Email do usuário"),
      password: z.string().describe("Senha do usuário"),
    },
    async ({ email, password }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/auth/login/", {
          email,
          password,
        });
        const data = await resp.json();
        if (!resp.ok) return errorResult("Falha no login", data);
        return successResult({
          message: "Login realizado com sucesso",
          user: data.user,
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_register",
    "Registrar novo usuário no CV Generator.",
    {
      email: z.string().describe("Email do usuário"),
      password: z.string().describe("Senha do usuário"),
      full_name: z
        .string()
        .optional()
        .describe("Nome completo (opcional)"),
    },
    async ({ email, password, full_name }): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/auth/register/", {
          email,
          password,
          full_name: full_name ?? "",
        });
        const data = await resp.json();
        if (!resp.ok) return errorResult("Falha no registro", data);
        return successResult({
          message: "Registro realizado com sucesso",
          user: data.user,
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_logout",
    "Encerrar sessão no CV Generator.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("POST", "/api/auth/logout/");
        session.clear();
        if (!resp.ok) {
          const data = await resp.json();
          return errorResult("Falha ao fazer logout", data);
        }
        return successResult({ message: "Logout realizado com sucesso" });
      } catch (err) {
        session.clear();
        return successResult({ message: "Sessão encerrada" });
      }
    },
  );

  server.tool(
    "cv_session",
    "Verificar status da sessão atual.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("GET", "/api/auth/session/");
        const data = await resp.json();
        return successResult(data);
      } catch (err) {
        return handleError(err);
      }
    },
  );
}
