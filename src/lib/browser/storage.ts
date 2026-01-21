// High-level storage API for analysis persistence
// Combines db.ts, crypto.ts, and fingerprint.ts into a clean interface

import {
  STORES,
  get,
  put,
  getAll,
  getByIndex,
  getByIndexWithLimit,
  deleteByIndex,
  remove,
  isIndexedDBAvailable,
} from './db';
import { generateUUID } from './crypto';
import {
  generateIssueFingerprint,
  generateProjectId,
  calculateHealthScore,
  countIssuesByType,
} from './fingerprint';
import type { StoredProject, StoredAnalysis, StoredIssue, Inconsistency } from '@/types';
import type { AnalysisResult } from './analyzer';

// Re-export types for convenience
export type { StoredProject, StoredAnalysis, StoredIssue };

// Re-export fingerprint function for client-side use
export { generateIssueFingerprint } from './fingerprint';

/**
 * Save an analysis result to IndexedDB
 * Returns the analysis ID
 */
export async function saveAnalysis(
  projectName: string,
  result: AnalysisResult,
  projectPath?: string
): Promise<string> {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available, skipping persistence');
    return '';
  }

  const timestamp = new Date().toISOString();
  const projectId = await generateProjectId(projectName, projectPath);
  const analysisId = generateUUID();

  // Get or create project
  let project = await get<StoredProject>(STORES.PROJECTS, projectId);

  if (project) {
    // Update existing project
    project.lastAnalyzedAt = timestamp;
    project.analysisCount += 1;
  } else {
    // Create new project
    project = {
      id: projectId,
      name: projectName,
      path: projectPath,
      createdAt: timestamp,
      lastAnalyzedAt: timestamp,
      analysisCount: 1,
    };
  }

  await put(STORES.PROJECTS, project);

  // Create analysis record
  const analysis: StoredAnalysis = {
    id: analysisId,
    projectId,
    timestamp,
    metadata: {
      totalFiles: result.metadata.totalFiles,
      totalMarkdownFiles: result.metadata.totalMarkdownFiles,
      totalLinks: result.metadata.totalLinks,
      totalCodeFiles: result.metadata.totalCodeFiles,
      totalExports: result.metadata.totalExports,
      documentedExports: result.metadata.documentedExports,
      coveragePercentage: result.metadata.coveragePercentage,
    },
    issueCount: result.inconsistencies.length,
    issuesByType: countIssuesByType(result.inconsistencies),
    healthScore: calculateHealthScore(result),
    runNumber: project.analysisCount,
  };

  await put(STORES.ANALYSES, analysis);

  // Get existing fingerprints for this project to track firstSeenAt
  const existingIssues = await getByIndex<StoredIssue>(
    STORES.ISSUES,
    'projectId',
    projectId
  );
  const fingerprintFirstSeen = new Map<string, string>();
  for (const issue of existingIssues) {
    if (!fingerprintFirstSeen.has(issue.fingerprint)) {
      fingerprintFirstSeen.set(issue.fingerprint, issue.firstSeenAt);
    }
  }

  // Save issues with fingerprints
  for (const inconsistency of result.inconsistencies) {
    const fingerprint = await generateIssueFingerprint(inconsistency);
    const firstSeenAt = fingerprintFirstSeen.get(fingerprint) || timestamp;

    const storedIssue: StoredIssue = {
      id: generateUUID(),
      analysisId,
      projectId,
      fingerprint,
      type: inconsistency.type,
      severity: inconsistency.severity,
      message: inconsistency.message,
      location: inconsistency.location,
      context: inconsistency.context,
      suggestion: inconsistency.suggestion,
      firstSeenAt,
      status: 'open',
    };

    await put(STORES.ISSUES, storedIssue);
  }

  return analysisId;
}

/**
 * Get analysis history for a project
 */
export async function getAnalysisHistory(
  projectName: string,
  limit = 10,
  projectPath?: string
): Promise<StoredAnalysis[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }

  const projectId = await generateProjectId(projectName, projectPath);
  return getByIndexWithLimit<StoredAnalysis>(
    STORES.ANALYSES,
    'projectId',
    projectId,
    limit,
    'prev' // newest first
  );
}

/**
 * Get the most recent analysis for a project
 */
