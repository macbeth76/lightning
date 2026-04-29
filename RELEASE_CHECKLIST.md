# 🚀 Lightning CLI Release Checklist

## Pre-Release (Dev Lead)

### Code Quality
- [ ] All tests pass: `pnpm run test`
- [ ] Code coverage ≥ 90%: `pnpm run test:coverage`
- [ ] Linting passes: `pnpm run lint`
- [ ] No security issues: `npm audit`
- [ ] TypeScript strict mode passes: `pnpm run build`
- [ ] All JSDoc comments present on public APIs

### Documentation
- [ ] CHANGELOG.md updated with new features
- [ ] README.md updated with latest features
- [ ] DISTRIBUTION_STRATEGY.md reflects current plan
- [ ] INSTALLER_GUIDE.md is accurate
- [ ] Benchmark metrics updated: `lightning --benchmark`

### Testing
- [ ] Unit tests for new features
- [ ] Integration tests pass
- [ ] A/B benchmarks run successfully
- [ ] Sample code analysis works
- [ ] GitHub/Jira MCP integration tested

### Version Management
- [ ] Update version in `package.json`
- [ ] Update version in `Dockerfile`
- [ ] Update version in `homebrew-lightning.rb`
- [ ] Verify all version numbers match

---

## Release (GitHub Actions - Automated)

### Build Phase
- [ ] Trigger: `git tag v1.0.0 && git push --tags`
- [ ] GitHub Actions workflow starts automatically
- [ ] Build matrix runs:
  - [ ] Linux x64
  - [ ] Linux arm64
  - [ ] macOS x64
  - [ ] macOS arm64
  - [ ] Windows x64
  - [ ] Windows arm64

### Test Phase (in CI)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage maintained
- [ ] No security vulnerabilities

### Artifact Creation (in CI)
- [ ] Binaries compiled and optimized
- [ ] Checksums generated (SHA256)
- [ ] Docker image built
- [ ] Artifacts uploaded

### Release Publishing (in CI)

#### GitHub Release
- [ ] Release created with version tag
- [ ] All binaries attached
- [ ] Checksums attached
- [ ] Release notes generated:
  - New features
  - Bug fixes
  - Breaking changes (if any)
  - Benchmark metrics

#### NPM Registry
- [ ] `npm publish @github/lightning@v1.0.0`
- [ ] Verify on npm: https://www.npmjs.com/package/@github/lightning
- [ ] Tag as `latest` if stable release

#### Docker Hub
- [ ] Image pushed: `github/lightning:v1.0.0`
- [ ] Image tagged: `github/lightning:latest`
- [ ] Verify on Docker Hub

#### Homebrew
- [ ] Formula updated in `github/homebrew-lightning`
- [ ] SHA256 in formula matches release
- [ ] Verify: `brew install lightning-cli`

#### WinGet
- [ ] Manifest submitted to Microsoft WinGet repo
- [ ] Waiting for Microsoft approval (24-48 hours)
- [ ] Once approved: `winget install GitHub.Lightning`

---

## Post-Release (Next Day)

### Verification
- [ ] Bash installer works: `curl -fsSL https://lightning.dev/install | bash`
- [ ] npm install works: `npm install -g @github/lightning`
- [ ] Docker image runs: `docker run github/lightning --version`
- [ ] Homebrew install works: `brew install lightning-cli`
- [ ] `lightning --version` returns correct version
- [ ] `lightning --benchmark` shows metrics
- [ ] `lightning analyze ./sample` works immediately

### Announcements
- [ ] Tweet announcement with metrics
- [ ] Blog post published (optional)
- [ ] GitHub discussion posted
- [ ] Slack/Discord announcement (if applicable)
- [ ] Reddit post to r/typescript, r/devtools (optional)

### Monitoring
- [ ] Monitor GitHub releases for download count
- [ ] Check npm stats for weekly downloads
- [ ] Monitor Docker Hub pull count
- [ ] Watch GitHub issues for bugs/feedback
- [ ] Track user feedback on metrics claims

---

## Day 7 Review

### Metrics Assessment
- [ ] GitHub downloads: Target 1,000+
- [ ] npm weekly downloads: Target 500+
- [ ] Docker pulls: Target 1,000+
- [ ] GitHub stars: Track trajectory
- [ ] User issues reported: Document patterns
- [ ] Benchmark claims validated: Speed, cost, quality

### Bug Fixes
- [ ] Any critical bugs reported?
  - [ ] If yes, hotfix and patch release (v1.0.1)
- [ ] Any platform-specific issues?
  - [ ] Windows: Test all commands
  - [ ] macOS ARM64: Verify performance
  - [ ] Linux ARM64: Verify compatibility

### Community Feedback
- [ ] Review all issues/PRs
- [ ] Respond to feature requests
- [ ] Gather improvement suggestions
- [ ] Plan for v1.1 release

---

## Month 1 Goals

- [ ] 10,000+ GitHub releases downloads
- [ ] 5,000+ npm weekly installs
- [ ] 10,000+ Docker pulls
- [ ] 1,000+ GitHub stars
- [ ] 100+ GitHub discussions
- [ ] Stable v1.0.x releases (bug fixes)
- [ ] User case studies (if available)

---

## Release Command Reference

```bash
# Create release tag (triggers automated GitHub Actions)
git tag v1.0.0
git push --tags

# Manually verify artifacts
lightning --version
lightning --benchmark
lightning analyze ./test-project

# Publish to npm (if auto-publish fails)
pnpm publish

# Build Docker image locally
docker build -t github/lightning:v1.0.0 .

# Test installer locally
bash install.sh

# Verify checksums
sha256sum -c checksums.sha256
```

---

## Sign-Off

- [ ] Release Lead Approval: ________________
- [ ] QA Lead Approval: ________________
- [ ] Product Manager Approval: ________________
- [ ] Release Date: ________________
- [ ] Release Version: v________________

