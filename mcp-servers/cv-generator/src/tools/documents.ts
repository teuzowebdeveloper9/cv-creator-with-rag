import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sessionFetchMultipart } from "../client.js";
import { successResult, handleError, type MCPToolResult } from "../utils.js";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export function registerDocumentTools(server: McpServer): void {
  server.tool(
    "cv_upload_documents",
    "Enviar documentos PDF/HTML para processamento RAG. Os documentos são indexados no vector store para geração de CV.",
    {
      file_paths: z
        .array(z.string())
        .describe(
          "Caminhos locais dos arquivos para upload (PDF/HTML, máx 10MB cada)",
        ),
    },
    async ({ file_paths }): Promise<MCPToolResult> => {
      try {
        const results = [];
        for (const filePath of file_paths) {
          const fileBuffer = await readFile(filePath);
          const formData = new FormData();
          const blob = new Blob([fileBuffer]);
          formData.append("files", blob, basename(filePath));

          const resp = await sessionFetchMultipart("/api/upload/", formData);
          const data = await resp.json();
          results.push({ file: filePath, ...data });
        }
        return successResult(results);
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.tool(
    "cv_list_documents",
    "Listar todos os documentos indexados do usuário com status de processamento.",
    {},
    async (): Promise<MCPToolResult> => {
      try {
        const resp = await (await import("../client.js")).sessionFetch(
          "GET",
          "/api/documents/",
        );
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
