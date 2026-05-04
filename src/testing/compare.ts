/**
 * Lightning Compare — benchmark Lightning agent vs plain one-shot Ollama.
 *
 * Tests the same tasks through two runners:
 *   "baseline" = one-shot /api/generate, no tools, no graph, no enforcement
 *   "lightning" = full agent loop with tools, graph pipeline, 24-line validation
 *
 * Scores each result on: builds?, 24-line compliant?, correct output?, time taken.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { LightningAgent } from '../agent';
import { validateCode } from '../agent/validator';
import { OLLAMA_HOST, LIGHTNING_MODEL } from '../agent/config';

export interface BenchmarkTask {
  id: string;
  name: string;
  prompt: string;
  /** Regex patterns the output should match for correctness */
  checks: RegExp[];
}

export interface RunResult {
  runner: 'baseline' | 'lightning';
  taskId: string;
  output: string;
  timeMs: number;
  compiles: boolean;
  lines: number;
  maxSegmentLines: number;
  compliant: boolean;
  checksPass: number;
  checksTotal: number;
  error?: string;
}

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: 'email-validator',
    name: 'Email Validator',
    prompt: 'Write a TypeScript function called validateEmail(email: string): boolean that returns true if the email is valid.',
    checks: [/validateEmail/, /boolean/, /regex|@|test|match/i],
  },
  {
    id: 'stack-class',
    name: 'Stack Data Structure',
    prompt: 'Write a TypeScript generic Stack<T> class with push(item: T), pop(): T | undefined, peek(): T | undefined, and isEmpty(): boolean methods. Each method must be ≤24 lines.',
    checks: [/class Stack/, /push/, /pop/, /isEmpty/],
  },
  {
    id: 'json-reader',
    name: 'JSON File Reader',
    prompt: 'Write a TypeScript function called readJsonFile(filePath: string): Record<string, unknown> that reads and parses a JSON file synchronously.',
    checks: [/readJsonFile/, /readFileSync|readFile/, /JSON.parse/],
  },
  {
    id: 'debounce',
    name: 'Debounce Utility',
    prompt: 'Write a TypeScript function debounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number): T that returns a debounced version of fn.',
    checks: [/debounce/, /setTimeout/, /clearTimeout/],
  },
];

async function runBaseline(task: BenchmarkTask, model: string): Promise<RunResult> {
  const start = Date.now();
  try {
    const res = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model,
      prompt: `You are a TypeScript expert. Generate ONLY clean TypeScript code with no markdown fences or explanation.\n\n${task.prompt}`,
      stream: false,
    }, { timeout: 60_000 });

    const output: string = (res.data.response ?? '')
      .replace(/^```(?:typescript|ts)?\n?/, '').replace(/\n?```$/, '').trim();
    const timeMs = Date.now() - start;
    return scoreResult('baseline', task, output, timeMs);
  } catch (e: unknown) {
    return errorResult('baseline', task, e, Date.now() - start);
  }
}

async function runLightning(task: BenchmarkTask, tmpDir: string): Promise<RunResult> {
  const start = Date.now();
  const agent = new LightningAgent({ cwd: tmpDir, sessionId: `bench-${task.id}` });
  try {
    const output = await agent.ask(task.prompt);
    const timeMs = Date.now() - start;
    return scoreResult('lightning', task, output, timeMs);
  } catch (e: unknown) {
    return errorResult('lightning', task, e, Date.now() - start);
  } finally {
    agent.close();
  }
}

function scoreResult(runner: 'baseline' | 'lightning', task: BenchmarkTask, output: string, timeMs: number): RunResult {
  const lines = output.split('\n').length;
  const validation = validateCode(output, `${task.id}.ts`);
  const maxSeg = validation.violations.length > 0
    ? Math.max(...validation.violations.map(v => v.lineCount))
    : lines;
  const compliant = validation.valid;

  let compiles = false;
  try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-'));
    fs.writeFileSync(path.join(tmp, 'out.ts'), output);
    execSync(`npx --yes tsc --noEmit --strict --target ES2020 --module NodeNext --moduleResolution NodeNext ${path.join(tmp, 'out.ts')}`, { timeout: 15_000, stdio: 'pipe' });
    compiles = true;
    fs.rmSync(tmp, { recursive: true });
  } catch { /* compile error */ }

  const checksPass = task.checks.filter(r => r.test(output)).length;

  return { runner, taskId: task.id, output, timeMs, compiles, lines, maxSegmentLines: maxSeg, compliant, checksPass, checksTotal: task.checks.length };
}

function errorResult(runner: 'baseline' | 'lightning', task: BenchmarkTask, e: unknown, timeMs: number): RunResult {
  return { runner, taskId: task.id, output: '', timeMs, compiles: false, lines: 0, maxSegmentLines: 0, compliant: false, checksPass: 0, checksTotal: task.checks.length, error: e instanceof Error ? e.message : String(e) };
}

export async function runComparison(model = LIGHTNING_MODEL): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lightning-bench-'));

  try {
    for (const task of BENCHMARK_TASKS) {
      console.log(`\n⚡ Task: ${task.name}`);

      process.stdout.write('  baseline... ');
      const base = await runBaseline(task, model);
      console.log(`${base.timeMs}ms | checks ${base.checksPass}/${base.checksTotal} | compliant: ${base.compliant} | compiles: ${base.compiles}`);

      process.stdout.write('  lightning... ');
      const light = await runLightning(task, tmpDir);
      console.log(`${light.timeMs}ms | checks ${light.checksPass}/${light.checksTotal} | compliant: ${light.compliant} | compiles: ${light.compiles}`);

      results.push(base, light);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }

  return results;
}

export function summarize(results: RunResult[]): void {
  const runners = ['baseline', 'lightning'] as const;
  console.log('\n─────────────────────────────────────────────────────');
  console.log('  Task                   Runner     Time    Checks  24-line  Compiles');
  console.log('─────────────────────────────────────────────────────');
  for (const task of BENCHMARK_TASKS) {
    for (const runner of runners) {
      const r = results.find(x => x.taskId === task.id && x.runner === runner);
      if (!r) continue;
      const score = `${r.checksPass}/${r.checksTotal}`;
      console.log(
        `  ${task.name.padEnd(22)} ${runner.padEnd(10)} ${String(r.timeMs + 'ms').padEnd(8)} ${score.padEnd(8)} ${r.compliant ? '✅' : '❌'}        ${r.compiles ? '✅' : '❌'}`
      );
    }
    console.log();
  }
}
