'use client';

import { formatRelativeTime } from '@/lib/browser/storage';
import type { StoredProject, StoredAnalysis } from '@/types';

interface ProjectCardProps {
  project: StoredProject;
  latestAnalysis?: StoredAnalysis;
  onClick: () => void;
}

export default function ProjectCard({ project, latestAnalysis, onClick }: ProjectCardProps) {
  const healthScore = latestAnalysis?.healthScore ?? 0;
  const issueCount = latestAnalysis?.issueCount ?? 0;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'var(--color-success, #3fb950)';
    if (score >= 50) return 'var(--color-medium, #d29922)';
    return 'var(--color-high, #f85149)';
  };

  return (
    <div className="project-card" onClick={onClick}>
      <div className="project-card-header">
        <h3 className="project-card-name">{project.name}</h3>
        <div
          className="project-card-health"
          style={{ color: getHealthColor(healthScore) }}
        >
          {healthScore}%
        </div>
      </div>

      <div className="project-card-meta">
        <span className="project-card-date">
          {formatRelativeTime(project.lastAnalyzedAt)}
        </span>
        <span className="project-card-runs">
          {project.analysisCount} run{project.analysisCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="project-card-stats">
        <span className="project-card-issues">
          {issueCount} issue{issueCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
