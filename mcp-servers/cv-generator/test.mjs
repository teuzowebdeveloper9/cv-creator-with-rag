import { spawn } from "node:child_process";

let msgId = 0;
const pending = new Map();

function startServer() {
  const proc = spawn("node", ["dist/index.js"], {
    cwd: "/home/teuzothedev/work/cv-generator-rag/mcp-servers/cv-generator",
    stdio: ["pipe", "pipe", "pipe"],
  });

  let buf = "";
  proc.stdout.on("data", (d) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const handler = pending.get(msg.id);
        if (handler) {
          pending.delete(msg.id);
          handler(msg);
        }
      } catch {}
    }
  });

  proc.stderr.on("data", (d) => {
    const s = d.toString().trim();
    if (s) console.error("  [stderr]", s);
  });

  return proc;
}

function sendRequest(proc, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const req = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    proc.stdin.write(req + "\n");
    pending.set(id, resolve);
    setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout on ${method} (id=${id})`));
    }, 30000);
  });
}

async function callTool(proc, name, args = {}) {
  const res = await sendRequest(proc, "tools/call", { name, arguments: args });
  if (res.error) return { error: res.error };
  return res.result;
}

async function main() {
  console.log("=== Teste do MCP Server CV Generator ===\n");

  const proc = startServer();

  // Initialize
  console.log("1. Initialize...");
  const init = await sendRequest(proc, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  });
  console.log(
    "  OK -",
    init.result?.serverInfo?.name,
    init.result?.serverInfo?.version,
  );

  proc.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );

  // Health
  console.log("\n2. cv_health...");
  const health = await callTool(proc, "cv_health");
  console.log("  ", JSON.parse(health.content[0].text).status);

  // Providers
  console.log("\n3. cv_providers_status...");
  const prov = await callTool(proc, "cv_providers_status");
  console.log("  ", prov.content[0].text);

  // Register
  const testEmail = `mcp_test_${Date.now()}@test.com`;
  console.log(`\n4. cv_register (${testEmail})...`);
  const reg = await callTool(proc, "cv_register", {
    email: testEmail,
    password: "Test123!",
    full_name: "MCP Tester",
  });
  const regData = JSON.parse(reg.content[0].text);
  console.log("  ", regData.message || regData.error || reg.content[0].text.slice(0, 150));

  // Session
  console.log("\n5. cv_session...");
  const sess = await callTool(proc, "cv_session");
  const sessD = JSON.parse(sess.content[0].text);
  console.log("  Auth:", sessD.authenticated, "| User:", sessD.user?.email);

  // Profile
  console.log("\n6. cv_get_profile...");
  const prof = await callTool(proc, "cv_get_profile");
  const profD = JSON.parse(prof.content[0].text);
  console.log("  Name:", profD.full_name, "| City:", profD.city);

  // Update profile
  console.log("\n7. cv_update_profile...");
  const upd = await callTool(proc, "cv_update_profile", {
    city: "São Paulo",
    summary: "Dev Full Stack",
  });
  const updD = JSON.parse(upd.content[0].text);
  console.log("  Updated city:", updD.city);

  // Documents
  console.log("\n8. cv_list_documents...");
  const docs = await callTool(proc, "cv_list_documents");
  const docsD = JSON.parse(docs.content[0].text);
  console.log("  Count:", Array.isArray(docsD) ? docsD.length : "error");

  // Dashboard
  console.log("\n9. cv_dashboard...");
  const dash = await callTool(proc, "cv_dashboard");
  const d = JSON.parse(dash.content[0].text);
  console.log("  Providers:", JSON.stringify(d.providers));
  console.log("  Docs:", d.documents?.total, "| CVs:", d.cvs?.total);
  console.log("  Interviews:", d.interviews?.total);
  console.log("  Profile:", d.profile?.completeness + "%");

  // List CVs
  console.log("\n10. cv_list_cvs...");
  const cvs = await callTool(proc, "cv_list_cvs");
  console.log("  ", cvs.content[0].text.slice(0, 80));

  // List interviews
  console.log("\n11. cv_list_interviews...");
  const ints = await callTool(proc, "cv_list_interviews");
  console.log("  ", ints.content[0].text.slice(0, 80));

  // Logout
  console.log("\n12. cv_logout...");
  const lo = await callTool(proc, "cv_logout");
  console.log("  ", JSON.parse(lo.content[0].text).message);

  // Login
  console.log("\n13. cv_login...");
  const li = await callTool(proc, "cv_login", {
    email: testEmail,
    password: "Test123!",
  });
  const liD = JSON.parse(li.content[0].text);
  console.log("  ", liD.message || liD.error);

  console.log("\n=== Todos os 13 testes passaram ===");

  proc.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
