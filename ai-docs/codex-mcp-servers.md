# Model Context Protocol (MCP) no Codex

Model Context Protocol (MCP) conecta modelos a ferramentas e contexto. Use-o para dar ao Codex acesso a documentação de terceiros, ou para interagir com ferramentas de desenvolvimento como seu navegador ou Figma.

O Codex suporta servidores MCP tanto no CLI quanto na extensão IDE.

## Funcionalidades MCP suportadas

- **Servidores STDIO**: Servidores que rodam como um processo local (iniciado por um comando).
  - Variáveis de ambiente
- **Servidores HTTP Streamable**: Servidores acessíveis por endereço.
  - Autenticação por bearer token
  - Autenticação OAuth (execute `codex mcp login <server-name>` para servidores que suportam OAuth)
- **Instruções do servidor**: O Codex lê o campo `instructions` do MCP retornado durante a inicialização e usa como orientação geral do servidor junto com suas ferramentas.

## Conectar o Codex a um servidor MCP

O Codex armazena a configuração MCP no `config.toml` junto com outras configurações. Por padrão é `~/.codex/config.toml`, mas você pode escopar servidores MCP a um projeto com `.codex/config.toml` (projetos confiáveis apenas).

### Configurar com a CLI

#### Adicionar um servidor MCP

```bash
codex mcp add <server-name> --env VAR1=VALUE1 --env VAR2=VALUE2 -- <stdio server-command>
```

Exemplo - Context7 (servidor MCP gratuito para documentação de desenvolvedores):

```bash
codex mcp add context7 -- npx -y @upstash/context7-mcp
```

#### Outros comandos CLI

```bash
codex mcp --help
```

#### Terminal UI (TUI)

No TUI do `codex`, use `/mcp` para ver seus servidores MCP ativos.

### Configurar com config.toml

Para controle mais granular, edite `~/.codex/config.toml` ou `.codex/config.toml`.

#### Servidores STDIO

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["LOCAL_TOKEN"]

[mcp_servers.context7.env]
MY_ENV_VAR = "MY_ENV_VALUE"
```

Configurações disponíveis:
- `command` (obrigatório): Comando que inicia o servidor
- `args` (opcional): Argumentos para o servidor
- `env` (opcional): Variáveis de ambiente para o servidor
- `env_vars` (opcional): Variáveis de ambiente para permitir e encaminhar
- `cwd` (opcional): Diretório de trabalho para iniciar o servidor
- `experimental_environment` (opcional): Defina como `remote` para iniciar via executor remoto

`env_vars` pode conter nomes de variáveis simples ou objetos com fonte:

```toml
env_vars = ["LOCAL_TOKEN", { name = "REMOTE_TOKEN", source = "remote" }]
```

#### Servidores HTTP Streamable

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }
```

Configurações disponíveis:
- `url` (obrigatório): Endereço do servidor
- `bearer_token_env_var` (opcional): Nome da variável de ambiente para bearer token
- `http_headers` (opcional): Mapa de cabeçalhos com valores estáticos
- `env_http_headers` (opcional): Mapa de cabeçalhos para nomes de variáveis de ambiente

#### Outras opções de configuração

```toml
[mcp_servers.chrome_devtools]
url = "http://localhost:3000/mcp"
enabled_tools = ["open", "screenshot"]
disabled_tools = ["screenshot"]
default_tools_approval_mode = "prompt"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true

[mcp_servers.chrome_devtools.tools.open]
approval_mode = "approve"
```

- `startup_timeout_sec` (opcional): Timeout em segundos para iniciar. Padrão: 10
- `tool_timeout_sec` (opcional): Timeout em segundos para rodar uma ferramenta. Padrão: 60
- `enabled` (opcional): Defina `false` para desabilitar sem deletar
- `required` (opcional): Defina `true` para falhar se o servidor não inicializar
- `enabled_tools` (opcional): Lista de permitidas
- `disabled_tools` (opcional): Lista de negadas (aplicada após enabled_tools)
- `default_tools_approval_mode` (opcional): `auto`, `prompt`, ou `approve`

#### Servidores MCP fornecidos por plugins

Plugins instalados podem empacotar servidores MCP em seu manifesto. Esses servidores são iniciados pelo plugin:

```toml
[plugins."sample@test".mcp_servers.sample]
enabled = true
default_tools_approval_mode = "prompt"
enabled_tools = ["read", "search"]

[plugins."sample@test".mcp_servers.sample.tools.search]
approval_mode = "approve"
```

## Exemplos de servidores MCP úteis

- [OpenAI Docs MCP](https://developers.openai.com/learn/docs-mcp): Buscar e ler docs do OpenAI
- [Context7](https://github.com/upstash/context7): Documentação de desenvolvedor atualizada
- [Figma](https://developers.figma.com/docs/figma-mcp-server/): Acessar designs do Figma
- [Playwright](https://www.npmjs.com/package/@playwright/mcp): Controlar navegador via Playwright
- [Chrome Developer Tools](https://github.com/ChromeDevTools/chrome-devtools-mcp/): Controlar Chrome
- [Sentry](https://docs.sentry.io/product/sentry-mcp/#codex): Acessar logs do Sentry
- [GitHub](https://github.com/github/github-mcp-server): Gerenciar GitHub (PRs, issues)
