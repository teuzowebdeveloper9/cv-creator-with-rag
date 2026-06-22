import { config } from "./config.js";
export { config } from "./config.js";
import { SessionManager } from "./session.js";

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

const session = new SessionManager();

async function ensureCsrf(): Promise<void> {
  if (session.getCsrfToken()) return;
  const resp = await fetch(`${config.backendUrl}/api/auth/session/`, {
    headers: { Cookie: session.getCookieHeader() },
  });
  session.updateFromResponse(resp);
  const data = (await resp.json()) as { csrf_token?: string };
  if (data.csrf_token) session.setCsrfToken(data.csrf_token);
}

export async function sessionFetch(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  await ensureCsrf();

  const headers = new Headers();
  const cookie = session.getCookieHeader();
  if (cookie) headers.set("Cookie", cookie);

  const isWrite = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  if (isWrite && session.getCsrfToken()) {
    headers.set("X-CSRFToken", session.getCsrfToken());
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined && method !== "GET") {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeout);
  init.signal = controller.signal;

  try {
    const response = await fetch(`${config.backendUrl}${path}`, init);
    session.updateFromResponse(response);

    if (response.ok && isWrite) {
      const clone = response.clone();
      try {
        const data = (await clone.json()) as Record<string, unknown>;
        if (typeof data.csrf_token === "string") {
          session.setCsrfToken(data.csrf_token);
        }
      } catch {}
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sessionFetchMultipart(
  path: string,
  formData: FormData,
): Promise<Response> {
  await ensureCsrf();

  const headers = new Headers();
  const cookie = session.getCookieHeader();
  if (cookie) headers.set("Cookie", cookie);
  if (session.getCsrfToken()) {
    headers.set("X-CSRFToken", session.getCsrfToken());
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.uploadTimeout,
  );
  const init: RequestInit = {
    method: "POST",
    headers,
    body: formData,
    signal: controller.signal,
  };

  try {
    const response = await fetch(`${config.backendUrl}${path}`, init);
    session.updateFromResponse(response);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export { session };
