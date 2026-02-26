# Development Setup Guide

This guide walks you through setting up the Documentation Consistency Analyzer development environment.

## Prerequisites

### Required Software
- **Node.js** v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm** v9.0.0 or higher (comes with Node.js)
- **Git** (for version control)
- **Code Editor** (VS Code recommended)

### Optional Tools
- **OpenAI API Key** (for semantic analysis features)
- **Python 3.8+** (if using local transformer models)

---

## Quick Start (5 Minutes)

```bash
# 1. Clone or navigate to project directory
cd "My Project v1"

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Open browser
# Visit http://localhost:3000
```

---

## Detailed Setup

### Step 1: Verify Node.js Installation

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

If you don't have Node.js or your version is too old:
1. Download from [nodejs.org](https://nodejs.org/)
2. Install LTS version (recommended)
3. Restart your terminal

### Step 2: Install Project Dependencies

```bash
# Install all dependencies from package.json
npm install

# This will install:
# - Next.js (web framework)
# - React (UI library)
# - TypeScript (type safety)
# - All parsing libraries
# - Development tools (ESLint, Prettier)
```

**First time?** This may take 2-5 minutes depending on your internet speed.

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# .env.local (create this file)

# OpenAI API Key (optional for MVP, required for semantic analysis)
OPENAI_API_KEY=sk-your-key-here

# Analysis Configuration (optional, has defaults)
MAX_CONCURRENT_FILES=100
MAX_FILE_SIZE_MB=100
CACHE_SIZE_GB=1
```

**Don't have an OpenAI key?** The app will still work with rule-based analysis only.

**Get an API key:**
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create new secret key
5. Copy and paste into `.env.local`

### Step 4: Verify Installation

```bash
# Run the development server
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Open browser:** Navigate to http://localhost:3000

You should see the Documentation Consistency Analyzer home page.

---

## Project Structure

After setup, your project should look like this:

```
My Project v1/
├── node_modules/        # Dependencies (auto-generated, ~200MB)
├── src/                 # Source code
│   ├── app/            # Next.js app directory (pages, layouts)
│   ├── components/     # React components
│   ├── lib/            # Core library code
│   │   ├── input/      # File discovery layer
│   │   ├── aggregation/# File reading layer
│   │   ├── parsing/    # Parser implementations
│   │   ├── analysis/   # Detection algorithms
│   │   └── output/     # Result formatting
│   └── types/          # TypeScript type definitions
├── tests/              # Test files
├── cache/              # Cache directory (auto-created)
├── results/            # Analysis results (auto-created)
├── docs/               # Documentation
├── .env.local          # Environment variables (you create this)
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── next.config.js      # Next.js configuration
└── README.md           # Project overview
```

---

## Development Workflow

### Running the Development Server

```bash
# Start dev server with hot reload
npm run dev

# Server runs at http://localhost:3000
# Changes to code automatically reload the page
```

**Pro tip:** Keep this terminal open while developing. You'll see build output and errors here.

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run specific test file
npm test -- input.test.ts
```

### Linting and Formatting

```bash
# Check for code style issues
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format code with Prettier
npm run format
```

### Building for Production

```bash
# Create optimized production build
npm run build

# Run production server
npm start
```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'next'"

**Cause:** Dependencies not installed
**Solution:**
```bash
npm install
```

### Issue: "Port 3000 is already in use"

**Cause:** Another app is using port 3000
**Solution:**
```bash
# Option 1: Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <process-id> /F

# Option 2: Use a different port
npm run dev -- -p 3001
```

### Issue: "Module parse failed: Unexpected token"

**Cause:** TypeScript configuration issue
**Solution:**
```bash
# Delete build cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Issue: "OPENAI_API_KEY is not set"

**Cause:** Missing or incorrect .env.local file
**Solution:**
1. Ensure `.env.local` exists in project root
2. Check that `OPENAI_API_KEY=sk-...` is on its own line
3. Restart the dev server after creating/editing `.env.local`

### Issue: "Out of memory" during large project analysis

**Cause:** Node.js default heap size too small
**Solution:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

---

## VS Code Setup (Recommended)

### Recommended Extensions

Install these VS Code extensions for best experience:

1. **ESLint** - Real-time code linting
2. **Prettier** - Code formatting
3. **TypeScript and JavaScript Language Features** - Enhanced TS support
4. **Next.js snippets** - Code snippets for Next.js

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Testing Your Setup

### 1. Create a Test Project Folder

```bash
# Create a sample project to analyze
mkdir test-project
cd test-project
echo "# Test Project" > README.md
echo "// Test file" > index.js
cd ..
```

### 2. Run Analysis

1. Go to http://localhost:3000
2. Enter path: `./test-project`
3. Click "Analyze"
4. You should see results appear!

---

## Next Steps

Once setup is complete:

1. Read [docs/architecture.md](architecture.md) to understand the system design
2. Read [docs/decisions.md](decisions.md) to understand key choices
3. Check out `src/lib/` to see the implementation
4. Run tests with `npm test` to verify everything works
5. Start coding! See [docs/contributing.md](contributing.md) for guidelines

---

## Getting Help

- **Documentation issues:** Check [docs/](.)
- **Code questions:** Read inline comments in `src/`
- **Build problems:** Delete `.next/` and `node_modules/`, reinstall
- **Performance issues:** Check [docs/architecture.md#performance-benchmarks](architecture.md)

---

**Setup complete?** You're ready to start developing!
