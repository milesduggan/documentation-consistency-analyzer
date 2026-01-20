# Architecture Documentation

## Overview
The Documentation Consistency Analyzer is an internal-use web application designed to evaluate software project documentation for completeness, accuracy, and consistency. It ingests a software project folder or repository, aggregates all documentation and code comments, and identifies inconsistencies across files.

This document provides a **high-level blueprint** of the system, describing the flow of data, responsibilities of each component, and reasoning behind design choices. It is intended for both **human and AI agent understanding**, ensuring clarity, auditability, and extensibility.

---

## Phase 1 Implementation Status (COMPLETE) ✅

**Delivered:** Browser-based Markdown link validation tool
**Date Completed:** 2026-01-18

### What Was Built

**Web UI (7 files):**
1. `src/app/layout.tsx` - Next.js root layout with metadata
2. `src/app/page.tsx` - Main UI orchestrator (upload → analyzing → results)
3. `src/app/globals.css` - Global styles with CSS variables for severity colors
4. `src/lib/browser/file-reader.ts` - File System Access API wrapper
5. `src/lib/browser/analyzer.ts` - Browser-compatible analysis engine
6. `src/components/UploadZone.tsx` - Upload interface (drag-drop + file picker)
7. `src/components/IssuesTable.tsx` - Results table with severity filtering

**Features Implemented:**
- ✅ Client-side file upload (no server, files stay local)
- ✅ Drag-drop folder support
- ✅ File picker dialog (File System Access API)
- ✅ Recursive directory reading with exclusions
- ✅ Markdown parsing with `unified` + `remark-parse`
- ✅ Broken internal link detection
- ✅ Broken anchor link detection (missing headings)
- ✅ Real-time progress tracking
- ✅ Filterable results by severity (high/medium/low)
- ✅ Expandable rows for details/suggestions
- ✅ Browser compatibility checking

**Technical Approach:**
- **Client-side only:** All processing happens in browser, no backend
- **File System Access API:** Reads directories without uploading
- **Same parsing logic as CLI:** Reused `unified`/`remark` from CLI implementation
- **Performance:** Parallel file reading, efficient AST traversal

**Browser Support:**
- Chrome 86+ ✅
- Edge 86+ ✅
- Opera 72+ ✅
- Firefox ❌ (File System Access API not available)
- Safari ❌ (File System Access API not available)

**Deferred to Phase 2:**
- AI-powered semantic analysis
- Code comment extraction
- Duplicate content detection
- Conflicting statement detection
- Download JSON report feature

---

## System Goals (Phase 2+)
- Ensure documentation accurately reflects the codebase and internal processes
- Detect conflicts, gaps, redundancies, and outdated information automatically
- Provide actionable, structured insights for development teams
- Support iterative improvements in documentation quality
- Maintain a modular and extensible architecture for future enhancements
- Achieve high performance while maintaining accuracy
- Support both rule-based and AI-powered analysis approaches

---

## Non-Goals & Scope Boundaries

### MVP Explicitly Does NOT Include:
- **External release or production deployment** - Internal use only
- **Multi-user collaboration features** - Single-user for MVP
- **Real-time analysis** - Batch processing acceptable
- **Code quality analysis** - Focus is documentation, not code correctness
- **Automated documentation generation** - Analysis only, not creation
- **Support for all programming languages** - MVP: Markdown, JS/TS/Python comments
- **Database persistence** - File-based storage for MVP
- **Authentication/authorization** - Local tool, no user management needed

### Future Considerations (Post-MVP):
- Multi-user support and team collaboration
- Real-time watch mode for continuous analysis
- CI/CD integration
- Additional language support (Java, Go, Rust, etc.)
- Historical trending and comparison across runs
- API for external tool integration

---

## Glossary
- **Inconsistency:** Any conflict, gap, or mismatch detected across documentation sources or between documentation and code.
- **Normalized Document:** A representation of all collected documentation in a standard format suitable for automated analysis.
- **Content Object:** A structured representation of a single document or code comment, including metadata (source file, location, type).
- **Embedding:** A high-dimensional vector representation of text content used for semantic similarity analysis.
- **Rule-Based Detection:** Pattern matching and structural analysis using predefined rules (e.g., broken links, version mismatches).
- **Semantic Analysis:** AI-powered analysis using embeddings to detect conceptual inconsistencies and contradictions.
- **Confidence Score:** A numerical rating (0-1) indicating how certain the system is that a detected issue is a true inconsistency.

---

## Technology Stack & Rationale

