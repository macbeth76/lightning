# 📦 Lightning Installer - Distribution & Installation

## Goal: Make Lightning as Easy to Install as Copilot CLI

```bash
# Current (Copilot CLI):
curl -fsSL https://gh.io/copilot-install | bash

# Target (Lightning):
curl -fsSL https://lightning.dev/install | bash
```

---

## 📋 Installation Methods (In Priority Order)

### 1. **Direct Bash Install (curl | bash)**
```bash
curl -fsSL https://lightning.dev/install | bash
```
**File:** `install.sh`
**Works on:** Linux, macOS

### 2. **Homebrew (macOS + Linux)**
```bash
brew install lightning-cli
brew install lightning-cli@prerelease
```
**Workflow:** Push to Homebrew taps

### 3. **NPM (Universal)**
```bash
npm install -g @github/lightning
npm install -g @github/lightning@prerelease
```
**File:** Publish to npm registry

### 4. **WinGet (Windows)**
```bash
winget install GitHub.Lightning
winget install GitHub.Lightning.Prerelease
```
**Workflow:** Add to Microsoft WinGet repo

### 5. **Apt (Ubuntu/Debian)**
```bash
echo "deb https://lightning.dev/apt stable main" | sudo tee /etc/apt/sources.list.d/lightning.list
sudo apt update
sudo apt install lightning-cli
```
**Workflow:** Host .deb packages

### 6. **Docker (Container)**
```bash
docker pull github/lightning:latest
docker run -it github/lightning
```
**File:** `Dockerfile`

---

## 🏗️ Installer Architecture

```
lightning-installer/
├── install.sh              # Main bash installer
├── Dockerfile              # Docker image
├── homebrew/
│   └── lightning.rb        # Homebrew formula
├── scripts/
│   ├── download.sh         # Download binary
│   ├── verify.sh           # Verify checksums
│   ├── setup.sh            # Post-install setup
│   └── uninstall.sh        # Cleanup
├── releases/
│   ├── lightning-v1.0.0-linux-x64.tar.gz
│   ├── lightning-v1.0.0-macos-arm64.tar.gz
│   └── lightning-v1.0.0-windows-x64.exe
└── metadata.json           # Version info
```

---

## 📝 install.sh Script

```bash
#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="github/lightning"
RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"
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

FILENAME="lightning-v${VERSION}-${PLATFORM}-${ARCH_SUFFIX}.tar.gz"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/v${VERSION}/$FILENAME"

echo -e "${BLUE}ℹ️ Detected: $OS $ARCH${NC}"
echo -e "${BLUE}ℹ️ Downloading: $FILENAME${NC}"

# Download
mkdir -p /tmp/lightning-install
cd /tmp/lightning-install
curl -fsSL -o "$FILENAME" "$DOWNLOAD_URL" || {
  echo -e "${RED}❌ Failed to download${NC}"
  exit 1
}

# Extract
echo -e "${BLUE}ℹ️ Extracting...${NC}"
tar xzf "$FILENAME"

# Verify checksum
echo -e "${BLUE}ℹ️ Verifying...${NC}"
curl -fsSL -o checksums.txt "$DOWNLOAD_URL.sha256"
sha256sum -c checksums.txt || {
  echo -e "${RED}❌ Checksum verification failed${NC}"
  exit 1
}

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
