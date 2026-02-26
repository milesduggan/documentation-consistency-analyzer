# Documentation Consistency Analyzer

## Overview
Documentation Consistency Analyzer is a **browser-based web application** for analyzing software project documentation. It runs entirely **client-side** - your files never leave your computer. The tool scans Markdown files for broken internal links and documentation issues.

## Current Status: Phase 1 MVP Complete
**What works now:**
-Browser-based file upload (drag-drop or file picker)
-Client-side analysis (no server, files stay local)
-Markdown link validation (broken links and anchors)
-Real-time progress tracking
-Filterable results table by severity

**What's NOT in Phase 1:**
-AI-powered semantic analysis (future phase)
-Code comment extraction (future phase)
-Conflicting statement detection (future phase)
-Multi-user features (future phase)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:3000
   ```

4. **Analyze a project:**
   - Drag-drop a folder into the upload zone, OR
   - Click "Browse for Folder" and select a directory
   - Wait for analysis to complete
   - Review broken links and issues in the results table

## What It Analyzes

**Supported file types:**
- `.md` - Markdown documentation
- `.js` / `.ts` - JavaScript/TypeScript (future: code comments)
- `.py` - Python (future: docstrings)

**Current detections:**
- Broken internal links (references to non-existent files)
- Broken anchor links (references to non-existent headings)
- Missing cross-references

**Excluded directories:**
- `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `coverage/`

## Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript

**Analysis:**
- `unified` + `remark-parse` for Markdown AST parsing
- `unist-util-visit` for AST traversal
- Custom link validation logic

**Browser APIs:**
- File System Access API (Chrome/Edge/Opera only)
- Drag & Drop API

## Browser Compatibility

**Supported:**
-Chrome 86+
-Edge 86+
-Opera 72+

**Not supported:**
-Firefox (File System Access API not available)
-Safari (File System Access API not available)

## Project Structure

```
src/
  app/
    layout.tsx          # Root layout
    page.tsx            # Main UI (upload → analyzing → results)
    globals.css         # Global styles
  components/
    UploadZone.tsx      # File upload interface
    IssuesTable.tsx     # Results table with filtering
  lib/
    browser/
      file-reader.ts    # File System Access API wrapper
      analyzer.ts       # Client-side analysis engine
    parse/
      markdown-parser.ts  # Markdown AST parsing (CLI)
    analyze/
      link-validator.ts   # Link validation logic (CLI)
docs/
  architecture.md       # System architecture (Phase 1 + future)
  decisions.md          # Architecture Decision Records
  setup.md             # Setup instructions
  contributing.md      # Contribution guidelines
```

## Roadmap

**Phase 1 (Complete):** Browser-based link validation
**Phase 2 (Planned):** AI-powered semantic analysis, code comment extraction
**Phase 3 (Future):** Multi-user support, CI/CD integration

## For Developers

- **CLI still works:** Run `npm run analyze` to use the original CLI tool
- **Documentation:** See [docs/architecture.md](docs/architecture.md) for full system design
- **Decisions:** See [docs/decisions.md](docs/decisions.md) for architectural choices
- **Contributing:** See [docs/contributing.md](docs/contributing.md)

## License

Internal use only - not for external distribution