### Frontend
- **Framework:** Next.js 14+ with React 18+
- **Rationale:** Combines frontend and backend in single framework, excellent developer experience, built-in routing and API routes, optimized for performance
- **UI Library:** React with Tailwind CSS for styling
- **State Management:** React Context API (simple enough for MVP, can upgrade to Zustand if needed)

### Backend
- **Runtime:** Node.js 18+ (integrated with Next.js)
- **Rationale:** Excellent npm ecosystem for parsing tools, async I/O perfect for file processing, worker threads for CPU-intensive tasks
- **API Design:** REST endpoints built with Next.js API routes

### File Parsing & AST Generation
- **JavaScript/TypeScript:** `@babel/parser` or `typescript` compiler API
- **Python:** `tree-sitter` with Python grammar
- **Markdown:** `remark` / `unified` ecosystem
- **Rationale:** Mature, well-maintained libraries with good performance and accurate parsing

### Analysis & Detection

**Rule-Based Detection:**
- **Link Validation:** Custom implementation using URL parsing and file system checks
- **Pattern Matching:** Native JavaScript regex (compiled once, reused)
- **Cross-References:** Custom indexing with hash maps for O(1) lookup

**AI-Powered Semantic Analysis:**
- **Primary:** OpenAI Embeddings API (text-embedding-3-small, 384d or 1536d)
- **Alternative:** Local sentence-transformers via Python bridge (offline capability)
- **Fallback:** TF-IDF for basic similarity (no external dependencies)
- **Rationale:** Hybrid approach balances cost, performance, and accuracy

**Similarity Search:**
- **Vector Database:** FAISS (Facebook AI Similarity Search) for fast nearest-neighbor queries
- **Rationale:** O(log n) similarity search vs O(n²) naive comparison

### Storage
- **MVP:** File system (JSON for results, cache files for embeddings/parsed ASTs)
- **Cache:** LRU cache in memory + persistent file cache with content-based hashing
- **Future:** Consider SQLite for structured queries or PostgreSQL for multi-user phase

### Build & Development Tools
- **Package Manager:** npm or pnpm (faster installs)
- **TypeScript:** For type safety and better DX
- **Linting/Formatting:** ESLint + Prettier
- **Testing:** Jest for unit tests, Playwright for E2E

### Monitoring & Profiling
- **Logging:** Winston or Pino for structured logging
- **Profiling:** Built-in Node.js profiler, Chrome DevTools, clinic.js
- **Metrics:** Custom instrumentation with `performance.mark()`

---

## Data Flow Overview

### End-to-End Journey: Project Input → Inconsistency Report

```
1. INPUT LAYER
   ↓ User provides project folder/repository path
   ↓ System validates path and access permissions
   ↓ Discovers all relevant files (docs, source code)

2. AGGREGATION LAYER
   ↓ Reads file contents in parallel (concurrency-limited)
   ↓ Labels each file by type (README, docs, code, comments)
   ↓ Creates Content Objects with metadata

3. PARSING & NORMALIZATION LAYER
   ↓ Parses Markdown files → structured content
   ↓ Parses code files → AST → extracts comments/docstrings
   ↓ Normalizes text (remove formatting, tokenize, clean)
   ↓ Stores normalized content + original source references

4. ANALYSIS & DETECTION LAYER (Multi-Pass)

   PASS 1: Structural Analysis (Fast, Rule-Based)
   ↓ Validate internal links and cross-references
   ↓ Check for broken URLs
   ↓ Detect version number mismatches
   ↓ Find TODO/FIXME in docs vs code

   PASS 2: Content Extraction (Indexing)
   ↓ Build term frequency index
   ↓ Extract key entities (function names, APIs, concepts)
   ↓ Create cross-reference map

   PASS 3: Cross-Document Consistency (Rule-Based)
   ↓ Compare duplicate sections across files
   ↓ Detect contradictory statements (simple pattern matching)
   ↓ Find missing sections (e.g., function documented but not in code)

   PASS 4: Semantic Analysis (AI-Powered, Slower)
   ↓ Generate embeddings for documentation chunks
   ↓ Compute semantic similarity across documents
   ↓ Detect conceptual inconsistencies and contradictions
   ↓ Identify completeness gaps (mentioned but not explained)

5. OUTPUT & REPORTING LAYER
   ↓ Aggregate all detected inconsistencies
   ↓ Assign severity levels (critical, warning, info)
   ↓ Calculate confidence scores
   ↓ Group by type and location
   ↓ Generate actionable recommendations
   ↓ Stream results to UI as they're ready (progressive loading)

6. USER INTERFACE
   ↓ Display real-time progress indicators
   ↓ Show filterable/sortable results table
   ↓ Provide jump-to-source links
   ↓ Allow export (JSON, CSV, PDF)
```

