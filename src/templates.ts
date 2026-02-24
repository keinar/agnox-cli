/** Default Playwright image version used when detection fails. */
export const PLAYWRIGHT_DEFAULT_VERSION = "1.50.0";

/** Generates the Playwright Dockerfile with a dynamic image version. */
export function playwrightDockerfile(version: string): string {
  return `FROM mcr.microsoft.com/playwright:v${version}-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN chmod +x /app/entrypoint.sh
`;
}

// Playwright entrypoint.sh template
export const PLAYWRIGHT_ENTRYPOINT = `#!/bin/sh

FOLDER=$1

if [ -f .env ]; then
  echo "Removing local .env to enforce injected configuration..."
  rm .env
fi

echo "Running against BASE_URL: $BASE_URL"

if [ -z "$FOLDER" ] || [ "$FOLDER" = "all" ]; then
  echo "Running ALL tests..."
  npx playwright test
else
  echo "Running tests in folder: $FOLDER"
  npx playwright test "$FOLDER"
fi
`;

// Pytest Dockerfile template
import { BrowserConfig } from "./analyzer.js";

export interface PytestDockerfileOptions {
  pythonVersion: string;
  packageManager: "pip" | "poetry";
  installPlaywright: boolean;
  playwrightVersion?: string | null;
  browserConfig: BrowserConfig;
  extraSystemDeps: string[];
}

export function generatePytestDockerfile(options: PytestDockerfileOptions): string {
  const { pythonVersion, packageManager, installPlaywright, playwrightVersion, browserConfig, extraSystemDeps } = options;

  // Use the official Playwright image if detected, otherwise standard Python slim
  // Bug fix: Use detected version if available, otherwise default
  const pwVersion = playwrightVersion || PLAYWRIGHT_DEFAULT_VERSION;

  const baseImage = installPlaywright
    ? `mcr.microsoft.com/playwright/python:v${pwVersion}-jammy`
    : `python:${pythonVersion}-slim`;

  let dockerfile = `FROM ${baseImage}\n\n`;

  dockerfile += `WORKDIR /app\n\n`;

  // Install extra system dependencies if any
  if (extraSystemDeps.length > 0) {
    dockerfile += `RUN apt-get update && apt-get install -y --no-install-recommends \\\n`;
    dockerfile += `    ${extraSystemDeps.join(" ")} && \\\n`;
    dockerfile += `    rm -rf /var/lib/apt/lists/*\n\n`;
  }

  // Install dependencies based on package manager
  if (packageManager === "poetry") {
    dockerfile += `RUN pip install poetry\n`;
    dockerfile += `COPY pyproject.toml poetry.lock ./\n`;
    dockerfile += `RUN poetry install --no-root\n\n`;
  } else {
    dockerfile += `COPY requirements.txt ./\n`;
    dockerfile += `RUN pip install --no-cache-dir -r requirements.txt\n\n`;
  }

  // Install specialized browser channel if needed (Chrome/Edge)
  if (browserConfig.dockerInstallCommand) {
    dockerfile += `# Required for specific browser channel\n`;
    dockerfile += `${browserConfig.dockerInstallCommand}\n\n`;
  }

  dockerfile += `COPY . .\n\n`;
  dockerfile += `RUN chmod +x /app/entrypoint.sh\n`;

  return dockerfile;
}

// Pytest entrypoint.sh template
export function generatePytestEntrypoint(packageManager: "pip" | "poetry"): string {
  const testCommand = packageManager === "poetry" ? "poetry run pytest" : "pytest";

  return `#!/bin/sh

FOLDER=$1

if [ -f .env ]; then
  echo "Removing local .env to enforce injected configuration..."
  rm .env
fi

if [ -z "$FOLDER" ] || [ "$FOLDER" = "all" ]; then
  echo "Running ALL tests..."
  ${testCommand}
else
  echo "Running tests in folder: $FOLDER"
  ${testCommand} "$FOLDER"
fi
`;
}

// Shared .dockerignore template
export const DOCKERIGNORE = `.git
.env
node_modules
__pycache__
.venv
`;
