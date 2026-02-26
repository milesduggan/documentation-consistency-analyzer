// Issue fingerprinting and health score calculation
// Used for deduplication and tracking issues across analysis runs

import { sha256 } from './crypto';
import type { Inconsistency } from '@/types';
import type { AnalysisResult } from './analyzer';

/**
 * Generate a fingerprint for an issue
 * Used to identify the "same" issue across different analysis runs
 *
 * Fingerprint is based on:
 * - Issue type
 * - File path
 * - Normalized message (without line-specific details)
 */
export async function generateIssueFingerprint(issue: Inconsistency): Promise<string> {
  // Normalize the message by removing variable parts
  const normalizedMessage = normalizeMessage(issue.message);

  // Create a stable string representation
  const fingerprintSource = [
    issue.type,
    issue.location.filePath,
    normalizedMessage,
  ].join('::');

  // Hash it for a consistent, compact fingerprint
  const hash = await sha256(fingerprintSource);

  // Return first 16 chars for readability while maintaining uniqueness
  return hash.substring(0, 16);
}

/**
 * Normalize a message for fingerprinting
 * Removes line numbers, specific values, and other variable parts
 */
export function normalizeMessage(message: string): string {
  return message
    // Remove line numbers like "line 42" or "L42"
    .replace(/\bline\s*\d+/gi, 'line N')
    .replace(/\bL\d+/g, 'LN')
    // Remove column numbers
    .replace(/:\d+:\d+/g, ':N:N')
    .replace(/\bcol(umn)?\s*\d+/gi, 'col N')
    // Remove specific file paths but keep structure
    .replace(/(['"`])([^'"`]+)(['"`])/g, '$1PATH$3')
    // Remove numbers that might be counts
    .replace(/\b\d+\s+(files?|links?|issues?)/gi, 'N $1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Generate a project ID from project name and optional path
 */
export async function generateProjectId(name: string, path?: string): Promise<string> {
  const source = path ? `${name}::${path}` : name;
  const hash = await sha256(source);
  return hash.substring(0, 12);
}

/**
 * Calculate a health score (0-100) for an analysis result
 *
 * Scoring factors:
 * - Issue count and severity
 * - Documentation coverage
 * - Issue density (issues per file)
 */
export function calculateHealthScore(result: AnalysisResult): number {
  const { inconsistencies, metadata } = result;

  if (metadata.totalFiles === 0) {
    return 100; // No files = nothing wrong
  }

  let score = 100;

  // Deduct points based on issue severity
  const severityPenalties = {
    high: 10,
    medium: 5,
    low: 2,
  };

  for (const issue of inconsistencies) {
    score -= severityPenalties[issue.severity] || 2;
  }

  // Deduct points based on issue density (issues per 10 files)
  const density = (inconsistencies.length / metadata.totalFiles) * 10;
  if (density > 5) {
    score -= Math.min(20, (density - 5) * 2);
  }

  // Bonus/penalty for documentation coverage
  if (metadata.coveragePercentage !== undefined) {
    if (metadata.coveragePercentage >= 80) {
      score += 5; // Bonus for good coverage
    } else if (metadata.coveragePercentage < 50) {
      score -= 10; // Penalty for poor coverage
    }
  }

  // Ensure score stays in valid range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get a text label for a health score
 */
export function getHealthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Poor';
  return 'Critical';
}

/**
 * Get a color for a health score (for UI)
 */
export function getHealthColor(score: number): string {
  if (score >= 90) return '#3fb950'; // Green
  if (score >= 75) return '#58a6ff'; // Blue
  if (score >= 50) return '#d29922'; // Yellow
  if (score >= 25) return '#f85149'; // Red
  return '#da3633'; // Dark red
}

/**
 * Count issues by type
 */
export function countIssuesByType(issues: Inconsistency[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const issue of issues) {
    counts[issue.type] = (counts[issue.type] || 0) + 1;
  }

  return counts;
}

/**
 * Count issues by severity
 */
export function countIssuesBySeverity(issues: Inconsistency[]): Record<string, number> {
  const counts: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const issue of issues) {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  }

  return counts;
}
