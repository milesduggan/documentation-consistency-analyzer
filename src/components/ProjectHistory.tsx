'use client';

import { useState, useEffect } from 'react';
import { getAnalysisHistory, getIssuesForAnalysis, formatRelativeTime } from '@/lib/browser/storage';
import { getHealthColor, getHealthLabel } from '@/lib/browser/fingerprint';
import type { StoredProject, StoredAnalysis, StoredIssue } from '@/types';

interface ProjectHistoryProps {
  project: StoredProject;
  onBack: () => void;
}

export default function ProjectHistory({ project, onBack }: ProjectHistoryProps) {
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runIssues, setRunIssues] = useState<Map<string, StoredIssue[]>>(new Map());

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getAnalysisHistory(project.name, 20, project.path);
        setAnalyses(history);
      } catch (err) {
        console.error('Failed to load analysis history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [project]);

  const handleRunClick = async (analysisId: string) => {
    if (expandedRun === analysisId) {
      setExpandedRun(null);
      return;
    }

    setExpandedRun(analysisId);

    // Lazy load issues if not already loaded
    if (!runIssues.has(analysisId)) {
      try {
        const issues = await getIssuesForAnalysis(analysisId);
        setRunIssues(new Map(runIssues).set(analysisId, issues));
      } catch (err) {
        console.error('Failed to load issues:', err);
      }
    }
  };

  // Calculate stats
  const bestHealth = analyses.length > 0 ? Math.max(...analyses.map((a) => a.healthScore)) : 0;
  const worstHealth = analyses.length > 0 ? Math.min(...analyses.map((a) => a.healthScore)) : 0;
  const latestHealth = analyses[0]?.healthScore ?? 0;

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-loading">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <header className="history-header">
        <button className="history-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1 className="history-title">{project.name}</h1>
        <span className="history-run-count">{project.analysisCount} runs</span>
      </header>

      <div className="history-stats">
        <div className="stat-item">
          <span className="stat-value" style={{ color: getHealthColor(latestHealth) }}>
            {latestHealth}%
          </span>
          <span className="stat-label">Current Health</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: getHealthColor(bestHealth) }}>
            {bestHealth}%
          </span>
          <span className="stat-label">Best</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: getHealthColor(worstHealth) }}>
            {worstHealth}%
          </span>
          <span className="stat-label">Worst</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-value--small">
            {formatRelativeTime(project.createdAt)}
          </span>
          <span className="stat-label">First Analysis</span>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="history-empty">No analysis history found.</div>
      ) : (
        <div className="history-list">
          {analyses.map((analysis) => {
            const isExpanded = expandedRun === analysis.id;
            const issues = runIssues.get(analysis.id) || [];

            return (
              <div key={analysis.id} className="history-run">
                <div
                  className="history-run-header"
                  onClick={() => handleRunClick(analysis.id)}
                >
                  <div className="history-run-main">
                    <span className="history-run-number">Run #{analysis.runNumber}</span>
                    <span
                      className="history-run-health"
                      style={{ color: getHealthColor(analysis.healthScore) }}
                    >
                      {analysis.healthScore}% {getHealthLabel(analysis.healthScore)}
                    </span>
                  </div>
                  <div className="history-run-meta">
                    <span className="history-run-issues">
                      {analysis.issueCount} issue{analysis.issueCount !== 1 ? 's' : ''}
                    </span>
                    <span className="history-run-time">
                      {formatRelativeTime(analysis.timestamp)}
                    </span>
                  </div>
                  <div className="history-run-details-row">
                    <span>{analysis.metadata.totalFiles} files</span>
                    <span>{analysis.metadata.totalMarkdownFiles} markdown</span>
                    <span>{analysis.metadata.totalLinks} links</span>
                    {analysis.metadata.coveragePercentage !== undefined && (
                      <span>{analysis.metadata.coveragePercentage}% coverage</span>
                    )}
                  </div>
                  <span className="history-run-expand">{isExpanded ? '▼' : '▶'}</span>
                </div>

                {isExpanded && (
                  <div className="history-run-details">
                    <h4>Issues by Type</h4>
                    {Object.keys(analysis.issuesByType).length === 0 ? (
                      <p className="history-no-issues">No issues in this run</p>
                    ) : (
                      <div className="history-issue-types">
                        {Object.entries(analysis.issuesByType).map(([type, count]) => (
                          <div key={type} className="history-issue-type">
                            <span className="history-issue-type-name">
                              {type.replace(/-/g, ' ')}
                            </span>
                            <span className="history-issue-type-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {issues.length > 0 && (
                      <>
                        <h4>Issue List</h4>
                        <div className="history-issues-list">
                          {issues.slice(0, 10).map((issue) => (
                            <div
                              key={issue.id}
                              className={`history-issue history-issue--${issue.severity}`}
                            >
                              <span className={`history-issue-severity severity-${issue.severity}`}>
                                {issue.severity[0].toUpperCase()}
                              </span>
                              <span className="history-issue-message">{issue.message}</span>
                              <span className="history-issue-location">
                                {issue.location.filePath}
                                {issue.location.lineNumber && `:${issue.location.lineNumber}`}
                              </span>
                            </div>
                          ))}
                          {issues.length > 10 && (
                            <p className="history-issues-more">
                              ...and {issues.length - 10} more issues
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
