// Export utilities for analysis results

import type { AnalysisResult } from './analyzer';

/**
 * Convert analysis results to formatted JSON string
 */
export function exportToJSON(results: AnalysisResult): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Trigger download of analysis results as JSON file
 */
export function downloadJSON(results: AnalysisResult, filename: string = 'analysis-results.json') {
  const jsonString = exportToJSON(results);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Generate human-readable summary text
 */
export function generateSummaryText(results: AnalysisResult): string {
  const { metadata, inconsistencies } = results;

  // Count by severity
  const severityCounts = inconsistencies.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by type
  const typeCounts = inconsistencies.reduce((acc, inc) => {
    acc[inc.type] = (acc[inc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = `
Documentation Consistency Analysis Report
==========================================

Analysis Date: ${new Date(metadata.analyzedAt).toLocaleString()}

Files Scanned:
- Total files: ${metadata.totalFiles}
- Markdown files: ${metadata.totalMarkdownFiles}
- Links checked: ${metadata.totalLinks}

Issues Found: ${inconsistencies.length}
- High severity: ${severityCounts.high || 0}
- Medium severity: ${severityCounts.medium || 0}
- Low severity: ${severityCounts.low || 0}

Issue Breakdown:
${Object.entries(typeCounts).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

Detailed Issues:
${inconsistencies.map((issue, index) => `
${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}
   File: ${issue.location.filePath}:${issue.location.lineNumber || '?'}
   ${issue.context ? `Context: ${issue.context}` : ''}
   ${issue.suggestion ? `Suggestion: ${issue.suggestion}` : ''}
`).join('\n')}
`.trim();

  return summary;
}

/**
 * Copy summary text to clipboard
 */
export async function copySummaryToClipboard(results: AnalysisResult): Promise<void> {
  const summaryText = generateSummaryText(results);
  await navigator.clipboard.writeText(summaryText);
}
