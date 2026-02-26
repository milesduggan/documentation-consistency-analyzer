# Contributing Guide

Welcome to the Documentation Consistency Analyzer project! This guide will help you understand how to contribute effectively.

## Development Principles

### 1. **Simplicity First**
- MVP over perfection
- Solve real problems, not hypothetical ones
- Delete code is better than refactored code

### 2. **Performance Matters**
- Measure before optimizing
- Profile to find bottlenecks
- Document performance assumptions

### 3. **Test What Matters**
- Test behavior, not implementation
- Focus on edge cases and error handling
- Integration tests > unit tests for complex workflows

---

## Code Organization

### Directory Structure

```
src/
├── app/              # Next.js pages and routes
│   ├── page.tsx      # Home page
│   ├── api/          # API endpoints
│   └── results/      # Results page
├── components/       # React components
│   ├── ui/           # Reusable UI components
│   └── analysis/     # Analysis-specific components
├── lib/              # Core library (business logic)
│   ├── input/        # Layer 1: File discovery
│   ├── aggregation/  # Layer 2: File reading
│   ├── parsing/      # Layer 3: Parsing & normalization
│   ├── analysis/     # Layer 4: Detection algorithms
│   ├── output/       # Layer 5: Result formatting
│   └── utils/        # Shared utilities
└── types/            # TypeScript type definitions
```

### Layer Responsibilities

**Follow the architecture layers strictly:**

1. **Input Layer** (`lib/input/`)
   - File discovery only
   - No file reading
   - Returns file paths + metadata

2. **Aggregation Layer** (`lib/aggregation/`)
   - File reading only
   - No parsing
   - Returns ContentObjects with raw content

3. **Parsing Layer** (`lib/parsing/`)
   - Parse files into structured format
   - Extract comments/docstrings
   - No analysis logic

4. **Analysis Layer** (`lib/analysis/`)
   - Detect inconsistencies
   - Apply rules and AI
   - No I/O operations

5. **Output Layer** (`lib/output/`)
   - Format results
   - Generate reports
   - Handle exports

**Why strict separation?** Easier testing, clearer debugging, better performance optimization.

---

## Coding Standards

### TypeScript Style

```typescript
// GOOD: Clear types, descriptive names
interface ContentObject {
  id: string;
  filePath: string;
  content: string;
}

async function discoverFiles(rootPath: string): Promise<ContentObject[]> {
  // Implementation
}

// BAD: Vague types, unclear purpose
function processStuff(data: any): any {
  // What does this do?
}
```

### Error Handling

```typescript
// GOOD: Specific error types, recovery strategy
class FileReadError extends Error {
  constructor(public filePath: string, message: string) {
    super(message);
    this.name = 'FileReadError';
  }
}

try {
  await readFile(path);
} catch (error) {
  if (error instanceof FileReadError) {
    logger.warn(`Skipping unreadable file: ${error.filePath}`);
    skippedFiles.push(error.filePath);
  } else {
    throw error; // Unexpected error, fail fast
  }
}

// BAD: Silent failures, generic errors
try {
  await readFile(path);
} catch (error) {
  console.log('Error'); // What error? Where? Why?
  return null; // Hides the problem
}
```

### Performance Guidelines

