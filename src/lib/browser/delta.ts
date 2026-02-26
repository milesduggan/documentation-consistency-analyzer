// Delta-First Analysis Engine
// Compares current analysis to previous run, classifies every issue,
// and produces attributable health score changes.

import { generateIssueFingerprint, generateProjectId } from './fingerprint';
import { getAnalysisHistory, getIssuesForAnalysis } from './storage';
import { STORES, getByIndex, isIndexedDBAvailable } from './db';
import { calculateHealthScore } from './fingerprint';
import type { Inconsistency, StoredIssue } from '@/types';
import type { AnalysisResult } from './analyzer';

// Severity penalty values (must match fingerprint.ts)
const SEVERITY_PENALTIES: Record<string, number> = {
  high: 10,
  medium: 5,
  low: 2,
};

export type DeltaClassification = 'new' | 'persisting' | 'resolved' | 'reintroduced' | 'ignored';

export interface IssueDelta {
  fingerprint: string;
  classification: DeltaClassification;
  severity: 'high' | 'medium' | 'low';
  issue?: Inconsistency;      // Present for current issues
  previousIssue?: StoredIssue; // Present if existed in previous run
}

export interface DeltaSummary {
  // Issue counts by classification
  newCount: number;
  persistingCount: number;
  resolvedCount: number;
  reintroducedCount: number;
  ignoredCount: number;

  // Severity breakdown for NEW issues (most actionable)
  newBySeverity: { high: number; medium: number; low: number };

  // Severity breakdown for REINTRODUCED issues
  reintroducedBySeverity: { high: number; medium: number; low: number };

  // Health score attribution
  previousHealthScore: number | null;
  currentHealthScore: number;
  healthDelta: number;
  healthAttribution: {
    fromNewIssues: number;       // Points lost to new issues (negative)
    fromResolvedIssues: number;  // Points gained from resolved (positive)
    fromSeverityMix: number;     // Remainder (density, coverage changes)
  };

  // Full issue list with classifications
  issues: IssueDelta[];

  // Quick-check flags
  hasRegressions: boolean;  // new HIGH severity or any reintroduced
  isFirstRun: boolean;
}

/**
 * Get all issues for a project that were ever marked resolved
 */
async function getEverResolvedFingerprints(projectId: string): Promise<Set<string>> {
  if (!isIndexedDBAvailable()) {
    return new Set();
  }

  const allIssues = await getByIndex<StoredIssue>(STORES.ISSUES, 'projectId', projectId);
  const resolved = new Set<string>();

  for (const issue of allIssues) {
    if (issue.status === 'resolved') {
      resolved.add(issue.fingerprint);
    }
  }

  return resolved;
}

/**
 * Get current status for a fingerprint from the most recent stored issue
 */
async function getCurrentStatusMap(projectId: string): Promise<Map<string, StoredIssue['status']>> {
  if (!isIndexedDBAvailable()) {
    return new Map();
  }

  const allIssues = await getByIndex<StoredIssue>(STORES.ISSUES, 'projectId', projectId);
  const statusMap = new Map<string, StoredIssue['status']>();

  // Keep the most recent status for each fingerprint
  for (const issue of allIssues) {
    // Issues are stored per-analysis, so later ones overwrite
    statusMap.set(issue.fingerprint, issue.status);
  }

  return statusMap;
}

/**
 * Compute delta between current analysis and previous run.
 *
 * Classification rules (evaluated in order):
 * 1. In current + status=ignored → IGNORED
 * 2. In current + not in previous + ever resolved → REINTRODUCED
 * 3. In current + not in previous → NEW
 * 4. In current + in previous → PERSISTING
 * 5. In previous + not in current → RESOLVED
 */
