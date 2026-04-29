/**
 * Copilot vs SLM Benchmarking Suite
 * Apples-to-apples testing framework
 */

export interface BenchmarkTestCase {
  id: string;
  name: string;
  description: string;
  prompt: string;
  expectedOutputLength: number; // Expected tokens in correct output
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'refactor' | 'fix-bug' | 'feature' | 'optimize' | 'document';
}

export interface BenchmarkResult {
  testCaseId: string;
  tool: 'copilot' | 'slm';
  model?: string;
  output: string;
  tokensUsed: number;
  latencyMs: number;
  accuracy: number; // 0-1 based on correctness
  speed: number; // tokens per millisecond
  efficiency: number; // accuracy / tokens_used
  timestamp: string;
}

export interface BenchmarkComparison {
  testCaseId: string;
  copilotResult: BenchmarkResult;
  slmResult: BenchmarkResult;
  winner: 'copilot' | 'slm' | 'tie';
  metrics: {
    accuracyDiff: number; // slm - copilot
    speedDiff: number; // slm - copilot
    efficiencyDiff: number; // slm - copilot
  };
}

/**
 * Standard benchmark test cases for SLM vs Copilot
 */
export const BENCHMARK_TEST_CASES: BenchmarkTestCase[] = [
  {
    id: 'refactor-1',
    name: 'Simplify nested loops',
    description: 'Refactor nested loops into more efficient code',
    prompt: `Refactor this code to be more efficient:
    function processArray(arr) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
          console.log(arr[i][j]);
        }
      }
    }`,
    expectedOutputLength: 150,
    difficulty: 'easy',
    category: 'refactor',
  },
  {
    id: 'bug-fix-1',
    name: 'Fix off-by-one error',
    description: 'Identify and fix off-by-one loop error',
    prompt: `Fix the bug in this code:
    function sumArray(arr) {
      let sum = 0;
      for (let i = 0; i <= arr.length; i++) {
        sum += arr[i];
      }
      return sum;
    }`,
    expectedOutputLength: 120,
    difficulty: 'easy',
    category: 'fix-bug',
  },
  {
    id: 'feature-1',
    name: 'Add error handling',
    description: 'Add comprehensive error handling to async function',
    prompt: `Add error handling to this async function:
    async function fetchUserData(userId) {
      const response = await fetch(\`/api/users/\${userId}\`);
      return response.json();
    }`,
    expectedOutputLength: 200,
    difficulty: 'medium',
    category: 'feature',
  },
  {
    id: 'optimize-1',
    name: 'Optimize sorting algorithm',
    description: 'Replace bubble sort with more efficient algorithm',
    prompt: `Optimize this sorting function:
    function bubbleSort(arr) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
          if (arr[j] > arr[j + 1]) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          }
        }
      }
      return arr;
    }`,
    expectedOutputLength: 150,
    difficulty: 'medium',
    category: 'optimize',
  },
  {
    id: 'document-1',
    name: 'Add JSDoc comments',
    description: 'Document function with comprehensive JSDoc',
    prompt: `Add JSDoc documentation to this function:
    function calculateTax(amount, taxRate) {
      return amount * (1 + taxRate);
    }`,
    expectedOutputLength: 200,
    difficulty: 'easy',
    category: 'document',
  },
  {
    id: 'refactor-2',
    name: 'Extract method',
    description: 'Extract repeated logic into separate method',
    prompt: `Refactor by extracting a method:
    class DataProcessor {
      processArray1(arr) {
        return arr.filter(x => x > 0).map(x => x * 2).sort();
      }
      processArray2(arr) {
        return arr.filter(x => x > 0).map(x => x * 3).sort();
      }
    }`,
    expectedOutputLength: 250,
    difficulty: 'hard',
    category: 'refactor',
  },
  {
    id: 'bug-fix-2',
    name: 'Fix null pointer exception',
    description: 'Fix null reference bug in nested property access',
    prompt: `Fix the potential null reference error:
    function getUserName(user) {
      return user.profile.name;
    }`,
    expectedOutputLength: 180,
    difficulty: 'medium',
    category: 'fix-bug',
  },
  {
    id: 'feature-2',
    name: 'Add retry logic',
    description: 'Add exponential backoff retry to network call',
    prompt: `Add retry logic with exponential backoff:
    async function fetchData(url) {
      const response = await fetch(url);
      return response.json();
    }`,
    expectedOutputLength: 300,
    difficulty: 'hard',
    category: 'feature',
  },
];

