# Architecture Decision Records (ADR)

This document tracks important architectural decisions made during the development of the Documentation Consistency Analyzer.

## Format
Each decision follows this structure:
- **Decision:** What was decided
- **Context:** Why we needed to make this decision
- **Options Considered:** Alternatives we evaluated
- **Decision Rationale:** Why we chose this option
- **Consequences:** Trade-offs and implications
- **Date:** When decided
- **Status:** Accepted | Superseded | Deprecated

---

## ADR-001: Use Next.js for Full-Stack Framework

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Use Next.js 14+ as the primary framework for both frontend and backend.

**Context:**
We need a web application that can handle file processing (backend) and display results (frontend). We want to minimize complexity for an internal MVP tool.

**Options Considered:**
1. **Next.js (chosen)** - Full-stack React framework with built-in API routes
2. **Separate React + Express** - Traditional split frontend/backend
3. **Electron** - Desktop app with Node.js backend
4. **Vanilla Node.js + HTML** - Minimal dependencies

**Decision Rationale:**
- Single framework reduces complexity
- Built-in API routes eliminate need for separate backend server
- Excellent developer experience with hot reload
- Easy to deploy locally (just `npm run dev`)
- Large ecosystem and community support
- Can add React UI components easily

**Consequences:**
- [+] Faster development (one codebase, one framework)
- [+] Built-in optimizations (code splitting, image optimization)
- [+] Easy local deployment
- [!] Slightly heavier than minimal Node.js server
- [!] Learning curve if team unfamiliar with Next.js

---

## ADR-002: Hybrid Analysis Approach (Rule-Based + AI)

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Implement both rule-based detection and AI-powered semantic analysis.

**Context:**
Documentation inconsistencies range from simple (broken links) to complex (conceptual contradictions). No single approach catches everything.

**Options Considered:**
1. **Rule-based only** - Regex, pattern matching, structural checks
2. **AI-only** - LLM or embeddings for all detection
3. **Hybrid (chosen)** - Combine both approaches
4. **Crowdsourced** - Manual review with AI assistance

**Decision Rationale:**
- Rule-based is fast, deterministic, and free (broken links, duplicates)
- AI catches subtle semantic issues rules can't detect (contradictions, gaps)
- Hybrid maximizes coverage while controlling cost
- Progressive enhancement: rules work offline, AI is optional

**Consequences:**
- [+] Best accuracy (catches simple and complex issues)
- [+] Graceful degradation (works without AI API)
- [+] Cost-effective (only use AI where needed)
- [!] More complex implementation (two analysis paths)
- [!] Requires API key management for AI features

---

## ADR-003: File-Based Storage for MVP

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Use file system for storage (JSON files, cache files) instead of database for MVP.

**Context:**
MVP is single-user, internal tool. Need to store analysis results, cached embeddings, and parsed ASTs.

**Options Considered:**
1. **File system (chosen)** - JSON files, simple cache directory
2. **SQLite** - Embedded database, SQL queries
3. **PostgreSQL** - Full relational database
4. **In-memory only** - No persistence

**Decision Rationale:**
- Simplest setup (no database installation)
- Sufficient for single-user MVP
- Easy to inspect (can open JSON files manually)
- No schema migrations needed during development
- Can migrate to database later without changing interfaces

**Consequences:**
- [+] Zero setup complexity
- [+] Easy debugging (human-readable files)
- [+] Fast enough for MVP scale (10k files)
- [!] Not suitable for multi-user (file locking issues)
- [!] No complex queries (must load and filter in memory)
- [!] Will need migration for Phase 2 (multi-user)

---

## ADR-004: TypeScript for Type Safety

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Use TypeScript for all application code.

**Context:**
Complex data structures (ContentObject, Inconsistency, NormalizedContent) need clear contracts. Want to catch errors at compile time.

**Options Considered:**
1. **TypeScript (chosen)** - Typed superset of JavaScript
2. **JavaScript + JSDoc** - Comments for type hints
3. **JavaScript only** - No types

