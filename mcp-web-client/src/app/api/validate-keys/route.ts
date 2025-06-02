import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json();

    if (!apiKeys || !apiKeys.openaiKey || !apiKeys.airtableKey) {
      return NextResponse.json({ error: 'Both OpenAI and Airtable API keys are required' }, { status: 400 });
    }

    // Test OpenAI API Key
    try {
      const openai = new OpenAI({
        apiKey: apiKeys.openaiKey,
      });

      // Make a simple test request to validate the key
      await openai.models.list();
      console.log('✅ OpenAI API key is valid');
    } catch (error) {
      console.error('❌ OpenAI API key validation failed:', error);
      return NextResponse.json({ 
        error: 'Invalid OpenAI API key. Please check your key and try again.' 
      }, { status: 401 });
    }

    // Test Airtable API Key (we'll do this via MCP in a simple way)
    try {
      // Create a test MCP client to validate Airtable connection
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['airtable-mcp-server'],
        env: {
          ...process.env,
          AIRTABLE_API_KEY: apiKeys.airtableKey,
          NODE_ENV: 'production',
        },
      });

      const mcpClient = new Client({
        name: 'mcp-web-client-validator',
        version: '1.0.0',
      }, {
        capabilities: {}
      });

      await mcpClient.connect(transport);
      
      // Try to list bases to validate the key
      const result = await mcpClient.callTool({
        name: 'list_bases',
        arguments: {}
      });

      // Close the connection
      await mcpClient.close();
      
      console.log('✅ Airtable API key is valid');
    } catch (error) {
      console.error('❌ Airtable API key validation failed:', error);
      return NextResponse.json({ 
        error: 'Invalid Airtable API key or connection failed. Please check your Personal Access Token and try again.' 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Both API keys are valid and working!' 
    });

  } catch (error) {
    console.error('Key validation error:', error);
    return NextResponse.json({ 
      error: 'Validation failed. Please try again.' 
    }, { status: 500 });
  }
} 