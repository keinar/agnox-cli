#!/bin/sh
# AAC CLI Installer for macOS and Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/keinar/aac-cli/main/install.sh | sh

set -e

REPO="keinar/aac-cli"
BINARY="aac"
INSTALL_DIR="/usr/local/bin"

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
  linux)  OS="linux" ;;
  darwin) OS="darwin" ;;
  *)      echo "Error: Unsupported OS: $OS"; exit 1 ;;
esac

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Fetch latest release tag
echo "Fetching latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$TAG" ]; then
  echo "Error: Could not determine latest release."
  exit 1
fi

echo "Latest version: ${TAG}"

# Download archive
ARCHIVE="${BINARY}_${OS}_${ARCH}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${TAG}/${ARCHIVE}"

echo "Downloading ${URL}..."
TMP_DIR=$(mktemp -d)
curl -fsSL "$URL" -o "${TMP_DIR}/${ARCHIVE}"

# Extract and install
tar -xzf "${TMP_DIR}/${ARCHIVE}" -C "${TMP_DIR}"
chmod +x "${TMP_DIR}/${BINARY}"

echo "Installing to ${INSTALL_DIR}/${BINARY}..."
sudo mv "${TMP_DIR}/${BINARY}" "${INSTALL_DIR}/${BINARY}"

# Cleanup
rm -rf "$TMP_DIR"

echo ""
echo "✅ AAC CLI ${TAG} installed successfully!"
echo "   Run 'aac --help' to get started."
