// Documentation Coverage Analyzer
// Cross-references code exports with documentation mentions

import type { Inconsistency } from '@/types';
import type { CodeExport, ParsedCodeFile } from './code-parser';

interface ParsedMarkdown {
  filePath: string;
  rawContent: string;
}

export interface CoverageResult {
  undocumentedExports: UndocumentedExport[];
  orphanedDocs: OrphanedDoc[];
  coveragePercentage: number;
  totalExports: number;
  documentedExports: number;
}

export interface UndocumentedExport {
  export: CodeExport;
  mentionedIn: string[]; // Files that mention this export (if any, but not as documentation)
}

export interface OrphanedDoc {
  mention: string;
  filePath: string;
  lineNumber: number;
  context: string;
}

/**
 * Find all mentions of an export name in documentation
 */
function findMentionsInDocs(
  exportName: string,
  parsedMarkdown: ParsedMarkdown[]
): { filePath: string; lineNumber: number; context: string }[] {
  const mentions: { filePath: string; lineNumber: number; context: string }[] = [];

  // Create regex that matches the export name as a word
  // Match in code blocks, inline code, or as plain text
  const patterns = [
    new RegExp(`\`${exportName}\``, 'g'),           // `exportName`
    new RegExp(`\\b${exportName}\\s*\\(`, 'g'),     // exportName(
    new RegExp(`\\b${exportName}\\b`, 'g'),         // exportName as word
  ];

  for (const md of parsedMarkdown) {
    const lines = md.rawContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          mentions.push({
            filePath: md.filePath,
            lineNumber: i + 1,
            context: line.trim().substring(0, 100),
          });
          break; // Only count once per line
        }
        // Reset regex lastIndex for next iteration
        pattern.lastIndex = 0;
      }
    }
  }

  return mentions;
}

/**
 * Check if an export is properly documented
 * "Properly documented" means:
 * - Mentioned in a README, docs folder, or API documentation
 * - Appears in a code block with explanation
 * - Has a dedicated section
 */
function isProperlyDocumented(
  mentions: { filePath: string; lineNumber: number; context: string }[]
): boolean {
  if (mentions.length === 0) return false;

  // Check if mentioned in documentation files
  const docPatterns = [
    /readme\.md$/i,
    /docs?\//i,
    /api/i,
    /guide/i,
    /tutorial/i,
    /reference/i,
  ];

  for (const mention of mentions) {
    for (const pattern of docPatterns) {
      if (pattern.test(mention.filePath)) {
        return true;
      }
    }
  }

  // If mentioned at least twice, consider it documented
  if (mentions.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Find references to non-existent code in documentation
 * These are potential "orphaned docs" - docs that reference code that was removed
 */
function findOrphanedDocReferences(
  parsedMarkdown: ParsedMarkdown[],
  allExportNames: Set<string>
): OrphanedDoc[] {
  const orphaned: OrphanedDoc[] = [];

  // Common patterns that suggest a function/class reference
  const codeRefPatterns = [
    /`(\w+)\(\)`/g,                    // `functionName()`
    /`(\w+)`\s+function/gi,            // `name` function
    /function\s+`(\w+)`/gi,            // function `name`
    /the\s+`(\w+)`\s+(?:function|method|class)/gi,  // the `name` function/method/class
    /call(?:ing)?\s+`(\w+)`/gi,        // calling `name`
  ];

  for (const md of parsedMarkdown) {
    const lines = md.rawContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of codeRefPatterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const refName = match[1];

          // Skip common words that might be false positives
          const skipWords = new Set([
            'function', 'class', 'type', 'interface', 'const', 'let', 'var',
            'import', 'export', 'return', 'async', 'await', 'true', 'false',
            'null', 'undefined', 'string', 'number', 'boolean', 'object',
            'array', 'map', 'set', 'promise', 'error', 'example', 'code',
          ]);

          if (skipWords.has(refName.toLowerCase())) continue;

          // Check if this looks like a function/class name (PascalCase or camelCase)
          if (!/^[A-Z]/.test(refName) && !/^[a-z][a-zA-Z0-9]*$/.test(refName)) continue;

          // If it looks like a code reference but doesn't exist in exports
          if (!allExportNames.has(refName)) {
            orphaned.push({
              mention: refName,
              filePath: md.filePath,
              lineNumber: i + 1,
              context: line.trim().substring(0, 100),
            });
          }
        }
        pattern.lastIndex = 0;
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return orphaned.filter(o => {
    const key = `${o.filePath}:${o.lineNumber}:${o.mention}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main coverage analysis function
 */
export function analyzeDocumentationCoverage(
  parsedCodeFiles: ParsedCodeFile[],
  parsedMarkdown: ParsedMarkdown[]
): CoverageResult {
  // Collect all exports
  const allExports: CodeExport[] = [];
  for (const file of parsedCodeFiles) {
    allExports.push(...file.exports);
  }

  // Build set of export names
  const allExportNames = new Set(allExports.map(e => e.name));

  // Check each export for documentation
  const undocumentedExports: UndocumentedExport[] = [];
  let documentedCount = 0;

  for (const exp of allExports) {
    // Skip internal/private exports (starting with _)
    if (exp.name.startsWith('_')) {
      continue;
    }

    // Skip very short names (likely internal)
    if (exp.name.length < 3) {
      continue;
    }

    const mentions = findMentionsInDocs(exp.name, parsedMarkdown);
    const isDocumented = isProperlyDocumented(mentions);

    if (isDocumented) {
      documentedCount++;
    } else {
      undocumentedExports.push({
        export: exp,
        mentionedIn: mentions.map(m => m.filePath),
      });
    }
  }

  // Find orphaned documentation references
  const orphanedDocs = findOrphanedDocReferences(parsedMarkdown, allExportNames);

  // Calculate coverage percentage
  const publicExports = allExports.filter(e => !e.name.startsWith('_') && e.name.length >= 3);
  const coveragePercentage = publicExports.length > 0
    ? Math.round((documentedCount / publicExports.length) * 100)
    : 100;

  return {
    undocumentedExports,
    orphanedDocs,
    coveragePercentage,
    totalExports: publicExports.length,
    documentedExports: documentedCount,
  };
}

/**
 * Convert coverage results to inconsistencies
 */
export function coverageToInconsistencies(
  coverage: CoverageResult
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  // Add undocumented exports
  for (const undoc of coverage.undocumentedExports) {
    inconsistencies.push({
      id: `cov-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'undocumented-export',
      severity: undoc.export.type === 'function' || undoc.export.type === 'class' ? 'medium' : 'low',
      confidence: 'medium',
      message: `Undocumented ${undoc.export.type}: ${undoc.export.name}`,
      location: {
        filePath: undoc.export.filePath,
        lineNumber: undoc.export.lineNumber,
      },
      context: `Exported ${undoc.export.type} "${undoc.export.name}" is not documented`,
      suggestion: `Add documentation for ${undoc.export.name} in README.md or docs/`,
    });
  }

  // Add orphaned docs
  for (const orphan of coverage.orphanedDocs) {
    inconsistencies.push({
      id: `cov-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'orphaned-doc',
      severity: 'low',
      confidence: 'medium',
      message: `Documentation references non-existent code: ${orphan.mention}`,
      location: {
        filePath: orphan.filePath,
        lineNumber: orphan.lineNumber,
      },
      context: orphan.context,
      suggestion: `Verify if "${orphan.mention}" still exists or update the documentation`,
    });
  }

  return inconsistencies;
}