**Decision Rationale:**
- Better IDE autocomplete and IntelliSense
- Catch type errors before runtime
- Self-documenting code (interfaces as contracts)
- Easier refactoring with confidence
- Industry standard for modern JavaScript projects

**Consequences:**
- [+] Fewer runtime errors
- [+] Better developer experience
- [+] Easier onboarding (types explain code)
- [!] Slightly slower development initially (must define types)
- [!] Compilation step required

---

## ADR-005: OpenAI Embeddings API with Local Fallback

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Use OpenAI text-embedding-3-small as primary, with local sentence-transformers as fallback.

**Context:**
Need high-quality embeddings for semantic similarity analysis. Must balance cost, speed, and offline capability.

**Options Considered:**
1. **OpenAI API (primary)** - Fast, accurate, costs ~$0.0001/1k tokens
2. **Local transformers (fallback)** - Free, slower, works offline
3. **TF-IDF only** - Very fast, less accurate
4. **OpenAI only** - No offline support

**Decision Rationale:**
- OpenAI is fast and accurate (50ms per chunk batched)
- Local models enable offline use (important for sensitive projects)
- TF-IDF as emergency fallback if both fail
- Users can choose based on needs (cost vs speed vs privacy)

**Consequences:**
- [+] High-quality semantic analysis by default
- [+] Works offline when needed
- [+] User controls cost/performance trade-off
- [!] Requires API key setup for best experience
- [!] More complex configuration

---

## ADR-006: Scope MVP to Markdown, JS/TS/Python Only

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Limit MVP language support to Markdown files and JavaScript/TypeScript/Python code comments.

**Context:**
Many programming languages exist. Need to prioritize to ship MVP quickly while covering most common use cases.

**Options Considered:**
1. **Limited scope (chosen)** - Markdown + JS/TS/Python
2. **All major languages** - Add Java, Go, Rust, C++, etc.
3. **Documentation only** - Skip code comments entirely
4. **Plugin system first** - Let users add languages

**Decision Rationale:**
- Markdown covers most documentation (README, docs/)
- JS/TS/Python covers majority of modern projects
- Smaller scope = faster MVP
- Can add more languages in Phase 2 with clear patterns established

**Consequences:**
- [+] Faster time to working MVP
- [+] Focused testing on fewer parsers
- [+] Clear upgrade path (add languages incrementally)
- [!] Won't work for Java/Go/Rust projects initially
- [!] Users may request more languages quickly

---

## ADR-007: Multi-Pass Analysis Strategy

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Use 4-pass analysis: (1) Structural, (2) Indexing, (3) Cross-document, (4) Semantic

**Context:**
Different inconsistency types require different algorithms. Want to optimize for speed while maintaining thoroughness.

**Options Considered:**
1. **Multi-pass (chosen)** - Separate phases for different analysis types
2. **Single-pass** - Everything in one loop
3. **On-demand** - User selects what to check
4. **Parallel passes** - All checks simultaneously

**Decision Rationale:**
- Fast checks first (structural) give quick feedback
- Indexing pass enables efficient cross-document checks
- Semantic analysis is slow, run last when needed
- Progressive results (show structural issues while AI runs)
- Clear separation of concerns (easier to test/debug)

**Consequences:**
- [+] Fast initial feedback (structural pass <5 sec)
- [+] Optimized performance (index once, query many times)
- [+] Modular (can skip passes if not needed)
- [!] More complex orchestration code
- [!] Need to merge results from multiple passes

---

## ADR-008: Content-Based Caching with SHA-256 Hashing

**Date:** 2026-01-17
**Status:** Accepted

**Decision:** Use SHA-256 hashes of file content as cache keys for embeddings and parsed ASTs.

**Context:**
Parsing and embedding generation are expensive. Want to cache aggressively but invalidate when files change.

**Options Considered:**
1. **Content hash (chosen)** - SHA-256 of file contents
2. **Modification time** - File system mtime
3. **File path** - Location-based caching
4. **Version number** - Manual cache versioning

