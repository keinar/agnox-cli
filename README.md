# AAC CLI

> **Agnostic Automation Center CLI** — Prepare any test automation repository to run seamlessly inside the AAC containerized platform.

[![Release](https://github.com/keinar/aac-cli/actions/workflows/release.yml/badge.svg)](https://github.com/keinar/aac-cli/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/aac-cli)](https://www.npmjs.com/package/aac-cli)

## What It Does

`aac-cli init` generates the integration files your test automation project needs to run inside the AAC platform:

| File | Purpose |
|---|---|
| `Dockerfile` | Builds your test suite image (no ENTRYPOINT/CMD — the AAC Worker injects it) |
| `entrypoint.sh` | Executed by the Worker at runtime: `/app/entrypoint.sh <folder>` |
| `.dockerignore` | Prevents secrets (`.env`, `.git`) and bloat (`node_modules`, `__pycache__`) from entering the image |

### Supported Frameworks

- **Playwright** (TypeScript / Node.js)
- **Pytest** (Python)

## Quick Start

```bash
# No installation needed — run directly with npx
npx aac-cli init
```

## Installation (optional)

```bash
npm install -g aac-cli
```

## Usage

```bash
# Initialize AAC integration in your project directory
cd my-playwright-tests
aac-cli init

# Check version
aac-cli --version
```

## How It Works

1. Run `aac-cli init` inside your test project.
2. Select your framework (Playwright or Pytest).
3. The CLI generates `Dockerfile`, `entrypoint.sh`, and `.dockerignore`.
4. Build & push your Docker image.
5. Enter the image name in the AAC Dashboard.

## Development

```bash
npm install
npm run build
node dist/index.js init
```

## Release

Tag a new version to trigger the CI/CD pipeline:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will build with tsup, publish to npm, and create a GitHub release.

## License

MIT
