'use client'

import { useState, useEffect, useRef } from 'react';
import type { AnalysisResult } from '@/lib/browser/analyzer';
import {
  getApiKey,
  saveApiKey,
  clearApiKey,
  getInitialAnalysis,
  continueConversation,
  type GeminiMessage,
} from '@/lib/browser/gemini';

interface AIChatProps {
  results: AnalysisResult;
  onClose: () => void;
  isWideMode?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat({ results, onClose, isWideMode = false }: AIChatProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setShowApiKeyInput(false);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setShowApiKeyInput(false);
      setError('');
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKey('');
    setApiKeyInput('');
    setShowApiKeyInput(true);
    setMessages([]);
    setError('');
  };

  const handleGetAnalysis = async () => {
    if (!apiKey) {
      setError('Please enter your API key first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getInitialAnalysis(apiKey, results);

      setMessages([
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: 'Analyze my documentation and provide recommendations.',
          timestamp: new Date(),
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !apiKey || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      // Convert chat messages to Gemini format
      const geminiMessages: GeminiMessage[] = messages
        .concat(userMessage)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          content: msg.content,
        }));

      const response = await continueConversation(apiKey, geminiMessages, results);

      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`ai-chat-panel ${isWideMode ? 'ai-chat-wide' : ''}`}>
      <div className="ai-chat-header">
        <h3>AI Documentation Assistant</h3>
        {!isWideMode && (
          <button onClick={onClose} className="ai-chat-close">x</button>
        )}
      </div>

      {showApiKeyInput ? (
        <div className="ai-chat-api-key">
          <div className="ai-chat-intro-section">
            <p className="ai-chat-intro">
              Enter your Gemini API key to get AI-powered insights about your documentation.
              Your key is stored locally in your browser and never sent to any server except Google's API.
            </p>
            <p className="ai-chat-key-link">
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                Get a free API key from Google AI Studio
              </a>
            </p>
          </div>
          <div className="ai-chat-key-input">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your Gemini API key..."
              onKeyPress={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}>
              Save Key
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-chat-key-status">
            <span>API key saved</span>
            <button onClick={handleClearApiKey} className="ai-chat-clear-key">
              Clear Key
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="ai-chat-start">
              <p>Ready to analyze your documentation!</p>
              <button
                onClick={handleGetAnalysis}
                disabled={isLoading}
                className="ai-chat-analyze-btn"
              >
                {isLoading ? 'Analyzing...' : 'Get AI Analysis'}
              </button>
            </div>
          ) : (
            <div className="ai-chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ai-chat-message ai-chat-message-${msg.role}`}
                >
                  <div className="ai-chat-message-header">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </div>
                  <div className="ai-chat-message-content">
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i}>{line || '\u00A0'}</p>
                    ))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="ai-chat-message ai-chat-message-assistant">
                  <div className="ai-chat-message-header">AI Assistant</div>
                  <div className="ai-chat-message-content ai-chat-typing">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {messages.length > 0 && (
            <div className="ai-chat-input">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a follow-up question..."
                disabled={isLoading}
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
              >
                Send
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="ai-chat-error">
          {error}
        </div>
      )}
    </div>
  );
}
