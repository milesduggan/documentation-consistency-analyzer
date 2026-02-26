'use client'

import { useState } from 'react';
import type { Inconsistency } from '@/types';
import type { AnalysisResult } from '@/lib/browser/analyzer';
import { downloadJSON, copySummaryToClipboard } from '@/lib/browser/export';

interface AnalysisSummaryProps {
  results: AnalysisResult;
}

export default function AnalysisSummary({ results }: AnalysisSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copyStatus, setCopyStatus] = useState<string>('');

  const { metadata, inconsistencies } = results;

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
    } catch (err) {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

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

  return (
    <div className="analysis-summary">
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
          <button onClick={handleCopySummary} className="export-btn secondary">
            Copy Summary
            {copyStatus && <span className="copy-status"> {copyStatus}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
