# Turbo DCA 3000

Browser-based documentation consistency analyzer. Scans project folders for broken links, orphaned files, and documentation drift. **100% client-side** — files never leave your machine.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000, drop a folder, review issues.

## Features

- **Link validation** — broken internal links, anchors, images
- **Content detection** — TODO/FIXME markers, orphaned files
- **Doc coverage** — undocumented exports, orphaned documentation
- **Numerical consistency** — detects conflicting values across docs
- **Delta tracking** — NEW/RESOLVED/REINTRODUCED issue classification
- **Health scores** — project-level metrics with trend tracking
- **Persistence** — IndexedDB storage survives browser refresh

## Browser Support

Chrome 86+, Edge 86+, Opera 72+ (requires File System Access API)

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/STATUS.md](docs/STATUS.md) | Current state, roadmap, recent work |
| [docs/architecture.md](docs/architecture.md) | System design, data flow |
| [docs/contributing.md](docs/contributing.md) | Code standards, workflow |
| [docs/decisions.md](docs/decisions.md) | Architecture Decision Records |

## Project Structure

```
src/
├── app/                    # Next.js pages
├── components/             # React components
├── context/                # React context providers
├── lib/browser/            # Core analysis engine
│   ├── analyzer.ts         # Main orchestrator
│   ├── delta.ts            # Delta computation
│   ├── storage.ts          # IndexedDB persistence
│   └── fingerprint.ts      # Issue identity/hashing
├── types/                  # TypeScript definitions
└── ui/                     # UI utilities
```

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npm test         # Jest tests
```

## License

Internal use only
