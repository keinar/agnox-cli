package templates

// PytestDockerfile is the Dockerfile content for Pytest (Python) projects.
const PytestDockerfile = `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh
`

// PytestEntrypoint is the entrypoint.sh content for Pytest projects.
const PytestEntrypoint = `#!/bin/sh

FOLDER=$1

if [ -f .env ]; then
  echo "Removing local .env to enforce injected configuration..."
  rm .env
fi

if [ -z "$FOLDER" ] || [ "$FOLDER" = "all" ]; then
  echo "Running ALL tests..."
  exec pytest
else
  echo "Running tests in folder: $FOLDER"
  exec pytest "$FOLDER"
fi
`
