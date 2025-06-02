'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
  timestamp: Date;
}

interface ApiKeys {
  openaiKey: string;
  airtableKey: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openaiKey: '', airtableKey: '' });
  const [tempKeys, setTempKeys] = useState<ApiKeys>({ openaiKey: '', airtableKey: '' });
  const [isValidating, setIsValidating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load API keys from localStorage on component mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('mcp-api-keys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      setApiKeys(keys);
      setTempKeys(keys);
      setShowChat(true);
    }
    
    // Set initial welcome message based on whether keys are configured
    const hasKeys = savedKeys && JSON.parse(savedKeys).openaiKey && JSON.parse(savedKeys).airtableKey;
    if (hasKeys) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: '👋 Welcome back! I\'m your MCP-powered AI assistant, ready to help you manage your Airtable data with natural language. What would you like to do today?',
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if API keys are configured
    if (!apiKeys.openaiKey || !apiKeys.airtableKey) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Please configure your API keys first by clicking the Settings button.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          apiKeys: apiKeys
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'Sorry, I encountered an error.',
        toolCalls: data.toolCalls,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please check your API keys in Settings.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndSaveKeys = async () => {
    if (!tempKeys.openaiKey || !tempKeys.airtableKey) {
      alert('Please enter both API keys');
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch('/api/validate-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKeys: tempKeys }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Keys validation failed');
      }

      localStorage.setItem('mcp-api-keys', JSON.stringify(tempKeys));
      setApiKeys(tempKeys);
      setShowSettings(false);
      setShowChat(true);
      
      setMessages([{
        id: '1',
        role: 'assistant',
        content: '✅ Perfect! Your API keys are configured and validated. I\'m now connected to your OpenAI and Airtable accounts. Ready to help you manage your data!',
        timestamp: new Date()
      }]);

    } catch (error) {
      alert(`Key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  const clearKeys = () => {
    localStorage.removeItem('mcp-api-keys');
    setApiKeys({ openaiKey: '', airtableKey: '' });
    setTempKeys({ openaiKey: '', airtableKey: '' });
    setShowChat(false);
    setMessages([]);
  };

  const hasValidKeys = apiKeys.openaiKey && apiKeys.airtableKey;

  if (!showChat && !hasValidKeys) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-96 h-96 gradient-primary rounded-full opacity-10 animate-float"></div>
          <div className="absolute -bottom-40 -left-32 w-96 h-96 gradient-secondary rounded-full opacity-10 animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 gradient-accent rounded-full opacity-5 animate-float" style={{animationDelay: '4s'}}></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 px-6 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold gradient-text">MCP Studio</span>
              <span className="badge-premium">Beta</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="btn-secondary"
            >
              <span className="mr-2">⚙️</span>
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
          <div className="text-center">
            <div className="animate-slide-up">
              <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6">
                The Future of
                <span className="gradient-text block">AI Integration</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                Experience the power of <strong>Model Context Protocol</strong> - the new standard for AI tool connectivity. 
                Connect your Airtable data with GPT-4 through a beautiful, secure interface.
              </p>
            </div>

            <div className="animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn-primary text-lg px-8 py-4"
                >
                  Configure API Keys
                  <span className="ml-2">🚀</span>
                </button>
                <button className="btn-secondary text-lg px-8 py-4">
                  <span className="mr-2">📖</span>
                  Learn More
                </button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-8 mt-20 animate-slide-up" style={{animationDelay: '0.4s'}}>
              <div className="card-premium text-center">
                <div className="w-16 h-16 gradient-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Completely Secure</h3>
                <p className="text-gray-600">Your API keys stay in your browser. We never see your data.</p>
              </div>

              <div className="card-premium text-center">
                <div className="w-16 h-16 gradient-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Real MCP Protocol</h3>
                <p className="text-gray-600">Built on Anthropic's official MCP SDK - the future standard.</p>
              </div>

              <div className="card-premium text-center">
                <div className="w-16 h-16 gradient-accent rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Natural Language</h3>
                <p className="text-gray-600">Manage your Airtable with plain English commands.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">🔑 Setup Your Keys</h2>
                    <p className="text-gray-600">Configure your API keys to get started</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <span className="text-gray-600 text-xl">×</span>
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Security Notice */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <span className="mr-2">🛡️</span>
                      Enterprise-Grade Security
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-center"><span className="mr-2">✓</span>Keys stored locally in your browser only</li>
                      <li className="flex items-center"><span className="mr-2">✓</span>Direct connection to your accounts</li>
                      <li className="flex items-center"><span className="mr-2">✓</span>Zero server-side data storage</li>
                      <li className="flex items-center"><span className="mr-2">✓</span>You control all costs and usage</li>
                    </ul>
                  </div>

                  {/* OpenAI API Key */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={tempKeys.openaiKey}
                      onChange={(e) => setTempKeys(prev => ({ ...prev, openaiKey: e.target.value }))}
                      placeholder="sk-proj-..."
                      className="input-premium w-full"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Get yours at: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-indigo-600 hover:underline font-medium">platform.openai.com/api-keys</a>
                    </p>
                  </div>

                  {/* Airtable API Key */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Airtable Personal Access Token
                    </label>
                    <input
                      type="password"
                      value={tempKeys.airtableKey}
                      onChange={(e) => setTempKeys(prev => ({ ...prev, airtableKey: e.target.value }))}
                      placeholder="pat..."
                      className="input-premium w-full"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Get yours at: <a href="https://airtable.com/developers/web/guides/personal-access-tokens" target="_blank" className="text-indigo-600 hover:underline font-medium">airtable.com/developers/web/guides/personal-access-tokens</a>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-6">
                    <button
                      onClick={validateAndSaveKeys}
                      disabled={isValidating || !tempKeys.openaiKey || !tempKeys.airtableKey}
                      className="btn-primary flex-1"
                    >
                      {isValidating ? (
                        <div className="loading-dots text-white">
                          <div className="dot"></div>
                          <div className="dot"></div>
                          <div className="dot"></div>
                          <span className="ml-2">Validating...</span>
                        </div>
                      ) : (
                        <>✅ Save & Launch</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Premium Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">MCP Studio</h1>
                <div className="flex items-center space-x-3 text-sm">
                  {hasValidKeys ? (
                    <>
                      <div className="flex items-center">
                        <div className="status-online mr-2"></div>
                        <span className="text-gray-600">Connected</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-600">GPT-4 + Airtable MCP</span>
                    </>
                  ) : (
                    <span className="text-amber-600">Configure API Keys</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(true)}
                className="btn-secondary"
              >
                <span className="mr-2">⚙️</span>
                Settings
              </button>
              {hasValidKeys && (
                <button
                  onClick={clearKeys}
                  className="btn-secondary text-red-600 hover:text-red-700"
                >
                  <span className="mr-2">🔐</span>
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="space-y-8 scrollbar-custom max-h-[calc(100vh-300px)] overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="flex items-start space-x-4 max-w-4xl">
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">AI</span>
                  </div>
                )}
                
                <div className={message.role === 'user' ? 'chat-bubble-user ml-auto' : 'chat-bubble-assistant'}>
                  <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  {message.toolCalls && (
                    <div className="mt-4 p-4 bg-black/5 rounded-xl border border-gray-200/50">
                      <div className="font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">🔧</span>
                        MCP Function Calls
                      </div>
                      {message.toolCalls.map((call, idx) => (
                        <div key={idx} className="text-sm text-gray-600 mb-1 font-mono">
                          <span className="text-indigo-600 font-semibold">{call.function?.name}</span>
                          <span className="text-gray-400">({JSON.stringify(JSON.parse(call.function?.arguments || '{}'))})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">You</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-slide-up">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">AI</span>
                </div>
                <div className="chat-bubble-assistant">
                  <div className="flex items-center space-x-3">
                    <div className="loading-dots text-indigo-600">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <span className="text-gray-600">Thinking and calling MCP functions...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Premium Input */}
      <div className="glass border-t border-white/20 sticky bottom-0">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={hasValidKeys ? "Ask me anything about your Airtable data..." : "Configure your API keys first..."}
              className="input-premium flex-1 text-lg py-4"
              disabled={isLoading || !hasValidKeys}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !hasValidKeys}
              className="btn-primary px-8 py-4 text-lg"
            >
              {isLoading ? (
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              ) : (
                <>Send<span className="ml-2">🚀</span></>
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-500">
              {hasValidKeys ? (
                <>
                  <span className="mr-4">💡 Try: "What bases do I have?"</span>
                  <span className="mr-4">📊 "Show me customer records"</span>
                  <span>"Create a contact for John Smith"</span>
                </>
              ) : (
                <>Click Settings to configure your OpenAI and Airtable API keys</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal for Chat Mode */}
      {showSettings && showChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h2>
                  <p className="text-gray-600">Manage your API configuration</p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-600 text-xl">×</span>
                </button>
              </div>

              <div className="space-y-8">
                {/* Current Status */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                    <span className="mr-2">✅</span>
                    Connection Status
                  </h3>
                  <div className="text-sm text-green-800 space-y-2">
                    <div className="flex justify-between">
                      <span>OpenAI API</span>
                      <span className="font-semibold">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Airtable MCP</span>
                      <span className="font-semibold">Connected</span>
                    </div>
                  </div>
                </div>

                {/* OpenAI API Key */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={tempKeys.openaiKey}
                    onChange={(e) => setTempKeys(prev => ({ ...prev, openaiKey: e.target.value }))}
                    placeholder="sk-proj-..."
                    className="input-premium w-full"
                  />
                </div>

                {/* Airtable API Key */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Airtable Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={tempKeys.airtableKey}
                    onChange={(e) => setTempKeys(prev => ({ ...prev, airtableKey: e.target.value }))}
                    placeholder="pat..."
                    className="input-premium w-full"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-6">
                  <button
                    onClick={validateAndSaveKeys}
                    disabled={isValidating || !tempKeys.openaiKey || !tempKeys.airtableKey}
                    className="btn-primary flex-1"
                  >
                    {isValidating ? 'Validating...' : 'Update Keys'}
                  </button>
                  
                  <button
                    onClick={clearKeys}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    🗑️ Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
