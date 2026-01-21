// Web Worker for CPU-intensive analysis operations
// This worker handles markdown parsing, code parsing, and batch processing
// off the main thread to keep the UI responsive

import { parseMarkdownContent } from './markdown-parser';
import { extractExports, type ParsedCodeFile } from './code-parser';

// Worker message types
interface WorkerRequest {
  id: string;
  type: 'PARSE_MARKDOWN' | 'PARSE_CODE' | 'PARSE_BATCH';
  payload: unknown;
}

interface MarkdownPayload {
  filePath: string;
  content: string;
}

interface CodePayload {
  filePath: string;
  content: string;
}

interface BatchPayload {
  files: Array<{
    filePath: string;
    content: string;
    type: 'markdown' | 'code';
  }>;
}

interface WorkerResponse {
  id: string;
  type: string;
  payload?: unknown;
  error?: string;
}

/**
 * Parse a single code file content
 */
function parseCodeContent(content: string, filePath: string): ParsedCodeFile {
  const exports = extractExports(filePath, content);
  return {
    filePath,
    exports,
    rawContent: content,
  };
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'PARSE_MARKDOWN': {
        const { filePath, content } = payload as MarkdownPayload;
        const result = parseMarkdownContent(content, filePath);
        self.postMessage({ id, type: 'MARKDOWN_PARSED', payload: result } as WorkerResponse);
        break;
      }

      case 'PARSE_CODE': {
        const { filePath, content } = payload as CodePayload;
        const result = parseCodeContent(content, filePath);
        self.postMessage({ id, type: 'CODE_PARSED', payload: result } as WorkerResponse);
        break;
      }

      case 'PARSE_BATCH': {
        const { files } = payload as BatchPayload;
        const results = files.map((file) => {
          if (file.type === 'markdown') {
            return {
              filePath: file.filePath,
              type: 'markdown' as const,
              result: parseMarkdownContent(file.content, file.filePath),
            };
          } else {
            return {
              filePath: file.filePath,
              type: 'code' as const,
              result: parseCodeContent(file.content, file.filePath),
            };
          }
        });
        self.postMessage({ id, type: 'BATCH_COMPLETE', payload: results } as WorkerResponse);
        break;
      }

      default:
        self.postMessage({
          id,
          type: 'ERROR',
          error: `Unknown message type: ${type}`,
        } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
};

// Export for type checking (not used at runtime in worker)
export {};
