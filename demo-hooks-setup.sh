#!/bin/bash
# Demo: Lightning hooks setup in action

echo "
╔════════════════════════════════════════════════════════════════════════════╗
║                Lightning Hooks Setup - Live Demo                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"

# Create temp directory
TMP_DEMO=$(mktemp -d)
cd "$TMP_DEMO"

echo "📁 Created demo directory: $TMP_DEMO"
echo ""

# Initialize git repo
git init --quiet
git config user.name "Lightning Demo"
git config user.email "demo@lightning.local"
echo "✓ Git repository initialized"
echo ""

# Copy Lightning to demo
LIGHTNING_PATH="/root/MyProjects/powercontrol-lightning"
cp -r "$LIGHTNING_PATH/dist" "$TMP_DEMO/"
echo "✓ Lightning compiled files copied"
echo ""

# Create demo project structure
mkdir -p src/utils
cat > src/utils/example.ts << 'TS'
// Example: Method that exceeds 24 lines
export function analyzeCode(code: string) {
  const lines = code.split('\n');
  let count = 0;
  let inComment = false;
  
  for (const line of lines) {
    if (line.includes('/*')) inComment = true;
    if (!inComment) count++;
    if (line.includes('*/')) inComment = false;
  }
  
  console.log(`Found ${count} lines`);
  
  // This method is getting long...
  const result = {
    lines: count,
    hasIssues: count > 24,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  
  return result;
}
TS

git add .
git commit --quiet -m "Initial commit" 2>/dev/null || true
echo "✓ Demo project created with example code"
echo ""

# Now show the hooks setup process
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Running: lightning --setup hooks                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Run Lightning hooks setup using Node directly
node -e "
const { HooksSetup } = require('./dist/utils/hooks-setup');
const setup = new HooksSetup();
setup.install().then(() => {
  console.log('📋 Verifying installation...');
  setup.status();
}).catch(err => console.error('Error:', err.message));
" 2>&1 || true

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Hooks Installation Complete!                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Show installed hooks
echo "📂 Installed hooks in .git/hooks/:"
ls -lh "$TMP_DEMO/.git/hooks/" | grep -E "pre-commit|post-checkout|commit-msg" | awk '{print "  " $9 " (" $5 ")"}'
echo ""

# Show config
echo "⚙️  Configuration (.lightning/config.json):"
cat "$TMP_DEMO/.lightning/config.json" | sed 's/^/  /'
echo ""

# Test running a commit
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            Testing pre-commit hook trigger                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Make a change
cat > src/utils/example.ts << 'TS'
// Modified example
export function analyzeCode(code: string) {
  const lines = code.split('\n');
  let count = 0;
  let inComment = false;
  
  for (const line of lines) {
    if (line.includes('/*')) inComment = true;
    if (!inComment) count++;
    if (line.includes('*/')) inComment = false;
  }
  
  console.log(`Found ${count} lines`);
  const result = {
    lines: count,
    hasIssues: count > 24,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  
  return result;
}
TS

git add src/utils/example.ts

echo "🔄 Attempting to commit (will trigger pre-commit hook):"
echo ""

# Try to commit - the hook will run
git commit -m "Update example" 2>&1 | grep -E "⚡|✅|❌|Lightning" | head -10 || echo "  (Hook ran, checking files...)"

echo ""
echo "✅ Demo complete!"
echo ""
echo "📍 Demo directory: $TMP_DEMO"
echo "🔧 To explore: cd $TMP_DEMO"
echo "🗑️  To cleanup: rm -rf $TMP_DEMO"
echo ""

