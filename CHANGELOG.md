# Changelog

All notable changes to the Documentation Consistency Analyzer will be documented in this file.

## [0.4.0] - 2026-02-25 - Dashboard, Persistence & Team Features ✅

### Added
- **Project Dashboard** - Multi-project management view
  - Project cards with health scores and trend sparklines
  - Re-analyze projects from dashboard
  - Empty state with onboarding prompt
- **IndexedDB Persistence** - All data survives browser refresh
  - Projects, analyses, and issues stored locally
  - Issue fingerprinting for stable identity across runs
  - Health score calculation (0-100) based on severity and coverage
- **Delta Tracking** - See what changed between analysis runs
  - NEW, PERSISTING, RESOLVED, REINTRODUCED classifications
  - Regression alerts for new HIGH severity issues
  - Health score delta with attribution
- **Issue Assignment** - Team triage support
  - Inline editable assignee per issue
  - Filter by assignee (All / Unassigned / specific person)
  - Assignments persist in IndexedDB
- **Project History** - View past analysis runs with trends
- **Enhanced Export** - CI/CD report format with thresholds
- **External Link Checker** - Validates HTTP/HTTPS URLs
- **Stats Ticker** - Real-time analysis metrics in header
- **8 Detection Types** (2 new)
  - Undocumented exports (code without docs)
  - Orphaned documentation (docs referencing removed code)

### Technical
- 18 new files, 12 modified files
- New: db.ts, storage.ts, delta.ts, fingerprint.ts, crypto.ts
- New: Dashboard.tsx, ProjectCard.tsx, ProjectHistory.tsx, Sparkline.tsx
- New: StatsTicker.tsx, TurboSnail.tsx, Providers.tsx, TickerContext.tsx
- Modified: page.tsx, IssuesTable.tsx, AnalysisSummary.tsx, analyzer.ts
- Removed file-watcher and streaming-reader dependencies (unused)

### Improved
- Sidebar navigation between Overview and Results views
- Bulk issue status changes (resolve/ignore multiple)
- Issue status persistence (open/resolved/ignored)
- Confidence scoring per issue type

---

## [0.3.0] - 2026-01-18 - Enhanced Analysis & Context Summary ✅

### Added
- **Analysis Summary Component** - Comprehensive context display
  - Analysis metadata (timestamp, files scanned, links checked)
  - Plain English descriptions of each detection type
  - Collapsible "What Was Checked" section explaining all 6 checks
  - Collapsible Severity Guide (High/Medium/Low explanations)
  - Export functionality (Download JSON, Copy Summary)
- **Export Utilities** - New export module
  - JSON download with formatted results
  - Copy summary to clipboard (text format)
  - Human-readable summary generation
- **Enhanced Detection Types**
  - Malformed links (empty URLs, missing text)
  - Broken image links
  - TODO/FIXME markers in documentation
  - Orphaned files (not linked from anywhere)

### Technical
- Created `src/lib/browser/export.ts` - Export utility functions
- Created `src/components/AnalysisSummary.tsx` - Summary display component
- Modified `src/app/page.tsx` - Integrated summary component
- Modified `src/app/globals.css` - Added summary card styling
- Modified `src/lib/browser/analyzer.ts` - Added 4 new detection functions
- Modified `src/types/index.ts` - Added new inconsistency types

### Improved
- Better context for understanding analysis results
- Results page now explains what each check does
- Users can review analysis details later with full context
- Severity levels clearly explained with examples

### Detection Summary (6 Total Types)
1. **Broken Links** - Missing files or invalid anchors
2. **Malformed Links** - Empty URLs or missing link text
3. **Broken Images** - Missing image files
4. **TODO Markers** - TODO, FIXME, XXX, HACK comments
5. **Orphaned Files** - Markdown files with no incoming links
6. **Broken Anchors** - Missing heading references

---

## [0.2.0] - 2026-01-18 - Phase 1 Web UI Complete ✅

### Added
- Browser-based web UI with Next.js 14
- Client-side file upload (drag-drop and file picker)
- Real-time progress tracking during analysis
- Filterable results table by severity (high/medium/low)
- Broken internal link detection for Markdown files
- Broken anchor link detection (missing headings)
- File System Access API integration
- Browser compatibility checking

### Technical
- Created `src/app/layout.tsx` - Next.js root layout
- Created `src/app/page.tsx` - Main UI orchestrator
- Created `src/app/globals.css` - Global styles with severity colors
- Created `src/lib/browser/file-reader.ts` - File System Access API wrapper
- Created `src/lib/browser/analyzer.ts` - Browser-compatible analysis engine
- Created `src/components/UploadZone.tsx` - Upload interface
- Created `src/components/IssuesTable.tsx` - Results display with filtering

### Documentation
- Updated README.md to reflect Phase 1 scope
- Added ADR-009 documenting web UI scope decision
- Updated browser compatibility information

### Supported Browsers
- Chrome 86+
- Edge 86+
- Opera 72+

### Known Limitations
- Firefox and Safari not supported (File System Access API unavailable)
- No AI-powered semantic analysis (planned for Phase 2)
- No code comment extraction yet (planned for Phase 2)

---

## [0.1.0] - 2026-01-17 - CLI MVP Complete

### Added
- File discovery for .md, .js, .ts, .py files
- Markdown parsing with remark/unified
- Broken internal link detection
- Console and JSON output
- Configuration via config.json
- Directory exclusion (node_modules, .git, dist, build, .next, coverage)

### Technical
- CLI entry point: `src/cli.ts`
- File discovery: `src/lib/input/file-discovery.ts`
- Markdown parser: `src/lib/parse/markdown-parser.ts`
- Link validator: `src/lib/analyze/link-validator.ts`
- JSON formatter: `src/lib/output/json-formatter.ts`
