# Project Status

**Version:** 0.5.0
**Updated:** 2026-01-21

## Current State

Browser-based documentation consistency analyzer with delta tracking. Runs 100% client-side.

### Feature Matrix

| Category | Feature | Status |
|----------|---------|--------|
| **Input** | Drag-drop folder upload | ✅ |
| | File System Access API | ✅ |
| **Detection** | Broken links (files + anchors) | ✅ |
| | Broken images | ✅ |
| | Malformed links | ✅ |
| | TODO/FIXME markers | ✅ |
| | Orphaned files | ✅ |
| | Undocumented exports | ✅ |
| | Orphaned documentation | ✅ |
| | Numerical inconsistencies | ✅ |
| **Tracking** | Issue fingerprinting | ✅ |
| | Status (open/resolved/ignored) | ✅ |
| | Delta classification | ✅ |
| | Health scores | ✅ |
| **Storage** | IndexedDB persistence | ✅ |
| | Project history | ✅ |
| | Analysis runs | ✅ |
| **UI** | Dashboard with projects | ✅ |
| | Project history view | ✅ |
| | Filter by severity/type/delta | ✅ |
| | Delta badges on issues | ✅ |
| | Export (JSON/clipboard) | ✅ |

---

## Recent Work (Jan 21, 2026)

### Delta-First Analysis Engine

Compares current analysis to previous run, classifying every issue:

| Classification | Condition |
|----------------|-----------|
| **NEW** | First time seeing this issue |
| **PERSISTING** | Existed in previous run |
| **RESOLVED** | Was in previous, now gone |
| **REINTRODUCED** | Was resolved, came back |
| **IGNORED** | Marked as ignored by user |

**Files added:**
- `src/lib/browser/delta.ts` — Core delta computation
- Delta filter dropdown in IssuesTable
- Delta badges (NEW, REINTRODUCED) on issue cards
- "Since Last Run" summary in AnalysisSummary

**Health attribution:**
- `fromNewIssues` — Points lost to new issues
- `fromResolvedIssues` — Points gained from fixes
- `fromSeverityMix` — Remainder (density/coverage changes)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     page.tsx                            │
│                   (State Machine)                       │
│  dashboard → upload → analyzing → results               │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │Dashboard │    │UploadZone│    │IssuesTable│
   │ProjectCard│   │          │    │AnalysisSumm│
   └──────────┘    └──────────┘    └──────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  lib/browser/                           │
├─────────────────────────────────────────────────────────┤
│  analyzer.ts     → Main analysis orchestrator           │
│  delta.ts        → Delta computation & classification   │
│  storage.ts      → IndexedDB persistence API            │
│  fingerprint.ts  → Issue identity & health scoring      │
│  db.ts           → Low-level IndexedDB wrapper          │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
// Projects store
StoredProject { id, name, createdAt, lastAnalyzedAt, analysisCount }

// Analyses store
StoredAnalysis { id, projectId, timestamp, metadata, healthScore, runNumber }

// Issues store
StoredIssue { id, analysisId, projectId, fingerprint, type, severity, status }
```

Issues tracked by fingerprint (hash of type + file + normalized message). Status persists across re-analysis.

---

## Tech Stack

```
Framework:    Next.js 14, React 18, TypeScript
Parsing:      unified + remark-parse, @babel/parser
Storage:      IndexedDB (via custom wrapper)
Browser APIs: File System Access API
Styling:      CSS variables (no framework)
```

---

## Roadmap

### Near-term
- [ ] Re-analyze button from Dashboard
- [ ] Trend sparklines (health over time)
- [ ] Bulk issue actions (select + resolve/ignore)

### Mid-term
- [ ] External link checking (HTTP HEAD with rate limiting)
- [ ] Watch mode (file system observer)
- [ ] CI/CD JSON export format

### Future
- [ ] AI chat integration (Gemini)
- [ ] Multi-project comparison
- [ ] Team collaboration features

---

## Known Issues

1. No error boundary — crashes show blank screen
2. Large projects (10k+ files) can be slow
3. Mobile not optimized
4. No loading skeleton on Dashboard
