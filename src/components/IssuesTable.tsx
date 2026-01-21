'use client'

import { useState } from 'react';
import type { Inconsistency } from '@/types';

interface IssuesTableProps {
  inconsistencies: Inconsistency[];
  onReset: () => void;
}

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
};

function getExplanation(type: string, severity: string): string {
  return severityExplanations[type]?.[severity] || 'This issue should be reviewed';
}

export default function IssuesTable({ inconsistencies, onReset: _onReset }: IssuesTableProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Filter inconsistencies
  let filteredIssues = inconsistencies;
  if (filterSeverity !== 'all') {
    filteredIssues = filteredIssues.filter(inc => inc.severity === filterSeverity);
  }
  if (filterType !== 'all') {
    filteredIssues = filteredIssues.filter(inc => inc.type === filterType);
  }

  // Count by severity
  const severityCounts = inconsistencies.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get unique types
  const types = [...new Set(inconsistencies.map(inc => inc.type))];

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
      </div>

      {/* Issues list */}
      <div className="issues-list">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className={`issue-card issue-card-${issue.severity}`}
          >
            <div className="issue-header">
              <span className={`issue-severity severity-${issue.severity}`}>
                {severityIcons[issue.severity]}
              </span>
              <span className="issue-type">{issue.type.replace(/-/g, ' ')}</span>
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
          </div>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <div className="no-filtered-issues">
          No issues match the current filters.
        </div>
      )}
    </div>
  );
}
