/**
 * Metrics module: SLMMetric interface + MetricsCollector
 * In-memory store with optional JSON file persistence.
 * No native dependencies — avoids sqlite3 compilation issues.
 */

import * as fs from 'fs';

export interface SLMMetric {
  id: string;
  testCaseId: string;
  model: string;
  accuracy: number;
  latencyMs: number;
  tokensUsed: number;
  tokenEfficiency: number;
  contextUtilization: number;
  codeQualityScore: number;
  timestamp: string;
}

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
}

/** Collects and stores SLM metrics for regression tracking */
export class MetricsCollector {
  private metrics: SLMMetric[] = [];
  private testCases: TestCase[] = [];
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.load();
  }

  /** Register a test case for tracking */
  addTestCase(id: string, name: string, input: string, expectedOutput: string): void {
    this.testCases.push({ id, name, input, expectedOutput });
  }

  /** Record a metric result */
  recordMetric(metric: SLMMetric): void {
    this.metrics.push(metric);
    this.persist();
  }

  /** Get all metrics for a specific model */
  getMetricsForModel(model: string): SLMMetric[] {
    return this.metrics.filter(m => m.model === model);
  }

  /** Get accuracy trend over time for a model */
  getAccuracyTrend(model: string): number[] {
    return this.getMetricsForModel(model).map(m => m.accuracy);
  }

  /** Flush and release resources */
  close(): void {
    this.persist();
  }

  private persist(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify({ metrics: this.metrics, testCases: this.testCases }, null, 2));
    } catch {
      // Non-fatal — in-memory store still valid
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        this.metrics = data.metrics ?? [];
        this.testCases = data.testCases ?? [];
      }
    } catch {
      this.metrics = [];
      this.testCases = [];
    }
  }
}
