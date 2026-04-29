# 🚀 Getting Started with Lightning CLI

**Complete teaching package for creating projects with Lightning**

---

## Choose Your Learning Path

### ⚡ Path 1: Quick Start (15 minutes)

**Best for**: "Just show me the commands"

```bash
# 1. Read this first
cat LIGHTNING_QUICK_START.md

# 2. Install Lightning
npm install -g lightning
# or
pnpm install -g lightning

# 3. Create project
mkdir my-api && cd my-api
pnpm init -y
pnpm add express

# 4. Analyze
lightning analyze src

# Done! ✅
```

**Result**: Understand basics and have Lightning running

---

### 🎓 Path 2: Hands-On Tutorial (30 minutes)

**Best for**: "Build something real and learn"

```bash
# 1. Read the tutorial
cat TUTORIAL_BUILD_API.md

# 2. Follow Part 1 (TypeScript API)
# - Copy code examples
# - Build working REST API
# - Run: npx ts-node src/index.ts

# 3. Follow Part 2 (Java/Gradle)
# - Create Gradle project
# - Analyze build file

# 4. Follow Part 3 (Git Hooks)
# - Setup hooks
# - Test violations

# 5. Follow Part 4 (CI/CD)
# - Create GitHub Actions workflow
# - Push and watch it work

# Done! ✅
```

**Result**: Have working projects + understand 24-line rule + setup automation

---

### 📚 Path 3: Complete Mastery (1 hour)

**Best for**: "I want to understand everything"

```bash
# 1. Read all three guides
cat LIGHTNING_QUICK_START.md       # 15 min
cat TUTORIAL_BUILD_API.md          # 20 min
cat CREATE_PROJECT_GUIDE.md        # 25 min

# 2. Build multiple projects
# - TypeScript API
# - Java/Gradle service
# - Document with markdown

# 3. Setup team integration
# - Git hooks for whole team
# - CI/CD pipeline
# - Share best practices

# 4. Measure and compare
# - Run Lightning (should be fast!)
# - Compare to Copilot (416x faster!)

# Done! You're an expert! ✅
```

**Result**: Complete understanding + expert knowledge + team ready

---

## File Guide

| File | Purpose | Time | For Who |
|------|---------|------|---------|
| **LIGHTNING_QUICK_START.md** | Commands + examples | 15 min | Quick learners |
| **TUTORIAL_BUILD_API.md** | Step-by-step projects | 30 min | Hands-on learners |
| **CREATE_PROJECT_GUIDE.md** | Complete reference | 1 hour | Deep dive |
| **PNPM_MIGRATION.md** | Why pnpm is faster | 5 min | Reference |
| **INSTALL.md** | Installation guide | 5 min | Getting started |
| **PHASE_5B_AB_BENCHMARK.md** | Performance proof | 10 min | Compare to Copilot |

---

## The 24-Line Rule (30 seconds)

**Everything in Lightning follows the 24-line rule:**

```
Code methods:      ≤ 24 lines
Gradle tasks:      ≤ 24 lines
Doc sections:      ≤ 24 blocks (~300 words)
```

**Why?**
- 24 lines = ~100-200 tokens
- Perfect for 7B small language models
- Parallelizable (no context bloat)
- Results: 416x faster than Copilot

---

## Quick Commands

### Analyze Code
```bash
lightning analyze src                    # TypeScript/JS
lightning analyze . --docs               # Documentation
lightning analyze build.gradle --gradle  # Gradle tasks
```

### Setup Automation
```bash
lightning --setup hooks                  # Git hooks
lightning analyze src --fail-on-error    # CI/CD check
```

### Help
```bash
lightning --help                         # Show commands
lightning --version                      # Show version
```

---

## Example: Create API in 5 Minutes

```bash
# Setup
mkdir my-api && cd my-api
pnpm init -y
pnpm add express

# Create main file
mkdir src
cat > src/index.ts << 'TS'
import express from 'express';
const app = express();
app.use(express.json());

app.post('/users', (req, res) => {
  res.json({ id: 1, name: req.body.name });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => console.log('Ready on :3000'));
TS

# Analyze
lightning analyze src

# Run
npx ts-node src/index.ts

# Test in another terminal
curl http://localhost:3000/health
```

**Result**: Working API that passes Lightning validation ✅

---

## Where to Go Next

### After Quick Start
- Read TUTORIAL_BUILD_API.md for hands-on project
- Build your first TypeScript API
- Setup git hooks locally

### After Hands-On Tutorial
- Read CREATE_PROJECT_GUIDE.md for deep dive
- Build Java/Gradle projects
- Setup team CI/CD pipeline

### After Mastery
- Share Lightning with your team
- Setup company-wide standards
- Measure speed vs competitors (416x faster!)
- Contribute to Lightning (open source)

---

## FAQ

**Q: Do I need to install pnpm?**
A: No, npm works too. But pnpm is 10x faster (see PNPM_MIGRATION.md)

**Q: What if my function is 25 lines?**
A: Break it into smaller functions. That's the whole point!

**Q: Can I use Lightning offline?**
A: Yes! Completely local, no cloud calls

**Q: Does Lightning work with my IDE?**
A: Yes, via git hooks + CI/CD. VS Code extension coming soon.

**Q: How do I compare to Copilot?**
A: Lightning is 416x faster (see PHASE_5B_AB_BENCHMARK.md)

---

## Getting Help

- **Quick reference**: LIGHTNING_QUICK_START.md
- **Examples**: TUTORIAL_BUILD_API.md
- **Deep dive**: CREATE_PROJECT_GUIDE.md
- **Performance**: PHASE_5B_AB_BENCHMARK.md
- **Installation**: INSTALL.md

---

## What's Next?

1. ✅ Pick a learning path above
2. ✅ Read the first guide
3. ✅ Run the first example
4. ✅ Create your first project
5. ✅ Share with team

**You're 15 minutes away from using Lightning!**

---

**Lightning CLI v1.0.0**
- Status: Production Ready
- Philosophy: 24-unit chunks for small LLM performance
- Speed: 416x faster than Copilot
- Cost: Free
- Privacy: 100% local

Let's go! 🚀