**Decision Rationale:**
- Content hash is deterministic (same content = same hash)
- Detects actual changes (mtime can change without content change)
- Works across file moves/renames
- Industry standard approach (Git uses similar strategy)

**Consequences:**
- [+] Accurate cache invalidation (no stale data)
- [+] Works even if files moved/renamed
- [+] Easy to implement with Node.js crypto module
- [!] Must hash every file (small overhead)
- [!] Cache doesn't transfer between identical projects (different paths)

---

## ADR-009: Simplify MVP to Browser-Based Link Validation Only

**Date:** 2026-01-18
**Status:** Accepted

**Decision:** Limit Phase 1 MVP to browser-based Markdown link validation, defer AI analysis to Phase 2.

**Context:**
Original architecture planned for full CLI + AI semantic analysis in MVP. During implementation, realized scope was too large for initial release. User needed working tool quickly ("speed is north star").

**Options Considered:**
1. **Full original scope** - CLI + Web UI + AI analysis + code comments
2. **Web UI only with AI** - Browser app with OpenAI embeddings
3. **Browser-based link validation (chosen)** - Minimal but functional
4. **CLI only** - Skip web UI entirely

**Decision Rationale:**
- Browser-based approach: No server needed, files stay private
- Link validation: High value, low complexity (catches 80% of issues)
- Fast to build: 7 files created in one session
- No API dependencies: Works offline, no costs
- Clear upgrade path: Can add AI analysis in Phase 2
- User can test immediately: No infrastructure setup

**Implementation Details:**
Created browser-compatible analyzer using:
- File System Access API for folder reading
- `unified` + `remark-parse` for Markdown parsing (same as CLI)
- Custom link validation logic (adapted from CLI link-validator.ts)
- Next.js 14 for UI framework
- Client-side only processing (no backend)

**Files Created:**
- `src/app/layout.tsx` - Next.js root layout
- `src/app/page.tsx` - Main UI orchestrator
- `src/app/globals.css` - Global styles
- `src/lib/browser/file-reader.ts` - File System Access API wrapper
- `src/lib/browser/analyzer.ts` - Browser-compatible analysis
- `src/components/UploadZone.tsx` - Upload interface
- `src/components/IssuesTable.tsx` - Results display

**Consequences:**
- [+] MVP shipped in single development session
- [+] Zero infrastructure costs (client-side only)
- [+] User privacy (files never uploaded)
- [+] Immediate value (broken link detection)
- [+] Browser compatibility clearly documented
- [!] Limited to Chrome/Edge/Opera (Firefox/Safari lack File System Access API)
- [!] No AI-powered analysis yet (deferred to Phase 2)
- [!] No code comment extraction yet (deferred to Phase 2)
- [!] Documentation needs update to reflect reduced scope

**Success Criteria Met:**
- Analyze projects with Markdown files [Done]
- Detect broken internal links [Done]
- Detect broken anchor links [Done]
- Real-time progress indicators [Done]
- Filterable results table [Done]
- Works entirely client-side [Done]

**Next Steps (Phase 2):**
- Add semantic analysis with OpenAI embeddings
- Extract and analyze code comments
- Detect duplicate/conflicting content
- Add download JSON report feature

---

## Future Decisions (To Be Made)

### Pending ADRs:
- **Database choice for Phase 2** (PostgreSQL vs MongoDB)
- **License for potential open source release** (MIT vs Apache 2.0)
- **CI/CD integration approach** (GitHub Actions vs GitLab CI)
- **Vector database for embeddings at scale** (FAISS vs Pinecone vs Weaviate)
- **Dark mode implementation** (CSS variables vs theme toggle vs system preference)

---

## Template for New Decisions

```markdown
## ADR-XXX: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Superseded | Deprecated

**Decision:** [What was decided]

**Context:** [Why this decision was necessary]

**Options Considered:**
1. Option 1
2. Option 2
3. Option 3 (chosen)

**Decision Rationale:**
- Reason 1
- Reason 2
- Reason 3

**Consequences:**
- [+] Benefit 1
- [+] Benefit 2
- [!] Trade-off 1
- [!] Trade-off 2
```
