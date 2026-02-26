// JSON Output Formatter - Export analysis results to JSON

import fs from 'fs/promises';
import path from 'path';
import { Inconsistency } from '@/types';

export interface AnalysisReport {
  metadata: {
    analyzedAt: string;
    projectPath: string;
    totalFiles: number;
    totalMarkdownFiles: number;
    totalLinks: number;
    totalInconsistencies: number;
  };
  inconsistencies: Inconsistency[];
  summary: {
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

/**
 * Format and export analysis results to JSON file
 */
export async function exportToJSON(
  inconsistencies: Inconsistency[],
  metadata: {
    projectPath: string;
    totalFiles: number;
    totalMarkdownFiles: number;
    totalLinks: number;
  },
  outputPath?: string
): Promise<string> {
  // Calculate summary statistics
  const bySeverity = inconsistencies.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byType = inconsistencies.reduce((acc, inc) => {
    acc[inc.type] = (acc[inc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Build the report
  const report: AnalysisReport = {
    metadata: {
      analyzedAt: new Date().toISOString(),
      projectPath: metadata.projectPath,
      totalFiles: metadata.totalFiles,
      totalMarkdownFiles: metadata.totalMarkdownFiles,
      totalLinks: metadata.totalLinks,
      totalInconsistencies: inconsistencies.length,
    },
    inconsistencies: inconsistencies,
    summary: {
      bySeverity,
      byType,
    },
  };

  // Determine output file path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultPath = path.join(process.cwd(), `analysis-${timestamp}.json`);
  const finalPath = outputPath || defaultPath;

  // Write to file
  await fs.writeFile(finalPath, JSON.stringify(report, null, 2), 'utf-8');

  return finalPath;
}

/**
 * Export inconsistencies grouped by file for easier fixing
 */
export async function exportGroupedByFile(
  inconsistencies: Inconsistency[],
  outputPath?: string
): Promise<string> {
  // Group by file
  const grouped = inconsistencies.reduce((acc, inc) => {
    const filePath = inc.location.filePath;
    if (!acc[filePath]) {
      acc[filePath] = [];
    }
    acc[filePath].push(inc);
    return acc;
  }, {} as Record<string, Inconsistency[]>);

  // Sort files by number of issues (highest first)
  const sortedFiles = Object.entries(grouped)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([filePath, issues]) => ({
      filePath,
      issueCount: issues.length,
      issues: issues.sort((a, b) => {
        // Sort by line number within each file
        const lineA = a.location.lineNumber || 0;
        const lineB = b.location.lineNumber || 0;
        return lineA - lineB;
      }),
    }));

  const report = {
    totalFiles: sortedFiles.length,
    totalIssues: inconsistencies.length,
    filesSortedByIssueCount: sortedFiles,
  };

  // Determine output file path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultPath = path.join(process.cwd(), `analysis-by-file-${timestamp}.json`);
  const finalPath = outputPath || defaultPath;

  // Write to file
  await fs.writeFile(finalPath, JSON.stringify(report, null, 2), 'utf-8');

  return finalPath;
}
