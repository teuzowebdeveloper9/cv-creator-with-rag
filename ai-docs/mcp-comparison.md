# Comparação: Servidores MCP - Codex vs Claude Code vs MiMo Code

## Visão Geral

| Característica | Codex (OpenAI) | Claude Code (Anthropic) | MiMo Code |
|----------------|----------------|------------------------|-----------|
| **Transportes suportados** | STDIO, HTTP Streamable | STDIO, HTTP, SSE, WebSocket | STDIO |
| **Autenticação** | Bearer Token, OAuth | Bearer Token, OAuth 2.0, Headers dinâmicos | OAuth básico |
| **Configuração** | `config.toml` | `.mcp.json`, `~/.claude.json` | `config.json` |
| **Escopos** | Projeto, Global | Local, Projeto, Usuário | Global |
| **Tool Search** | Não | Sim (padrão) | Não |
| **Servidor como MCP** | Não | Sim (`claude mcp serve`) | Não |
| **Plugins** | Sim | Sim | Não |

## Como Criar um Servidor MCP

### Padrão Comum (STDIO)

Todos os três suportam servidores STDIO que rodam como processos locais:

```bash
# Exemplo genérico
<comando-do-servidor> --arg1 value1 --arg2 value2
```

### Codex

```bash
# Adicionar via CLI
codex mcp add meu-servidor -- npx -y @exemplo/mcp-server

# Ou editar config.toml
[mcp_servers.meu-servidor]
command = "npx"
args = ["-y", "@exemplo/mcp-server"]
env = { API_KEY = "valor" }
```

### Claude Code

```bash
# Adicionar via CLI
claude mcp add --transport stdio meu-servidor -- npx -y @exemplo/mcp-server

# Ou editar .mcp.json
{
  "mcpServers": {
    "meu-servidor": {
      "command": "npx",
      "args": ["-y", "@exemplo/mcp-server"],
      "env": { "API_KEY": "valor" }
    }
  }
}
```

### MiMo Code

```bash
# Adicionar via CLI
mimo mcp add meu-servidor

# Ou editar config.json
{
  "servers": [
    {
      "name": "meu-servidor",
      "path": "./mcp-servers/meu-servidor"
    }
  ]
}
```

## Servidores HTTP Remotos

### Codex

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
```

### Claude Code

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

```json
{
  "mcpServers": {
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.com/mcp"
    }
  }
}
```

### MiMo Code

MiMo Code atualmente não suporta nativamente servidores HTTP remotos via configuração. A maioria das integrações é feita via STDIO.

## Autenticação OAuth

### Codex

```bash
codex mcp login <server-name>
```

### Claude Code

```bash
# Adicionar servidor que requer OAuth
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Autenticar dentro do Claude Code
/mcp
```

Suporta:
- OAuth 2.0 completo
- Credenciais pré-configuradas
- Porta de callback fixa
- Headers dinâmicos

### MiMo Code

```bash
mimo mcp auth <server-name>
```

## Escopos de Configuração

### Codex
- **Global**: `~/.codex/config.toml`
- **Projeto**: `.codex/config.toml` (projetos confiáveis)

### Claude Code
- **Local**: `~/.claude.json` (apenas projeto atual)
- **Projeto**: `.mcp.json` na raiz (compartilhado via git)
- **Usuário**: `~/.claude.json` (todos os projetos)

### MiMo Code
- **Global**: `config.json` na instalação

## Exemplos de Servidores Populares

| Servidor | Codex | Claude Code | MiMo Code |
|----------|-------|-------------|-----------|
| Context7 | `codex mcp add context7 -- npx -y @upstash/context7-mcp` | `claude mcp add --transport stdio context7 -- npx -y @upstash/context7-mcp` | Configuração manual |
| GitHub | Configuração manual | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer TOKEN"` | Configuração manual |
| Sentry | Configuração manual | `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` | Configuração manual |
| Playwright | Configuração manual | `claude mcp add --transport stdio playwright -- npx -y @playwright/mcp` | Configuração manual |

## Melhores Plataformas por Uso

### Para uso individual
**Recomendado**: Claude Code
- Tool Search automático
- OAuth integrado
- Suporte a múltiplos transportes

### Para equipes
**Recomendado**: Claude Code
- Escopo de projeto com `.mcp.json` versionado
- Configuração gerenciada para empresas

### Para uso local/privado
**Recomendado**: MiMo Code
- 100% local
- Integração com Ollama/LM Studio
- Sem necessidade de contas externas

### Para ecossistema OpenAI
**Recomendado**: Codex
- Integração nativa com modelos OpenAI
- Configuração simples via TOML

## Criando um Servidor MCP Universal

Para criar um servidor que funcione em todas as plataformas, use o SDK MCP padrão:

```typescript
// server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'meu-servidor-universal',
  version: '1.0.0',
});

// Registrar ferramentas
server.tool(
  'minha_ferramenta',
  'Descrição clara da ferramenta',
  { parametro: { type: 'string', description: 'Descrição do parâmetro' } },
  async ({ parametro }) => {
    // Implementação
    return { 
      content: [{ 
        type: 'text', 
        text: `Resultado: ${parametro}` 
      }] 
    };
  }
);

// Iniciar
const transport = new StdioServerTransport();
await server.connect(transport);
```

### package.json

```json
{
  "name": "meu-servidor-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "server.ts",
  "scripts": {
    "start": "node --loader ts-node/esm server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

### Uso em cada plataforma

**Codex**:
```toml
[mcp_servers.meu-servidor]
command = "node"
args = ["--loader", "ts-node/esm", "server.ts"]
```

**Claude Code**:
```json
{
  "mcpServers": {
    "meu-servidor": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "server.ts"]
    }
  }
}
```

**MiMo Code**:
```json
{
  "servers": [
    {
      "name": "meu-servidor",
      "path": "./meu-servidor"
    }
  ]
}
```

## Conclusão

- **Claude Code** tem o suporte MCP mais completo e maduro
- **Codex** é uma boa opção para quem já usa o ecossistema OpenAI
- **MiMo Code** é ideal para uso local e privado, mas com suporte MCP mais básico

Para máxima compatibilidade, crie servidores STDIO usando o SDK MCP padrão.
