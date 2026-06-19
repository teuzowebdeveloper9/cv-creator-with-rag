# Conectar Claude Code a ferramentas via MCP

O Claude Code pode se conectar a centenas de ferramentas e fontes de dados externas através do Model Context Protocol (MCP), um padrão de código aberto para integrações de IA com ferramentas. Os servidores MCP dão ao Claude Code acesso às suas ferramentas, bancos de dados e APIs.

## O que você pode fazer com MCP

Com servidores MCP conectados, você pode pedir ao Claude Code para:

- Implementar recursos de rastreadores de problemas
- Analisar dados de monitoramento
- Consultar bancos de dados
- Integrar designs
- Automatizar fluxos de trabalho
- Reagir a eventos externos

## Encontre e crie servidores MCP

- [Diretório Anthropic](https://claude.ai/directory): Conectores revisados
- [Guia do servidor MCP](https://modelcontextprotocol.io/docs/develop/build-server): Fundamentos do protocolo
- [Documentação de construção de conectores Claude](https://claude.com/docs/connectors/building): Autenticação, testes e envio

### Plugin oficial mcp-server-dev

```
/plugin install mcp-server-dev@claude-plugins-official
```

Se necessário:
```
/plugin marketplace add anthropics/claude-plugins-official
```

Execute a skill de construção:
```
/mcp-server-dev:build-mcp-server
```

## Instalando servidores MCP

### Opção 1: Servidor HTTP remoto (recomendado)

```bash
# Sintaxe básica
claude mcp add --transport http <name> <url>

# Exemplo: Conectar ao Notion
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Exemplo com token Bearer
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

O campo `type` aceita `streamable-http` como alias para `http`.

### Opção 2: Servidor SSE remoto (descontinuado)

```bash
# Sintaxe básica
claude mcp add --transport sse <name> <url>

# Exemplo: Conectar ao Asana
claude mcp add --transport sse asana https://mcp.asana.com/sse
```

### Opção 3: Servidor stdio local

```bash
# Sintaxe básica
claude mcp add [options] <name> -- <command> [args...]

# Exemplo: Adicionar servidor Airtable
claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable \
  -- npx -y airtable-mcp-server
```

**Importante**: Use `--` para separar argumentos do servidor das opções do Claude.

### Opção 4: Servidor WebSocket remoto

```bash
claude mcp add-json events-server \
  '{"type":"ws","url":"wss://mcp.example.com/socket","headers":{"Authorization":"Bearer YOUR_TOKEN"}}'
```

## Gerenciando servidores

```bash
# Listar todos os servidores
claude mcp list

# Detalhes de um servidor
claude mcp get github

# Remover um servidor
claude mcp remove github

# Dentro do Claude Code - verificar status
/mcp
```

## Escopos de instalação

| Escopo | Carrega em | Compartilhado | Armazenado em |
|--------|-----------|---------------|---------------|
| Local (padrão) | Projeto atual | Não | `~/.claude.json` |
| Projeto | Projeto atual | Sim (controle de versão) | `.mcp.json` na raiz |
| Usuário | Todos os projetos | Não | `~/.claude.json` |

```bash
# Escopo local (padrão)
claude mcp add --transport http stripe https://mcp.stripe.com

# Escopo de projeto
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp

# Escopo de usuário
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

## Exemplos práticos

### Monitorar erros com Sentry

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

Autentique com `/mcp` dentro do Claude Code.

### GitHub para revisões de código

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"
```

### Consultar PostgreSQL

```bash
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@prod.db.com:5432/analytics"
```

## Autenticação com servidores remotos

Claude Code suporta OAuth 2.0 para conexões seguras.

### Porta de callback OAuth fixa

```bash
claude mcp add --transport http \
  --callback-port 8080 \
  my-server https://mcp.example.com/mcp
```

### Credenciais OAuth pré-configuradas

```bash
claude mcp add --transport http \
  --client-id your-client-id --client-secret --callback-port 8080 \
  my-server https://mcp.example.com/mcp
```

### Headers dinâmicos para autenticação personalizada

```json
{
  "mcpServers": {
    "internal-api": {
      "type": "http",
      "url": "https://mcp.internal.example.com",
      "headersHelper": "/opt/bin/get-mcp-auth-headers.sh"
    }
  }
}
```

## Adicionar servidores de JSON

```bash
claude mcp add-json weather-api '{"type":"http","url":"https://api.weather.com/mcp","headers":{"Authorization":"Bearer token"}}'
```

## Importar do Claude Desktop

```bash
claude mcp add-from-claude-desktop
```

## Usar Claude Code como servidor MCP

```bash
# Inicie como servidor MCP stdio
claude mcp serve
```

Configuração no Claude Desktop:
```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

## Limites de saída MCP

- Limite de aviso: 10.000 tokens
- Limite padrão: 25.000 tokens
- Ajuste: `export MAX_MCP_OUTPUT_TOKENS=50000`

## Tool Search (Escala)

Ativado por padrão. Ferramentas MCP são adiadas e descobertas sob demanda.

```bash
# Limite personalizado de 5%
ENABLE_TOOL_SEARCH=auto:5 claude

# Desabilitar pesquisa de ferramentas
ENABLE_TOOL_SEARCH=false claude
```

### Isentar servidor de adiamento

```json
{
  "mcpServers": {
    "core-tools": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "alwaysLoad": true
    }
  }
}
```

## Uso de prompts MCP como comandos

```
/mcp__github__list_prs
/mcp__github__pr_review 456
/mcp__jira__create_issue "Bug no fluxo de login" high
```

## Referência de recursos MCP

Use `@` no prompt para ver recursos disponíveis:

```
Analise @github:issue://123 e sugira uma correção?
```

```
Compare @postgres:schema://users com @docs:file://database/user-model
```

## Configuração MCP gerenciada

Para organizações que precisam de controle centralizado, consulte [Configuração MCP gerenciada](/pt/managed-mcp).
