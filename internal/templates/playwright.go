package templates

// PlaywrightDockerfile is the Dockerfile content for Playwright (TypeScript/Node.js) projects.
const PlaywrightDockerfile = `FROM mcr.microsoft.com/playwright:v1.50.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN chmod +x /app/entrypoint.sh
`

// PlaywrightEntrypoint is the entrypoint.sh content for Playwright projects.
const PlaywrightEntrypoint = `#!/bin/sh

FOLDER=$1

if [ -f .env ]; then
  echo "Removing local .env to enforce injected configuration..."
  rm .env
fi

if [ -z "$FOLDER" ] || [ "$FOLDER" = "all" ]; then
  echo "Running ALL tests..."
  exec npx playwright test
else
  echo "Running tests in folder: $FOLDER"
  exec npx playwright test "$FOLDER"
fi
`