```typescript
// GOOD: Parallel with concurrency limit
import pLimit from 'p-limit';
const limit = pLimit(100);
await Promise.all(
  files.map(file => limit(() => readFile(file)))
);

// BAD: Sequential processing (too slow)
for (const file of files) {
  await readFile(file); // Waits for each file
}

// BAD: Unlimited parallelism (memory explosion)
await Promise.all(files.map(file => readFile(file)));
```

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `file-discovery.ts`)
- **Classes:** `PascalCase` (e.g., `ContentObject`)
- **Functions:** `camelCase` (e.g., `discoverFiles`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- **Interfaces:** `PascalCase` with descriptive names (e.g., `AnalysisConfig`)
- **Types:** `PascalCase` (e.g., `FileType`)

---

## Writing Tests

### Test Structure

```typescript
// Example: tests/lib/input/file-discovery.test.ts
import { discoverFiles } from '@/lib/input/file-discovery';

describe('discoverFiles', () => {
  it('should find all markdown files in directory', async () => {
    // Arrange
    const testDir = '/path/to/test/fixtures';

    // Act
    const files = await discoverFiles(testDir);

    // Assert
    expect(files).toHaveLength(5);
    expect(files.every(f => f.fileName.endsWith('.md'))).toBe(true);
  });

  it('should skip files matching .gitignore patterns', async () => {
    // Test implementation
  });

  it('should handle empty directories gracefully', async () => {
    // Test implementation
  });
});
```

### What to Test

**Priority 1: Edge Cases**
- Empty inputs
- Very large inputs
- Malformed data
- Missing permissions

**Priority 2: Error Handling**
- File not found
- Invalid encoding
- Network failures (for APIs)
- Timeout scenarios

**Priority 3: Happy Path**
- Basic functionality
- Expected outputs
- Performance benchmarks

### Test Fixtures

Store test data in `tests/fixtures/`:

```
tests/
├── fixtures/
│   ├── small-project/    # 10 files
│   ├── medium-project/   # 100 files
│   ├── edge-cases/       # Unicode, empty, huge files
│   └── known-issues/     # Projects with documented inconsistencies
└── lib/
    └── input/
        └── file-discovery.test.ts
```

---

## Git Workflow

### Branch Naming

- **Features:** `feature/description` (e.g., `feature/broken-link-detection`)
- **Bugs:** `fix/description` (e.g., `fix/encoding-error-handling`)
- **Docs:** `docs/description` (e.g., `docs/setup-guide`)
- **Performance:** `perf/description` (e.g., `perf/parallel-file-reading`)

### Commit Messages

```bash
# GOOD: Clear, specific, explains why
feat: add broken link detection to analysis layer

Implements Pass 1 of analysis strategy. Detects both internal
and external broken links with configurable timeout.

# GOOD: Fix with context
fix: handle UTF-16 encoding in file reader

Previously crashed on UTF-16 files. Now detects encoding
with chardet and converts to UTF-8.

# BAD: Vague, no context
Update stuff
Fix bug
WIP
```

### Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `perf:` Performance improvement
- `test:` Adding or updating tests
- `refactor:` Code restructuring (no behavior change)
- `chore:` Build process, dependencies

---

## Adding New Features

### 1. **Plan First**
- Read [docs/architecture.md](architecture.md)
- Check [docs/decisions.md](decisions.md)
- Discuss approach before implementing

### 2. **Follow the Layers**
- Identify which layer owns the feature
- Don't cross layer boundaries
- Use interfaces for layer communication

### 3. **Write Tests First** (TDD recommended)
```typescript
// 1. Write failing test
it('should detect duplicate documentation', () => {
  const result = detectDuplicates(docs);
  expect(result).toContainInconsistency('duplicate');
});

// 2. Implement minimal code to pass
function detectDuplicates(docs) {
  // Implementation
}

// 3. Refactor for performance/clarity
```

### 4. **Performance Benchmark**
```typescript
// Add performance test
it('should process 1000 files in <30 seconds', async () => {
  const start = performance.now();
  await discoverFiles(largeTestDir);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(30000);
});
```

### 5. **Document**
- Add inline comments for complex logic
- Update architecture.md if adding new layer/component
- Add ADR to decisions.md for significant choices

---

## Code Review Checklist

### Before Submitting PR

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] No console.log left in code
- [ ] Error handling for edge cases

### What Reviewers Check

1. **Correctness:** Does it solve the problem?
2. **Performance:** Does it meet benchmarks?
3. **Tests:** Are edge cases covered?
4. **Readability:** Is the code self-explanatory?
5. **Architecture:** Does it follow layer separation?

---

## Performance Guidelines

### Measurement

Always profile before claiming optimization:

```typescript
import { performance } from 'perf_hooks';

const start = performance.now();
await expensiveOperation();
const duration = performance.now() - start;

logger.info(`Operation took ${duration.toFixed(2)}ms`);
```

### Common Patterns

**Parallel Processing:**
```typescript
import pLimit from 'p-limit';

const limit = pLimit(100); // Max 100 concurrent
const results = await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

**Caching:**
```typescript
const cache = new Map<string, CachedData>();

function getOrCompute(key: string, compute: () => Promise<Data>) {
  if (cache.has(key)) return cache.get(key)!;

  const result = await compute();
  cache.set(key, result);
  return result;
}
```

**Streaming:**
```typescript
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

await pipeline(
  createReadStream(filePath),
  parseTransform,
  analysisTransform,
  outputStream
);
```

---

## Debugging Tips

### 1. **Use Debugger** (VS Code)

Add to `.vscode/launch.json`:
```json
{
  "configurations": [
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 2. **Structured Logging**

```typescript
import logger from '@/lib/utils/logger';

logger.debug('File discovery started', { rootPath, pattern });
logger.info('Files discovered', { count: files.length });
logger.warn('Skipped unreadable file', { filePath, reason });
logger.error('Fatal error', { error, context });
```

### 3. **Performance Profiling**

```bash
# Generate CPU profile
node --cpu-prof --cpu-prof-dir=./profiles node_modules/.bin/next dev

# Analyze with Chrome DevTools
# Open chrome://inspect
# Load profile from ./profiles/
```

---

## Common Gotchas

### 1. **Async/Await Mistakes**

```typescript
// BAD: Doesn't wait
files.forEach(async (file) => {
  await processFile(file); // forEach doesn't wait!
});

// GOOD: Properly awaits
await Promise.all(files.map(file => processFile(file)));
```

### 2. **Memory Leaks**

```typescript
// BAD: Holds references
const cache = new Map();
files.forEach(file => {
  cache.set(file, largeObject); // Never cleared!
});

// GOOD: Use WeakMap or implement eviction
const cache = new WeakMap(); // GC can collect
// OR
const cache = new LRU({ max: 1000 }); // Auto-evicts
```

### 3. **Path Handling**

```typescript
import path from 'path';

// BAD: String concatenation
const filePath = rootDir + '/' + fileName; // Breaks on Windows

// GOOD: Use path module
const filePath = path.join(rootDir, fileName);
```

---

## Questions?

- **Architecture questions:** See [docs/architecture.md](architecture.md)
- **Setup problems:** See [docs/setup.md](setup.md)
- **Design decisions:** See [docs/decisions.md](decisions.md)

---

**Happy coding!**
