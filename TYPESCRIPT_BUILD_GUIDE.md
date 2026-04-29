# TypeScript Build Guide for Lightning

## Issue Discovered
The TypeScript compiler (`tsc`) was hanging indefinitely, even when compiling simple files. This was NOT a TypeScript configuration issue.

## Root Cause
A stale `pnpm install` process was holding file system locks, causing all `tsc` processes to wait in uninterruptible sleep (D state).

## Solution

### Quick Fix
If you encounter hanging `tsc` processes:

```bash
# Find stale pnpm processes
ps aux | grep pnpm | grep install

# Kill by PID (e.g., kill 12345)
kill <PID>

# Then try building again
npm run build
```

### Why This Works
1. pnpm maintains temporary directories with file locks
2. When pnpm processes hang, they hold locks on node_modules 
3. tsc needs write access to node_modules/.pnpm to resolve types
4. Killing stale processes releases the locks
5. Build completes normally

## Build Process

### Standard Build
```bash
npm run build          # Compiles src/ → dist/
npm run dev            # Runs tsc in watch mode
npm run test           # Runs Jest tests
npm run lint           # Runs ESLint
```

### TypeScript Configuration
- **Target**: ES2020 (modern Node.js)
- **Module**: commonjs
- **Strict Mode**: Enabled (no `any` types)
- **Output**: ./dist/
- **Source**: ./src/

## Common Issues & Solutions

### Issue: "tsc: command not found"
```bash
npm install typescript --save-dev
```

### Issue: "tsc hangs indefinitely"
```bash
# Check for stale processes
ps aux | grep pnpm

# Kill by PID
kill <PID>

# Or restart shell/terminal
```

### Issue: Type errors on clean build
```bash
rm -rf dist node_modules
npm install
npm run build
```

## TypeScript Conventions Used

### Strict Mode
- No implicit any types
- Strict null checks enabled
- Type-only imports for type definitions
- All public functions have JSDoc comments

### Interfaces vs Types
- Use interface for object shapes (extendable)
- Use type for unions and readonly structures

### File Organization
```
src/
├── cli.ts              # Main CLI entry point
├── utils/              # Utility modules
│   ├── chat-engine.ts      # Chat loop and code generation
│   ├── analyzer.ts         # Static code analysis
│   ├── project-generator.ts # Project scaffolding
│   └── ...
├── types/              # Type definitions
└── testing/            # Test utilities
```

## Performance Notes

### Build Time
- Clean build: ~15-20 seconds
- Incremental (watch mode): ~2-3 seconds
- With declaration maps: +10% overhead

### Memory Usage
- Typical: 300-400MB
- Large projects: up to 600MB
- Adjust with: NODE_OPTIONS="--max-old-space-size=2048"

## Debugging

### Enable Verbose Output
```bash
./node_modules/.bin/tsc --diagnostics
./node_modules/.bin/tsc --listFiles | head -50
```

### Check for File System Issues
```bash
# Check for hung processes
ps aux | grep -E "tsc|pnpm" | grep Dl

# Check open files
lsof | grep "node_modules" | wc -l
```

### Trace Process
```bash
strace -f ./node_modules/.bin/tsc --noEmit 2>&1 | tail -50
```

## References
- TypeScript Compiler Options: https://www.typescriptlang.org/tsconfig
- Node.js Memory Management: https://nodejs.org/en/docs/guides/simple-profiling/
- pnpm documentation: https://pnpm.io/docs/install
