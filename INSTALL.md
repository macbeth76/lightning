# Installation Guide - Lightning CLI v1.0.0

This guide covers all installation methods for Lightning CLI.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
   - [npm (Recommended)](#npm-recommended)
   - [Homebrew (macOS)](#homebrew-macos)
   - [From Source](#from-source)
   - [Docker](#docker)
3. [Verification](#verification)
4. [Troubleshooting](#troubleshooting)
5. [Uninstall](#uninstall)

---

## Prerequisites

### System Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 7.0.0 or higher (if using npm installation)
- **RAM**: Minimum 256MB (512MB recommended)
- **Disk Space**: 100MB for installation
- **OS**: macOS, Linux, or Windows (with WSL)

### Check Your System

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# If you need to upgrade Node.js, visit: https://nodejs.org/
```

---

## Installation Methods

### npm (Recommended)

The easiest way to install Lightning CLI globally.

#### Step 1: Install from npm Registry

```bash
npm install -g powercontrol-lightning
```

#### Step 2: Verify Installation

```bash
lightning --version
# Output: lightning@1.0.0

lightning --help
# Output: Display help information
```

#### Benefits of npm Installation
- ✅ Easy updates: `npm install -g powercontrol-lightning@latest`
- ✅ Global CLI access from any directory
- ✅ Automatic dependency management
- ✅ Works on all platforms (macOS, Linux, Windows)

---

### Homebrew (macOS)

For macOS users, Homebrew provides an easy installation method.

#### Step 1: Add the Homebrew Tap

```bash
brew tap PowerSecure/lightning
```

#### Step 2: Install Lightning

```bash
brew install lightning
```

#### Step 3: Verify Installation

```bash
lightning --version
# Output: lightning@1.0.0
```

#### Homebrew Commands

```bash
# Update Lightning to latest version
brew upgrade lightning

# View Lightning formula details
brew info lightning

# Uninstall Lightning
brew uninstall lightning
```

#### Benefits of Homebrew Installation
- ✅ Native macOS integration
- ✅ Automatic updates with `brew upgrade`
- ✅ Standard Homebrew conventions
- ✅ Easy uninstall

---

### From Source

For developers or when npm is not available.

#### Step 1: Clone the Repository

```bash
git clone https://github.com/PowerSecure/lightning.git
cd lightning
```

#### Step 2: Install Dependencies

```bash
npm install
# or with pnpm (recommended)
pnpm install
```

#### Step 3: Build the Project

```bash
npm run build
```

#### Step 4: Make CLI Executable

```bash
chmod +x dist/cli.js
```

#### Step 5: Link Globally (Optional)

```bash
npm link
# Now you can use 'lightning' from anywhere

# Or, create a symlink manually:
sudo ln -s $(pwd)/dist/cli.js /usr/local/bin/lightning
```

#### Step 6: Verify Installation

```bash
lightning --version
```

#### Benefits of Source Installation
- ✅ Access to latest development features
- ✅ Easy to contribute back to the project
- ✅ Full control over the installation
- ✅ Ability to make local modifications

---

### Docker

Run Lightning CLI in a Docker container.

#### Step 1: Create a Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Lightning CLI
RUN npm install -g powercontrol-lightning

# Set working directory for analysis
WORKDIR /code

# Run Lightning by default
ENTRYPOINT ["lightning"]
CMD ["--help"]
```

#### Step 2: Build the Docker Image

```bash
docker build -t lightning-cli:1.0.0 .
```

#### Step 3: Run Lightning in Docker

```bash
# Get help
docker run --rm lightning-cli:1.0.0 --help

# Analyze current directory
docker run --rm -v $(pwd):/code lightning-cli:1.0.0 analyze /code

# Analyze specific directory
docker run --rm -v /path/to/project:/code lightning-cli:1.0.0 analyze /code/src
```

#### Docker Benefits
- ✅ Consistent environment across systems
- ✅ No local Node.js installation required
- ✅ Easy CI/CD integration
- ✅ Isolated execution environment

---

## Verification

### Verify Installation Success

After installation, run these commands to verify everything is working:

#### 1. Check Version

```bash
lightning --version
```

**Expected Output:**
```
lightning@1.0.0
```

#### 2. Display Help

```bash
lightning --help
```

**Expected Output:**
```
Lightning CLI - Fast code analysis for small language models

USAGE:
  lightning [COMMAND] [OPTIONS]
...
```

#### 3. Analyze a Directory

```bash
lightning analyze .
```

**Expected Output:**
```
Analyzing: .
✓ Analysis complete
Violations found: X
...
```

#### 4. Check CLI Path (Optional)

```bash
which lightning
# Should show the installation path

lightning --version
# Should output: lightning@1.0.0
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "command not found: lightning"

**Cause**: CLI is not in your system PATH

**Solutions**:
```bash
# If installed with npm globally
npm list -g powercontrol-lightning

# If installed with Homebrew
brew list lightning

# If installed from source, ensure the symlink exists
ls -l /usr/local/bin/lightning

# Try re-installing
npm install -g powercontrol-lightning
```

#### Issue 2: "Permission denied" Error

**Cause**: Insufficient permissions to execute the CLI

**Solutions**:
```bash
# Make the script executable
chmod +x dist/cli.js

# Or, if installed globally:
sudo chown -R $(whoami) ~/.npm
npm install -g powercontrol-lightning --force
```

#### Issue 3: "Node.js version too old"

**Cause**: Your Node.js version is below 16.0.0

**Solutions**:
```bash
# Check current version
node --version

# Update Node.js
# Using Homebrew (macOS)
brew upgrade node

# Using nvm (Node Version Manager) - recommended
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Issue 4: npm Permission Errors

**Cause**: npm permissions issue during global installation

**Solutions**:
```bash
# Option 1: Change npm default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Option 2: Use sudo (not recommended)
sudo npm install -g powercontrol-lightning

# Option 3: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo "export PATH=~/.npm-global/bin:$PATH" >> ~/.bashrc
source ~/.bashrc
```

#### Issue 5: "Cannot find module" Errors

**Cause**: Dependencies not properly installed

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Reinstall globally
npm install -g powercontrol-lightning

# Or, from source:
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Issue 6: Homebrew Installation Fails

**Cause**: Tap not found or formula outdated

**Solutions**:
```bash
# Update Homebrew
brew update

# Remove and re-add the tap
brew untap PowerSecure/lightning
brew tap PowerSecure/lightning

# Install again
brew install lightning
```

### Getting Help

If you encounter issues:

1. **Check the documentation**: https://github.com/PowerSecure/lightning#readme
2. **Search existing issues**: https://github.com/PowerSecure/lightning/issues
3. **Create a new issue** with:
   - Your Node.js version (`node --version`)
   - Your npm version (`npm --version`)
   - Your operating system
   - The command that failed
   - The complete error message

---

## Uninstall

### Uninstall from npm

```bash
npm uninstall -g powercontrol-lightning
```

### Uninstall from Homebrew

```bash
brew uninstall lightning
```

### Uninstall from Source

```bash
# If you created a symlink
sudo rm /usr/local/bin/lightning

# If you used npm link
npm unlink -g powercontrol-lightning
```

### Clean Up After Uninstall

```bash
# Remove any configuration files (optional)
rm -rf ~/.lightning

# Remove git hooks if installed
lightning --setup hooks --remove  # Before uninstalling
```

---

## Configuration

### Global Configuration

Lightning CLI respects a `.lightningrc` configuration file in your project:

```json
{
  "maxLength": 24,
  "failOnError": false,
  "excludePatterns": ["node_modules", "dist", "build"],
  "rules": {
    "methodLength": true,
    "complexity": true,
    "naming": false
  }
}
```

### Per-Project Configuration

For per-project settings, create `.lightningrc` in your project root:

```bash
# Create configuration
cat > .lightningrc << EOF
{
  "maxLength": 20,
  "failOnError": true
}
EOF

# Use it
lightning analyze src/
```

---

## Next Steps

After installation:

1. **Run your first analysis**: `lightning analyze .`
2. **Set up git hooks**: `lightning --setup hooks`
3. **Integrate with GitHub Actions**: See RELEASE_NOTES_v1.0.md
4. **Check the documentation**: Visit https://github.com/PowerSecure/lightning

---

## Support

- **GitHub Issues**: https://github.com/PowerSecure/lightning/issues
- **Discussions**: https://github.com/PowerSecure/lightning/discussions
- **Documentation**: https://github.com/PowerSecure/lightning/blob/main/README.md
- **Email**: support@powersecure.com

---

**Lightning CLI v1.0.0 - Installation Guide Complete! ⚡**

Happy analyzing! 🚀