### Caching & Optimization Flow
- File content hash → Check cache → Cache hit? Use cached results : Reprocess
- Incremental analysis: Git diff → Only analyze changed files
- Embedding cache: File hash + chunk → Reuse embeddings if unchanged

---

## System Architecture

### Processing Pipeline

#### 1. Input Layer

**Purpose:** Collects the source data for analysis

**Inputs:**
- Local project folders (absolute or relative paths)
- Remote repositories (future: GitHub URL integration)

**Responsibilities:**
- Validate project path and read permissions
- Discover relevant documentation files (`README.md`, `docs/`, `*.md`)
- Discover all source code files for comment extraction
- Accept multiple file types and programming languages (MVP: JS/TS/Python)
- Filter out excluded files (`.gitignore`, binary files, `node_modules`)
- Handle various text encodings (UTF-8, UTF-16, Latin-1)

**Technology:**
- `fast-glob` for efficient file discovery with glob patterns
- `chardet` for encoding detection
- `ignore` library to respect `.gitignore` rules

**Outputs:**
- List of file paths with metadata (type, size, encoding, modification time)
- Organized by category (documentation, code, configuration)

**Error Handling:**
- Gracefully skip inaccessible files (log warning, continue)
- Handle symbolic links (follow once, detect circular refs)
- Timeout for very large directories (>100k files)

**Performance Considerations:**
- Async file system operations (no blocking)
- Parallel directory traversal
- Early filtering to avoid processing irrelevant files
- Target: 10k+ files discovered in <2 seconds

---

#### 2. Aggregation Layer

**Purpose:** Gather and centralize documentation content

**Processes:**
- Read file contents in parallel (concurrency limit: 100 simultaneous)
- Label sources (README, internal docs, code comment, docstring) for traceability
- Handle conflicting or duplicate files by storing all variants with source info
- Stream large files (>10MB) instead of loading into memory
- Detect and handle binary files (skip with warning)

**Technology:**
- `fs.promises` with `Promise.all` + concurrency limiting (`p-limit`)
- Streaming API (`fs.createReadStream`) for large files
- File type detection with `file-type` library

**Outputs:**
- Collection of Content Objects:
  ```typescript
  interface ContentObject {
    id: string; // Unique identifier (hash-based)
    filePath: string; // Absolute path to source file
    fileName: string; // Base name for display
    fileType: 'markdown' | 'code' | 'config' | 'other';
    language?: 'javascript' | 'typescript' | 'python';
    content: string; // Raw file contents
    encoding: string; // Detected encoding
    size: number; // File size in bytes
    modifiedTime: Date; // Last modification timestamp
    contentHash: string; // SHA-256 hash for caching
    category: 'documentation' | 'code-comment' | 'readme' | 'config';
  }
  ```

**Error Handling:**
- Skip unparseable files (corrupted, wrong encoding) with detailed logs
- Partial read recovery for truncated files
- Memory overflow protection (skip files >100MB with warning)

**Why it matters:**
- Ensures no source of documentation is overlooked
- Creates a single point of truth for downstream analysis
- Enables content-based caching and incremental analysis

**Performance Considerations:**
- Batch file reads in chunks of 100
- Monitor memory usage, clear processed files from memory
- Use WeakMap for temporary caches to allow GC
- Target: 1000 files read and aggregated in <10 seconds

---

#### 3. Parsing & Normalization Layer

**Purpose:** Prepare aggregated content for automated analysis

**Processes:**
- Parse documentation files (Markdown → AST → structured content)
- Parse code files → AST → extract comments and docstrings
- Remove formatting, code artifacts, and irrelevant symbols
- Convert all text into consistent, comparable format (tokenization, lowercase, trim)
- Maintain metadata for source location, context, and original formatting
- Handle edge cases (code blocks in docs, documentation in strings)

**Technology:**

**Markdown Parsing:**
- `unified` + `remark-parse` for Markdown AST
- `remark-stringify` for normalized output
- Custom plugins for extracting links, code blocks, headings

**Code Parsing:**
- JavaScript/TypeScript: `@babel/parser` with comment extraction plugin
- Python: `tree-sitter-python` for AST generation + comment extraction
- Regex fallback for simple comment patterns (less accurate but faster)

**Normalization:**
- Text cleaning: Remove extra whitespace, normalize quotes
- Tokenization: Split on word boundaries, preserve technical terms
- Stopword removal: Optional, configurable (can reduce embedding size)
- Stemming/Lemmatization: Optional via `natural` library

