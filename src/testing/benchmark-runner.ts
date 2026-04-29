/**
 * Benchmark runner — Lightning vs raw Ollama across 4 honest categories.
 * Calls Ollama directly (bypasses TTY gate) for scripted/non-interactive runs.
 * Lightning uses constrained prompts + AST enforcement.
 * Baseline uses same Ollama model without constraints.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { StaticAnalyzer } from '../utils/analyzer';
import { ProjectGraphAnalyzer } from '../utils/project-graph-analyzer';
import { BenchmarkCase, ALL_CASES } from './benchmark-cases';
import {
  ExecutionResult, ScoredResult, scoreResult,
  summariseCategory, pickWinners,
  evaluateGeneratedCode, parseViolationCount, stripFences,
} from './benchmark-scorer';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://host.docker.internal:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'phi3:mini';
const BASELINE_MODEL = process.env.BASELINE_MODEL ?? MODEL;
const CATEGORIES = ['static-analysis', 'constrained-gen', 'refactor', 'project-classification'];

/** Run all benchmark cases and print a report */
export async function runBenchmark(): Promise<void> {
  console.log('\n⚡ Lightning Benchmark Runner\n' + '═'.repeat(60));
  const scored: ScoredResult[] = [];

  for (const tc of ALL_CASES) {
    const repeats = tc.runs ?? 1;
    for (let run = 0; run < repeats; run++) {
      const [lgExec, blExec] = await Promise.all([
        runLightning(tc),
        runBaseline(tc),
      ]);
      scored.push(scoreResult(lgExec, tc));
      scored.push(scoreResult(blExec, tc));
    }
    process.stdout.write('.');
  }

  console.log('\n');
  printReport(scored);
  saveResults(scored);
}

// ── Lightning runner ──────────────────────────────────────────────────────────

async function runLightning(tc: BenchmarkCase): Promise<ExecutionResult> {
  const start = Date.now();
  try {
    if (tc.category === 'static-analysis') return lightningAnalysis(tc, start);
    if (tc.category === 'project-classification') return await lightningClassify(tc, start);
    return await lightningGenerate(tc, start);
  } catch (e) {
    return fail(tc.id, 'lightning', start, e);
  }
}

function lightningAnalysis(tc: BenchmarkCase, start: number): ExecutionResult {
  const tmp = `/tmp/bench-${Date.now()}.ts`;
  fs.writeFileSync(tmp, tc.code ?? '');
  try {
    const report = StaticAnalyzer.analyzeFile(tmp);
    const output = `{"violationCount": ${report.violations.length}}`;
    return {
      caseId: tc.id, tool: 'lightning', latencyMs: elapsed(start),
      output, success: true, violationCount: report.violations.length,
    };
  } finally { fs.unlinkSync(tmp); }
}

/**
 * Lightning classification: graph analysis → Ollama context prompt.
 * Uses ProjectGraphAnalyzer to extract structural context, then asks Ollama
 * for a natural-language classification. Better than raw Ollama alone.
 */
async function lightningClassify(tc: BenchmarkCase, start: number): Promise<ExecutionResult> {
  const fullPath = path.resolve(tc.code ?? '');
  let graphContext = '';
  if (fs.existsSync(fullPath)) {
    const analyzer = new ProjectGraphAnalyzer(fullPath);
    analyzer.buildGraph();
    graphContext = analyzer.getGraphForContext();
  }
  const prompt = graphContext
    ? `Project structure analysis:\n${graphContext}\n\n${tc.prompt}`
    : tc.prompt;
  const output = await callOllama(prompt);
  const keywordHits = countKeywords(output, tc.groundTruth);
  return { caseId: tc.id, tool: 'lightning', latencyMs: elapsed(start), output, success: !!output, keywordHits };
}

async function lightningGenerate(tc: BenchmarkCase, start: number): Promise<ExecutionResult> {
  const input = tc.code ? `Given this code:\n${tc.code}\n\n${tc.prompt}` : tc.prompt;
  const prompt = `${input}\nRules: every function/method MUST be ≤ 24 lines. Return ONLY TypeScript, no markdown.`;
  const output = await callOllama(prompt);
  const { violationCount, compilesOk } = evaluateGeneratedCode(output);
  const keywordHits = countKeywords(output, tc.groundTruth);
  return {
    caseId: tc.id, tool: 'lightning', latencyMs: elapsed(start),
    output, success: !!output, violationCount, compilesOk, keywordHits,
  };
}

