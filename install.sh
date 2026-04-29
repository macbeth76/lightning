#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO="github/lightning"
VERSION="${VERSION:-latest}"
PREFIX="${PREFIX:-$HOME/.local}"
OS="$(uname -s)"
ARCH="$(uname -m)"

echo -e "${BLUE}⚡ Lightning CLI Installer${NC}"
echo ""

# Detect OS and Architecture
case "$OS" in
  Linux)
    PLATFORM="linux"
    case "$ARCH" in
      x86_64) ARCH_SUFFIX="x64" ;;
      aarch64) ARCH_SUFFIX="arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  Darwin)
    PLATFORM="macos"
    case "$ARCH" in
      x86_64) ARCH_SUFFIX="x64" ;;
      arm64) ARCH_SUFFIX="arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  *)
    echo -e "${RED}❌ Unsupported OS: $OS${NC}"
    exit 1
    ;;
esac

FILENAME="lightning-${PLATFORM}-${ARCH_SUFFIX}.tar.gz"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/v${VERSION}/$FILENAME"

echo -e "${BLUE}ℹ️ Detected: $OS $ARCH${NC}"
echo -e "${BLUE}ℹ️ Downloading from: $DOWNLOAD_URL${NC}"

# Download
mkdir -p /tmp/lightning-install
cd /tmp/lightning-install
if ! curl -fsSL -o "$FILENAME" "$DOWNLOAD_URL"; then
  echo -e "${RED}❌ Failed to download${NC}"
  exit 1
fi

# Extract
echo -e "${BLUE}ℹ️ Extracting...${NC}"
tar xzf "$FILENAME"

# Install
echo -e "${BLUE}ℹ️ Installing to $PREFIX/bin/${NC}"
mkdir -p "$PREFIX/bin"
cp lightning "$PREFIX/bin/"
chmod +x "$PREFIX/bin/lightning"

# Add to PATH if needed
if ! echo "$PATH" | grep -q "$PREFIX/bin"; then
  echo ""
  echo -e "${BLUE}ℹ️ Add to your shell profile:${NC}"
  echo -e "${GREEN}export PATH=\"$PREFIX/bin:\$PATH\"${NC}"
fi

# Verify installation
echo ""
if "$PREFIX/bin/lightning" --version > /dev/null 2>&1; then
  VERSION_INFO=$("$PREFIX/bin/lightning" --version)
  echo -e "${GREEN}✅ Installation successful!${NC}"
  echo -e "${GREEN}$VERSION_INFO${NC}"
  echo ""
  echo -e "${BLUE}Get started:${NC}"
  echo -e "${GREEN}$PREFIX/bin/lightning${NC}"
else
  echo -e "${RED}❌ Installation verification failed${NC}"
  exit 1
fi

# Cleanup
cd /
rm -rf /tmp/lightning-install
