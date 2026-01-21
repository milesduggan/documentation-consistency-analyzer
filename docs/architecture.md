# Architecture

## Overview

Turbo DCA 3000 is a browser-based documentation analyzer. All processing happens client-side using the File System Access API.

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    page.tsx                          │   │
│  │              (Application State Machine)             │   │
│  │   dashboard → upload → analyzing → results           │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│           ┌───────────────┼───────────────┐                 │
│           ▼               ▼               ▼                 │
│    ┌──────────┐    ┌──────────┐    ┌──────────────┐        │
│    │Dashboard │    │UploadZone│    │ Results View │        │
│    │ProjectCard│   │          │    │ IssuesTable  │        │
│    │          │    │          │    │ AnalysisSumm │        │
│    └──────────┘    └──────────┘    └──────────────┘        │
│           │               │               │                  │
│           └───────────────┼───────────────┘                 │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  lib/browser/                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  file-reader.ts  │ File System Access API wrapper   │   │
│  │  analyzer.ts     │ Main analysis orchestrator       │   │
│  │  delta.ts        │ Delta computation & classification│   │
│  │  storage.ts      │ IndexedDB persistence API        │   │
│  │  fingerprint.ts  │ Issue identity & health scoring  │   │
│  │  db.ts           │ Low-level IndexedDB wrapper      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    IndexedDB                         │   │
│  │   projects │ analyses │ issues                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Analysis Flow

```
1. User drops folder
   └─→ File System Access API grants permission

2. file-reader.ts reads directory
   └─→ Filters by extension (.md, .ts, .js, .py)
   └─→ Excludes node_modules, .git, dist, etc.

3. analyzer.ts processes files
   └─→ Parse Markdown (unified + remark)
   └─→ Parse code (Babel for JS/TS)
   └─→ Run detection passes:
       ├─→ Broken links (internal + anchors)
       ├─→ Broken images
       ├─→ TODO/FIXME markers
       ├─→ Orphaned files
       ├─→ Undocumented exports
       ├─→ Orphaned documentation
       └─→ Numerical inconsistencies

4. storage.ts persists results
   └─→ Save to IndexedDB
   └─→ Compute health score

5. delta.ts computes changes
   └─→ Compare to previous run
   └─→ Classify issues (NEW/PERSISTING/RESOLVED/etc.)
```

### Persistence Flow

```
IndexedDB Stores:
├─→ projects: { id, name, createdAt, lastAnalyzedAt, analysisCount }
├─→ analyses: { id, projectId, timestamp, metadata, healthScore, runNumber }
└─→ issues:   { id, analysisId, projectId, fingerprint, type, severity, status }
```

Issues are identified by fingerprint (SHA-256 hash of type + file + normalized message). This enables:
- Status persistence across re-analysis
- Delta detection (NEW vs PERSISTING)
- Reintroduced issue tracking

## Key Components

### page.tsx — State Machine

Manages application state transitions:
- `dashboard` → Show stored projects
- `upload` → File picker interface
- `analyzing` → Progress display
- `results` → Issues and summary

### analyzer.ts — Analysis Engine

Orchestrates all detection passes:
- Parallel file reading with concurrency limits
- AST-based parsing (Markdown, JS/TS)
- Progress callbacks for UI updates

### delta.ts — Delta Computation

Compares current analysis to previous run:
```typescript
type DeltaClassification =
  | 'new'          // First time seeing this
  | 'persisting'   // Existed in previous run
  | 'resolved'     // Was in previous, now gone
  | 'reintroduced' // Was resolved, came back
  | 'ignored';     // User marked as ignored
```

### fingerprint.ts — Issue Identity

Generates stable identifiers for issues:
```typescript
// Fingerprint = SHA-256(type + file + normalizedMessage)
async function generateIssueFingerprint(issue: Inconsistency): Promise<string>
```

### storage.ts — Persistence API

High-level API for IndexedDB operations:
- `saveAnalysis()` — Store analysis results
- `getAnalysisHistory()` — Fetch past runs
- `updateIssueStatus()` — Mark resolved/ignored
- `getIssueStatusMap()` — Load status for current issues

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14, React 18, TypeScript |
| Parsing | unified + remark-parse, @babel/parser |
| Storage | IndexedDB |
| Browser APIs | File System Access API |
| Styling | CSS variables (no framework) |

## Browser Constraints

**Supported:** Chrome 86+, Edge 86+, Opera 72+

**Not Supported:** Firefox, Safari (File System Access API unavailable)

## Performance Considerations

- Files read in parallel with concurrency limit (100)
- Large files (>10MB) streamed
- AST parsing uses worker threads where available
- IndexedDB operations batched
- Fingerprint hashing uses Web Crypto API

## Security Model

- **No server** — All processing client-side
- **No uploads** — Files stay on user's machine
- **No API keys required** — Core functionality works offline
- **LocalStorage/IndexedDB** — Data stays in browser