**Outputs:**
- Normalized Content Objects:
  ```typescript
  interface NormalizedContent {
    sourceId: string; // Reference to original ContentObject
    originalText: string; // Pre-normalization text
    normalizedText: string; // Cleaned, tokenized text
    tokens: string[]; // Individual tokens for indexing
    structure: {
      headings?: HeadingNode[]; // For Markdown
      links?: LinkNode[]; // Internal/external references
      codeBlocks?: CodeBlockNode[]; // Embedded code
      comments?: CommentNode[]; // Extracted from source code
    };
    embeddings?: number[]; // Generated in Pass 4 of analysis
    metadata: {
      lineNumbers: [number, number]; // Start, end in original file
      contextBefore?: string; // Surrounding text for context
      contextAfter?: string;
    };
  }
  ```

**Error Handling:**
- Graceful degradation: If AST parsing fails, fallback to regex
- Partial parsing: Extract what's possible, skip malformed sections
- Encoding errors: Try multiple encodings before giving up

**Performance Considerations:**
- Use worker threads for CPU-intensive parsing (offload from main thread)
- Reuse parser instances (avoid re-initialization overhead)
- Cache parsed ASTs with content hash invalidation
- Streaming parsers for large files
- Target: 1000 files parsed in <30 seconds

---

#### 4. Analysis & Detection Layer

**Purpose:** Identify inconsistencies through hybrid rule-based and AI-powered analysis

**Multi-Pass Analysis Strategy:**

##### Pass 1: Structural Analysis (Fast, Rule-Based)

**Detects:**
- Broken internal links (references to non-existent files/sections)
- Broken external URLs (HTTP requests with timeout)
- Version number mismatches across files
- Outdated timestamps/dates in documentation
- TODO/FIXME comments in docs vs code (flag undocumented TODOs)
- Missing required sections (README without usage, etc.)

**Technology:**
- Custom link validator with path resolution
- `axios` or `node-fetch` for URL validation (with caching)
- Regex patterns for version numbers, dates
- Fast hash map lookups for cross-references

**Performance:** <5 seconds for 1000 files

##### Pass 2: Content Extraction & Indexing

**Builds:**
- Inverted index (term → list of documents containing it)
- Entity extraction (function names, class names, API endpoints)
- Cross-reference map (what documents mention what concepts)
- TF-IDF scores for all documents

**Technology:**
- Custom indexing with JavaScript Maps
- Simple NER (Named Entity Recognition) using regex patterns
- TF-IDF calculation with `natural` library

**Purpose:** Enables fast lookups for Pass 3 and provides baseline for semantic analysis

**Performance:** <10 seconds for 1000 files

##### Pass 3: Cross-Document Consistency (Rule-Based)

**Detects:**
- Duplicate sections with different content (conflicting information)
- Contradictory statements (simple pattern: "X is true" vs "X is false")
- Missing cross-references (function mentioned in docs but not in code)
- Redundant explanations (same info in multiple places)
- Completeness gaps (mentioned concept without definition)

**Technology:**
- Exact string matching for duplicates
- Levenshtein distance for fuzzy matching (typos, similar terms)
- Pattern matching for contradictions ("not", "don't", negations)
- Index lookups for cross-reference validation

**Performance:** <15 seconds for 1000 files

##### Pass 4: Semantic Analysis (AI-Powered)

