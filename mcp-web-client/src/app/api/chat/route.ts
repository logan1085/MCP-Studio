import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ApiKeys {
  openaiKey: string;
  airtableKey: string;
}

interface ToolArguments {
  [key: string]: unknown;
}

// Custom in-process transport for connecting MCP client and server directly
class InProcessTransport {
  private clientTransport: any;
  private serverTransport: any;
  
  constructor() {
    // Create paired transports
    this.clientTransport = new InProcessClientTransport();
    this.serverTransport = new InProcessServerTransport();
    
    // Connect them bidirectionally
    this.clientTransport.setPeer(this.serverTransport);
    this.serverTransport.setPeer(this.clientTransport);
  }
  
  getClientTransport() {
    return this.clientTransport;
  }
  
  getServerTransport() {
    return this.serverTransport;
  }
}

class InProcessClientTransport {
  private peer: any;
  public onmessage?: (message: any) => void;
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public sessionId?: string;
  
  constructor() {
    this.sessionId = Math.random().toString(36).substring(7);
  }
  
  setPeer(peer: any) {
    this.peer = peer;
  }
  
  async start(): Promise<void> {
    // Nothing to do for in-process transport
  }
  
  async send(message: any): Promise<void> {
    // Forward message to server transport
    if (this.peer && this.peer.onmessage) {
      // Use setTimeout to make it async
      setTimeout(() => this.peer.onmessage(message), 0);
    }
  }
  
  async close(): Promise<void> {
    if (this.onclose) {
      this.onclose();
    }
  }
}

class InProcessServerTransport {
  private peer: any;
  public onmessage?: (message: any) => void;
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public sessionId?: string;
  
  constructor() {
    this.sessionId = Math.random().toString(36).substring(7);
  }
  
  setPeer(peer: any) {
    this.peer = peer;
  }
  
  async start(): Promise<void> {
    // Nothing to do for in-process transport
  }
  
  async send(message: any): Promise<void> {
    // Forward message to client transport
    if (this.peer && this.peer.onmessage) {
      // Use setTimeout to make it async
      setTimeout(() => this.peer.onmessage(message), 0);
    }
  }
  
  async close(): Promise<void> {
    if (this.onclose) {
      this.onclose();
    }
  }
}

// Create real MCP client connected to in-process server
async function createRealMCPClient(airtableApiKey: string) {
  try {
    // Import MCP SDK classes
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { AirtableService } = await import('airtable-mcp-server/dist/airtableService.js');
    const { AirtableMCPServer } = await import('airtable-mcp-server/dist/mcpServer.js');
    
    // Create the in-process transport
    const transport = new InProcessTransport();
    
    // Create and start the MCP server
    const airtableService = new AirtableService(airtableApiKey);
    const mcpServer = new AirtableMCPServer(airtableService);
    await mcpServer.connect(transport.getServerTransport());
    
    // Create and connect the MCP client
    const mcpClient = new Client({
      name: 'mcp-web-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    });
    
    await mcpClient.connect(transport.getClientTransport());
    
    return mcpClient;
  } catch (error) {
    console.error('Failed to create real MCP client:', error);
    throw error;
  }
}

// Function to call real MCP functions
async function callRealMCPFunction(toolName: string, arguments_: any, airtableApiKey: string) {
  let mcpClient;
  try {
    console.log(`Calling real MCP function: ${toolName}`, arguments_);
    mcpClient = await createRealMCPClient(airtableApiKey);
    
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: arguments_
    });

    console.log(`Real MCP function ${toolName} result:`, result);
    return result.content;
  } catch (error) {
    console.error(`Real MCP function ${toolName} failed:`, error);
    throw error;
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {
        console.error('Error closing MCP client:', closeError);
      }
    }
  }
}

// Function to list real MCP tools
async function listRealMCPTools(airtableApiKey: string) {
  let mcpClient;
  try {
    mcpClient = await createRealMCPClient(airtableApiKey);
    const tools = await mcpClient.listTools();
    return tools.tools;
  } catch (error) {
    console.error('Error listing real MCP tools:', error);
    throw error;
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {
        console.error('Error closing MCP client:', closeError);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKeys }: { messages: Array<{role: string; content: string}>; apiKeys: ApiKeys } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!apiKeys || !apiKeys.openaiKey || !apiKeys.airtableKey) {
      return NextResponse.json({ error: 'Both OpenAI and Airtable API keys are required' }, { status: 400 });
    }

    console.log('🔧 Using real in-process MCP with user-provided API keys...');
    
    // Create OpenAI client with user's key
    const openai = new OpenAI({
      apiKey: apiKeys.openaiKey,
    });

    // Get available MCP tools from real MCP server
    const availableTools = await listRealMCPTools(apiKeys.airtableKey);
    console.log('Available real MCP tools:', availableTools.map(t => t.name));

    // Add system message with specific instructions
    const systemMessage = {
      role: 'system' as const,
      content: `You are an AI assistant that helps users manage their Airtable data using real MCP (Model Context Protocol).

IMPORTANT INSTRUCTIONS:
- You are connected to a real MCP server running the airtable-mcp-server
- All tools use the genuine MCP protocol
- For create_record: ALWAYS include the "fields" parameter as an object
- Example: {"baseId": "appXXX", "tableId": "tblXXX", "fields": {"Name": "John", "Email": "john@example.com"}}
- Get base/table structure first if needed using list_bases and list_tables
- Be helpful and explain what you're doing

This is real MCP in action! Available tools: ${availableTools.map(t => t.name).join(', ')}`
    };

    // Convert messages to proper OpenAI format
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Send to OpenAI with available tools
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...openaiMessages],
      tools: availableTools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      })),
      tool_choice: 'auto'
    });

    const message = response.choices[0]?.message;
    
    if (!message) {
      throw new Error('No response from OpenAI');
    }

    // Check if AI wants to call tools
    if (message.tool_calls) {
      console.log('🔧 AI requested real MCP tool calls:', message.tool_calls.map(t => t.function.name));
      
      // Execute real MCP tool calls
      const toolResults = [];
      for (const toolCall of message.tool_calls) {
        try {
          const result = await callRealMCPFunction(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            apiKeys.airtableKey
          );
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          });
          
          console.log(`✅ Real MCP tool ${toolCall.function.name} executed successfully`);
        } catch (error) {
          console.error(`❌ Real MCP tool ${toolCall.function.name} failed:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
      
      // Get final response from OpenAI with tool results
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          systemMessage,
          ...openaiMessages,
          message,
          ...toolResults
        ]
      });
      
      const finalMessage = finalResponse.choices[0]?.message;
      
      return NextResponse.json({
        role: 'assistant',
        content: finalMessage?.content || 'I completed the requested MCP actions.',
        toolCalls: message.tool_calls
      });
    }
    
    // No tool calls needed, return direct response
    return NextResponse.json({
      role: 'assistant',
      content: message.content
    });
    
  } catch (error) {
    console.error('❌ Real MCP API error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({
          error: 'Invalid API key. Please check your OpenAI or Airtable API keys in Settings.'
        }, { status: 401 });
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return NextResponse.json({
          error: 'API quota exceeded or billing issue. Please check your OpenAI account.'
        }, { status: 402 });
      }
    }
    
    return NextResponse.json({
      error: 'Sorry, there was an error processing your MCP request. Please try again or check your API keys.'
    }, { status: 500 });
  }
} 