export async function computeDelta(
  projectName: string,
  currentResult: AnalysisResult,
  projectPath?: string
): Promise<DeltaSummary> {
  const projectId = await generateProjectId(projectName, projectPath);

  // Get the two most recent analyses (current will be index 0 after save)
  // We need the one BEFORE the current run, so we get 2 and take index 1
  const recentAnalyses = await getAnalysisHistory(projectName, 2, projectPath);

  // Previous analysis is the second one (index 1), if it exists
  const previousAnalysis = recentAnalyses.length > 1 ? recentAnalyses[1] : null;
  const isFirstRun = previousAnalysis === null;

  // Get previous run's issues (by analysisId)
  let previousIssues: StoredIssue[] = [];
  if (previousAnalysis) {
    previousIssues = await getIssuesForAnalysis(previousAnalysis.id);
  }

  // Build fingerprint sets
  const previousFingerprints = new Set<string>();
  const previousIssueMap = new Map<string, StoredIssue>();
  for (const issue of previousIssues) {
    previousFingerprints.add(issue.fingerprint);
    previousIssueMap.set(issue.fingerprint, issue);
  }

  // Get ever-resolved fingerprints for REINTRODUCED detection
  const everResolvedFingerprints = await getEverResolvedFingerprints(projectId);

  // Get current status map for IGNORED detection
  const currentStatusMap = await getCurrentStatusMap(projectId);

  // Generate fingerprints for current issues
  const currentFingerprints = new Map<string, Inconsistency>();
  for (const issue of currentResult.inconsistencies) {
    const fp = await generateIssueFingerprint(issue);
    currentFingerprints.set(fp, issue);
  }

  // Classify all issues
  const issues: IssueDelta[] = [];

  // Process current issues
  for (const [fingerprint, issue] of currentFingerprints) {
    const inPrevious = previousFingerprints.has(fingerprint);
    const currentStatus = currentStatusMap.get(fingerprint) || 'open';
    const wasEverResolved = everResolvedFingerprints.has(fingerprint);
    const severity = issue.severity as 'high' | 'medium' | 'low';

    let classification: DeltaClassification;

    if (currentStatus === 'ignored') {
      classification = 'ignored';
    } else if (!inPrevious && wasEverResolved) {
      classification = 'reintroduced';
    } else if (!inPrevious) {
      classification = 'new';
    } else {
      classification = 'persisting';
    }

    issues.push({
      fingerprint,
      classification,
      severity,
      issue,
      previousIssue: previousIssueMap.get(fingerprint),
    });
  }

  // Process resolved issues (in previous, not in current)
  for (const [fingerprint, prevIssue] of previousIssueMap) {
    if (!currentFingerprints.has(fingerprint)) {
      issues.push({
        fingerprint,
        classification: 'resolved',
        severity: prevIssue.severity as 'high' | 'medium' | 'low',
        previousIssue: prevIssue,
      });
    }
  }

  // Count by classification
  let newCount = 0;
  let persistingCount = 0;
  let resolvedCount = 0;
  let reintroducedCount = 0;
  let ignoredCount = 0;

  const newBySeverity = { high: 0, medium: 0, low: 0 };
  const reintroducedBySeverity = { high: 0, medium: 0, low: 0 };

  for (const delta of issues) {
    switch (delta.classification) {
      case 'new':
        newCount++;
        newBySeverity[delta.severity]++;
        break;
      case 'persisting':
        persistingCount++;
        break;
      case 'resolved':
        resolvedCount++;
        break;
      case 'reintroduced':
        reintroducedCount++;
        reintroducedBySeverity[delta.severity]++;
        break;
      case 'ignored':
        ignoredCount++;
        break;
    }
  }

  // Calculate health scores
  const currentHealthScore = calculateHealthScore(currentResult);
  const previousHealthScore = previousAnalysis?.healthScore ?? null;
  const healthDelta = previousHealthScore !== null
    ? currentHealthScore - previousHealthScore
    : 0;

  // Calculate health attribution (deterministic)
  // Points lost to new issues
  let fromNewIssues = 0;
  for (const delta of issues) {
    if (delta.classification === 'new' || delta.classification === 'reintroduced') {
      fromNewIssues -= SEVERITY_PENALTIES[delta.severity] || 2;
    }
  }

  // Points gained from resolved issues
  let fromResolvedIssues = 0;
  for (const delta of issues) {
    if (delta.classification === 'resolved') {
      fromResolvedIssues += SEVERITY_PENALTIES[delta.severity] || 2;
    }
  }

  // Remainder goes to severity mix (density changes, coverage changes, etc.)
  const fromSeverityMix = healthDelta - fromNewIssues - fromResolvedIssues;

  // Check for regressions
  const hasRegressions = newBySeverity.high > 0 || reintroducedCount > 0;

  return {
    newCount,
    persistingCount,
    resolvedCount,
    reintroducedCount,
    ignoredCount,
    newBySeverity,
    reintroducedBySeverity,
    previousHealthScore,
    currentHealthScore,
    healthDelta,
    healthAttribution: {
      fromNewIssues,
      fromResolvedIssues,
      fromSeverityMix,
    },
    issues,
    hasRegressions,
    isFirstRun,
  };
}

/**
 * Generate a human-readable delta summary text
 */
export function formatDeltaSummary(delta: DeltaSummary): string {
  if (delta.isFirstRun) {
    return 'First analysis run - no comparison available.';
  }

  const parts: string[] = [];

  if (delta.hasRegressions) {
    if (delta.newBySeverity.high > 0) {
      parts.push(`⚠️ ${delta.newBySeverity.high} new HIGH severity issue${delta.newBySeverity.high > 1 ? 's' : ''}`);
    }
    if (delta.reintroducedCount > 0) {
      parts.push(`↺ ${delta.reintroducedCount} reintroduced issue${delta.reintroducedCount > 1 ? 's' : ''}`);
    }
  }

  const changes: string[] = [];
  if (delta.newCount > 0) changes.push(`+${delta.newCount} new`);
  if (delta.resolvedCount > 0) changes.push(`-${delta.resolvedCount} resolved`);
  if (delta.persistingCount > 0) changes.push(`${delta.persistingCount} unchanged`);

  if (changes.length > 0) {
    parts.push(changes.join(', '));
  }

  if (delta.previousHealthScore !== null) {
    const sign = delta.healthDelta >= 0 ? '+' : '';
    parts.push(`Health: ${delta.previousHealthScore}% → ${delta.currentHealthScore}% (${sign}${delta.healthDelta})`);
  }

  return parts.join(' | ');
}
