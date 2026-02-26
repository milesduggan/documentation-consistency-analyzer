// Gemini API client for AI-powered documentation analysis
// Client-side only - API key stored in browser sessionStorage (cleared on tab close)

import type { AnalysisResult } from './analyzer';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GeminiError {
  code: string;
  message: string;
}

/**
 * Save API key to localStorage
 */
export function saveApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  }
}

/**
 * Get API key from localStorage
 */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Clear API key from localStorage
 */
export function clearApiKey(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

/**
 * Build the system prompt with analysis context
 */
export function buildAnalysisPrompt(results: AnalysisResult): string {
  const { metadata, inconsistencies } = results;

  // Count by severity
  const highCount = inconsistencies.filter(i => i.severity === 'high').length;
  const mediumCount = inconsistencies.filter(i => i.severity === 'medium').length;
  const lowCount = inconsistencies.filter(i => i.severity === 'low').length;

  // Group issues by severity for the prompt
  const highIssues = inconsistencies
    .filter(i => i.severity === 'high')
    .slice(0, 10) // Limit to avoid token overflow
    .map(i => `- ${i.message} (${i.location.filePath}${i.location.lineNumber ? `:${i.location.lineNumber}` : ''})`)
    .join('\n');

  const mediumIssues = inconsistencies
    .filter(i => i.severity === 'medium')
    .slice(0, 10)
    .map(i => `- ${i.message} (${i.location.filePath}${i.location.lineNumber ? `:${i.location.lineNumber}` : ''})`)
    .join('\n');

  const lowIssues = inconsistencies
    .filter(i => i.severity === 'low')
    .slice(0, 10)
    .map(i => `- ${i.message} (${i.location.filePath}${i.location.lineNumber ? `:${i.location.lineNumber}` : ''})`)
    .join('\n');

  return `You are an expert documentation analyst helping developers improve their project documentation.

ANALYSIS RESULTS:
- Total files scanned: ${metadata.totalFiles}
- Markdown files: ${metadata.totalMarkdownFiles}
- Code files: ${metadata.totalCodeFiles || 0}
- Links checked: ${metadata.totalLinks}
- Documentation coverage: ${metadata.coveragePercentage !== undefined ? `${metadata.coveragePercentage}%` : 'N/A'}
- Exports found: ${metadata.totalExports || 0}
- Documented exports: ${metadata.documentedExports || 0}

ISSUES FOUND (${inconsistencies.length} total):

HIGH PRIORITY (${highCount}):
${highIssues || 'None'}

MEDIUM PRIORITY (${mediumCount}):
${mediumIssues || 'None'}

LOW PRIORITY (${lowCount}):
${lowIssues || 'None'}

Based on this analysis, please provide:
1. A brief summary of the documentation health (2-3 sentences)
2. The top 3 most important issues to fix first and why
3. Specific suggestions for fixing each high-priority issue
4. General recommendations for improving documentation quality

Be concise, practical, and actionable. Focus on helping the developer understand what to prioritize.`;
}

/**
 * Send a message to Gemini API
 */
export async function sendToGemini(
  apiKey: string,
  messages: GeminiMessage[],
  systemPrompt?: string
): Promise<string> {
  // Build the contents array for Gemini API
  const contents = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  // If there's a system prompt, prepend it as context
  if (systemPrompt) {
    contents.unshift({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'I understand. I\'ll analyze your documentation and provide helpful feedback based on these results.' }],
    });
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch((e) => {
        console.warn('Failed to parse API error response:', e);
        return {};
      });
      const errorMessage = errorData?.error?.message || response.statusText;

      if (response.status === 400) {
        throw new Error('Invalid API key. Please check your Gemini API key and try again.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 403) {
        throw new Error('API key does not have permission. Please check your API key settings.');
      } else {
        throw new Error(`API error: ${errorMessage}`);
      }
    }

    const data = await response.json();

    // Extract the response text
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response received from Gemini. Please try again.');
    }

    return responseText;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Get initial AI analysis of the results
 */
export async function getInitialAnalysis(
  apiKey: string,
  results: AnalysisResult
): Promise<string> {
  const systemPrompt = buildAnalysisPrompt(results);

  return sendToGemini(
    apiKey,
    [{ role: 'user', content: 'Please analyze my documentation and provide your recommendations.' }],
    systemPrompt
  );
}

/**
 * Continue a conversation with follow-up questions
 */
export async function continueConversation(
  apiKey: string,
  messages: GeminiMessage[],
  results: AnalysisResult
): Promise<string> {
  const systemPrompt = buildAnalysisPrompt(results);
  return sendToGemini(apiKey, messages, systemPrompt);
}
