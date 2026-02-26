'use client'

import { useTickerContext } from '@/context/TickerContext';

export default function StatsTicker() {
  const { tickerData } = useTickerContext();

  // Dashboard mode - single full-width ticker
  if (tickerData.mode === 'dashboard') {
    return (
      <div className="stats-ticker stats-ticker--single">
        <div className="stats-ticker__rows">
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">THE TURBO DCA 3000 ▪ PROJECT DASHBOARD</span>
          </div>
        </div>
      </div>
    );
  }

  // History mode - single full-width ticker with project name
  if (tickerData.mode === 'history') {
    return (
      <div className="stats-ticker stats-ticker--single">
        <div className="stats-ticker__rows">
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">
              THE TURBO DCA 3000 ▪ HISTORY ▪ {tickerData.projectName?.toUpperCase() || 'PROJECT'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Idle mode - single full-width ticker with merged content
  if (tickerData.mode === 'idle') {
    return (
      <div className="stats-ticker stats-ticker--single">
        <div className="stats-ticker__rows">
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">THE TURBO DCA 3000 ▪ READY</span>
          </div>
        </div>
      </div>
    );
  }

  // Project mode - single full-width ticker with merged content
  if (tickerData.mode === 'project') {
    return (
      <div className="stats-ticker stats-ticker--single">
        <div className="stats-ticker__rows">
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">
              THE TURBO DCA 3000 ▪ ANALYZING ▪ {tickerData.projectName?.toUpperCase() || 'LOADING'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Results mode - no logo, metrics scroll full width
  if (tickerData.mode === 'results' && tickerData.metrics) {
    const { metrics } = tickerData;
    return (
      <div className="stats-ticker stats-ticker--multi stats-ticker--full">
        <div className="stats-ticker__rows">
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">TOTAL FILES: {metrics.totalFiles}</span>
          </div>
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">MARKDOWN FILES: {metrics.markdownFiles}</span>
          </div>
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">LINKS CHECKED: {metrics.linksChecked}</span>
          </div>
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">ISSUES FOUND: {metrics.issuesFound}</span>
          </div>
          <div className="stats-ticker__row">
            <span className="stats-ticker__content">DOC COVERAGE: {metrics.coverage}%</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
