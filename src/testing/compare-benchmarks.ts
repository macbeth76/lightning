/**
 * 3-model benchmark comparison report.
 * Reads two benchmark JSON files (7b and 14b runs) and produces a side-by-side table
 * showing Lightning (phi3:mini) vs qwen2.5-coder:7b vs qwen2.5-coder:14b.
 *
 * Usage:
 *   node dist/testing/compare-benchmarks.js <file1.json> <file2.json>
 */

import * as fs from 'fs';
import { ScoredResult } from './benchmark-scorer';

interface BenchmarkFile {
  lightningModel: string;
  baselineModel: string;
  results: ScoredResult[];
}

const CATEGORIES = ['static-analysis', 'constrained-gen', 'refactor', 'project-classification'];

interface CategoryStats {
  correctRate: number;
  complianceRate: number;
  medianMs: number;
  caseCount: number;
}

/** Compute per-category stats for a given tool from a result set. */
function stats(results: ScoredResult[], category: string, tool: string): CategoryStats {
  const rows = results.filter(r => r.caseId.startsWith(categoryPrefix(category)) && r.tool === tool);
  if (!rows.length) return { correctRate: 0, complianceRate: 0, medianMs: 0, caseCount: 0 };
  const correct = rows.filter(r => r.correct).length;
  const compliant = rows.filter(r => r.compliant).length;
  const latencies = rows.map(r => r.latencyMs).sort((a, b) => a - b);
  const mid = Math.floor(latencies.length / 2);
  return {
    correctRate: correct / rows.length,
    complianceRate: compliant / rows.length,
    medianMs: latencies[mid],
    caseCount: rows.length,
  };
}

function categoryPrefix(cat: string): string {
  const map: Record<string, string> = {
    'static-analysis': 'sa-',
    'constrained-gen': 'cg-',
    'refactor': 'rf-',
    'project-classification': 'pc-',
  };
  return map[cat] ?? cat;
}

function pct(n: number): string { return `${(n * 100).toFixed(0)}%`; }
function ms(n: number): string { return n < 10 ? `${n}ms` : n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`; }
function winner(a: number, b: number, c: number): [string, string, string] {
  const best = Math.max(a, b, c);
  return [a === best ? '🏆' : '  ', b === best ? '🏆' : '  ', c === best ? '🏆' : '  '];
}

/** Entry point */
function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node compare-benchmarks.js <file1.json> <file2.json>');
    process.exit(1);
  }
  const f1: BenchmarkFile = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const f2: BenchmarkFile = JSON.parse(fs.readFileSync(args[1], 'utf8'));

  const lgModel = f1.lightningModel;
  const b1Model = f1.baselineModel;
  const b2Model = f2.baselineModel;

  console.log('\n' + '═'.repeat(96));
  console.log('📊 3-MODEL BENCHMARK COMPARISON');
  console.log(`   ⚡ Lightning  : ${lgModel} (constrained — 24-line rule enforced)`);
  console.log(`   Baseline 1   : ${b1Model} (unconstrained)`);
  console.log(`   Baseline 2   : ${b2Model} (unconstrained)`);
  console.log('═'.repeat(96));

  // Correctness table
  console.log('\n── CORRECTNESS ──────────────────────────────────────────────────────────────');
  console.log(`${'Category'.padEnd(24)} ${'Lightning'.padEnd(12)} ${b1Model.padEnd(24)} ${b2Model.padEnd(24)}`);
  console.log('─'.repeat(96));
  for (const cat of CATEGORIES) {
    const lg = stats(f1.results, cat, 'lightning');
    const b1 = stats(f1.results, cat, 'raw-ollama');
    const b2 = stats(f2.results, cat, 'raw-ollama');
    const [wl, w1, w2] = winner(lg.correctRate, b1.correctRate, b2.correctRate);
    console.log(
      `${cat.padEnd(24)} ${(wl + pct(lg.correctRate)).padEnd(12)} ` +
      `${(w1 + pct(b1.correctRate)).padEnd(24)} ` +
      `${(w2 + pct(b2.correctRate)).padEnd(24)}`
    );
  }

  // Compliance table
  console.log('\n── COMPLIANCE (code compiles + no violations) ───────────────────────────────');
  console.log(`${'Category'.padEnd(24)} ${'Lightning'.padEnd(12)} ${b1Model.padEnd(24)} ${b2Model.padEnd(24)}`);
  console.log('─'.repeat(96));
  for (const cat of CATEGORIES) {
    const lg = stats(f1.results, cat, 'lightning');
    const b1 = stats(f1.results, cat, 'raw-ollama');
    const b2 = stats(f2.results, cat, 'raw-ollama');
    const [wl, w1, w2] = winner(lg.complianceRate, b1.complianceRate, b2.complianceRate);
    console.log(
      `${cat.padEnd(24)} ${(wl + pct(lg.complianceRate)).padEnd(12)} ` +
      `${(w1 + pct(b1.complianceRate)).padEnd(24)} ` +
      `${(w2 + pct(b2.complianceRate)).padEnd(24)}`
    );
  }

  // Latency table (lower is better — Lightning wins on static-analysis by design)
  console.log('\n── MEDIAN LATENCY (lower is better) ─────────────────────────────────────────');
  console.log(`${'Category'.padEnd(24)} ${'Lightning'.padEnd(12)} ${b1Model.padEnd(24)} ${b2Model.padEnd(24)}`);
  console.log('─'.repeat(96));
  for (const cat of CATEGORIES) {
    const lg = stats(f1.results, cat, 'lightning');
    const b1 = stats(f1.results, cat, 'raw-ollama');
    const b2 = stats(f2.results, cat, 'raw-ollama');
    const best = Math.min(lg.medianMs, b1.medianMs, b2.medianMs);
    const mark = (n: number) => n === best ? '⚡' : '  ';
    console.log(
      `${cat.padEnd(24)} ${(mark(lg.medianMs) + ms(lg.medianMs)).padEnd(12)} ` +
      `${(mark(b1.medianMs) + ms(b1.medianMs)).padEnd(24)} ` +
      `${(mark(b2.medianMs) + ms(b2.medianMs)).padEnd(24)}`
    );
  }

  console.log('\n' + '═'.repeat(96));

  // Summary
  const lgWins = CATEGORIES.filter(cat => {
    const lg = stats(f1.results, cat, 'lightning').correctRate;
    const b1 = stats(f1.results, cat, 'raw-ollama').correctRate;
    const b2 = stats(f2.results, cat, 'raw-ollama').correctRate;
    return lg >= b1 && lg >= b2;
  });
  console.log(`\n⚡ Lightning wins ${lgWins.length}/${CATEGORIES.length} categories: ${lgWins.join(', ')}`);
  console.log('');
}

main();