// ── Baseline runner ───────────────────────────────────────────────────────────

async function runBaseline(tc: BenchmarkCase): Promise<ExecutionResult> {
  const start = Date.now();
  try {
    if (tc.category === 'static-analysis') return await baselineAnalysis(tc, start);
    if (tc.category === 'project-classification') return await baselineClassify(tc, start);
    return await baselineGenerate(tc, start);
  } catch (e) {
    return fail(tc.id, 'raw-ollama', start, e);
  }
}

async function baselineAnalysis(tc: BenchmarkCase, start: number): Promise<ExecutionResult> {
  const prompt = `${tc.prompt}\nCode:\n${tc.code ?? ''}\nReturn only valid JSON with violationCount.`;
  const output = await callOllama(prompt, BASELINE_MODEL);
  const parsedViolationCount = parseViolationCount(output);
  return {
    caseId: tc.id, tool: 'raw-ollama', latencyMs: elapsed(start),
    output, success: !!output, parsedViolationCount,
  };
}

async function baselineClassify(tc: BenchmarkCase, start: number): Promise<ExecutionResult> {
  const output = await callOllama(`${tc.prompt} Project path: ${tc.code}`, BASELINE_MODEL);
  const keywordHits = countKeywords(output, tc.groundTruth);
  return { caseId: tc.id, tool: 'raw-ollama', latencyMs: elapsed(start), output, success: !!output, keywordHits };
}

async function baselineGenerate(tc: BenchmarkCase, start: number): Promise<ExecutionResult> {
  const input = tc.code ? `Given this code:\n${tc.code}\n\n${tc.prompt}` : tc.prompt;
  const output = await callOllama(`${input}\nReturn only TypeScript code.`, BASELINE_MODEL);
  const { violationCount, compilesOk } = evaluateGeneratedCode(output);
  const keywordHits = countKeywords(output, tc.groundTruth);
  return {
    caseId: tc.id, tool: 'raw-ollama', latencyMs: elapsed(start),
    output, success: !!output, violationCount, compilesOk, keywordHits,
  };
}

// ── Ollama HTTP call ──────────────────────────────────────────────────────────

function callOllama(prompt: string, model = MODEL): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, prompt, stream: false });
    const req = http.request(
      `${OLLAMA_URL}/api/generate`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(stripFences(JSON.parse(data).response ?? '')); }
          catch { reject(new Error('Bad response')); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(45000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body); req.end();
  });
}

// ── Report ────────────────────────────────────────────────────────────────────

function printReport(results: ScoredResult[]): void {
  const tools = ['lightning', 'raw-ollama'];
  const summaries = CATEGORIES.flatMap(c => tools.map(t => summariseCategory(results, c, t)));
  const withWinners = pickWinners(summaries);

  console.log('═'.repeat(80));
  console.log(`📊 BENCHMARK RESULTS  [Lightning: ${MODEL}  vs  Baseline: ${BASELINE_MODEL}]\n`);
  console.log('Category               Tool          Cases  Correct  Compliant  Median ms  W');
  console.log('─'.repeat(80));
  withWinners.forEach(s => {
    const w = s.winner ? '🏆' : '  ';
    const cat = s.category.padEnd(22);
    const tool = s.tool.padEnd(13);
    const n = String(s.caseCount).padStart(5);
    const cr = `${(s.correctRate * 100).toFixed(0)}%`.padStart(7);
    const cp = `${(s.complianceRate * 100).toFixed(0)}%`.padStart(9);
    const ms = String(s.medianLatencyMs).padStart(9);
    console.log(`${cat} ${tool} ${n}  ${cr}  ${cp}  ${ms}  ${w}`);
  });
  console.log('═'.repeat(80));
}

function saveResults(results: ScoredResult[]): void {
  const file = `benchmark-${Date.now()}.json`;
  const meta = { timestamp: new Date().toISOString(), lightningModel: MODEL, baselineModel: BASELINE_MODEL, results };
  fs.writeFileSync(file, JSON.stringify(meta, null, 2));
  console.log(`\n✅ Saved to ${file}\n`);
}

// ── utils ─────────────────────────────────────────────────────────────────────

function countKeywords(text: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
}

function elapsed(start: number): number { return Date.now() - start; }

function fail(caseId: string, tool: string, start: number, e: unknown): ExecutionResult {
  return { caseId, tool, latencyMs: elapsed(start), output: String(e), success: false };
}
