import type { BackendError } from "./client.js";

export interface MCPToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function successResult(data: unknown): MCPToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(message: string, details?: unknown): MCPToolResult {
  const text = details
    ? `${message}\n\nDetails: ${JSON.stringify(details, null, 2)}`
    : message;
  return { content: [{ type: "text", text }], isError: true };
}

export function handleError(err: unknown): MCPToolResult {
  if (err && typeof err === "object" && "status" in err) {
    const e = err as BackendError;
    if (e.status === 401 || e.status === 403) {
      return errorResult(
        "Sessão expirada ou não autenticado. Chame cv_login primeiro.",
      );
    }
    return errorResult(`Erro do backend (${e.status}): ${e.message}`, e.body);
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return errorResult(
        "Timeout: o backend demorou muito para responder. Tente novamente.",
      );
    }
    return errorResult(`Erro: ${err.message}`);
  }
  return errorResult(`Erro inesperado: ${String(err)}`);
}

export async function parseSSEStream(
  response: Response,
): Promise<{ chunk: string; photo_url?: string }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  const lines = buffer.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        continue;
      }
    }
  }

  throw new Error("Nenhum dado SSE válido encontrado na resposta");
}