/**
 * Benchmark runner
 */
export class BenchmarkRunner {
  /**
   * Calculate accuracy score based on output quality
   */
  static calculateAccuracy(expected: string, actual: string): number {
    if (actual.length === 0) return 0;

    const expectedTokens = expected.toLowerCase().split(/\s+/);
    const actualTokens = actual.toLowerCase().split(/\s+/);

    let matches = 0;
    for (let i = 0; i < Math.min(expectedTokens.length, actualTokens.length); i++) {
      if (expectedTokens[i] === actualTokens[i]) {
        matches++;
      }
    }

    const maxLen = Math.max(expectedTokens.length, actualTokens.length);
    return maxLen > 0 ? matches / maxLen : 0;
  }

  /**
   * Generate comparison report
   */
  static generateComparisonReport(results: BenchmarkResult[]): {
    copilotWins: number;
    slmWins: number;
    ties: number;
    copilotAvgAccuracy: number;
    slmAvgAccuracy: number;
    copilotAvgSpeed: number;
    slmAvgSpeed: number;
    copilotAvgEfficiency: number;
    slmAvgEfficiency: number;
  } {
    const copilotResults = results.filter((r) => r.tool === 'copilot');
    const slmResults = results.filter((r) => r.tool === 'slm');

    let copilotWins = 0;
    let slmWins = 0;
    let ties = 0;

    // Group by test case
    const testCaseGroups: { [key: string]: BenchmarkResult[] } = {};
    results.forEach((r) => {
      if (!testCaseGroups[r.testCaseId]) {
        testCaseGroups[r.testCaseId] = [];
      }
      testCaseGroups[r.testCaseId].push(r);
    });

    // Compare each test case
    Object.values(testCaseGroups).forEach((group) => {
      if (group.length === 2) {
        const [r1, r2] = group;
        const accuracyDiff = r1.accuracy - r2.accuracy;

        if (accuracyDiff > 0.05) {
          r1.tool === 'copilot' ? copilotWins++ : slmWins++;
        } else if (accuracyDiff < -0.05) {
          r1.tool === 'copilot' ? slmWins++ : copilotWins++;
        } else {
          ties++;
        }
      }
    });

    const avgAccuracy = (results: BenchmarkResult[]) =>
      results.length > 0 ? results.reduce((a, b) => a + b.accuracy, 0) / results.length : 0;

    const avgSpeed = (results: BenchmarkResult[]) =>
      results.length > 0
        ? results.reduce((a, b) => a + b.speed, 0) / results.length
        : 0;

    const avgEfficiency = (results: BenchmarkResult[]) =>
      results.length > 0
        ? results.reduce((a, b) => a + b.efficiency, 0) / results.length
        : 0;

    return {
      copilotWins,
      slmWins,
      ties,
      copilotAvgAccuracy: avgAccuracy(copilotResults),
      slmAvgAccuracy: avgAccuracy(slmResults),
      copilotAvgSpeed: avgSpeed(copilotResults),
      slmAvgSpeed: avgSpeed(slmResults),
      copilotAvgEfficiency: avgEfficiency(copilotResults),
      slmAvgEfficiency: avgEfficiency(slmResults),
    };
  }

  /**
   * Format benchmark results as CSV
   */
  static formatCSV(results: BenchmarkResult[]): string {
    const header = [
      'testCaseId',
      'tool',
      'model',
      'tokensUsed',
      'latencyMs',
      'accuracy',
      'speed',
      'efficiency',
      'timestamp',
    ].join(',');

    const rows = results.map((r) =>
      [
        r.testCaseId,
        r.tool,
        r.model || 'N/A',
        r.tokensUsed,
        r.latencyMs.toFixed(1),
        r.accuracy.toFixed(3),
        r.speed.toFixed(4),
        r.efficiency.toFixed(4),
        r.timestamp,
      ].join(',')
    );

    return [header, ...rows].join('\n');
  }
}
