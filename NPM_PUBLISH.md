# NPM Publication Guide - Lightning CLI v1.0.0

Complete guide for publishing Lightning CLI to the npm registry.

## Prerequisites

1. **npm Account**
   - Create at: https://www.npmjs.com/signup
   - Username: `your-npm-username`
   - Email: `your-email@example.com`

2. **Local Setup**
   - npm installed and updated
   - Git repository configured
   - All changes committed

3. **Verification**
   ```bash
   # Check npm version
   npm --version  # Should be 7.0.0 or higher
   
   # Check Node.js
   node --version  # Should be 16.0.0 or higher
   ```

## Step 1: Pre-Publication Checks

### 1.1 Verify package.json is Correct

```bash
cd /root/MyProjects/powercontrol-lightning

# Check package.json
cat package.json | grep -E '"name"|"version"|"bin"|"files"'
```

Expected output:
```
"name": "powercontrol-lightning",
"version": "1.0.0",
"bin": { "lightning": "./dist/cli.js" },
"files": ["dist/", "README.md", "LICENSE"]
```

### 1.2 Build and Test

```bash
# Clean build
rm -rf dist/
npm run build

# Verify CLI works
node dist/cli.js --version
node dist/cli.js --help

# Run tests (if available)
npm test
```

### 1.3 Check File Permissions

```bash
# Make CLI executable
chmod +x dist/cli.js

# Verify shebang is present
head -1 dist/cli.js  # Should show: #!/usr/bin/env node
```

## Step 2: NPM Login

### 2.1 Authenticate with npm

```bash
npm login
```

You'll be prompted for:
- **Username**: Your npm username
- **Password**: Your npm password
- **Email**: Your email address (as registered on npm)

### 2.2 Verify Authentication

```bash
npm whoami
# Output: your-npm-username
```

## Step 3: Dry Run Publication

**Always do a dry run first!**

```bash
npm publish --dry-run
```

This will:
- ✅ Validate package.json
- ✅ Check file integrity
- ✅ Verify dependencies
- ✅ Show what will be published
- ❌ NOT actually publish to npm registry

### Expected Dry Run Output

```
npm notice
npm notice 📦  powercontrol-lightning@1.0.0
npm notice === Tarball Contents ===
npm notice 234B  LICENSE
npm notice 2.4kB  README.md
npm notice 123kB  dist/
npm notice 1.2kB  package.json
npm notice === Tarball Details ===
npm notice name: powercontrol-lightning
npm notice version: 1.0.0
npm notice filename: powercontrol-lightning-1.0.0.tgz
npm notice filesize: 45.6 kB
npm notice integrity: sha512-xxx
npm notice === Permissions ===
npm notice 775 dist/cli.js
npm notice === Dist Files ===
npm notice dist/
npm notice README.md
npm notice LICENSE
npm notice
npm notice 🔍  Checking for files that should not be included:
npm notice (none)
npm notice
npm notice ✓ ready to publish
```

## Step 4: Production Publication

### 4.1 Publish to npm Registry

```bash
npm publish
```

### 4.2 Verify Publication

Check npm registry:
```bash
npm view powercontrol-lightning
```

Expected output will show:
- Latest version
- Publisher info
- Package size
- Tarball URL
- Dependencies

### 4.3 Test Installation

```bash
# Install from npm (may take a minute to propagate)
npm install -g powercontrol-lightning

# Verify installation
lightning --version
# Output: lightning@1.0.0

lightning --help
# Output: Lightning CLI help
```

## Step 5: Create GitHub Release

### 5.1 Create Git Tag

```bash
cd /root/MyProjects/powercontrol-lightning

# Create and push tag
git tag -a v1.0.0 -m "Lightning CLI v1.0.0 - Production Release"
git push origin v1.0.0
```

### 5.2 Create Release on GitHub

1. Go to: https://github.com/PowerSecure/lightning/releases
2. Click "Draft a new release"
3. Fill in:
   - **Tag**: v1.0.0
   - **Title**: Lightning CLI v1.0.0 - Production Release
   - **Description**: (Use RELEASE_NOTES_v1.0.md content)
4. Click "Publish release"

## Step 6: Update Distribution Channels

### 6.1 Update Homebrew Formula

```bash
# Create tarball for Homebrew
cd /root/MyProjects/powercontrol-lightning

# Calculate SHA256 for the tarball
curl -s https://registry.npmjs.org/powercontrol-lightning/1.0.0 | grep -i sha

# Update homebrew-lightning.rb with correct SHA256
# Edit: homebrew-lightning.rb
# Replace: sha256 "placeholder_sha256_hash" with actual value
```

