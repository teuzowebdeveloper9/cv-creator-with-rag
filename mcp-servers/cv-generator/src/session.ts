export class SessionManager {
  private cookies = new Map<string, string>();
  private csrfToken = "";

  updateFromResponse(response: Response): void {
    const setCookieHeader = response.headers.get("set-cookie");
    if (!setCookieHeader) return;

    const pairs = setCookieHeader.split(/,(?=[^;]+=[^;])/);
    for (const pair of pairs) {
      const [nameValue] = pair.split(";");
      const eqIdx = nameValue.indexOf("=");
      if (eqIdx === -1) continue;
      const name = nameValue.slice(0, eqIdx).trim();
      const value = nameValue.slice(eqIdx + 1).trim();
      this.cookies.set(name, value);
    }
  }

  getCookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  getCsrfToken(): string {
    return this.csrfToken;
  }

  setCsrfToken(token: string): void {
    this.csrfToken = token;
  }

  isAuthenticated(): boolean {
    return this.cookies.has("sessionid") || this.cookies.has("csrftoken");
  }

  clear(): void {
    this.cookies.clear();
    this.csrfToken = "";
  }
}
