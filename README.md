# AAC CLI

> **Agnostic Automation Center CLI** – Prepare any test automation repository to run seamlessly inside the AAC containerized platform.

[![Release](https://github.com/keinar/aac-cli/actions/workflows/release.yml/badge.svg)](https://github.com/keinar/aac-cli/actions/workflows/release.yml)

## What It Does

`aac init` generates the integration files your test automation project needs to run inside the AAC platform:

| File | Purpose |
|---|---|
| `Dockerfile` | Builds your test suite image (no ENTRYPOINT/CMD — the AAC Worker injects it) |
| `entrypoint.sh` | Executed by the Worker at runtime: `/app/entrypoint.sh <folder>` |
| `.dockerignore` | Prevents secrets (`.env`, `.git`) and bloat (`node_modules`, `__pycache__`) from entering the image |

### Supported Frameworks

- **Playwright** (TypeScript / Node.js)
- **Pytest** (Python)

## Installation

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/keinar/aac-cli/main/install.sh | sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/keinar/aac-cli/main/install.ps1 | iex
```

### From Source

```bash
go install github.com/keinar/aac-cli@latest
```

## Usage

```bash
# Initialize AAC integration in your project directory
cd my-playwright-tests
aac init

# Check version
aac version
```

## How It Works

1. Run `aac init` inside your test project.
2. Select your framework (Playwright or Pytest).
3. The CLI generates `Dockerfile`, `entrypoint.sh`, and `.dockerignore`.
4. Build & push your Docker image.
5. Enter the image name in the AAC Dashboard.

## Development

```bash
# Build
go build -o aac .

# Run
./aac init
```

## Release

Tag a new version to trigger the CI/CD pipeline:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GoReleaser will cross-compile for Windows, macOS, and Linux (amd64 + arm64) and publish the release on GitHub.

## License

MIT
