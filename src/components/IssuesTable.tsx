'use client'

import { useState, useEffect } from 'react';
import type { Inconsistency, StoredIssue, DeltaClassification } from '@/types';
import type { DeltaSummary } from '@/lib/browser/delta';
import { generateIssueFingerprint } from '@/lib/browser/storage';

interface IssuesTableProps {
  inconsistencies: Inconsistency[];
  onReset: () => void;
  issueStatusMap?: Map<string, { id: string; status: StoredIssue['status'] }>;
  onStatusChange?: (issueId: string, fingerprint: string, status: StoredIssue['status']) => void;
  onBulkStatusChange?: (updates: Array<{ issueId: string; fingerprint: string; status: StoredIssue['status'] }>) => void;
  deltaSummary?: DeltaSummary | null;
}

// Delta classification labels and colors
const deltaLabels: Record<DeltaClassification, string> = {
  new: 'NEW',
  persisting: 'PERSISTING',
  resolved: 'RESOLVED',
  reintroduced: 'REINTRODUCED',
  ignored: 'IGNORED',
};

// Severity icons
const severityIcons: Record<string, string> = {
  high: 'H',
  medium: 'M',
  low: 'L',
};

// "Why it matters" explanations by issue type and severity
const severityExplanations: Record<string, Record<string, string>> = {
  'broken-link': {
    high: 'Users clicking this link will hit a 404 error',
    medium: 'Users clicking this link will hit a 404 error',
  },
  'broken-image': {
    high: 'This image will not display for users',
  },
  'malformed-link': {
    high: 'Empty URL means link goes nowhere',
    low: 'Missing link text affects accessibility',
  },
  'todo-marker': {
    medium: 'FIXME indicates incomplete work needing attention',
    low: 'TODO marker - may be intentional placeholder',
  },
  'orphaned-file': {
    low: 'This file may be unused or forgotten',
  },
  'undocumented-export': {
    low: 'This code has no documentation for users',
  },
  'orphaned-doc': {
    medium: 'Documentation references code that no longer exists',
  },
  'numerical-inconsistency': {
    low: 'Values differ but have context qualifiers (dev vs prod)',
    medium: 'Same concept has different values across documentation',
  },
  'external-link': {
    high: 'External URL is broken or unreachable',
    medium: 'External URL timed out during check',
    low: 'External URL could not be verified (CORS)',
  },
};

function getExplanation(type: string, severity: string): string {
  return severityExplanations[type]?.[severity] || 'This issue should be reviewed';
}

