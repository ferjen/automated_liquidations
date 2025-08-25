'use client';

import { useState } from 'react';

interface GeminiResponse {
  response: string;
}

export default function GeminiTest() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'simple' | 'advanced' | 'chat'>('simple');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; parts: string }>>([]);
  const [advancedOptions, setAdvancedOptions] = useState({
    temperature: 0.7,
    maxOutputTokens: 2048,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const requestBody: any = { prompt, mode };
      
      if (mode === 'advanced') {
        requestBody.options = advancedOptions;
      } else if (mode === 'chat') {
        const newMessage = { role: 'user' as const, parts: prompt };
        const updatedMessages = [...chatMessages, newMessage];
        requestBody.options = { messages: updatedMessages };
        setChatMessages(updatedMessages);
      }

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data: GeminiResponse = await res.json();
      setResponse(data.response);

      if (mode === 'chat') {
        setChatMessages(prev => [...prev, { role: 'model', parts: data.response }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: Failed to get response from Gemini AI');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setResponse('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gemini AI Test</h1>
        <p className="text-gray-600">Test different modes of Gemini AI integration</p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-4 justify-center">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="simple"
            checked={mode === 'simple'}
            onChange={(e) => setMode(e.target.value as any)}
            className="text-blue-600"
          />
          Simple
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="advanced"
            checked={mode === 'advanced'}
            onChange={(e) => setMode(e.target.value as any)}
            className="text-blue-600"
          />
          Advanced
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="chat"
            checked={mode === 'chat'}
            onChange={(e) => setMode(e.target.value as any)}
            className="text-blue-600"
          />
          Chat
        </label>
      </div>

      {/* Advanced Options */}
      {mode === 'advanced' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Advanced Options</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {advancedOptions.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={advancedOptions.temperature}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens: {advancedOptions.maxOutputTokens}
              </label>
              <input
                type="range"
                min="100"
                max="4096"
                step="100"
                value={advancedOptions.maxOutputTokens}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, maxOutputTokens: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chat History */}
      {mode === 'chat' && chatMessages.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Chat History</h3>
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Chat
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  msg.role === 'user' ? 'bg-blue-100 ml-4' : 'bg-green-100 mr-4'
                }`}
              >
                <span className="font-medium">{msg.role === 'user' ? 'You:' : 'Gemini:'}</span>
                <p className="mt-1">{msg.parts}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Gemini AI anything..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Response'}
        </button>
      </form>

      {/* Response */}
      {response && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Gemini Response:</h3>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="whitespace-pre-wrap text-gray-800">{response}</p>
          </div>
        </div>
      )}
    </div>
  );
}
