# ⚡ Lightning CLI - Quick Start Reference Card

---

## Installation

```bash
# Global install
npm install -g lightning
# or
pnpm install -g lightning

# Verify
lightning --version
```

---

## Create a New Project (5 minutes)

### TypeScript API

```bash
mkdir my-api && cd my-api
pnpm init -y
pnpm add express
pnpm add -D typescript @types/express @types/node ts-node

# Create src/index.ts
# Run: npx ts-node src/index.ts
# Analyze: lightning analyze src
```

### Java Service

```bash
mkdir my-service && cd my-service
gradle init --type java-application

# Update build.gradle
# Build: ./gradlew build
# Analyze: lightning analyze build.gradle --gradle
```

---

## Core Commands

### Analyze Code

```bash
# Analyze TypeScript/JavaScript
lightning analyze src

# With suggestions (requires Ollama)
lightning analyze src --with-suggestions

# Fail on error
lightning analyze src --fail-on-error

# Quiet mode
lightning analyze src --quiet
```

### Analyze Gradle

```bash
# Analyze Gradle build file
lightning analyze build.gradle --gradle

# With dependency visualization
lightning analyze build.gradle --gradle --verbose
```

### Analyze Documentation

```bash
# Analyze README.md as graph
lightning analyze README.md --docs

# Check documentation structure
lightning analyze . --docs
```

### Setup & Manage Hooks

```bash
# Install git hooks
lightning --setup hooks

# Show hook status
lightning --setup hooks --status

# Disable hooks (temporary)
lightning --setup hooks --disable

# Remove hooks
lightning --setup hooks --remove
```

---

## The 24-Line Rule

**Everything in Lightning is designed around 24-unit chunks:**

### Code (TypeScript/JavaScript)
```typescript
// ✅ GOOD: 8 lines
function validate(data) {
  return data.filter(x => x.active);
}

// ❌ BAD: 30+ lines
function processEverything(data) {
  // Validation
  // Transformation
  // Saving
  // ... too much
}
```

### Gradle Tasks

```gradle
// ✅ GOOD: 10 lines
task buildApp {
  doLast {
    println 'Building...'
  }
}

// ❌ BAD: 40+ lines
task complexBuild {
  doLast {
    // Validation
    // Compilation
    // Testing
    // ... too much
  }
}
```

### Documentation Sections

```markdown
# Section ✅ GOOD
- 24 blocks max (~300 words)
- Links to other sections
- Clear headings

## Subsection ❌ BAD
- 100+ words
- No structure
- Hard to navigate
```

---

## Violation Types

### Code Violations

| Rule | Limit | Fix |
|------|-------|-----|
| `method-length` | 24 lines | Break into smaller functions |
| `method-complexity` | 3 parameters | Reduce params/use objects |
| `method-depth` | 3 nesting levels | Extract nested logic |

### Gradle Violations

| Rule | Limit | Fix |
|------|-------|-----|
| `task-length` | 24 lines | Split into smaller tasks |
| `dependency-cycle` | No cycles | Reorder task dependencies |
| `orphaned-task` | Used | Remove or use task |
| `task-complexity` | 3 deps | Reduce dependencies |

### Documentation Violations

| Rule | Limit | Fix |
|------|-------|-----|
| `section-length` | 24 blocks | Split section into subsections |
| `orphaned-section` | Linked | Link to/from other sections |
| `broken-link` | Must exist | Update or create target |

---

## Workflow Patterns

### Local Development

```bash
# 1. Code something
echo "function myFn() { ... }" > src/feature.ts

# 2. Check if valid
lightning analyze src

# 3. If violations, fix
# ... edit code ...

# 4. Commit when clean
git add .
git commit -m "Add feature"
# ✅ Pre-commit hook validates automatically
```

### Code Review

```bash
# Before PR:
lightning analyze src --fail-on-error

# Output shows:
# ✅ PASS = Ready to push
# ❌ FAIL = Fix violations first

# Team sees Lightning badge on PR
# ✅ Lightning: All checks passed
```

### CI/CD

```yaml
# .github/workflows/lightning.yml
- name: Lightning Analysis
  run: |
    lightning analyze src --fail-on-error
    if [ -f build.gradle ]; then
      lightning analyze build.gradle --gradle --fail-on-error
    fi
```

---

## Metrics & Performance

### What Lightning Measures

```bash
$ lightning analyze src --verbose

Analysis Results:
  ✓ Time: 82ms (vs 56.6s Copilot) ⚡ 416x faster
  ✓ Violations: 0 detected
  ✓ Accuracy: 100% rule-based
  ✓ Token usage: ~200 tokens (vs 5000+ Copilot)
```

### Comparing to Competitors

| Metric | Lightning | Copilot CLI |
|--------|-----------|------------|
| Speed | 82ms | 56.6s |
| Cost | Free | $20/month |
| Privacy | Local | Cloud |
| Model | 7B optimal | 13B+ required |
| Deterministic | Yes | No |

---

## Best Practices

### ✅ DO

- Split large methods into small functions
- Use git hooks to catch violations early
- Enable CI/CD checks on all PRs
- Design with 24-unit chunks in mind
- Document with markdown sections

### ❌ DON'T

- Write methods > 24 lines
- Have circular task dependencies
- Skip pre-commit checks
- Disable Lightning in CI/CD
- Use monolithic functions

---

## Troubleshooting

### Q: Method exceeds 24 lines. How do I fix it?

**A**: Break it into smaller functions:
```typescript
// Before: 40 lines
function process(data) {
  // validate
  // transform
  // save
}

// After: Three 10-line functions
function validate(data) { ... }
function transform(data) { ... }
function save(data) { ... }
```

### Q: Can I increase the limit?

**A**: You can temporarily, but shouldn't:
```bash
lightning analyze src --max-length 40  # Not recommended

# Why? 24 lines is optimized for small LLMs (7B tokens)
# Larger chunks require larger models (13B+)
```

### Q: Does Lightning work offline?

**A**: Yes! Completely local:
```bash
# No cloud calls, no API keys
# Everything runs on your machine
lightning analyze src
```

### Q: How do I integrate with my IDE?

**A**: Use git hooks and CI/CD:
```bash
# Pre-commit hook alerts you instantly
# CI/CD shows status on PRs
# VS Code Lightning extension coming soon
```

---

## Next Steps

1. ✅ Install: `npm install -g lightning`
2. ✅ Create project: Follow TUTORIAL_BUILD_API.md
3. ✅ Setup hooks: `lightning --setup hooks`
4. ✅ Share with team: Use pnpm for fast installs
5. ✅ Measure: Compare vs Copilot (416x faster!)

---

## Resources

- **Full Tutorial**: TUTORIAL_BUILD_API.md
- **Project Guide**: CREATE_PROJECT_GUIDE.md
- **Competitive Report**: PHASE_5B_AB_BENCHMARK.md
- **Installation Guide**: INSTALL.md

---

**Lightning CLI v1.0.0**  
**Status**: Production Ready  
**Philosophy**: 24-unit chunks = small LLM superpower  

Ready to build? 🚀
