'use client'

interface SidebarProps {
  activeView: 'overview' | 'results';
  onViewChange: (view: 'overview' | 'results') => void;
  issueCount: number;
  onReset: () => void;
}

export default function Sidebar({ activeView, onViewChange, issueCount, onReset }: SidebarProps) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`sidebar-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => onViewChange('overview')}
        >
          <span className="sidebar-tab-icon">📊</span>
          <span className="sidebar-tab-text">Analysis Overview</span>
        </button>

        <button
          className={`sidebar-tab ${activeView === 'results' ? 'active' : ''}`}
          onClick={() => onViewChange('results')}
        >
          <span className="sidebar-tab-icon">📋</span>
          <span className="sidebar-tab-text">Analysis Results</span>
          {issueCount > 0 && (
            <span className="sidebar-tab-badge">{issueCount}</span>
          )}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button onClick={onReset} className="sidebar-reset-btn">
          🔄 Analyze New Project
        </button>
      </div>
    </aside>
  );
}