export default function IssuesTable({
  inconsistencies,
  onReset: _onReset,
  issueStatusMap,
  onStatusChange,
  onBulkStatusChange,
  deltaSummary
}: IssuesTableProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDelta, setFilterDelta] = useState<string>('all');
  const [showResolved, setShowResolved] = useState<boolean>(false);
  const [fingerprints, setFingerprints] = useState<Map<string, string>>(new Map());
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  // Generate fingerprints for all issues on mount
  useEffect(() => {
    const generateFingerprints = async () => {
      const fpMap = new Map<string, string>();
      for (const issue of inconsistencies) {
        const fp = await generateIssueFingerprint(issue);
        fpMap.set(issue.id, fp);
      }
      setFingerprints(fpMap);
    };
    generateFingerprints();
  }, [inconsistencies]);

  // Helper to get status for an issue
  const getIssueStatus = (issueId: string): StoredIssue['status'] | undefined => {
    const fp = fingerprints.get(issueId);
    if (!fp || !issueStatusMap) return undefined;
    return issueStatusMap.get(fp)?.status;
  };

  // Helper to get stored ID for an issue
  const getStoredId = (issueId: string): string | undefined => {
    const fp = fingerprints.get(issueId);
    if (!fp || !issueStatusMap) return undefined;
    return issueStatusMap.get(fp)?.id;
  };

  // Helper to get delta classification for an issue
  const getDeltaClassification = (issueId: string): DeltaClassification | undefined => {
    if (!deltaSummary || deltaSummary.isFirstRun) return undefined;
    const fp = fingerprints.get(issueId);
    if (!fp) return undefined;
    const issueDelta = deltaSummary.issues.find(d => d.fingerprint === fp);
    return issueDelta?.classification;
  };

  // Count issues by delta classification
  const deltaCounts = deltaSummary && !deltaSummary.isFirstRun
    ? {
        new: deltaSummary.newCount,
        persisting: deltaSummary.persistingCount,
        reintroduced: deltaSummary.reintroducedCount,
        ignored: deltaSummary.ignoredCount,
      }
    : null;

  // Filter inconsistencies
  let filteredIssues = inconsistencies;
  if (filterSeverity !== 'all') {
    filteredIssues = filteredIssues.filter(inc => inc.severity === filterSeverity);
  }
  if (filterType !== 'all') {
    filteredIssues = filteredIssues.filter(inc => inc.type === filterType);
  }
  // Filter by delta classification
  if (filterDelta !== 'all' && deltaSummary && !deltaSummary.isFirstRun) {
    filteredIssues = filteredIssues.filter(inc => {
      const classification = getDeltaClassification(inc.id);
      return classification === filterDelta;
    });
  }
  // Filter out resolved/ignored unless showResolved is true
  if (!showResolved) {
    filteredIssues = filteredIssues.filter(inc => {
      const status = getIssueStatus(inc.id);
      return !status || status === 'open';
    });
  }

  // Count resolved/ignored
  const resolvedCount = inconsistencies.filter(inc => {
    const status = getIssueStatus(inc.id);
    return status === 'resolved' || status === 'ignored';
  }).length;

  // Count by severity
  const severityCounts = inconsistencies.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get unique types
  const types = [...new Set(inconsistencies.map(inc => inc.type))];

  // Selection helpers
  const toggleSelection = (issueId: string) => {
    setSelectedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(filteredIssues.map(i => i.id));
    setSelectedIssues(allIds);
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  // Bulk action handlers
  const handleBulkAction = (status: StoredIssue['status']) => {
    if (!onBulkStatusChange) return;

    const updates: Array<{ issueId: string; fingerprint: string; status: StoredIssue['status'] }> = [];

    for (const issueId of selectedIssues) {
      const fp = fingerprints.get(issueId);
      const storedId = getStoredId(issueId);
      if (fp && storedId) {
        updates.push({ issueId: storedId, fingerprint: fp, status });
      }
    }

    if (updates.length > 0) {
      onBulkStatusChange(updates);
      clearSelection();
    }
  };

  // Count selected that can be actioned
  const selectedCount = selectedIssues.size;
  const canBulkAction = selectedCount > 0 && onBulkStatusChange;

  if (inconsistencies.length === 0) {
    return (
      <div className="no-issues">
        <h2>No Issues Found!</h2>
        <p>
          All internal links are valid. Your documentation is consistent.
        </p>
      </div>
    );
  }

  return (
    <div className="issues-container">
      {/* Header with counts */}
      <div className="issues-header">
        <h2>Issues ({inconsistencies.length})</h2>
        <div className="issues-summary">
          <span className="severity-badge high">{severityCounts.high || 0} High</span>
          <span className="severity-badge medium">{severityCounts.medium || 0} Medium</span>
          <span className="severity-badge low">{severityCounts.low || 0} Low</span>
        </div>
      </div>

      {/* Bulk action bar */}
      {canBulkAction && (
        <div className="bulk-action-bar">
          <span className="bulk-selected-count">{selectedCount} selected</span>
          <div className="bulk-actions">
            <button
              className="bulk-action-btn bulk-action-btn--resolve"
              onClick={() => handleBulkAction('resolved')}
            >
              Resolve All
            </button>
            <button
              className="bulk-action-btn bulk-action-btn--ignore"
              onClick={() => handleBulkAction('ignored')}
            >
              Ignore All
            </button>
            <button
              className="bulk-action-btn bulk-action-btn--clear"
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filter controls */}
      <div className="issues-controls">
        <div className="filter-group">
          <label htmlFor="severity-filter">Severity:</label>
          <select
            id="severity-filter"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All</option>
            <option value="high">High ({severityCounts.high || 0})</option>
            <option value="medium">Medium ({severityCounts.medium || 0})</option>
            <option value="low">Low ({severityCounts.low || 0})</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="type-filter">Type:</label>
          <select
            id="type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type.replace(/-/g, ' ')}</option>
            ))}
          </select>
        </div>

        {deltaCounts && (
          <div className="filter-group">
            <label htmlFor="delta-filter">Change:</label>
            <select
              id="delta-filter"
              value={filterDelta}
              onChange={(e) => setFilterDelta(e.target.value)}
            >
              <option value="all">All Changes</option>
              <option value="new">New ({deltaCounts.new})</option>
              <option value="persisting">Persisting ({deltaCounts.persisting})</option>
              {deltaCounts.reintroduced > 0 && (
                <option value="reintroduced">Reintroduced ({deltaCounts.reintroduced})</option>
              )}
              {deltaCounts.ignored > 0 && (
                <option value="ignored">Ignored ({deltaCounts.ignored})</option>
              )}
            </select>
          </div>
        )}

        {resolvedCount > 0 && (
          <div className="filter-group filter-group--toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
              />
              Show resolved/ignored ({resolvedCount})
            </label>
          </div>
        )}

        {onBulkStatusChange && filteredIssues.length > 0 && (
          <div className="filter-group filter-group--select">
            <button
              className="select-all-btn"
              onClick={selectedCount === filteredIssues.length ? clearSelection : selectAll}
            >
              {selectedCount === filteredIssues.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}
      </div>

      {/* Issues list */}
      <div className="issues-list">
        {filteredIssues.map((issue) => {
          const status = getIssueStatus(issue.id);
          const storedId = getStoredId(issue.id);
          const fp = fingerprints.get(issue.id);
          const isResolved = status === 'resolved';
          const isIgnored = status === 'ignored';
          const deltaClass = getDeltaClassification(issue.id);

          const isSelected = selectedIssues.has(issue.id);

          return (
            <div
              key={issue.id}
              className={`issue-card issue-card-${issue.severity}${isResolved ? ' issue-card--resolved' : ''}${isIgnored ? ' issue-card--ignored' : ''}${isSelected ? ' issue-card--selected' : ''}`}
            >
              <div className="issue-header">
                {onBulkStatusChange && (
                  <label className="issue-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(issue.id)}
                    />
                  </label>
                )}
                <span className={`issue-severity severity-${issue.severity}`}>
                  {severityIcons[issue.severity]}
                </span>
                <span className="issue-type">{issue.type.replace(/-/g, ' ')}</span>
                {deltaClass && deltaClass !== 'persisting' && (
                  <span className={`issue-delta-badge issue-delta-badge--${deltaClass}`}>
                    {deltaLabels[deltaClass]}
                  </span>
                )}
                {status && status !== 'open' && (
                  <span className={`issue-status-badge issue-status-badge--${status}`}>
                    {status}
                  </span>
                )}
              </div>

              <div className="issue-message">{issue.message}</div>

              <div className="issue-location">
                {issue.location.filePath}
                {issue.location.lineNumber && `:${issue.location.lineNumber}`}
              </div>

              {issue.context && (
                <div className="issue-context">
                  <code>{issue.context}</code>
                </div>
              )}

              <div className="issue-footer">
                <span className="issue-explanation">{getExplanation(issue.type, issue.severity)}</span>
                {issue.suggestion && (
                  <span className="issue-suggestion">{issue.suggestion}</span>
                )}
              </div>

              {onStatusChange && storedId && fp && (
                <div className="issue-actions">
                  {status !== 'resolved' && (
                    <button
                      className="issue-status-btn issue-status-btn--resolve"
                      onClick={() => onStatusChange(storedId, fp, 'resolved')}
                    >
                      ✓ Resolve
                    </button>
                  )}
                  {status !== 'ignored' && (
                    <button
                      className="issue-status-btn issue-status-btn--ignore"
                      onClick={() => onStatusChange(storedId, fp, 'ignored')}
                    >
                      ✗ Ignore
                    </button>
                  )}
                  {(status === 'resolved' || status === 'ignored') && (
                    <button
                      className="issue-status-btn issue-status-btn--reopen"
                      onClick={() => onStatusChange(storedId, fp, 'open')}
                    >
                      ↺ Reopen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredIssues.length === 0 && (
        <div className="no-filtered-issues">
          No issues match the current filters.
        </div>
      )}
    </div>
  );
}