**Detects:**
- Conceptual inconsistencies (same idea explained differently)
- Contradictions not caught by rules (subtle semantic differences)
- Completeness gaps (implied but not stated information)
- Outdated information (docs don't match current code concepts)
- Misleading statements (technically correct but confusing)

**Technology & Implementation:**

**Embedding Generation:**
```typescript
interface EmbeddingConfig {
  provider: 'openai' | 'local' | 'tfidf';
  model: string; // e.g., 'text-embedding-3-small'
  dimensions: 384 | 1536; // Smaller for speed, larger for accuracy
  batchSize: number; // Chunks per API call (default: 50)
  chunkSize: number; // Tokens per chunk (default: 512)
  chunkOverlap: number; // Overlap between chunks (default: 50)
}
```

**Chunking Strategy:**
- Smart chunking by semantic boundaries (paragraphs, sections, not arbitrary chars)
- Maintain context with overlapping chunks
- Store chunk → source location mapping for traceability

**Caching:**
```typescript
interface EmbeddingCache {
  key: string; // Hash of (content + model + config)
  embedding: number[]; // Cached vector
  createdAt: Date; // For cache expiration
  fileHash: string; // Content hash for invalidation
}
```

**Similarity Search:**
- Use FAISS for vector indexing (install via `faiss-node` or Python bridge)
- Approximate nearest neighbors with HNSW algorithm
- Cosine similarity for comparing embeddings
- Threshold tuning: 0.8+ = likely duplicate, 0.6-0.8 = related, <0.6 = unrelated

**Cost Optimization:**
- Batch API calls (50 chunks per request)
- Deduplicate identical text chunks before embedding
- Selective embedding (prioritize documentation over code comments)
- Local model fallback if API budget exceeded
- Cache embeddings aggressively

**Performance:**
- API calls: ~50ms per chunk (batched), 200 chunks/sec
- Local models: ~200ms per chunk, 5 chunks/sec
- Similarity search with FAISS: <1ms per comparison
- Target: 1000 docs with embeddings in <2 minutes (API) or <15 minutes (local)

##### Confidence Scoring

**Each inconsistency receives:**
```typescript
interface Inconsistency {
  id: string;
  type: 'broken-link' | 'contradiction' | 'duplicate' | 'missing-ref' | 'semantic-gap' | 'outdated';
  severity: 'critical' | 'warning' | 'info';
  confidence: number; // 0-1, how sure we are this is real
  location: {
    filePath: string;
    lineNumbers: [number, number];
    context: string; // Surrounding text
  };
  relatedLocations?: Location[]; // For cross-file inconsistencies
  description: string; // Human-readable explanation
  suggestion?: string; // Recommended fix
  evidence: {
    rule?: string; // Which rule detected this
    similarityScore?: number; // For semantic analysis
    patternMatched?: string; // For regex detections
  };
}
```

**Confidence calculation:**
- Rule-based detections: High confidence (0.9-1.0) for exact matches
- Fuzzy matches: Medium (0.6-0.8) based on edit distance
- Semantic analysis: Variable (0.5-0.9) based on similarity scores and context

---

#### 5. Output & Reporting Layer

**Purpose:** Present analysis results in actionable, user-friendly format

**Processes:**
- Aggregate all inconsistencies from 4 analysis passes
- Group by type, severity, file, or custom criteria
- Sort by priority (severity × confidence)
- Generate summary statistics (total issues, by category, coverage %)
- Create actionable recommendations
- Export in multiple formats (JSON, CSV, PDF, HTML)
- Stream results to UI progressively (don't wait for full completion)

**Report Structure:**
```typescript
interface AnalysisReport {
  metadata: {
    projectPath: string;
    analyzedAt: Date;
    totalFiles: number;
    analyzedFiles: number;
    skippedFiles: number;
    analysisTime: {
      parsing: number; // ms
      ruleBasedAnalysis: number;
      semanticAnalysis: number;
      total: number;
    };
  };
  summary: {
    totalInconsistencies: number;
    bySeverity: { critical: number; warning: number; info: number };
    byType: Record<string, number>;
    coveragePercent: number; // % of project analyzed
  };
  inconsistencies: Inconsistency[]; // Sorted by priority
  recommendations: string[]; // High-level suggestions
  performance: {
    filesPerSecond: number;
    cacheHitRate: number;
    apiCallsMade: number;
  };
}
```

**UI Features:**
- Real-time progress bar (files processed, ETA)
- Filterable results table (by severity, type, file)
- Sortable columns (severity, confidence, file)
- Jump-to-source links (opens file at line number in editor)
- Severity-based color coding (red=critical, yellow=warning, blue=info)
- Expand/collapse for detailed evidence
- Export buttons (JSON for API, CSV for spreadsheets, PDF for sharing)

**API Endpoints:**
```
POST /api/analyze
  Body: { projectPath: string, config?: AnalysisConfig }
  Response: { jobId: string }

GET /api/analyze/:jobId/status
  Response: { status: 'pending' | 'running' | 'completed' | 'failed', progress: number, eta: number }

GET /api/analyze/:jobId/results
  Query: { page?: number, limit?: number, filter?: string, sort?: string }
  Response: { report: AnalysisReport, pagination: Pagination }

GET /api/analyze/:jobId/export
  Query: { format: 'json' | 'csv' | 'pdf' }
  Response: File download

POST /api/feedback
  Body: { inconsistencyId: string, isFalsePositive: boolean }
  Purpose: Improve future detection (future: ML feedback loop)
```

**Performance Considerations:**
- Paginate large result sets (50 items per page)
- Lazy load detailed evidence (fetch on expand)
- Cache generated reports (invalidate on config change)
- Stream large exports (CSV/JSON) instead of buffering

---

### Supporting Components

#### Storage Layer (Optional for MVP, Critical for Future)

**Current (MVP): File-Based Storage**
- Analysis results: `./results/{jobId}.json`
- Embedding cache: `./cache/embeddings/{fileHash}.json`
- AST cache: `./cache/ast/{fileHash}.json`
- Configuration: `./config.json`

**Cache Management:**
- LRU eviction (remove least recently used when cache size >1GB)
- Content-based invalidation (recompute if file hash changes)
- Timestamp-based expiration (embeddings older than 30 days)
- Manual cache clearing option

**Future (Phase 2): Database Storage**
- SQLite for single-user structured queries
- PostgreSQL for multi-user, concurrent access
- Vector database (Pinecone, Weaviate) for embeddings at scale

**Schema Considerations:**
```sql
-- Example future schema
CREATE TABLE analysis_runs (
  id UUID PRIMARY KEY,
  project_path TEXT,
  analyzed_at TIMESTAMP,
  config JSONB,
  results JSONB
);

CREATE TABLE inconsistencies (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES analysis_runs(id),
  type TEXT,
  severity TEXT,
  confidence REAL,
  file_path TEXT,
  line_start INT,
  line_end INT,
  description TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_inconsistencies_run ON inconsistencies(run_id);
CREATE INDEX idx_inconsistencies_severity ON inconsistencies(severity, confidence);
```

---

#### Error Handling & Logging

**Logging Strategy:**
- Structured logging with Winston or Pino
- Log levels: ERROR, WARN, INFO, DEBUG
- Separate log files by component (parsing.log, analysis.log, api.log)
- Include context: timestamp, jobId, filePath, operation
- Rotate logs daily, keep last 7 days

**Error Recovery Patterns:**
- **Graceful degradation:** If semantic analysis fails, return rule-based results only
- **Partial results:** If some files fail, analyze the rest and report which failed
- **Retry with backoff:** For transient failures (API timeouts), retry 3x with exponential backoff
- **Circuit breaker:** If AI API fails >5x in 1 minute, switch to local model or skip
- **Checkpointing:** For long-running analyses, save progress every 100 files (enable resume)

**Error Types & Handling:**
```typescript
class DocumentAnalysisError extends Error {
  constructor(
    public code: 'PARSE_ERROR' | 'API_ERROR' | 'FILE_ERROR' | 'TIMEOUT',
    public filePath: string,
    message: string,
    public recoverable: boolean
  ) { super(message); }
}

// Example error handling
try {
  await parseFile(filePath);
} catch (error) {
  if (error.recoverable) {
    logger.warn('Recoverable error, skipping file', { error, filePath });
    skippedFiles.push({ filePath, reason: error.message });
  } else {
    logger.error('Unrecoverable error, halting analysis', { error });
    throw error;
  }
}
```

---

#### Configuration Management

**Configuration File:** `config.json`
```json
{
  "analysis": {
    "enableRuleBased": true,
    "enableSemanticAnalysis": true,
    "semanticProvider": "openai",
    "confidenceThreshold": 0.6,
    "severityFilter": ["critical", "warning"]
  },
  "parsing": {
    "languages": ["javascript", "typescript", "python"],
    "maxFileSize": 104857600,
    "timeout": 30000
  },
  "performance": {
    "maxConcurrentFiles": 100,
    "maxConcurrentApiCalls": 10,
    "cacheSize": 1073741824,
    "enableIncrementalAnalysis": true
  },
  "embeddings": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 384,
    "batchSize": 50,
    "chunkSize": 512
  },
  "excluded": {
    "patterns": ["**/node_modules/**", "**/.git/**", "**/dist/**"],
    "fileTypes": [".png", ".jpg", ".pdf", ".zip"]
  }
}
```

**Runtime Configuration:**
- Environment variables for secrets (GEMINI_API_KEY)
- Command-line flags override config file
- UI settings override command-line flags
- Validate configuration on startup, fail fast with clear errors

---

## Extension Points & Future Enhancements

### Plugin Architecture (Future)
```typescript
interface AnalyzerPlugin {
  name: string;
  version: string;
  analyze(content: NormalizedContent): Promise<Inconsistency[]>;
  configure(options: Record<string, any>): void;
}

// Example: Custom analyzer for API documentation
class ApiDocAnalyzer implements AnalyzerPlugin {
  name = 'api-doc-analyzer';
  version = '1.0.0';

  async analyze(content: NormalizedContent): Promise<Inconsistency[]> {
    // Check for missing required fields in API docs
    // Validate example code actually works
    // Ensure all endpoints are documented
    return inconsistencies;
  }
}
```

### Incremental Analysis (High Priority)
- Integrate with Git: `git diff` to find changed files
- Only re-analyze changed files + dependencies
- Merge new results with cached results
- Huge performance boost for large projects (10x faster on re-runs)

### Watch Mode (Future)
- File system watcher (chokidar) for real-time monitoring
- Debounced re-analysis (wait 500ms after last change)
- Live-reload results in UI
- Perfect for documentation-driven development

### CI/CD Integration (Future)
- GitHub Action for automatic PR analysis
- Comment on PR with detected inconsistencies
- Block merge if critical issues found
- Track documentation quality over time

### Comparison Mode (Future)
- Compare analysis results across git commits
- Show improvements/regressions in documentation quality
- Historical trending dashboard

---

## Success Metrics for MVP

### Functional Success Criteria:
- ✅ Analyze projects with up to 10,000 files
- ✅ Detect at least 5 types of inconsistencies (links, duplicates, contradictions, gaps, semantic)
- ✅ Achieve >90% accuracy on test corpus (minimize false positives)
- ✅ Support Markdown, JavaScript, TypeScript, Python
- ✅ Generate actionable reports with source location links

### Performance Success Criteria:
- ✅ Small project (100 files): <5 seconds total analysis time
- ✅ Medium project (1,000 files): <30 seconds total analysis time
- ✅ Large project (10,000 files): <5 minutes total analysis time
- ✅ Memory usage: <500MB for 1,000 files, <2GB for 10,000 files
- ✅ UI responsiveness: First results visible within 5 seconds
- ✅ Cache hit rate: >80% on subsequent runs of same project

### User Experience Success Criteria:
- ✅ Clear, actionable error messages
- ✅ Zero-config for standard projects (sane defaults)
- ✅ Real-time progress indicators with ETA
- ✅ Filterable, sortable results
- ✅ One-click jump to source location
- ✅ Export results in 3+ formats

---

## Performance Benchmarks & Constraints

### Defined Targets:

**File Processing:**
- File discovery: >1000 files/second
- File reading: >500 files/second (parallel, concurrency-limited)
- Parsing: >100 files/second (with worker threads)

**Analysis:**
- Rule-based analysis: Complete within 2× file parsing time
- Embedding generation: <50ms per chunk (batched API), <200ms (local)
- Similarity search: <1ms per comparison (with FAISS vector index)

**API & UI:**
- API response time: <200ms for status checks
- UI initial load: <2 seconds
- Results pagination: <100ms per page load

**Resource Limits:**
- Maximum file size: 100MB (skip larger files with warning)
- Maximum project size: 10,000 files for MVP (warn if exceeded)
- Memory budget per file: 10MB average (stream larger files)
- API rate limit: Respect provider limits (e.g., 10k requests/minute for OpenAI)

### Measurement Approach:
- Add `performance.mark()` and `performance.measure()` throughout codebase
- Log timing for each phase (discovery, aggregation, parsing, analysis, reporting)
- Track resource usage: `process.memoryUsage()`, `process.cpuUsage()`
- Generate performance report alongside analysis report
- Set up alerts for performance regressions in CI/CD

---

## Advanced Performance Optimizations

### Algorithm Complexity Considerations:
- **File discovery:** O(n) where n = total files, optimized with pruning
- **Cross-reference detection:** O(n) with hash map index, not O(n²)
- **Similarity search:** O(log n) with FAISS, not O(n²) naive comparison
- **Duplicate detection:** O(n log n) with sorting, not O(n²) all-pairs

### Memory Management:
- Use streaming APIs for files >1MB
- Clear processed Content Objects from memory after analysis
- Use WeakMap for temporary caches (allows GC)
- Implement LRU cache with size limits for persistent caches
- Monitor heap usage, trigger GC if approaching limit

### Concurrency & Parallelization:
- Worker threads for CPU-bound parsing (avoid blocking event loop)
- `Promise.all` with `p-limit` for controlled I/O parallelism
- Batch API calls (50 chunks per request reduces network overhead)
- Pipeline architecture: file reading → parsing → analysis (overlap stages)

### Caching Strategy:
- **Multi-level cache:** Memory (fastest) → Disk → Regenerate
- **Content-based keys:** SHA-256 hash of (file content + config)
- **Smart invalidation:** Only recompute when content or config changes
- **Cache warming:** Pre-generate embeddings for large projects during idle time

### Network Optimization (AI API):
- HTTP/2 connection pooling
- Request compression (gzip)
- Retry with exponential backoff (transient failures)
- Circuit breaker pattern (switch to local model if API consistently fails)
- Prefetch embeddings for predictable access patterns

---

## Testing Strategy

### Unit Tests:
- Each component layer (Input, Aggregation, Parsing, Analysis, Output) tested independently
- Mock file system, API calls, external dependencies
- Test edge cases: empty files, malformed input, encoding errors
- Aim for >80% code coverage

### Integration Tests:
- End-to-end flow with sample projects (small, medium, large)
- Test corpus: Projects with known inconsistencies (gold standard)
- Verify detected inconsistencies match expected results
- Test all configuration combinations

### Performance Tests:
- Benchmark suite for each component (measure baseline, detect regressions)
- Load testing with varying project sizes (100, 1k, 10k files)
- Memory leak detection (run analysis in loop, monitor heap growth)
- Stress testing (concurrent analyses, API rate limiting)

### Test Data Corpus:
- **Small:** 100 files, mixed types, <1MB total (for quick iteration)
- **Medium:** 1,000 files, realistic project structure, ~10MB (for regression tests)
- **Large:** 10,000 files, includes edge cases, ~100MB (for performance benchmarking)
- **Edge Cases:** Encoding issues, circular symlinks, massive files, Unicode challenges

---

## Security & Privacy Considerations

### Data Handling:
- **No external transmission** except optional AI API calls (user-controlled)
- **Local processing by default:** All analysis happens on user's machine
- **API key security:** Environment variables, never logged or stored in plaintext
- **Sanitize reports:** Remove secrets/credentials if detected (regex patterns for API keys, passwords)

### Input Validation:
- **Path validation:** Prevent directory traversal attacks
- **File size limits:** Reject files >100MB to prevent DoS
- **Rate limiting:** Prevent abuse of analysis API (max 10 concurrent jobs per user)
- **Regex safety:** Use `re2` library to prevent ReDoS (Regular Expression Denial of Service)

### Access Control (Future):
- **File permissions:** Respect OS-level file access controls
- **User authentication:** If multi-user phase, implement proper auth
- **Audit logging:** Track who analyzed what, when (compliance)

---

## Open Questions & Decisions

### To Be Decided:

1. **Embedding Provider for MVP:**
   - Option A: OpenAI API (fast, accurate, costs $0.0001/1k tokens)
   - Option B: Local transformers (free, slower, works offline)
   - **Decision:** Support both, default to OpenAI with local fallback

2. **TypeScript vs JavaScript:**
   - TypeScript recommended for better DX and fewer runtime errors
   - **Decision:** Use TypeScript for MVP

3. **Database for Phase 2:**
   - PostgreSQL (relational, battle-tested) vs MongoDB (document, flexible schema)
   - **Decision:** PostgreSQL for structured queries, better consistency

4. **License for Open Source Release (Future):**
   - MIT (permissive) vs GPL (copyleft) vs Apache 2.0 (patent protection)
   - **Decision:** TBD, depends on whether external release is desired

5. **Performance vs Accuracy Trade-offs:**
   - Smaller embeddings (384d) vs larger (1536d): Speed vs accuracy
   - **Decision:** Default to 384d, make configurable for users who want higher accuracy

### Known Limitations (MVP):
- No real-time analysis (batch only)
- Limited language support (JS/TS/Python only)
- No multi-user collaboration
- No version control integration beyond file watching
- Semantic analysis dependent on external API or slow local models

---

## Deployment & Operations

### MVP Deployment:
- **Local development:** `npm run dev` (Next.js dev server)
- **Internal use:** `npm run build && npm start` (production build, run locally)
- **No hosting required:** Runs on user's machine

### Future Deployment (Phase 2+):
- **Docker containerization:** Easy deployment to any environment
- **Cloud hosting:** AWS/GCP/Azure for multi-user access
- **CI/CD:** GitHub Actions for automated testing and deployment
- **Monitoring:** Application Performance Monitoring (APM) tools

### Configuration Management:
- Development: `.env.development` (defaults, no API keys)
- Production: `.env.production` (user provides API keys)
- Environment variables override config file
- Validate configuration on startup, fail fast with helpful errors

---

## Conclusion

This architecture provides a solid foundation for the Documentation Consistency Analyzer MVP while planning for future enhancements. Key design principles:

1. **Hybrid Analysis:** Combines fast rule-based detection with powerful AI-powered semantic analysis
2. **Performance-Oriented:** Optimized for large codebases with caching, parallelization, and smart algorithms
3. **Extensible:** Plugin architecture and configuration options enable customization
4. **Measurable:** Concrete success metrics and performance benchmarks guide development
5. **Pragmatic:** MVP focuses on core value (detecting inconsistencies), defers nice-to-haves

The system balances accuracy, performance, and cost while maintaining simplicity for the MVP. Future phases can build upon this foundation with multi-user support, real-time analysis, and broader language support.

---

**Document Version:** 1.1
**Last Updated:** 2026-01-18
**Status:** Phase 1 Complete, Phase 2 Planning
