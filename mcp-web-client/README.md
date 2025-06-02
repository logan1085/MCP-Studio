# MCP Web Client

A **secure, user-friendly** web-based Model Context Protocol (MCP) client that connects to Airtable through the real MCP protocol. Users provide their own API keys for maximum security and privacy.

## 🎯 What This Is

This is a **working example of MCP (Model Context Protocol)** - Anthropic's "USB-C for AI" that standardizes how AI models connect to external tools and services.

### Architecture

```
User → Next.js Web UI → User's API Keys → OpenAI GPT-4 + MCP Client → airtable-mcp-server → User's Airtable
```

## 🔒 Security Features

- **🛡️ User-Provided API Keys**: Each user provides their own OpenAI and Airtable keys
- **🏠 Local Storage**: Keys stored locally in browser only (never on server)
- **🔐 Private Data**: Users only access their own Airtable data
- **💰 Cost Control**: Users control their own API usage and costs
- **🌍 Scalable**: Ready for public deployment without security concerns

## 🚀 Features

- **Real MCP Protocol**: Uses official `@modelcontextprotocol/sdk`
- **Airtable Integration**: Connect to your real Airtable bases
- **13 MCP Tools**: list_bases, create_record, list_tables, etc.
- **GPT-4 Powered**: Natural language interface to your data
- **Modern Web Interface**: Clean, responsive chat UI
- **API Key Management**: Built-in settings modal with validation

## 🔧 Local Development

1. **Clone and Install**:
   ```bash
   git clone <your-repo>
   cd mcp-web-client
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Open**: http://localhost:3000

4. **Configure API Keys** (in the web interface):
   - Click ⚙️ Settings button
   - Enter your OpenAI API Key: https://platform.openai.com/api-keys
   - Enter your Airtable Personal Access Token: https://airtable.com/developers/web/guides/personal-access-tokens
   - Click "Save & Validate Keys"

## 🌐 Public Deployment

This app is **ready for public deployment**! Users provide their own API keys, so there are no security concerns.

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **No Environment Variables Needed**: The app uses user-provided keys only

### Deploy to Other Platforms

The app works on any Node.js hosting platform:
- **Netlify**: `npm run build` then deploy `out/` folder
- **Railway**: Connect GitHub repo and deploy
- **Render**: Connect repo with build command `npm run build`
- **DigitalOcean App Platform**: One-click deploy from GitHub

## 💬 Example Usage

Once you've configured your API keys:

- "What bases do I have?"
- "Show me tables in my Personal CRM"
- "Create a new contact with name John Smith"
- "List all records in my customers table"
- "Add a task: Call prospect tomorrow"

## 🏗️ How MCP Works

1. **MCP Client** (this app): Speaks standard MCP protocol
2. **MCP Server** (`airtable-mcp-server`): Translates MCP → Airtable API  
3. **Benefits**: Same client can work with any MCP server (Gmail, GitHub, Slack, etc.)

## 📁 Project Structure

```
mcp-web-client/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Main chat interface with settings
│   │   └── api/
│   │       ├── chat/route.ts        # Chat API with user keys
│   │       └── validate-keys/route.ts # API key validation
│   └── components/                  # React components
├── package.json
└── README.md
```

## 🎨 Key Benefits for Users

- **Privacy**: Your data never touches our servers
- **Cost Control**: You pay OpenAI/Airtable directly 
- **No Limits**: No shared rate limits or quotas
- **Full Access**: Use all your Airtable bases and tables
- **Always Works**: No server downtime affects you

## 🔑 API Key Requirements

### OpenAI API Key
- Go to: https://platform.openai.com/api-keys
- Create new key with GPT-4 access
- Billing account required

### Airtable Personal Access Token  
- Go to: https://airtable.com/developers/web/guides/personal-access-tokens
- Create token with:
  - `data.records:read` scope
  - `data.records:write` scope  
  - `schema.bases:read` scope
- Access to your bases

---

**This demonstrates real MCP in action** - a standardized, secure protocol for AI tool integration! 🎉
