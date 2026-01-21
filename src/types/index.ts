// Core type definitions for Documentation Consistency Analyzer

export interface FileMetadata {
  filePath: string;
  fileName: string;
  fileType: 'markdown' | 'javascript' | 'typescript' | 'python' | 'unknown';
  sizeBytes: number;
  modifiedTime: Date;
}

export interface ContentObject {
  id: string;
  filePath: string;
  content: string;
  metadata: FileMetadata;
  hash: string; // SHA-256 hash for caching
}

export type Confidence = 'high' | 'medium' | 'low';

export interface Inconsistency {
  id: string;
  type:
    | 'broken-link'
    | 'broken-image'
    | 'malformed-link'
    | 'todo-marker'
    | 'orphaned-file'
    | 'undocumented-export'    // Code export without documentation
    | 'orphaned-doc'           // Documentation referencing non-existent code
    | 'numerical-inconsistency'; // Same concept with different numerical values
  severity: 'low' | 'medium' | 'high';
  confidence: Confidence;
  message: string;
  location: {
    filePath: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  context?: string;
  suggestion?: string;
}

export interface AnalysisResult {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  inconsistencies: Inconsistency[];
  metadata: {
    startTime: Date;
    endTime: Date;
    durationMs: number;
  };
}

export interface AnalysisConfig {
  enableRuleBased: boolean;
  enableSemanticAnalysis: boolean;
  maxConcurrentFiles: number;
  maxFileSizeBytes: number;
  excludePatterns: string[];
}

/**
 * Context available during analysis for confidence scoring
 */
export interface AnalysisContext {
  totalFiles: number;
  markdownFiles: number;
  codeFiles: number;
  allFilePaths: string[];
}

/**
 * Assigns a confidence level to an issue based on its type and context.
 * All branches currently return 'medium' as a stub for future refinement.
 */
export function assignConfidence(issue: Inconsistency, _context: AnalysisContext): Confidence {
  switch (issue.type) {
    case 'broken-link': {
      // Default confidence is high for broken links
      // Downgrade to medium if target is in build output directories
      const targetPath = issue.context?.toLowerCase() || '';
      if (targetPath.includes('/dist/') || targetPath.includes('/build/') || targetPath.includes('/out/')) {
        return 'medium';
      }
      return 'high';
    }

    case 'broken-image':
      return 'medium';

    case 'malformed-link':
      return 'medium';

    case 'todo-marker':
      return 'medium';

    case 'orphaned-file':
      return 'medium';

    case 'undocumented-export':
      return 'medium';

    case 'orphaned-doc':
      return 'medium';

    case 'numerical-inconsistency':
      return 'medium';

    default:
      return 'medium';
  }
}

// ============ Storage Types ============

/**
 * A project stored in IndexedDB
 */
export interface StoredProject {
  id: string;
  name: string;
  path?: string;
  createdAt: string;
  lastAnalyzedAt: string;
  analysisCount: number;
}

/**
 * An analysis run stored in IndexedDB
 */
export interface StoredAnalysis {
  id: string;
  projectId: string;
  timestamp: string;
  metadata: AnalysisMetadata;
  issueCount: number;
  issuesByType: Record<string, number>;
  healthScore: number;
  runNumber: number;
}

/**
 * Metadata for a stored analysis
 */
export interface AnalysisMetadata {
  totalFiles: number;
  totalMarkdownFiles: number;
  totalLinks: number;
  totalCodeFiles?: number;
  totalExports?: number;
  documentedExports?: number;
  coveragePercentage?: number;
}

/**
 * An issue stored in IndexedDB with tracking info
 */
export interface StoredIssue {
  id: string;
  analysisId: string;
  projectId: string;
  fingerprint: string;
  type: string;
  severity: string;
  message: string;
  location: {
    filePath: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  context?: string;
  suggestion?: string;
  firstSeenAt: string;
  status: 'open' | 'resolved' | 'ignored';
}
