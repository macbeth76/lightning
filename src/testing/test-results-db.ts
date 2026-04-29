/**
 * Test Results Storage
 * File-based JSON storage for regression tracking (no native dependencies)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StoredResult {
  id?: number;
  testName: string;
  agentType: 'graph' | 'ollama' | 'template';
  accuracy: number;
  hallucinating: boolean;
  falsePositives: string;
  timestamp: string;
  runId: string;
}

export class TestResultsDB {
  private filePath: string;
  private results: StoredResult[] = [];

  constructor(filePath: string = '.lightning-test.json') {
    this.filePath = filePath;
    this.loadResults();
  }

  /**
   * Load results from file (≤24 lines)
   */
  private loadResults(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        this.results = JSON.parse(content);
      }
    } catch {
      this.results = [];
    }
  }

  /**
   * Store test result in memory and persist (≤24 lines)
   */
  async store(result: StoredResult): Promise<number> {
    const id = (this.results.length > 0 ? Math.max(...this.results.map((r) => r.id ?? 0)) : 0) + 1;
    const stored = { ...result, id };
    this.results.push(stored);
    this.persistResults();
    return id;
  }

  /**
   * Get all results for a test case (≤24 lines)
   */
  async getResults(testName: string, limit = 10): Promise<StoredResult[]> {
    return this.results
      .filter((r) => r.testName === testName)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get accuracy trend for agent type (≤24 lines)
   */
  async getAccuracyTrend(
    testName: string,
    agentType: string,
    limit = 20
  ): Promise<number[]> {
    return this.results
      .filter((r) => r.testName === testName && r.agentType === agentType)
      .slice(-limit)
      .map((r) => r.accuracy)
      .reverse();
  }

  /**
   * Persist results to file (≤24 lines)
   */
  private persistResults(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.results, null, 2));
    } catch {
      // silent fail
    }
  }

  /**
   * Close — no-op for file storage (≤24 lines)
   */
  close(): Promise<void> {
    return Promise.resolve();
  }
}
