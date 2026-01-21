// Export utilities for analysis results

import type { AnalysisResult } from './analyzer';
import type { DeltaSummary } from './delta';

// ============ CI/CD Export Types ============

export interface CICDThresholds {
  maxHighSeverity: number;      // Fail if HIGH issues exceed this
  maxMediumSeverity: number;    // Fail if MEDIUM issues exceed this
  maxTotalIssues: number;       // Fail if total issues exceed this
  minHealthScore: number;       // Fail if health score below this (0-100)
  failOnRegression: boolean;    // Fail if new HIGH or reintroduced issues
}

export interface CICDResult {
  // Exit code: 0 = pass, 1 = fail, 2 = error
  exitCode: 0 | 1 | 2;
  passed: boolean;
  failureReasons: string[];

  // Summary for quick parsing
  summary: {
    healthScore: number;
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    hasRegressions: boolean;
  };

  // Delta info (if available)
  delta?: {
    isFirstRun: boolean;
    previousHealthScore: number | null;
    healthChange: number;
    newIssues: number;
    resolvedIssues: number;
    reintroducedIssues: number;
  };

  // Thresholds used for evaluation
  thresholds: CICDThresholds;

  // Full analysis data
  analysis: {
    timestamp: string;
    metadata: AnalysisResult['metadata'];
    issues: Array<{
      id: string;
      type: string;
      severity: string;
      confidence: string;
      message: string;
      file: string;
      line?: number;
      column?: number;
      context?: string;
      suggestion?: string;
    }>;
  };
}

// Default thresholds (can be overridden)
export const DEFAULT_CICD_THRESHOLDS: CICDThresholds = {
  maxHighSeverity: 0,        // No HIGH severity issues allowed
  maxMediumSeverity: 10,     // Up to 10 MEDIUM
  maxTotalIssues: 50,        // Up to 50 total
  minHealthScore: 70,        // Health must be 70+
  failOnRegression: true,    // Fail on regressions
};

/**
 * Evaluate analysis results against CI/CD thresholds
 */
export function evaluateCICDThresholds(
  results: AnalysisResult,
  delta: DeltaSummary | null,
  thresholds: Partial<CICDThresholds> = {}
): CICDResult {
  const t: CICDThresholds = { ...DEFAULT_CICD_THRESHOLDS, ...thresholds };
  const failureReasons: string[] = [];

  // Count by severity
  const severityCounts = results.inconsistencies.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const highCount = severityCounts.high || 0;
  const mediumCount = severityCounts.medium || 0;
  const lowCount = severityCounts.low || 0;
  const totalIssues = results.inconsistencies.length;

  // Calculate health score (same formula as storage.ts)
  const healthScore = delta?.currentHealthScore ?? calculateSimpleHealthScore(results);

  // Check thresholds
  if (highCount > t.maxHighSeverity) {
    failureReasons.push(`HIGH severity issues (${highCount}) exceed threshold (${t.maxHighSeverity})`);
  }

  if (mediumCount > t.maxMediumSeverity) {
    failureReasons.push(`MEDIUM severity issues (${mediumCount}) exceed threshold (${t.maxMediumSeverity})`);
  }

  if (totalIssues > t.maxTotalIssues) {
    failureReasons.push(`Total issues (${totalIssues}) exceed threshold (${t.maxTotalIssues})`);
  }

  if (healthScore < t.minHealthScore) {
    failureReasons.push(`Health score (${healthScore}%) below threshold (${t.minHealthScore}%)`);
  }

  const hasRegressions = delta?.hasRegressions ?? false;
  if (t.failOnRegression && hasRegressions) {
    if (delta?.newBySeverity.high && delta.newBySeverity.high > 0) {
      failureReasons.push(`${delta.newBySeverity.high} new HIGH severity issue(s) detected`);
    }
    if (delta?.reintroducedCount && delta.reintroducedCount > 0) {
      failureReasons.push(`${delta.reintroducedCount} reintroduced issue(s) detected`);
    }
  }

  const passed = failureReasons.length === 0;

  return {
    exitCode: passed ? 0 : 1,
    passed,
    failureReasons,
    summary: {
      healthScore,
      totalIssues,
      highSeverity: highCount,
      mediumSeverity: mediumCount,
      lowSeverity: lowCount,
      hasRegressions,
    },
    delta: delta ? {
      isFirstRun: delta.isFirstRun,
      previousHealthScore: delta.previousHealthScore,
      healthChange: delta.healthDelta,
      newIssues: delta.newCount,
      resolvedIssues: delta.resolvedCount,
      reintroducedIssues: delta.reintroducedCount,
    } : undefined,
    thresholds: t,
    analysis: {
      timestamp: results.metadata.analyzedAt,
      metadata: results.metadata,
      issues: results.inconsistencies.map(issue => ({
        id: issue.id,
        type: issue.type,
        severity: issue.severity,
        confidence: issue.confidence,
        message: issue.message,
        file: issue.location.filePath,
        line: issue.location.lineNumber,
        column: issue.location.columnNumber,
        context: issue.context,
        suggestion: issue.suggestion,
      })),
    },
  };
}

/**
 * Simple health score calculation for when delta is not available
 */
function calculateSimpleHealthScore(results: AnalysisResult): number {
  const severityCounts = results.inconsistencies.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPenalty =
    (severityCounts.high || 0) * 10 +
    (severityCounts.medium || 0) * 5 +
    (severityCounts.low || 0) * 2;

  return Math.max(0, Math.min(100, 100 - totalPenalty));
}

/**
 * Export CI/CD results as JSON string
 */
export function exportCICDJSON(
  results: AnalysisResult,
  delta: DeltaSummary | null,
  thresholds?: Partial<CICDThresholds>
): string {
  const cicdResult = evaluateCICDThresholds(results, delta, thresholds);
  return JSON.stringify(cicdResult, null, 2);
}

/**
 * Trigger download of CI/CD results as JSON file
 */
export function downloadCICDJSON(
  results: AnalysisResult,
  delta: DeltaSummary | null,
  projectName: string,
  thresholds?: Partial<CICDThresholds>
) {
  const jsonString = exportCICDJSON(results, delta, thresholds);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `${projectName}-cicd-${timestamp}.json`;

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Generate a compact one-line summary for CI logs
 */
export function generateCICDSummaryLine(
  results: AnalysisResult,
  delta: DeltaSummary | null,
  thresholds?: Partial<CICDThresholds>
): string {
  const cicd = evaluateCICDThresholds(results, delta, thresholds);

  const status = cicd.passed ? 'PASSED' : 'FAILED';
  const { summary } = cicd;

  let line = `${status} | Health: ${summary.healthScore}% | Issues: ${summary.totalIssues} (${summary.highSeverity}H/${summary.mediumSeverity}M/${summary.lowSeverity}L)`;

  if (cicd.delta && !cicd.delta.isFirstRun) {
    const sign = cicd.delta.healthChange >= 0 ? '+' : '';
    line += ` | Delta: ${sign}${cicd.delta.healthChange}% (${cicd.delta.newIssues} new, ${cicd.delta.resolvedIssues} resolved)`;
  }

  return line;
}

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