export async function getLatestAnalysis(
  projectName: string,
  projectPath?: string
): Promise<StoredAnalysis | undefined> {
  const history = await getAnalysisHistory(projectName, 1, projectPath);
  return history[0];
}

/**
 * Get all projects
 */
export async function getAllProjects(): Promise<StoredProject[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }
  return getAll<StoredProject>(STORES.PROJECTS);
}

/**
 * Get a project by name
 */
export async function getProject(
  projectName: string,
  projectPath?: string
): Promise<StoredProject | undefined> {
  if (!isIndexedDBAvailable()) {
    return undefined;
  }
  const projectId = await generateProjectId(projectName, projectPath);
  return get<StoredProject>(STORES.PROJECTS, projectId);
}

/**
 * Get issues for a specific analysis
 */
export async function getIssuesForAnalysis(analysisId: string): Promise<StoredIssue[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }
  return getByIndex<StoredIssue>(STORES.ISSUES, 'analysisId', analysisId);
}

/**
 * Get unique issues for a project (deduplicated by fingerprint)
 * Returns the most recent instance of each unique issue
 */
export async function getUniqueIssuesForProject(
  projectName: string,
  projectPath?: string
): Promise<StoredIssue[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }

  const projectId = await generateProjectId(projectName, projectPath);
  const allIssues = await getByIndex<StoredIssue>(STORES.ISSUES, 'projectId', projectId);

  // Deduplicate by fingerprint, keeping the most recent
  const issueMap = new Map<string, StoredIssue>();
  for (const issue of allIssues) {
    const existing = issueMap.get(issue.fingerprint);
    if (!existing || issue.firstSeenAt > existing.firstSeenAt) {
      issueMap.set(issue.fingerprint, issue);
    }
  }

  return Array.from(issueMap.values());
}

/**
 * Delete an analysis and its issues
 */
export async function deleteAnalysis(analysisId: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  // Delete issues for this analysis
  await deleteByIndex(STORES.ISSUES, 'analysisId', analysisId);

  // Delete the analysis record
  await remove(STORES.ANALYSES, analysisId);
}

/**
 * Delete a project and all its data
 */
export async function deleteProject(
  projectName: string,
  projectPath?: string
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  const projectId = await generateProjectId(projectName, projectPath);

  // Delete all issues for this project
  await deleteByIndex(STORES.ISSUES, 'projectId', projectId);

  // Delete all analyses for this project
  await deleteByIndex(STORES.ANALYSES, 'projectId', projectId);

  // Delete the project
  await remove(STORES.PROJECTS, projectId);
}

/**
 * Update issue status
 */
export async function updateIssueStatus(
  issueId: string,
  status: 'open' | 'resolved' | 'ignored'
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  const issue = await get<StoredIssue>(STORES.ISSUES, issueId);
  if (issue) {
    issue.status = status;
    await put(STORES.ISSUES, issue);
  }
}

/**
 * Get status map for a set of inconsistencies
 * Maps fingerprint -> {id, status} for looking up stored status
 */
export async function getIssueStatusMap(
  projectName: string,
  inconsistencies: Inconsistency[],
  projectPath?: string
): Promise<Map<string, { id: string; status: StoredIssue['status'] }>> {
  const statusMap = new Map<string, { id: string; status: StoredIssue['status'] }>();

  if (!isIndexedDBAvailable() || inconsistencies.length === 0) {
    return statusMap;
  }

  const projectId = await generateProjectId(projectName, projectPath);
  const storedIssues = await getByIndex<StoredIssue>(STORES.ISSUES, 'projectId', projectId);

  // Build a map of fingerprint -> most recent stored issue
  const fingerprintToIssue = new Map<string, StoredIssue>();
  for (const issue of storedIssues) {
    const existing = fingerprintToIssue.get(issue.fingerprint);
    // Keep the most recent one (by firstSeenAt or just overwrite)
    if (!existing || issue.firstSeenAt > existing.firstSeenAt) {
      fingerprintToIssue.set(issue.fingerprint, issue);
    }
  }

  // Generate fingerprints for current inconsistencies and match
  for (const inconsistency of inconsistencies) {
    const fingerprint = await generateIssueFingerprint(inconsistency);
    const storedIssue = fingerprintToIssue.get(fingerprint);
    if (storedIssue) {
      statusMap.set(fingerprint, { id: storedIssue.id, status: storedIssue.status });
    }
  }

  return statusMap;
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
