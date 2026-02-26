// Code parser for extracting exports from JavaScript/TypeScript files
// Used for documentation coverage analysis

import { BrowserFile, readFileContent } from './file-reader';

export interface CodeExport {
  name: string;
  type: 'function' | 'class' | 'type' | 'interface' | 'const' | 'variable' | 'enum';
  filePath: string;
  lineNumber?: number;
  isDefault: boolean;
  jsdoc?: string;
}

export interface ParsedCodeFile {
  filePath: string;
  exports: CodeExport[];
  rawContent: string;
}

/**
 * Extract exports from JavaScript/TypeScript code using regex patterns
 * This is a simplified parser that catches common export patterns
 */
export function extractExports(filePath: string, content: string): CodeExport[] {
  const exports: CodeExport[] = [];
  const lines = content.split('\n');

  // Track line numbers for each match
  const findLineNumber = (index: number): number => {
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline
      if (charCount > index) {
        return i + 1;
      }
    }
    return 1;
  };

  // Pattern 1: export function functionName
  const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = exportFunctionRegex.exec(content)) !== null) {
    exports.push({
      name: match[2],
      type: 'function',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: false,
    });
  }

  // Pattern 2: export default function functionName
  const exportDefaultFunctionRegex = /export\s+default\s+(async\s+)?function\s+(\w+)?/g;
  while ((match = exportDefaultFunctionRegex.exec(content)) !== null) {
    exports.push({
      name: match[2] || 'default',
      type: 'function',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: true,
    });
  }

  // Pattern 3: export class ClassName
  const exportClassRegex = /export\s+class\s+(\w+)/g;
  while ((match = exportClassRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'class',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: false,
    });
  }

  // Pattern 4: export default class ClassName
  const exportDefaultClassRegex = /export\s+default\s+class\s+(\w+)?/g;
  while ((match = exportDefaultClassRegex.exec(content)) !== null) {
    exports.push({
      name: match[1] || 'default',
      type: 'class',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: true,
    });
  }

  // Pattern 5: export const/let/var name
  const exportConstRegex = /export\s+(const|let|var)\s+(\w+)/g;
  while ((match = exportConstRegex.exec(content)) !== null) {
    exports.push({
      name: match[2],
      type: match[1] === 'const' ? 'const' : 'variable',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: false,
    });
  }

  // Pattern 6: export type TypeName (TypeScript)
  const exportTypeRegex = /export\s+type\s+(\w+)/g;
  while ((match = exportTypeRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'type',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: false,
    });
  }

  // Pattern 7: export interface InterfaceName (TypeScript)
  const exportInterfaceRegex = /export\s+interface\s+(\w+)/g;
  while ((match = exportInterfaceRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'interface',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: false,
    });
  }

  // Pattern 8: export enum EnumName (TypeScript)
  const exportEnumRegex = /export\s+enum\s+(\w+)/g;
  while ((match = exportEnumRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'enum',
      filePath,
      lineNumber: findLineNumber(match.index),
      isDefault: false,
    });
  }

  // Pattern 9: export { name1, name2 } - named exports
  const exportBracesRegex = /export\s*\{([^}]+)\}/g;
  while ((match = exportBracesRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
    for (const name of names) {
      if (name && !exports.some(e => e.name === name)) {
        exports.push({
          name,
          type: 'variable', // Could be anything, default to variable
          filePath,
          lineNumber: findLineNumber(match.index),
          isDefault: false,
        });
      }
    }
  }

  // Pattern 10: export default identifier
  const exportDefaultIdentifierRegex = /export\s+default\s+(\w+)\s*[;\n]/g;
  while ((match = exportDefaultIdentifierRegex.exec(content)) !== null) {
    // Skip if we already have this as a default export
    if (!exports.some(e => e.isDefault)) {
      exports.push({
        name: match[1],
        type: 'variable',
        filePath,
        lineNumber: findLineNumber(match.index),
        isDefault: true,
      });
    }
  }

  return exports;
}

/**
 * Parse all code files and extract exports
 */
export async function parseCodeFiles(
  files: BrowserFile[],
  onProgress?: (current: number, total: number) => void
): Promise<ParsedCodeFile[]> {
  // Filter to JS/TS files only
  const codeFiles = files.filter(f =>
    f.name.endsWith('.ts') ||
    f.name.endsWith('.tsx') ||
    f.name.endsWith('.js') ||
    f.name.endsWith('.jsx')
  );

  const parsedFiles: ParsedCodeFile[] = [];

  for (let i = 0; i < codeFiles.length; i++) {
    const file = codeFiles[i];

    try {
      const content = await readFileContent(file.handle);
      const exports = extractExports(file.path, content);

      parsedFiles.push({
        filePath: file.path,
        exports,
        rawContent: content,
      });
    } catch (err) {
      // Skip files that can't be read
      console.warn(`Could not parse ${file.path}:`, err);
    }

    onProgress?.(i + 1, codeFiles.length);
  }

  return parsedFiles;
}

/**
 * Get all unique export names from parsed code files
 */
export function getAllExportNames(parsedFiles: ParsedCodeFile[]): Map<string, CodeExport> {
  const exportMap = new Map<string, CodeExport>();

  for (const file of parsedFiles) {
    for (const exp of file.exports) {
      // Use export name as key (may overwrite if same name in multiple files)
      // We keep track of where it's defined
      if (!exportMap.has(exp.name)) {
        exportMap.set(exp.name, exp);
      }
    }
  }

  return exportMap;
}

/**
 * Parse code content directly (worker-compatible version)
 * Does not require file handles - just content string
 */
export function parseCodeContent(content: string, filePath: string): ParsedCodeFile {
  const exports = extractExports(filePath, content);
  return {
    filePath,
    exports,
    rawContent: content,
  };
}

/**
 * Batch parse multiple code files from content
 * Useful for worker batch processing
 */
export function parseCodeBatch(
  files: Array<{ filePath: string; content: string }>
): ParsedCodeFile[] {
  return files.map(({ filePath, content }) => parseCodeContent(content, filePath));
}
