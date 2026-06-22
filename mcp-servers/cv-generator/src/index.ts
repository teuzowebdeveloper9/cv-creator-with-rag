import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerCVTools } from "./tools/cv.js";
import { registerInterviewTools } from "./tools/interview.js";
import { registerSystemTools } from "./tools/system.js";

const server = new McpServer({
  name: "cv-generator",
  version: "1.0.0",
});

registerAuthTools(server);
registerProfileTools(server);
registerDocumentTools(server);
registerCVTools(server);
registerInterviewTools(server);
registerSystemTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