### 6.2 Submit to Homebrew Core (Optional)

```bash
# Fork https://github.com/Homebrew/homebrew-core
# Create pull request with updated formula
# Follow Homebrew guidelines: https://docs.brew.sh/Acceptable-Formulae
```

## Post-Publication Tasks

### 1. Announce Release

- Tweet/announce on Twitter
- Update GitHub discussions
- Send to community channels
- Email subscribers

### 2. Monitor for Issues

```bash
# Watch for error reports
# Check npm package page for issues/comments
# Monitor GitHub issues

# Check download statistics after 24 hours
npm view powercontrol-lightning
```

### 3. Document the Release

- Update CHANGELOG.md
- Add release notes to GitHub wiki
- Update documentation
- Create blog post if applicable

## Troubleshooting

### Issue: "You must be logged in"

```bash
# Re-authenticate
npm logout
npm login
npm whoami  # Verify login
```

### Issue: "Package name already taken"

```bash
# Check if name exists
npm search powercontrol-lightning

# Use different scoped name if needed
# Change in package.json: "@your-org/lightning"
# Update package.json "name" field
```

### Issue: "Cannot find module 'dist/cli.js'"

```bash
# Rebuild
npm run build

# Verify file exists
ls -la dist/cli.js

# Make executable
chmod +x dist/cli.js

# Try dry-run again
npm publish --dry-run
```

### Issue: "Files missing from tarball"

```bash
# Check files field in package.json
cat package.json | grep -A 5 '"files"'

# Should include:
# "files": ["dist/", "README.md", "LICENSE"]

# Verify files exist
ls -la dist/cli.js
ls -la README.md
ls -la LICENSE
```

### Issue: Publishing takes too long

```bash
# Check npm registry status
curl -s https://status.npmjs.org/api/v2/status.json

# If registry is down, wait and retry
# Takes 5-10 minutes for package to be searchable
```

## Rollback (If Needed)

### Deprecate a Version

```bash
npm deprecate powercontrol-lightning@1.0.0 "Use v1.0.1 instead"
```

### Unpublish (Not Recommended)

```bash
# Only possible within 72 hours of publication
npm unpublish powercontrol-lightning@1.0.0
```

## Publishing Workflow Script

Create `publish.sh` for automated publishing:

```bash
#!/bin/bash

set -e

echo "🔍 Pre-publication checks..."
npm run build
npm run lint
npm test

echo "📋 Running dry-run..."
npm publish --dry-run

echo "❓ Ready to publish to npm? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Publishing to npm..."
    npm publish
    
    echo "✅ Publication complete!"
    echo "📊 View on npm: https://www.npmjs.com/package/powercontrol-lightning"
    echo "🔗 GitHub release: https://github.com/PowerSecure/lightning/releases"
else
    echo "❌ Publication cancelled"
    exit 1
fi
```

Usage:
```bash
chmod +x publish.sh
./publish.sh
```

## Publishing Checklist

- [ ] All code changes committed to git
- [ ] Version updated to 1.0.0 in package.json
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] CLI works: `lightning --version`
- [ ] Shebang added to dist/cli.js
- [ ] Files field correct in package.json
- [ ] README.md present
- [ ] LICENSE file present
- [ ] npm login verified: `npm whoami`
- [ ] Dry-run succeeds: `npm publish --dry-run`
- [ ] Ready to publish: `npm publish`
- [ ] Installation tested: `npm install -g powercontrol-lightning`
- [ ] GitHub release created with v1.0.0 tag
- [ ] Homebrew formula updated
- [ ] Release notes published
- [ ] Announce to community

## Version Management

### Semantic Versioning

```
v1.0.0
│ │ │
│ │ └─ Patch (bug fixes): v1.0.1, v1.0.2
│ └─── Minor (features): v1.1.0, v1.2.0
└───── Major (breaking): v2.0.0
```

### Publishing Next Version

```bash
# Update version
npm version minor  # v1.1.0
npm version patch  # v1.0.1
npm version major  # v2.0.0

# Publish
npm publish

# Push tag
git push origin --tags
```

## Support

- npm Help: https://docs.npmjs.com/
- Package page: https://www.npmjs.com/package/powercontrol-lightning
- GitHub: https://github.com/PowerSecure/lightning
- Issues: https://github.com/PowerSecure/lightning/issues

---

**Lightning CLI v1.0.0 - Ready for npm Publication! 🚀⚡**

Next: Run `npm publish` (after dry-run verification)
