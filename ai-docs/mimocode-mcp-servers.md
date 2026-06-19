# Servidores MCP no MiMo Code

MiMo Code (mimocode) é um engenheiro IA autônomo que suporta o Model Context Protocol (MCP) para interagir com ferramentas externas e contextos.

## Visão Geral

O MiMo Code fornece ferramentas MCP integradas que permitem ao agente IA interagir diretamente com seu sistema de fichiers, executar comandos shell e realizar tarefas autônomas.

## Comandos MCP no MiMo Code

```bash
# Gerenciar servidores MCP
mimo mcp add            # Adicionar um servidor MCP
mimo mcp list           # Listar servidores MCP e seu status
mimo mcp auth [name]    # Autenticar com servidor OAuth
mimo mcp logout [name]  # Remover credenciais OAuth
mimo mcp debug <name>   # Debugar conexão OAuth
```

## Ferramentas MCP Integradas

O MiMo Code já vem com ferramentas MCP built-in:

### Ferramentas de Arquivo
- `read_file`: Ler conteúdo de um arquivo
- `write_file`: Criar ou atualizar um arquivo
- `list_dir`: Listar arquivos em um diretório
- `delete_file`: Remover um arquivo
- `copy_file`: Copiar arquivos
- `create_directory`: Criar uma pasta

### Ferramentas de Busca
- `search_files`: Buscar padrões de texto em arquivos
- `find_files`: Encontrar arquivos por nome
- `fast_search`: Busca de alta performance usando ripgrep

### Ferramentas de Execução
- `run_command`: Executar qualquer comando shell (git, npm, etc.)

### Ferramentas de Projeto
- `create_project`: Bootstrap de novo projeto (Java, Python, React, Node, Go, C++, PHP, Rust)
- `check_environment`: Verificar versões de software instalado

## Configuração de Servidores MCP

### Arquivo de Configuração

O MiMo Code usa um arquivo `config.json` para configurar servidores MCP:

```json
{
  "servers": [
    {
      "name": "sqlite_mcp",
      "path": "./mcp-servers/sqlite"
    }
  ]
}
```

### Estrutura de um Servidor MCP

Cada servidor MCP é um diretório com sua própria implementação:

```
mcp-servers/
├── memory/
│   └── index.ts
└── sqlite/
    └── index.ts
```

## Criando um Servidor MCP para MiMo Code

### Exemplo: Servidor de Memória

```typescript
// mcp-servers/memory/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'memory-server',
  version: '1.0.0',
});

// Definir ferramentas
server.tool(
  'save_memory',
  'Salva uma informação na memória',
  { key: { type: 'string' }, value: { type: 'string' } },
  async ({ key, value }) => {
    // Lógica para salvar
    return { content: [{ type: 'text', text: `Salvo: ${key}` }] };
  }
);

// Iniciar servidor
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Exemplo: Servidor SQLite

```typescript
// mcp-servers/sqlite/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Database from 'better-sqlite3';

const server = new McpServer({
  name: 'sqlite-server',
  version: '1.0.0',
});

server.tool(
  'query',
  'Executa uma query SQL',
  { sql: { type: 'string' } },
  async ({ sql }) => {
    const db = new Database('./data.db');
    const result = db.prepare(sql).all();
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Adicionando um Servidor MCP Personalizado

### 1. Criar o diretório do servidor

```bash
mkdir -p mcp-servers/meu-servidor
```

### 2. Criar o arquivo index.ts

```typescript
// mcp-servers/meu-servidor/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'meu-servidor',
  version: '1.0.0',
});

// Registrar ferramentas
server.tool(
  'minha_ferramenta',
  'Descrição da ferramenta',
  { parametro: { type: 'string' } },
  async ({ parametro }) => {
    // Implementação
    return { content: [{ type: 'text', text: `Resultado: ${parametro}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. Configurar no config.json

```json
{
  "servers": [
    {
      "name": "meu-servidor",
      "path": "./mcp-servers/meu-servidor"
    }
  ]
}
```

### 4. Instalar dependências

```bash
cd mcp-servers/meu-servidor
npm init -y
npm install @modelcontextprotocol/sdk better-sqlite3
```

## Uso no MiMo Code

### Listar ferramentas disponíveis

```bash
mimo mcp list
```

### Exemplo de uso no chat

```
mimo chat "Leia o arquivo src/main.ts e me diga o que ele faz"
```

O MiMo Code automaticamente usará as ferramentas MCP para:
1. `read_file` para ler o arquivo
2. Analisar o conteúdo
3. Retornar a explicação

### Exemplo com múltiplas ferramentas

```
mimo chat "Crie um novo projeto React chamado 'meu-app' com TypeScript"
```

O agente usará:
1. `create_project` para bootstrap do projeto
2. `run_command` para instalar dependências
3. `write_file` para criar arquivos personalizados

## SDK do MiMo Code

Você também pode interagir programaticamente:

```typescript
import { MimocodeClient } from './src/sdk';

const client = new MimocodeClient('http://localhost:3000');

// Listar agentes
const agents = await client.getAgents();

// Executar comando
const result = await client.executeCommand('mimo chat "Olá"');

// Plan e executar
await client.planAndExecute("Criar um teste unitário para src/main.ts");
```

## Colaboração com Agentes

Múltiplos agentes podem trabalhar juntos usando MCP:

```
/plan "Construir um blog full-stack"
```

1. **Architect** projeta o banco de dados e API
2. **Coder** implementa o backend
3. **Coder** implementa o frontend
4. **Debugger** verifica se tudo funciona

## RAG (Retrieval-Augmented Generation)

O MiMo Code suporta RAG para indexar e buscar em seu projeto:

```bash
# Indexar diretório atual
/rag index .

# Fazer pergunta sobre o código
/rag query "Como funciona o fluxo de autenticação?"
```

## Melhores Práticas

1. **Nomes descritivos**: Use nomes claros para suas ferramentas
2. **Parâmetros tipados**: Defina tipos corretos para os parâmetros
3. **Tratamento de erros**: Sempre retorne mensagens de erro úteis
4. **Documentação**: Adicione descrições claras para cada ferramenta
5. **Segurança**: Valide entrada do usuário antes de executar comandos

## Referências

- [Repositório MiMo Code](https://github.com/eurocybersecurite/mimocode)
- [Documentação MCP](https://modelcontextprotocol.io)
- [SDK MCP](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
