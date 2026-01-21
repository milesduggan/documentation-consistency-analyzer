'use client';

import { useState, useEffect } from 'react';
import { getAllProjects, getLatestAnalysis } from '@/lib/browser/storage';
import type { StoredProject, StoredAnalysis } from '@/types';
import ProjectCard from './ProjectCard';

interface DashboardProps {
  onSelectProject: (project: StoredProject) => void;
  onNewAnalysis: () => void;
}

export default function Dashboard({ onSelectProject, onNewAnalysis }: DashboardProps) {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [latestAnalyses, setLatestAnalyses] = useState<Map<string, StoredAnalysis>>(new Map());
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

      // Load latest analysis for each project (for health score)
      const analysisMap = new Map<string, StoredAnalysis>();
      for (const project of allProjects) {
        const latest = await getLatestAnalysis(project.name, project.path);
        if (latest) {
          analysisMap.set(project.id, latest);
        }
      }
      setLatestAnalyses(analysisMap);
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
            return (
              <ProjectCard
                key={project.id}
                project={project}
                latestAnalysis={latest}
                onClick={() => onSelectProject(project)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
