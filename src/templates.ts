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
export const PYTEST_DOCKERFILE = `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh
`;

// Pytest entrypoint.sh template
export const PYTEST_ENTRYPOINT = `#!/bin/sh

FOLDER=$1

if [ -f .env ]; then
  echo "Removing local .env to enforce injected configuration..."
  rm .env
fi

if [ -z "$FOLDER" ] || [ "$FOLDER" = "all" ]; then
  echo "Running ALL tests..."
  pytest
else
  echo "Running tests in folder: $FOLDER"
  pytest "$FOLDER"
fi
`;

// Shared .dockerignore template
export const DOCKERIGNORE = `.git
.env
node_modules
__pycache__
.venv
`;
