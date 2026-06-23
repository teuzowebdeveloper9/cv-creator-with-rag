import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sessionFetch } from "../client.js";
import {
  successResult,
  handleError,
  type MCPToolResult,
} from "../utils.js";

export function registerSystemTools(server: McpServer): void {
  server.tool(
    "cv_health",
    "Verificar se o backend está rodando.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("GET", "/api/health/");
        const data = await resp.json();
        return successResult(data);
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_providers_status",
    "Verificar quais provedores de LLM estão configurados e disponíveis.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await sessionFetch("GET", "/api/providers-status/");
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
    "cv_dashboard",
    "Visão geral completa: status dos providers, documentos, CVs, entrevistas e completude do perfil.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const [providersResp, docsResp, cvsResp, interviewsResp, profileResp] =
          await Promise.all([
            sessionFetch("GET", "/api/providers-status/"),
            sessionFetch("GET", "/api/documents/"),
            sessionFetch("GET", "/api/generated-cvs/"),
            sessionFetch("GET", "/api/interviews/"),
            sessionFetch("GET", "/api/profile/"),
          ]);

        const providers = await providersResp.json();
        const docs = await docsResp.json();
        const cvs = await cvsResp.json();
        const interviews = await interviewsResp.json();
        const profile = await profileResp.json();

        const profileFields = [
          "full_name",
          "email",
          "phone",
          "linkedin",
          "github",
          "portfolio",
          "city",
          "summary",
        ];
        const filled = profileFields.filter(
          (f) => profile[f] && String(profile[f]).trim(),
        );
        const missing = profileFields.filter(
          (f) => !profile[f] || !String(profile[f]).trim(),
        );

        const interviewList = Array.isArray(interviews) ? interviews : [];
        const avgScore =
          interviewList.length > 0
            ? (
                interviewList.reduce(
                  (sum: number, i: { average_score?: number }) =>
                    sum + (i.average_score ?? 0),
                  0,
                ) / interviewList.length
              ).toFixed(1)
            : null;

        return successResult({
          providers,
          documents: {
            total: Array.isArray(docs) ? docs.length : 0,
            processed: Array.isArray(docs)
              ? docs.filter(
                  (d: { status?: string }) => d.status === "SUCCESS",
                ).length
              : 0,
            failed: Array.isArray(docs)
              ? docs.filter(
                  (d: { status?: string }) => d.status === "FAILED",
                ).length
              : 0,
          },
          cvs: {
            total: Array.isArray(cvs) ? cvs.length : 0,
            latest: Array.isArray(cvs) && cvs.length > 0
              ? cvs[0].created_at
              : null,
          },
          interviews: {
            total: interviewList.length,
            completed: interviewList.filter(
              (i: { status?: string }) => i.status === "COMPLETED",
            ).length,
            in_progress: interviewList.filter(
              (i: { status?: string }) => i.status === "IN_PROGRESS",
            ).length,
            avg_score: avgScore,
          },
          profile: {
            completeness: Math.round(
              (filled.length / profileFields.length) * 100,
            ),
            filled_fields: filled,
            missing_fields: missing,
          },
        });
      } catch (err) {
        return handleError(err);
      }
    },
  );
}
