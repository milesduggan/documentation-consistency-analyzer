# Changelog

All notable changes to Turbo DCA 3000.

## [0.5.0] - 2026-01-21 - Delta-First Analysis Engine

### Added
- **Delta classification** — Issues classified as NEW, PERSISTING, RESOLVED, REINTRODUCED, IGNORED
- **Delta filter** — Filter issues by change status in IssuesTable
- **Delta badges** — Visual badges (NEW, REINTRODUCED) on issue cards
- **"Since Last Run" summary** — Shows issue changes and health delta
- **Health attribution** — Breakdown of score changes (new issues, resolved, severity mix)
- **Reintroduced detection** — Tracks issues that were resolved but came back

### Technical
- Created `src/lib/browser/delta.ts` — Delta computation module
- Added `DeltaClassification` type to `src/types/index.ts`
- Updated `IssuesTable.tsx` with delta filter and badges
- Updated `AnalysisSummary.tsx` with delta summary section
- Added delta-specific CSS styles

---

## [0.4.0] - 2026-01-21 - Project Persistence & History

### Added
- **Dashboard** — Grid view of all stored projects with health scores
- **Project history** — Expandable list of past analysis runs per project
- **Issue status tracking** — Mark issues as resolved/ignored
- **Status persistence** — Issue status survives re-analysis via fingerprinting
- **Health scores** — 0-100 score based on issue severity and density

### Technical
- Created `src/components/Dashboard.tsx`
- Created `src/components/ProjectCard.tsx`
- Created `src/components/ProjectHistory.tsx`
- Created `src/lib/browser/db.ts` — IndexedDB wrapper
- Created `src/lib/browser/storage.ts` — Persistence API
- Created `src/lib/browser/fingerprint.ts` — Issue hashing

---

## [0.3.0] - 2026-01-18 - Enhanced Analysis & Context

### Added
- **Analysis Summary** — Context display with metadata and explanations
- **Export utilities** — JSON download and clipboard copy
- **New detections** — Malformed links, broken images, TODO markers, orphaned files

### Technical
- Created `src/lib/browser/export.ts`
- Created `src/components/AnalysisSummary.tsx`
- Extended analyzer with 4 new detection functions

---

## [0.2.0] - 2026-01-18 - Phase 1 Web UI

### Added
- Browser-based web UI with Next.js 14
- Client-side file upload (drag-drop and file picker)
- Real-time progress tracking
- Filterable results by severity
- Broken internal link detection
- Broken anchor link detection
- File System Access API integration

### Technical
- Created core app structure (`src/app/`, `src/components/`, `src/lib/browser/`)
- Markdown parsing with unified + remark-parse

---

## [0.1.0] - 2026-01-17 - CLI MVP

### Added
- File discovery for .md, .js, .ts, .py files
- Markdown parsing with remark/unified
- Broken internal link detection
- Console and JSON output
- Configuration via config.json
