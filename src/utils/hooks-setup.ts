/**
 * Git hooks setup for Lightning
 * Handles installation, removal, and status of pre-commit hooks
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface HooksConfig {
  maxMethodLength: number;
  failOn: string[];
  warnOn: string[];
  rules: string[];
  ollamaEnabled: boolean;
  skipSuggestions: boolean;
}

export class HooksSetup {
  private gitDir: string;
  private hooksDir: string;
  private configDir: string;
  private configFile: string;

  constructor() {
    this.gitDir = this.findGitDir();
    this.hooksDir = path.join(this.gitDir, 'hooks');
    this.configDir = path.join(process.cwd(), '.lightning');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  /**
   * Find .git directory
   */
  private findGitDir(): string {
    try {
      const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf-8' }).trim();
      return path.resolve(gitDir);
    } catch (error) {
      throw new Error('Not a git repository. Run this command in a git repo.');
    }
  }

  /**
   * Load or create default config
   */
  private getConfig(): HooksConfig {
    if (fs.existsSync(this.configFile)) {
      return JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
    }

    return {
      maxMethodLength: 24,
      failOn: ['error'],
      warnOn: ['warning'],
      rules: ['method-length', 'null-safety', 'error-handling', 'unused-imports'],
      ollamaEnabled: false,
      skipSuggestions: true
    };
  }

  /**
   * Save config
   */
  private saveConfig(config: HooksConfig): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
  }

  /**
   * Create pre-commit hook
   */
  private createPreCommitHook(): string {
    return `#!/bin/bash
# Lightning pre-commit hook
# Runs static analysis on staged files

set -e

# Get project root
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

# Get staged files (TypeScript/JavaScript only)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx|js|jsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Run Lightning
echo "⚡ Lightning Pre-Commit Analysis"
echo "════════════════════════════════"

# Use lightning CLI if available, otherwise use npm
if command -v lightning &> /dev/null; then
  lightning analyze --files $STAGED_FILES --fail-on-error --quiet
else
  npm run lightning -- analyze --files $STAGED_FILES --fail-on-error --quiet
fi

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Lightning found violations!"
  echo "Fix issues and try again."
  echo ""
  echo "To bypass: git commit --no-verify"
  exit 1
fi

echo "✅ All checks passed!"
exit 0
`;
  }

  /**
   * Create post-checkout hook
   */
  private createPostCheckoutHook(): string {
    return `#!/bin/bash
# Lightning post-checkout hook
# Updates metrics baseline after branch switch

PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

# Only update if src directory exists
if [ -d "src" ]; then
  echo "📊 Lightning: Updating metrics baseline..."
  
  if command -v lightning &> /dev/null; then
    lightning analyze --files src/ --quiet 2>/dev/null || true
  else
    npm run lightning -- analyze --files src/ --quiet 2>/dev/null || true
  fi
fi

exit 0
`;
  }

  /**
   * Create commit-msg hook (optional)
   */
  private createCommitMsgHook(): string {
    return `#!/bin/bash
# Lightning commit-msg hook
# Validates commit message format (optional)

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Check if message starts with ticket ID or recognized prefix
if ! echo "$COMMIT_MSG" | grep -qE '^(IOT-|FEATURE|BUGFIX|HOTFIX|REFACTOR|CHORE|DOCS)'; then
  echo ""
  echo "⚠️  Commit message should start with:"
  echo "   - Ticket ID (IOT-123)"
  echo "   - Or prefix (FEATURE, BUGFIX, HOTFIX, REFACTOR, CHORE, DOCS)"
  echo ""
  echo "Example: IOT-123 Fix authentication bug"
  exit 0  # Warning only, not blocking
fi

exit 0
`;
  }

  /**
   * Install hooks
   */
  async install(): Promise<void> {
    console.log('\n✅ Setting up Lightning git hooks...\n');

    // Create config if doesn't exist
    const config = this.getConfig();
    this.saveConfig(config);
    console.log(`📝 Config: ${this.configFile}`);

    // Ensure hooks directory exists
    if (!fs.existsSync(this.hooksDir)) {
      fs.mkdirSync(this.hooksDir, { recursive: true });
    }

    // Install pre-commit hook
    const preCommitPath = path.join(this.hooksDir, 'pre-commit');
    fs.writeFileSync(preCommitPath, this.createPreCommitHook());
    fs.chmodSync(preCommitPath, '755');
    console.log(`  ✓ pre-commit hook installed`);

    // Install post-checkout hook
    const postCheckoutPath = path.join(this.hooksDir, 'post-checkout');
    fs.writeFileSync(postCheckoutPath, this.createPostCheckoutHook());
    fs.chmodSync(postCheckoutPath, '755');
    console.log(`  ✓ post-checkout hook installed`);

    // Install commit-msg hook
    const commitMsgPath = path.join(this.hooksDir, 'commit-msg');
    fs.writeFileSync(commitMsgPath, this.createCommitMsgHook());
    fs.chmodSync(commitMsgPath, '755');
    console.log(`  ✓ commit-msg hook installed`);

    console.log('\n📋 Configuration:');
    console.log(`  Max method length: ${config.maxMethodLength} lines`);
    console.log(`  Fail on: ${config.failOn.join(', ')}`);
    console.log(`  Rules: ${config.rules.join(', ')}`);

    console.log('\n✅ Git hooks installed successfully!\n');
    console.log('Next commit will run Lightning analysis automatically.');
    console.log('To bypass: git commit --no-verify\n');
  }

  /**
   * Remove hooks
   */
  async remove(): Promise<void> {
    console.log('\n🗑️  Removing Lightning git hooks...\n');

    const hooks = ['pre-commit', 'post-checkout', 'commit-msg'];
    for (const hook of hooks) {
      const hookPath = path.join(this.hooksDir, hook);
      if (fs.existsSync(hookPath)) {
        fs.unlinkSync(hookPath);
        console.log(`  ✓ ${hook} hook removed`);
      }
    }

    console.log('\n✅ Git hooks removed!\n');
  }

  /**
   * Check hook status
   */
  async status(): Promise<void> {
    console.log('\n📊 Lightning Hooks Status\n');

    const hooks = ['pre-commit', 'post-checkout', 'commit-msg'];
    for (const hook of hooks) {
      const hookPath = path.join(this.hooksDir, hook);
      const installed = fs.existsSync(hookPath);
      const status = installed ? '✅ installed' : '❌ not installed';
      console.log(`  ${hook}: ${status}`);
    }

    if (fs.existsSync(this.configFile)) {
      console.log(`\n⚙️  Configuration:`);
      const config = this.getConfig();
      console.log(`  Max method length: ${config.maxMethodLength}`);
      console.log(`  Rules enabled: ${config.rules.length}`);
    }

    console.log();
  }

  /**
   * Update config
   */
  async updateConfig(updates: Partial<HooksConfig>): Promise<void> {
    const config = this.getConfig();
    const updated = { ...config, ...updates };
    this.saveConfig(updated);

    console.log('\n✅ Config updated:\n');
    Object.entries(updates).forEach(([key, value]) => {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    });
    console.log();
  }
}
