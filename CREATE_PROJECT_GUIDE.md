# 🚀 Creating Projects with Lightning CLI

**Complete Tutorial**: Generate & validate new projects using Lightning's 24-unit chunk rules

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [TypeScript Projects](#typescript-projects)
3. [Java/Gradle Projects](#javagradle-projects)
4. [Analysis & Validation](#analysis--validation)
5. [Best Practices](#best-practices)

---

## Prerequisites

### Install Lightning CLI

```bash
# Option 1: Global install (npm)
npm install -g lightning

# Option 2: Global install (pnpm)
pnpm install -g lightning

# Option 3: Local development
cd powercontrol-lightning
pnpm install
node dist/cli.js --help
```

### Verify Installation

```bash
$ lightning --version
lightning@1.0.0

$ lightning --help
Lightning CLI - Fast code analysis for small language models
...
```

---

## TypeScript Projects

### Step 1: Create New TypeScript Project

```bash
mkdir my-api-service
cd my-api-service

# Initialize
pnpm init -y

# Add dependencies
pnpm add express typescript @types/express @types/node
pnpm add -D ts-node @types/jest jest ts-jest
```

### Step 2: Create Project Structure

```bash
# Create directories
mkdir -p src/{routes,services,utils}
mkdir test

# Create tsconfig.json
cat > tsconfig.json << 'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "test"]
}
JSON
```

### Step 3: Create Source Files (Following 24-Line Rule)

**✅ GOOD**: Each function ≤ 24 lines

```bash
cat > src/utils/logger.ts << 'TS'
// ✅ GOOD: 12 lines (within 24-line limit)
export class Logger {
  static info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }

  static error(message: string, error?: Error): void {
    console.log(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) console.error(error.stack);
  }

  static debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  }
}
TS
```

**✅ GOOD**: Another small service

```bash
cat > src/services/user-service.ts << 'TS'
// ✅ GOOD: 18 lines (within 24-line limit)
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  createUser(name: string, email: string): User {
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    };
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }
}
TS
```

**❌ BAD**: Function exceeds 24 lines

```bash
cat > src/services/bad-service.ts << 'TS'
// ❌ BAD: 28 lines (EXCEEDS 24-line limit)
export class ComplexService {
  processData(data: any[]): any {
    let result = [];
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (item.active) {
        item.processed = true;
        item.timestamp = new Date();
        let metadata = {
          version: 1,
          processed_by: "system",
          processing_time: Date.now(),
        };
        item.metadata = metadata;
        result.push(item);
        if (result.length > 100) {
          console.log("Processing batch...");
          // Save batch
          result = [];
        }
      }
    }
    // Cleanup
    for (let leftover of data) {
      if (!leftover.processed) {
        console.log("Unprocessed item:", leftover.id);
      }
    }
    return result; // LINE 28 - VIOLATION!
  }
}
TS
```

### Step 4: Create Main Application

```bash
cat > src/index.ts << 'TS'
// ✅ GOOD: 22 lines (within 24-line limit)
import express, { Express } from 'express';
import { Logger } from './utils/logger';
import { UserService } from './services/user-service';

const app: Express = express();
const userService = new UserService();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  const user = userService.createUser(name, email);
  Logger.info(`Created user: ${user.id}`);
  res.json(user);
});

app.get('/users/:id', (req, res) => {
  const user = userService.getUser(req.params.id);
  res.json(user || { error: 'Not found' });
});

app.listen(PORT, () => {
  Logger.info(`Server running on port ${PORT}`);
});
TS
```

### Step 5: Analyze with Lightning

```bash
# Analyze the project
lightning analyze src

# Expected output (if no violations):
✅ All files pass Lightning validation
- 24-line method limit: PASS
- Complexity rules: PASS
- Structure validation: PASS

# If there are violations:
❌ Violations found:

src/services/bad-service.ts (Line 28)
  Rule: method-length
  Message: Method 'processData' exceeds 24-line limit (28 lines)
  Severity: WARNING
  Fix: Break into smaller methods
```

---

## Java/Gradle Projects

### Step 1: Create New Gradle Project

```bash
mkdir my-java-service
cd my-java-service

# Initialize Gradle wrapper
gradle wrapper --gradle-version=8.5
```

### Step 2: Create build.gradle

**✅ GOOD**: Tasks follow 24-line rule

```groovy
cat > build.gradle << 'GRADLE'
plugins {
  id 'java'
  id 'application'
}

repositories {
  mavenCentral()
}

dependencies {
  implementation 'org.springframework.boot:spring-boot-starter-web:3.0.0'
  testImplementation 'junit:junit:4.13.2'
}

application {
  mainClass = 'com.example.Main'
}

// ✅ GOOD: 12 lines
task buildApp {
  doLast {
    println '🔨 Building application...'
    println 'Target: Java 17'
    println 'JAR: build/libs/app.jar'
  }
}

// ✅ GOOD: 8 lines
task testAll {
  dependsOn test
  doLast {
    println '✅ All tests passed'
  }
}

// ❌ BAD: 32 lines (EXCEEDS 24-line limit)
task complexBuild {
  doLast {
    println 'Starting complex build...'
    def srcDirs = fileTree('src').collect { it.path }
    srcDirs.each { dir ->
      println "Processing: $dir"
      exec {
        commandLine 'javac', dir
      }
    }
    def testDirs = fileTree('test').collect { it.path }
    testDirs.each { dir ->
      println "Testing: $dir"
      exec {
        commandLine 'java', '-jar', "build/$dir/test.jar"
      }
    }
    def reportDirs = fileTree('reports').collect { it.path }
    reportDirs.each { dir ->
      println "Generating report: $dir"
      exec {
        commandLine 'generate-report.sh', dir
      }
    }
    println 'Build complete!' // LINE 32 - VIOLATION!
  }
}
GRADLE
```

### Step 3: Create Java Source Files

```bash
mkdir -p src/main/java/com/example
mkdir -p src/test/java/com/example

# Main class - ✅ GOOD: 18 lines
cat > src/main/java/com/example/Main.java << 'JAVA'
package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Main {
  public static void main(String[] args) {
    SpringApplication.run(Main.class, args);
  }
}

// ✅ GOOD: 12 lines
class UserService {
  public User createUser(String name, String email) {
    User user = new User();
    user.setId(UUID.randomUUID().toString());
    user.setName(name);
    user.setEmail(email);
    return user;
  }
}
JAVA
```

### Step 4: Analyze with Lightning

```bash
# Analyze Gradle build file
lightning analyze build.gradle --gradle

# Expected output:
✅ Gradle Analysis Complete

Rules Checked:
  ✓ task-length: All tasks ≤ 24 lines
  ✓ dependency-cycle: No circular dependencies
  ✓ orphaned-task: No unused tasks
  ✓ task-complexity: No excessive dependencies

Violations Found:
  ⚠️ complexBuild task: 32 lines (exceeds 24-line limit)
     Suggestion: Split into buildSources() and buildTests() tasks
```

---

## Analysis & Validation

### Full Project Analysis

```bash
# Analyze entire project (TypeScript)
lightning analyze . --fail-on-error

# Analyze with suggestions from LLM (if Ollama running)
lightning analyze . --with-suggestions

# Analyze Gradle specifically
lightning analyze . --gradle

# Quiet mode (just pass/fail)
lightning analyze . --quiet
```

### Understanding Violations

```
Lightning detects 9 rule types:

CODE RULES (TypeScript/JavaScript):
  ✓ method-length (max 24 lines)
  ✓ method-complexity (max 3 parameters)
  ✓ method-depth (max 3 nesting levels)

GRADLE RULES (Java):
  ✓ task-length (max 24 lines)
  ✓ dependency-cycle (no circular deps)
  ✓ orphaned-task (must be used)
  ✓ task-complexity (max 3 dependencies)

DOCUMENTATION RULES (Markdown):
  ✓ section-length (max 24 blocks/600 words)
  ✓ orphaned-section (must link to something)
  ✓ broken-link (all links must exist)
```

### Fixing Violations

#### Example: Break Long Methods

**BEFORE** (28 lines - violation):
```typescript
async function processUsers(users: User[]): Promise<void> {
  // ... 28 lines of code
}
```

**AFTER** (3 small functions - valid):
```typescript
// ✅ 8 lines
async function validateUsers(users: User[]): User[] {
  return users.filter(u => u.email && u.name);
}

// ✅ 10 lines
async function enrichUsers(users: User[]): User[] {
  return users.map(u => ({
    ...u,
    created_at: new Date(),
    status: 'active',
  }));
}

// ✅ 6 lines
async function saveUsers(users: User[]): Promise<void> {
  await database.insert('users', users);
}
```

---

## Best Practices

### 1. Design with 24-Unit Chunks from the Start

✅ **DO**: Think in small, composable functions
```typescript
// Each piece is small and testable
export function validate(data): boolean { ... } // 8 lines
export function transform(data): Data { ... }    // 12 lines
export function save(data): void { ... }         // 6 lines
```

❌ **DON'T**: Write one large function
```typescript
export function processEverything(data): void {
  // Validation
  // Transformation
  // Saving
  // Reporting
  // ... 100 lines total
}
```

### 2. Use Graph Structure

Think of your project as a **graph**:
- **Nodes** = Methods (24 lines max)
- **Edges** = Function calls
- **Goal** = Small, connected components

```
Good Graph:
  validate() → transform() → save()
  (small, clear flow)

Bad Graph:
  processAll() → [50 lines of everything]
  (monolithic, hard to parallelize)
```

### 3. Organize for Small Models

```
Project Structure:
  src/
    ├── services/      (business logic, 24-line tasks)
    ├── utils/         (helpers, all small)
    ├── routes/        (handlers, each 24 lines)
    └── models/        (data structures, small)

  test/
    ├── services.test.ts
    ├── utils.test.ts
    └── integration.test.ts
```

### 4. Setup Git Hooks

```bash
# Install Lightning hooks
lightning --setup hooks

# Now every commit checks the 24-line rule:
# If your method exceeds 24 lines, commit is BLOCKED
git commit -m "Add new feature"
# ❌ Error: Method exceeds 24 lines
# ✅ Fix and try again
```

### 5. CI/CD Integration

```yaml
# .github/workflows/lightning.yml
name: Lightning Analysis

on: [pull_request, push]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Lightning
        run: pnpm install -g lightning

      - name: Analyze Code
        run: lightning analyze src --fail-on-error

      - name: Analyze Gradle
        run: |
          if [ -f build.gradle ]; then
            lightning analyze build.gradle --gradle --fail-on-error
          fi
```

---

## Quick Start Templates

### Minimal TypeScript API

```bash
# Create and initialize
mkdir my-api && cd my-api
pnpm init -y
pnpm add express typescript @types/express @types/node
pnpm add -D ts-node jest ts-jest @types/jest

# Copy template
cat > src/index.ts << 'TS'
import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
TS

# Analyze
lightning analyze src
```

### Minimal Java/Gradle Project

```bash
# Create and initialize
mkdir my-service && cd my-service
gradle init --type java-application

# Analyze
lightning analyze build.gradle --gradle
```

---

## Troubleshooting

### Q: Lightning says method is too long. How do I fix it?

**A**: Break it into smaller functions:
```typescript
// ❌ One 40-line function
function process(data) { ... }

// ✅ Four 10-line functions
function validate(data) { ... }
function transform(data) { ... }
function enrich(data) { ... }
function save(data) { ... }
```

### Q: Can I increase the 24-line limit?

**A**: Yes, but you shouldn't! The 24-line rule is optimized for small LLMs:
```bash
# Temporarily increase (not recommended)
lightning analyze src --max-length 40

# But best practice stays at 24
lightning analyze src --max-length 24
```

### Q: Does this work with TypeScript + Gradle projects?

**A**: Yes! Analyze each separately:
```bash
# Analyze TypeScript
lightning analyze src

# Analyze Gradle
lightning analyze build.gradle --gradle

# Or analyze both in one command
lightning analyze .
```

---

## What's Next?

After creating your first project:

1. ✅ Install Lightning hooks: `lightning --setup hooks`
2. ✅ Setup CI/CD in GitHub Actions
3. ✅ Share with your team using pnpm
4. ✅ Monitor metrics in `lightning analyze --verbose`
5. ✅ Scale: Add more projects following the same rules

---

**Ready to Create?** Pick a template above and start building! 🚀

Lightning CLI v1.0.0 | 24-Unit Chunk Philosophy | Small Model Optimized
