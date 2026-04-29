/**
 * Benchmark scorer — separates execution facts from scoring logic.
 * ExecutionResult: raw facts collected by the runner (no scoring).
 * ScoredResult: derived correctness + compliance + composite score.
 */

import * as fs from 'fs';
import { StaticAnalyzer } from '../utils/analyzer';
import { checkCompiles } from '../utils/ast-analyzer';
import { BenchmarkCase } from './benchmark-cases';

// ── data shapes ───────────────────────────────────────────────────────────────

/** Raw facts produced by the runner — no correctness judgement */
export interface ExecutionResult {
  caseId: string;
  tool: string;
  latencyMs: number;
  output: string;
  success: boolean;
  /** Violation count from AST analyzer on generated output (gen/refactor) */
  violationCount?: number;
  /** Whether output compiles with tsc */
  compilesOk?: boolean;
  /** Keyword hits against groundTruth */
  keywordHits?: number;
  /** Parsed violation count from JSON response (static-analysis baseline) */
  parsedViolationCount?: number;
}

/** Scored result — correctness derived from ExecutionResult + BenchmarkCase */
export interface ScoredResult extends ExecutionResult {
  correct: boolean;
  compliant: boolean;
  score: number;
}

/** Per-category summary across all runs of one tool */
export interface CategorySummary {
  category: string;
  tool: string;
  caseCount: number;
  correctRate: number;
  complianceRate: number;
  medianLatencyMs: number;
  winner: boolean;
}

// ── scoring ───────────────────────────────────────────────────────────────────

/** Score a single ExecutionResult using the case's expected outputs */
export function scoreResult(exec: ExecutionResult, tc: BenchmarkCase): ScoredResult {
  if (!exec.success) return { ...exec, correct: false, compliant: false, score: 0 };

  const correct = deriveCorrectness(exec, tc);
  const compliant = deriveCompliance(exec, tc);
  const score = computeScore(correct, compliant, exec.latencyMs);
  return { ...exec, correct, compliant, score };
}

/** Strip markdown code fences, write to tmp, run AST + compile gate */
export function evaluateGeneratedCode(output: string): {
  violationCount: number;
  compilesOk: boolean;
} {
  const code = stripFences(output);
  const tmp = `/tmp/eval-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`;
  try {
    fs.writeFileSync(tmp, code);
    const report = StaticAnalyzer.analyzeFile(tmp);
    const { ok } = checkCompiles(tmp);
    return { violationCount: report.violations.length, compilesOk: ok };
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

/** Parse JSON violation count from baseline static-analysis response */
export function parseViolationCount(text: string): number | undefined {
  try {
    const match = text.match(/\{[^}]*"violationCount"\s*:\s*(\d+)[^}]*\}/);
    if (match) return parseInt(match[1], 10);
    const loose = text.match(/"violationCount"\s*:\s*(\d+)/);
    if (loose) return parseInt(loose[1], 10);
  } catch { /* ignore */ }
  return undefined;
}

/** Remove markdown fences from LLM-generated code */
export function stripFences(text: string): string {
  return text
    .replace(/^```(?:typescript|ts|javascript|js)?\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim();
}

// ── summary + winners ─────────────────────────────────────────────────────────

/** Aggregate results for one category+tool combination */
export function summariseCategory(
  results: ScoredResult[],
  category: string,
  tool: string
): CategorySummary {
  const filtered = results.filter(
    r => r.caseId.startsWith(getCategoryPrefix(category)) && r.tool === tool
  );
  if (filtered.length === 0) {
    return { category, tool, caseCount: 0, correctRate: 0, complianceRate: 0, medianLatencyMs: 0, winner: false };
  }
  const correctRate = filtered.filter(r => r.correct).length / filtered.length;
  const complianceRate = filtered.filter(r => r.compliant).length / filtered.length;
  const sorted = [...filtered].sort((a, b) => a.latencyMs - b.latencyMs);
  const medianLatencyMs = sorted[Math.floor(sorted.length / 2)].latencyMs;
  return { category, tool, caseCount: filtered.length, correctRate, complianceRate, medianLatencyMs, winner: false };
}

/** Mark winner per category — correct rate → compliance rate → speed */
export function pickWinners(summaries: CategorySummary[]): CategorySummary[] {
  return summaries.map(s => {
    const peers = summaries.filter(p => p.category === s.category);
    const winner = peers.reduce((best, curr) => {
      if (curr.correctRate > best.correctRate) return curr;
      if (curr.correctRate === best.correctRate && curr.complianceRate > best.complianceRate) return curr;
      if (curr.correctRate === best.correctRate && curr.complianceRate === best.complianceRate
          && curr.medianLatencyMs < best.medianLatencyMs) return curr;
      return best;
    });
    return { ...s, winner: s.tool === winner.tool };
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function deriveCorrectness(exec: ExecutionResult, tc: BenchmarkCase): boolean {
  if (tc.category === 'static-analysis') {
    if (tc.expectedViolationCount === undefined) return false;
    // Lightning: exact violation count from AST
    if (exec.violationCount !== undefined) return exec.violationCount === tc.expectedViolationCount;
    // Baseline: parsed from JSON response
    if (exec.parsedViolationCount !== undefined) return exec.parsedViolationCount === tc.expectedViolationCount;
    return false;
  }

  if (tc.category === 'constrained-gen' || tc.category === 'refactor') {
    const compilesGate = tc.mustCompile ? (exec.compilesOk === true) : true;
    const keywordGate = tc.groundTruth.length > 0
      ? (exec.keywordHits ?? 0) >= Math.ceil(tc.groundTruth.length * 0.5)
      : true;
    return compilesGate && keywordGate;
  }

  // project-classification: keyword majority
  return (exec.keywordHits ?? 0) >= Math.ceil(tc.groundTruth.length * 0.5);
}

function deriveCompliance(exec: ExecutionResult, tc: BenchmarkCase): boolean {
  if (tc.category === 'static-analysis') return true; // N/A — analyzer, not generator
  if (tc.mustHaveZeroViolations) return exec.violationCount === 0;
  return exec.violationCount === undefined || exec.violationCount === 0;
}

function computeScore(correct: boolean, compliant: boolean, latencyMs: number): number {
  if (!correct) return 0;
  const complianceBonus = compliant ? 30 : 0;
  const speedBonus = Math.max(0, 20 - Math.floor(latencyMs / 1000));
  return 50 + complianceBonus + speedBonus;
}

function getCategoryPrefix(category: string): string {
  const map: Record<string, string> = {
    'static-analysis': 'sa-',
    'constrained-gen': 'cg-',
    'refactor': 'rf-',
    'project-classification': 'pc-',
  };
  return map[category] ?? '';
}
