import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Function to create MCP client with user-provided API key
async function createMCPClient(airtableApiKey: string) {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['airtable-mcp-server'],
    env: {
      ...process.env,
      AIRTABLE_API_KEY: airtableApiKey,
      NODE_ENV: 'production',
    },
  });

  const mcpClient = new Client({
    name: 'mcp-web-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  await mcpClient.connect(transport);
  return mcpClient;
}

// Function to call MCP function with user's Airtable key
async function callMCPFunction(toolName: string, arguments_: any, airtableApiKey: string) {
  let mcpClient;
  try {
    console.log(`Calling MCP function: ${toolName}`, arguments_);
    mcpClient = await createMCPClient(airtableApiKey);
    
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: arguments_
    });

    console.log(`MCP function ${toolName} result:`, result);
    return result.content;
  } catch (error) {
    console.error(`MCP function ${toolName} failed:`, error);
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

// Function to list MCP tools with user's Airtable key
async function listMCPTools(airtableApiKey: string) {
  let mcpClient;
  try {
    mcpClient = await createMCPClient(airtableApiKey);
    const tools = await mcpClient.listTools();
    return tools.tools;
  } catch (error) {
    console.error('Error listing MCP tools:', error);
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
    const { messages, apiKeys } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!apiKeys || !apiKeys.openaiKey || !apiKeys.airtableKey) {
      return NextResponse.json({ error: 'Both OpenAI and Airtable API keys are required' }, { status: 400 });
    }

    console.log('🔧 Using user-provided API keys for MCP client...');
    
    // Create OpenAI client with user's key
    const openai = new OpenAI({
      apiKey: apiKeys.openaiKey,
    });

    // Get available MCP tools using user's Airtable key
    const availableTools = await listMCPTools(apiKeys.airtableKey);
    console.log('Available MCP tools:', availableTools.map(t => t.name));

    // Add system message with specific instructions for create_record
    const systemMessage = {
      role: 'system' as const,
      content: `You are an AI assistant that helps users manage their Airtable data using MCP (Model Context Protocol) tools.

IMPORTANT INSTRUCTIONS FOR create_record:
- The create_record function REQUIRES a "fields" parameter that is an object containing the field values
- ALWAYS include the "fields" parameter when calling create_record
- Example: {"baseId": "appXXX", "tableId": "tblXXX", "fields": {"Name": "John", "Email": "john@example.com"}}
- If the user says "add logan, cornell to testing" or similar, use reasonable field names like {"Name": "logan", "Email": "cornell"} or {"First Name": "logan", "Last Name": "cornell"}

When creating records:
1. First get the table structure if needed with list_tables or describe_table
2. Use appropriate field names based on the context
3. ALWAYS provide the fields parameter as an object`
    };

    // Send to OpenAI with available tools
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
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
      console.log('🔧 AI requested MCP tool calls:', message.tool_calls.map(t => t.function.name));
      
      // Execute MCP tool calls using user's Airtable key
      const toolResults = [];
      for (const toolCall of message.tool_calls) {
        try {
          const result = await callMCPFunction(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            apiKeys.airtableKey
          );
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          });
          
          console.log(`✅ MCP tool ${toolCall.function.name} executed successfully`);
        } catch (error) {
          console.error(`❌ MCP tool ${toolCall.function.name} failed:`, error);
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
          ...messages,
          message,
          ...toolResults
        ]
      });
      
      const finalMessage = finalResponse.choices[0]?.message;
      
      return NextResponse.json({
        role: 'assistant',
        content: finalMessage?.content || 'I completed the requested actions.',
        toolCalls: message.tool_calls
      });
    }
    
    // No tool calls needed, return direct response
    return NextResponse.json({
      role: 'assistant',
      content: message.content
    });
    
  } catch (error) {
    console.error('❌ Chat API error:', error);
    
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
      error: 'Sorry, there was an error processing your request. Please try again or check your API keys.'
    }, { status: 500 });
  }
} 