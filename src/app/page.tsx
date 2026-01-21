'use client'

import { useState, useEffect } from 'react';
import UploadZone from '@/components/UploadZone';
import IssuesTable from '@/components/IssuesTable';
import AnalysisSummary from '@/components/AnalysisSummary';
import AIChat from '@/components/AIChat';
import Sidebar from '@/components/Sidebar';
import TurboSnail from '@/components/TurboSnail';
import Dashboard from '@/components/Dashboard';
import ProjectHistory from '@/components/ProjectHistory';
import { readDirectory } from '@/lib/browser/file-reader';
import { analyzeProject } from '@/lib/browser/analyzer';
import type { AnalysisProgress, AnalysisResult } from '@/lib/browser/analyzer';
import { useTickerContext } from '@/context/TickerContext';
import { saveAnalysis, getLatestAnalysis, formatRelativeTime, getAllProjects, getIssueStatusMap, updateIssueStatus } from '@/lib/browser/storage';
import type { StoredAnalysis, StoredProject, StoredIssue } from '@/types';

type AppState = 'dashboard' | 'history' | 'upload' | 'analyzing' | 'results';
type ResultsView = 'overview' | 'results';

export default function Home() {
  const [state, setState] = useState<AppState>('dashboard');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeView, setActiveView] = useState<ResultsView>('overview');
  const [projectName, setProjectName] = useState<string>('');
  const [lastAnalysis, setLastAnalysis] = useState<StoredAnalysis | null>(null);
  const [selectedProject, setSelectedProject] = useState<StoredProject | null>(null);
  const [issueStatusMap, setIssueStatusMap] = useState<Map<string, { id: string; status: StoredIssue['status'] }>>(new Map());

  const { setTickerData } = useTickerContext();

  // Check for existing projects on mount
  useEffect(() => {
    const checkExistingProjects = async () => {
      try {
        const projects = await getAllProjects();
        if (projects.length === 0) {
          setState('upload');
        }
      } catch (err) {
        console.warn('Failed to check projects:', err);
        setState('upload');
      } finally {
        setLoadingProjects(false);
      }
    };
    checkExistingProjects();
  }, []);

  // Update ticker when state changes
  useEffect(() => {
    if (state === 'dashboard') {
      setTickerData({ mode: 'dashboard' });
    } else if (state === 'history' && selectedProject) {
      setTickerData({ mode: 'history', projectName: selectedProject.name });
    } else if (state === 'upload') {
      setTickerData({ mode: 'idle' });
    } else if (state === 'analyzing' && projectName) {
      setTickerData({ mode: 'project', projectName });
    } else if (state === 'results' && results) {
      setTickerData({
        mode: 'results',
        projectName,
        metrics: {
          totalFiles: results.metadata.totalFiles,
          markdownFiles: results.metadata.totalMarkdownFiles,
          linksChecked: results.metadata.totalLinks,
          issuesFound: results.inconsistencies.length,
          coverage: results.metadata.coveragePercentage ?? 0,
        },
      });
    }
  }, [state, results, projectName, selectedProject, setTickerData]);

  const handleFolderSelected = async (dirHandle: FileSystemDirectoryHandle) => {
    try {
      // Store project name from folder
      setProjectName(dirHandle.name);

      // Check for previous analysis
      await checkPreviousAnalysis(dirHandle.name);

      setState('analyzing');
      setError('');
      setProgress({
        step: 'Reading files',
        current: 0,
        total: 0,
        percentage: 0,
      });

      // Step 1: Read all files from directory
      const files = await readDirectory(dirHandle);

      // Step 2: Analyze project
      const analysisResults = await analyzeProject(files, (prog) => {
        setProgress(prog);
      });

      // Step 3: Save to IndexedDB
      try {
        await saveAnalysis(dirHandle.name, analysisResults);
      } catch (saveErr) {
        console.warn('Failed to save analysis to IndexedDB:', saveErr);
      }

      // Step 4: Load issue status map
      try {
        const statusMap = await getIssueStatusMap(dirHandle.name, analysisResults.inconsistencies);
        setIssueStatusMap(statusMap);
      } catch (statusErr) {
        console.warn('Failed to load issue status:', statusErr);
      }

      // Step 5: Show results
      setResults(analysisResults);
      setState('results');
      setActiveView('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setState('upload');
    }
  };

  const handleReset = () => {
    setState('dashboard');
    setResults(null);
    setProgress(null);
    setError('');
    setActiveView('overview');
    setProjectName('');
    setLastAnalysis(null);
  };

  const handleSelectProject = (project: StoredProject) => {
    setSelectedProject(project);
    setState('history');
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    setState('dashboard');
  };

  const handleNewAnalysis = () => {
    setState('upload');
  };

  const handleStatusChange = async (issueId: string, fingerprint: string, status: StoredIssue['status']) => {
    try {
      await updateIssueStatus(issueId, status);
      // Update local state
      setIssueStatusMap((prev) => {
        const updated = new Map(prev);
        updated.set(fingerprint, { id: issueId, status });
        return updated;
      });
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  // Check for previous analysis when returning to a project
  const checkPreviousAnalysis = async (name: string) => {
    try {
      const previous = await getLatestAnalysis(name);
      if (previous) {
        setLastAnalysis(previous);
      }
    } catch (err) {
      console.warn('Failed to load previous analysis:', err);
    }
  };

  // Dashboard State
  if (state === 'dashboard' && !loadingProjects) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header-logo">
          <TurboSnail size={60} />
        </header>
        <Dashboard
          onSelectProject={handleSelectProject}
          onNewAnalysis={handleNewAnalysis}
        />
      </div>
    );
  }

  // History State
  if (state === 'history' && selectedProject) {
    return (
      <ProjectHistory
        project={selectedProject}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Upload State
  if (state === 'upload') {
    return (
      <div className="upload-page">
        <header className="upload-header">
          <TurboSnail size={80} />
          <p className="welcome-text">Welcome to The Turbo DCA 3000, now drop those files</p>
        </header>

        <UploadZone onFolderSelected={handleFolderSelected} />

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    );
  }

  // Analyzing State
  if (state === 'analyzing' && progress) {
    return (
      <div className="analyzing-page">
        <h2>Analyzing Project...</h2>
        <p className="analyzing-step">{progress.step}</p>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress.percentage}%` }}
          >
            {progress.percentage}%
          </div>
        </div>

        <p className="progress-files">
          {progress.current} / {progress.total} files
        </p>
      </div>
    );
  }

  // Results State - Two-panel layout with sidebar
  if (state === 'results' && results) {
    return (
      <div className="app-layout">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          issueCount={results.inconsistencies.length}
          onReset={handleReset}
        />

        <main className="main-content">
          {activeView === 'overview' ? (
            <div className="overview-page">
              {/* Wide stats banner at top */}
              <div className="stats-banner">
                {lastAnalysis && (
                  <div className="stat-item stat-item--history">
                    <span className="stat-value stat-value--small">
                      {lastAnalysis.runNumber > 1 ? `Run #${lastAnalysis.runNumber}` : 'First Run'}
                    </span>
                    <span className="stat-label">
                      Last: {formatRelativeTime(lastAnalysis.timestamp)}
                    </span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-value">{results.metadata.totalFiles}</span>
                  <span className="stat-label">Total Files</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{results.metadata.totalMarkdownFiles}</span>
                  <span className="stat-label">Markdown Files</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{results.metadata.totalLinks}</span>
                  <span className="stat-label">Links Checked</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{results.inconsistencies.length}</span>
                  <span className="stat-label">Issues Found</span>
                </div>
                {results.metadata.coveragePercentage !== undefined && (
                  <div className="stat-item">
                    <span className="stat-value">{results.metadata.coveragePercentage}%</span>
                    <span className="stat-label">Doc Coverage</span>
                  </div>
                )}
              </div>

              {/* Analysis Summary */}
              <AnalysisSummary results={results} />

              {/* AI Assistant - Wide Section */}
              <div className="ai-section">
                <AIChat results={results} onClose={() => {}} isWideMode={true} />
              </div>
            </div>
          ) : (
            <div className="results-page">
              <IssuesTable
                inconsistencies={results.inconsistencies}
                onReset={handleReset}
                issueStatusMap={issueStatusMap}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
