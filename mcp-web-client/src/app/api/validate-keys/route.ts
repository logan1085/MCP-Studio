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

    // Test Airtable API Key with direct API call (Vercel-compatible)
    try {
      // Validate Airtable key by making a direct API call to list bases
      const airtableResponse = await fetch('https://api.airtable.com/v0/meta/bases', {
        headers: {
          'Authorization': `Bearer ${apiKeys.airtableKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!airtableResponse.ok) {
        const errorData = await airtableResponse.text();
        console.error('❌ Airtable API validation failed:', airtableResponse.status, errorData);
        throw new Error(`Airtable API returned ${airtableResponse.status}`);
      }

      const airtableData = await airtableResponse.json();
      console.log('✅ Airtable API key is valid - found', airtableData.bases?.length || 0, 'bases');
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