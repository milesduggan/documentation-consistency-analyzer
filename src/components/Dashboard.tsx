'use client';

import { useState, useEffect } from 'react';
import { getAllProjects, getAnalysisHistory } from '@/lib/browser/storage';
import type { StoredProject, StoredAnalysis } from '@/types';
import ProjectCard from './ProjectCard';

interface DashboardProps {
  onSelectProject: (project: StoredProject) => void;
  onNewAnalysis: () => void;
  onReanalyze: (project: StoredProject) => void;
}

export default function Dashboard({ onSelectProject, onNewAnalysis, onReanalyze }: DashboardProps) {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [latestAnalyses, setLatestAnalyses] = useState<Map<string, StoredAnalysis>>(new Map());
  const [healthTrends, setHealthTrends] = useState<Map<string, number[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const allProjects = await getAllProjects();
      // Sort by lastAnalyzedAt descending
      allProjects.sort(
        (a, b) => new Date(b.lastAnalyzedAt).getTime() - new Date(a.lastAnalyzedAt).getTime()
      );
      setProjects(allProjects);

      // Load analysis history for each project (for health score + sparkline)
      const analysisMap = new Map<string, StoredAnalysis>();
      const trendsMap = new Map<string, number[]>();

      for (const project of allProjects) {
        const history = await getAnalysisHistory(project.name, 10, project.path);
        if (history.length > 0) {
          // Latest is first
          analysisMap.set(project.id, history[0]);
          // Reverse for sparkline (oldest to newest)
          const scores = history.map(a => a.healthScore).reverse();
          trendsMap.set(project.id, scores);
        }
      }

      setLatestAnalyses(analysisMap);
      setHealthTrends(trendsMap);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading projects...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Your Projects</h2>
        <button onClick={onNewAnalysis} className="btn btn-primary">
          + Analyze New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="dashboard-empty">
          <p>No projects analyzed yet.</p>
          <button onClick={onNewAnalysis} className="btn btn-primary">
            Analyze Your First Project
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {projects.map((project) => {
            const latest = latestAnalyses.get(project.id);
            const trend = healthTrends.get(project.id);
            return (
              <ProjectCard
                key={project.id}
                project={project}
                latestAnalysis={latest}
                healthTrend={trend}
                onClick={() => onSelectProject(project)}
                onReanalyze={onReanalyze}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
