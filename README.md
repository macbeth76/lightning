# ⚡ Lightning

A local AI coding agent powered by small language models — designed to run on a Jetson Orin 8GB.

Built on two invariants:
1. **Every code segment ≤ 24 lines** — enforced before any write, no exceptions.
2. **Graph theory first** — the project dependency graph is analyzed before any LLM generation.

## Model

Default: `qwen2.5-coder:3b` (~2 GB, reliable tool calling, leaves 4–5 GB headroom on Orin).

Override with `LIGHTNING_MODEL=<model>` env var.

## Requirements

- Node.js ≥ 16
- pnpm
- [Ollama](https://ollama.ai) running locally with `qwen2.5-coder:3b` pulled

```bash
ollama pull qwen2.5-coder:3b
```

## Install

```bash
pnpm install
pnpm build
```

> `better-sqlite3` requires a native build. On Jetson Orin, `node-gyp` and `python3` must be available.
> The `postinstall` script auto-rebuilds if the native addon is missing.

## Agent Commands

| Command | Description |
|---------|-------------|
| `lightning ask <question>` | General-purpose agent chat with tool access |
| `lightning fix <task>` | Fix code using graph-first pipeline |
| `lightning spec <description>` | Generate TypeScript files from a description |
| `lightning explain <file>` | Explain a file segment-by-segment |
| `lightning review <file>` | Review for correctness and 24-line violations |
| `lightning chat` | Interactive REPL |

### Examples

```bash
# Ask a question about the codebase
lightning ask "what does the segmenter do?"

# Generate new files
lightning spec "a user service with create, read, update, delete — each method ≤24 lines"

# Fix a specific file
lightning fix "add error handling to src/utils/ollama-client.ts"

# Review a file
lightning review src/utils/crud-engine.ts

# Explain a file
lightning explain src/agent/tools.ts
```

## Static Analysis Commands

```bash
lightning analyze <file>       # Analyze a TypeScript file
lightning analyze --dir <dir>  # Analyze a directory
lightning crud create <file>   # Generate CRUD file
lightning github-actions       # Run in CI
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIGHTNING_MODEL` | `qwen2.5-coder:3b` | Ollama model to use |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `LIGHTNING_DB_DIR` | `~/.lightning` | SQLite conversation store location |

## Architecture

```
CLI (cli.ts)
  └── LightningAgent (src/agent/index.ts)
        ├── OllamaChat       — /api/chat loop, parallel tool execution
        ├── ToolRegistry     — 10 tools: read/write/analyze/graph/search/run/done
        │     └── Validator  — CodeSegmenter ≤24 lines, synchronous, throws on violation
        ├── GraphPipeline    — build graph → identify nodes → generate → validate
        └── ConversationStore — SQLite memory (better-sqlite3)

Existing Infrastructure (untouched):
  ├── CodeSegmenter          — splits code at graph boundaries (≤24 lines)
  ├── ProjectGraphAnalyzer   — builds file/import dependency graph
  ├── DependencyGraph        — directed graph with cycle detection
  └── StaticAnalyzer         — existing rules engine
```

## Development

```bash
pnpm test          # 120 tests
pnpm build         # TypeScript compile
pnpm dev           # watch mode
pnpm lint          # ESLint
```
