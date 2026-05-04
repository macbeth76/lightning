/**
 * ToolRegistry — the 10 tools available to LightningAgent.
 * All tools are pure async functions. write_file enforces the 24-line rule.
 * AgentContext carries three-layer cache: file, segment, graph.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { CodeSegmenter } from '../utils/segmenter';
import { ProjectGraphAnalyzer } from '../utils/project-graph-analyzer';
import { assertValid, validateCode } from './validator';
import { MAX_SEGMENT_LINES } from './config';
import type { ToolDefinition, ToolHandler } from './ollama-chat';

const execFileAsync = promisify(execFile);

export interface AgentContext {
  cwd: string;
  fileCache: Map<string, string>;
  filesWritten: Set<string>;
  segmentCache: Map<string, ReturnType<typeof CodeSegmenter.segmentCode>>;
  graphCache: Map<string, Awaited<ReturnType<ProjectGraphAnalyzer['buildGraph']>>>;
}

export function makeContext(cwd: string): AgentContext {
  return {
    cwd,
    fileCache: new Map(),
    filesWritten: new Set(),
    segmentCache: new Map(),
    graphCache: new Map(),
  };
}

function resolvePath(ctx: AgentContext, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(ctx.cwd, filePath);
}

// ─── Tool implementations ────────────────────────────────────────────────────

async function readFile(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const filePath = resolvePath(ctx, args.path as string);
  if (ctx.fileCache.has(filePath)) return ctx.fileCache.get(filePath)!;
  const content = fs.readFileSync(filePath, 'utf8');
  ctx.fileCache.set(filePath, content);
  return content;
}

async function writeFile(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const filePath = resolvePath(ctx, args.path as string);
  const content = args.content as string;
  assertValid(content, filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  ctx.fileCache.set(filePath, content);
  ctx.filesWritten.add(filePath);
  ctx.segmentCache.delete(filePath);
  return `Written: ${filePath}`;
}

async function analyzeFile(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const filePath = resolvePath(ctx, args.path as string);
  if (!ctx.segmentCache.has(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    ctx.segmentCache.set(filePath, CodeSegmenter.segmentCode(filePath, content, MAX_SEGMENT_LINES));
  }
  const segments = ctx.segmentCache.get(filePath)!;
  return JSON.stringify(segments.map(s => ({
    name: s.name, type: s.type, lines: s.lineCount,
    start: s.startLine, end: s.endLine,
  })));
}

async function buildGraph(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const dir = resolvePath(ctx, (args.dir as string) ?? '.');
  if (!ctx.graphCache.has(dir)) {
    const analyzer = new ProjectGraphAnalyzer(dir);
    ctx.graphCache.set(dir, await analyzer.buildGraph());
  }
  return JSON.stringify(ctx.graphCache.get(dir));
}

async function getSegment(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const filePath = resolvePath(ctx, args.path as string);
  const idx = Number(args.index ?? 0);
  if (!ctx.segmentCache.has(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    ctx.segmentCache.set(filePath, CodeSegmenter.segmentCode(filePath, content, MAX_SEGMENT_LINES));
  }
  const seg = ctx.segmentCache.get(filePath)![idx];
  return seg ? seg.code : `Segment ${idx} not found`;
}

async function listFiles(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const dir = resolvePath(ctx, (args.dir as string) ?? '.');
  const ext = (args.ext as string) ?? '';
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && (!ext || e.name.endsWith(ext)))
    .map(e => path.join(dir, e.name))
    .join('\n');
}

async function runCommand(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const cmd = args.command as string;
  const [bin, ...cmdArgs] = cmd.split(/\s+/);
  const allowed = ['pnpm', 'npm', 'node', 'tsc', 'git', 'jest'];
  if (!allowed.includes(bin)) return `Error: command '${bin}' not allowed`;
  const { stdout, stderr } = await execFileAsync(bin, cmdArgs, {
    cwd: ctx.cwd, timeout: 60_000,
  });
  return (stdout + stderr).trim();
}

async function searchCode(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const pattern = args.pattern as string;
  const { stdout } = await execFileAsync('grep', ['-rn', '--include=*.ts', pattern, ctx.cwd], {
    cwd: ctx.cwd, timeout: 10_000,
  }).catch(e => ({ stdout: e.stdout ?? '' }));
  return stdout.trim() || 'No matches';
}

async function getViolations(args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const filePath = resolvePath(ctx, args.path as string);
  const content = fs.readFileSync(filePath, 'utf8');
  const result = validateCode(content, filePath);
  if (result.valid) return 'No violations';
  return result.violations
    .map(v => `Segment ${v.segmentIndex}: ${v.lineCount} lines\n${v.preview}`)
    .join('\n---\n');
}

async function doneImpl(args: Record<string, unknown>): Promise<string> {
  return (args.result as string) ?? 'Done';
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: 'read_file', description: 'Read a file from disk', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path' } }, required: ['path'] } },
  { name: 'write_file', description: 'Write content to a file. Content MUST comply with 24-line rule per segment.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path' }, content: { type: 'string', description: 'File content' } }, required: ['path', 'content'] } },
  { name: 'analyze_file', description: 'Analyze a file into graph segments (name, type, line counts)', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path' } }, required: ['path'] } },
  { name: 'build_graph', description: 'Build import/dependency graph for a project directory', parameters: { type: 'object', properties: { dir: { type: 'string', description: 'Directory path (default: cwd)' } } } },
  { name: 'get_segment', description: 'Get a specific code segment by index from a file', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path' }, index: { type: 'number', description: 'Segment index' } }, required: ['path'] } },
  { name: 'list_files', description: 'List files in a directory', parameters: { type: 'object', properties: { dir: { type: 'string', description: 'Directory (default: cwd)' }, ext: { type: 'string', description: 'File extension filter e.g. .ts' } } } },
  { name: 'run_command', description: 'Run an allowed CLI command (pnpm, npm, node, tsc, git, jest)', parameters: { type: 'object', properties: { command: { type: 'string', description: 'Command string' } }, required: ['command'] } },
  { name: 'search_code', description: 'Search for a pattern in TypeScript files', parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'grep pattern' } }, required: ['pattern'] } },
  { name: 'get_violations', description: 'Check a file for 24-line segment violations', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path' } }, required: ['path'] } },
  { name: 'done', description: 'Signal task completion and return result', parameters: { type: 'object', properties: { result: { type: 'string', description: 'Final result or summary' } }, required: ['result'] } },
];

export function makeHandlers(ctx: AgentContext): Map<string, ToolHandler> {
  return new Map<string, ToolHandler>([
    ['read_file',      (a) => readFile(a, ctx)],
    ['write_file',     (a) => writeFile(a, ctx)],
    ['analyze_file',   (a) => analyzeFile(a, ctx)],
    ['build_graph',    (a) => buildGraph(a, ctx)],
    ['get_segment',    (a) => getSegment(a, ctx)],
    ['list_files',     (a) => listFiles(a, ctx)],
    ['run_command',    (a) => runCommand(a, ctx)],
    ['search_code',    (a) => searchCode(a, ctx)],
    ['get_violations', (a) => getViolations(a, ctx)],
    ['done',           (a) => doneImpl(a)],
  ]);
}
