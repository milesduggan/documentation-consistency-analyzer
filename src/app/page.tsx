'use client'

import { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import IssuesTable from '@/components/IssuesTable';
import AnalysisSummary from '@/components/AnalysisSummary';
import AIChat from '@/components/AIChat';
import Sidebar from '@/components/Sidebar';
import { readDirectory } from '@/lib/browser/file-reader';
import { analyzeProject, AnalysisProgress, AnalysisResult } from '@/lib/browser/analyzer';

type AppState = 'upload' | 'analyzing' | 'results';
type ResultsView = 'overview' | 'results';

export default function Home() {
  const [state, setState] = useState<AppState>('upload');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeView, setActiveView] = useState<ResultsView>('overview');

  const handleFolderSelected = async (dirHandle: FileSystemDirectoryHandle) => {
    try {
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

      // Step 3: Show results
      setResults(analysisResults);
      setState('results');
      setActiveView('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setState('upload');
    }
  };

  const handleReset = () => {
    setState('upload');
    setResults(null);
    setProgress(null);
    setError('');
    setActiveView('overview');
  };

  // Upload State
  if (state === 'upload') {
    return (
      <div className="upload-page">
        <header className="upload-header">
          <h1>The Turbo DCA 3000</h1>
          <p>Analyze your project for broken links and documentation issues</p>
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
              />
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
