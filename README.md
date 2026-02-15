# @keinar/aac-cli

> **Agnostic Automation Center CLI** — The deployment assistant that prepares and ships any test automation repository to the AAC platform, end-to-end.

[![Release](https://github.com/keinar/aac-cli/actions/workflows/release.yml/badge.svg)](https://github.com/keinar/aac-cli/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@keinar/aac-cli)](https://www.npmjs.com/package/@keinar/aac-cli)

## Quick Start

```bash
npx @keinar/aac-cli@latest init
```

> No installation required. This always runs the latest version.

## What It Does

`@keinar/aac-cli` handles the entire flow from raw test project to a deployed, platform-ready Docker image:

### 1. Generates Integration Files

| File | Purpose |
|---|---|
| `Dockerfile` | Builds your test suite image — no `ENTRYPOINT`/`CMD` (the AAC Worker injects it at runtime) |
| `entrypoint.sh` | Executed by the Worker: `/app/entrypoint.sh <folder>` |
| `.dockerignore` | Prevents secrets (`.env`, `.git`) and bloat (`node_modules`, `__pycache__`) from entering the image |

### 2. Detects Framework Versions

For **Playwright** projects, the CLI reads your `package.json`, extracts the `@playwright/test` version, and uses it to pin the exact Docker base image (`mcr.microsoft.com/playwright:v{version}-jammy`). No more mismatched browser binaries.

### 3. Automates Docker Deployment

After generating files, the CLI offers to handle the full deployment:

- **Docker Hub login** — interactive authentication via `docker login`
- **Project name detection** — reads from `package.json`, with manual override
- **Multi-platform build** — `linux/amd64` + `linux/arm64` via Docker Buildx, ensuring compatibility with any AAC Worker architecture
- **Push to registry** — ships the image directly to Docker Hub

### Supported Frameworks

- **Playwright** (TypeScript / Node.js) — auto-detects version
- **Pytest** (Python)

## Prerequisites

- **Node.js 18+** — required to run the CLI
- **Docker Desktop** — must be running for the automated build & push features

## Installation (optional)

```bash
npm install -g @keinar/aac-cli
```

## Usage

```bash
# Run the full init + deploy flow
npx @keinar/aac-cli@latest init

# Check version
npx @keinar/aac-cli@latest --version
```

## How It Works

```
┌─────────────────────────────────────────────────┐
│  npx @keinar/aac-cli@latest init                │
├─────────────────────────────────────────────────┤
│  1. Select framework (Playwright / Pytest)      │
│  2. Auto-detect version from package.json       │
│  3. Generate Dockerfile + entrypoint.sh         │
│  4. (Optional) Docker login                     │
│  5. (Optional) Buildx multi-platform build      │
│  6. (Optional) Push image to Docker Hub         │
│  7. Enter image name in the AAC Dashboard       │
└─────────────────────────────────────────────────┘
```

## Development

```bash
npm install
npm run build
node dist/index.cjs init
```

## Release

Tag a new version to trigger the CI/CD pipeline:

```bash
git tag v1.1.0
git push origin v1.1.0
```

The workflow will build with tsup, publish to npm, and create a GitHub release.

## License

MIT
