'use client'

import { useState } from 'react';
import type { AnalysisResult } from '@/lib/browser/analyzer';
import type { DeltaSummary } from '@/lib/browser/delta';
import { downloadJSON, copySummaryToClipboard, downloadCICDJSON } from '@/lib/browser/export';

interface AnalysisSummaryProps {
  results: AnalysisResult;
  deltaSummary?: DeltaSummary | null;
  projectName?: string;
}

export default function AnalysisSummary({ results, deltaSummary, projectName = 'analysis' }: AnalysisSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copyStatus, setCopyStatus] = useState<string>('');

  const { inconsistencies } = results;

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleDownloadJSON = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    downloadJSON(results, `analysis-${timestamp}.json`);
  };

  const handleCopySummary = async () => {
    try {
      await copySummaryToClipboard(results);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleDownloadCICD = () => {
    downloadCICDJSON(results, deltaSummary ?? null, projectName);
  };

  // Count by type
  const typeCounts = inconsistencies.reduce((acc, inc) => {
    acc[inc.type] = (acc[inc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="analysis-summary">
      {/* Delta Summary - Since Last Run */}
      {deltaSummary && !deltaSummary.isFirstRun && (
        <div className="summary-card delta-summary">
          <h3>Since Last Run</h3>

          {deltaSummary.hasRegressions && (
            <div className="delta-alert delta-alert--regression">
              {deltaSummary.newBySeverity.high > 0 && (
                <span>{deltaSummary.newBySeverity.high} new HIGH severity issue{deltaSummary.newBySeverity.high > 1 ? 's' : ''}</span>
              )}
              {deltaSummary.reintroducedCount > 0 && (
                <span>{deltaSummary.reintroducedCount} reintroduced issue{deltaSummary.reintroducedCount > 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          <div className="delta-stats">
            <span className="delta-stat delta-stat--new">+{deltaSummary.newCount} new</span>
            <span className="delta-stat delta-stat--resolved">-{deltaSummary.resolvedCount} resolved</span>
            <span className="delta-stat delta-stat--persisting">{deltaSummary.persistingCount} unchanged</span>
            {deltaSummary.reintroducedCount > 0 && (
              <span className="delta-stat delta-stat--reintroduced">
                {deltaSummary.reintroducedCount} reintroduced
              </span>
            )}
            {deltaSummary.ignoredCount > 0 && (
              <span className="delta-stat delta-stat--ignored">{deltaSummary.ignoredCount} ignored</span>
            )}
          </div>

          {deltaSummary.previousHealthScore !== null && (
            <div className="health-delta">
              <span className="health-label">Health:</span>
              <span className="health-previous">{deltaSummary.previousHealthScore}%</span>
              <span className="health-arrow">→</span>
              <span className="health-current">{deltaSummary.currentHealthScore}%</span>
              <span className={`health-change ${deltaSummary.healthDelta >= 0 ? 'positive' : 'negative'}`}>
                ({deltaSummary.healthDelta >= 0 ? '+' : ''}{deltaSummary.healthDelta})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Section 1: What Was Checked (Expandable) */}
      <div className="summary-card collapsible">
        <div
          className="card-header"
          onClick={() => toggleSection('checks')}
        >
          <h3>
            {expandedSections.has('checks') ? '[-]' : '[+]'} What Was Checked
          </h3>
        </div>
        {expandedSections.has('checks') && (
          <div className="card-content checks-grid">
            <div className="check-description">
              <h4>Broken Links ({typeCounts['broken-link'] || 0})</h4>
              <ul>
                <li>Checks if linked files exist in your project</li>
                <li>Validates heading anchors (e.g., #introduction)</li>
                <li>Verifies relative paths resolve correctly</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>Malformed Links ({typeCounts['malformed-link'] || 0})</h4>
              <ul>
                <li>Detects empty link URLs: [text]()</li>
                <li>Finds links with no text: [](url)</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>Broken Images ({typeCounts['broken-image'] || 0})</h4>
              <ul>
                <li>Validates image file paths in markdown</li>
                <li>Checks if referenced images exist</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>TODO Markers ({typeCounts['todo-marker'] || 0})</h4>
              <ul>
                <li>Finds TODO, FIXME, XXX, HACK comments</li>
                <li>Highlights incomplete documentation</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>Orphaned Files ({typeCounts['orphaned-file'] || 0})</h4>
              <ul>
                <li>Finds markdown files not linked from anywhere</li>
                <li>Excludes README.md and index.md</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>Undocumented Exports ({typeCounts['undocumented-export'] || 0})</h4>
              <ul>
                <li>Scans JS/TS files for exported functions</li>
                <li>Checks if exports are mentioned in docs</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>Orphaned Docs ({typeCounts['orphaned-doc'] || 0})</h4>
              <ul>
                <li>Finds docs referencing non-existent code</li>
                <li>Detects docs for removed exports</li>
              </ul>
            </div>

            <div className="check-description">
              <h4>Numerical Consistency ({typeCounts['numerical-inconsistency'] || 0})</h4>
              <ul>
                <li>Extracts numbers with context (timeout=5000ms)</li>
                <li>Detects conflicting values across docs</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Export Options */}
      <div className="summary-card export-section">
        <h3>Export Results</h3>
        <div className="export-buttons">
          <button onClick={handleDownloadJSON} className="export-btn">
            Download JSON Report
          </button>
          <button onClick={handleDownloadCICD} className="export-btn">
            Download CI/CD Report
          </button>
          <button onClick={handleCopySummary} className="export-btn secondary">
            Copy Summary
            {copyStatus && <span className="copy-status"> {copyStatus}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
