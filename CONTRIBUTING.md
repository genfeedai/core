# Contributing to Genfeed

Thanks for your interest in contributing to Genfeed!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/genfeed.git`
3. Install dependencies: `bun install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Setup

```bash
# Install dependencies
bun install

# Copy environment config
cp .env.example .env

# Start development servers
bun dev

# Run tests
bun test
```

## Project Structure

```
genfeed/
├── apps/web/       # Next.js frontend
├── apps/api/       # NestJS backend
├── packages/
│   ├── types/      # Shared types
│   ├── core/       # Workflow engine
│   └── storage/    # Database adapters
```

## Code Style

- TypeScript strict mode
- No `any` types - define proper interfaces
- Use path aliases (`@components/`) over relative imports
- Follow existing patterns in the codebase

## Commit Messages

Use conventional commits:

```
feat: add new image processing node
fix: resolve edge connection validation
docs: update README with self-hosting guide
refactor: simplify workflow execution logic
```

## Pull Requests

1. Update tests for your changes
2. Ensure all tests pass
3. Update documentation if needed
4. Keep PRs focused - one feature/fix per PR

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, browser, Node version)

## Feature Requests

Open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Questions?

Open a discussion or reach out on [Discord](https://discord.gg/genfeed).
