# MCP Web Client

A web-based Model Context Protocol (MCP) client that connects to Airtable through the real MCP protocol.

## 🎯 What This Is

This is a **working example of MCP (Model Context Protocol)** - Anthropic's "USB-C for AI" that standardizes how AI models connect to external tools and services.

### Architecture

```
User → Next.js Web UI → MCP Client → airtable-mcp-server → Airtable API
```

## 🚀 Features

- **Real MCP Protocol**: Uses official `@modelcontextprotocol/sdk`
- **Airtable Integration**: Connect to your real Airtable bases
- **13 MCP Tools**: list_bases, create_record, list_tables, etc.
- **GPT-4 Powered**: Natural language interface to your data
- **Web Interface**: Modern chat UI for interacting with your Airtable

## 🔧 Setup

1. **Get API Keys**:
   - Airtable Personal Access Token: https://airtable.com/developers/web/guides/personal-access-tokens
   - OpenAI API Key: https://platform.openai.com/api-keys

2. **Start the System**:
   ```bash
   cd mcp-web-client
   AIRTABLE_API_KEY=your_token OPENAI_API_KEY=your_openai_key npm run dev
   ```

3. **Open**: http://localhost:3000

## 💬 Example Usage

- "What bases do I have?"
- "Show me tables in my Personal CRM"
- "Create a new contact with name John Smith"
- "List all records in my customers table"

## 🏗️ How MCP Works

1. **MCP Client** (this app): Speaks standard MCP protocol
2. **MCP Server** (`airtable-mcp-server`): Translates MCP → Airtable API
3. **Benefits**: Same client can work with any MCP server (Gmail, GitHub, Slack, etc.)

## 📁 Structure

```
mcp-web-client/
├── src/
│   ├── app/
│   │   └── api/chat/route.ts    # Main API endpoint
│   ├── lib/
│   │   └── mcp-client.ts        # MCP protocol client
│   └── components/              # React components
├── package.json
└── README.md
```

---

**This demonstrates real MCP in action** - a standardized protocol for AI tool integration! 🎉 