/**
 * Metrics Collector for Lightning vs Copilot
 * Tracks speed, quality, efficiency, reliability
 */

export interface Metrics {
  // Speed metrics
  latency: number; // ms
  timeToFirstToken: number; // ms
  taskCompletionTime: number; // seconds
  throughput: number; // requests/sec
  memoryUsage: number; // MB
  coldStartTime: number; // ms

  // Quality metrics
  accuracy: number; // 0-1
  precision: number; // 0-1
  recall: number; // 0-1
  f1Score: number; // 0-1
  contextRelevance: number; // 0-1
  fixCompiles: boolean;
  explanationQuality: number; // 1-5

  // Efficiency metrics
  costUSD: number;
  tokensGenerated: number;
  energyKWh: number;

  // Reliability
  uptime: number; // 0-1
  consistent: boolean;
  safe: boolean;
  unbiased: boolean;

  // Agent capabilities
  multiTurnSuccess: number; // 0-1
  contextMaintained: number; // 0-1
  errorRecovery: number; // 0-1
  taskCompletion: boolean;

  // Overall
  overallScore: number; // 0-1
}

export class MetricsCollector {
  private metrics: Map<string, Metrics[]> = new Map();

  /**
   * Record metrics for a model on a test case
   */
  recordMetrics(model: string, _testId: string, metrics: Partial<Metrics>): void {
    const key = `${model}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const calculated = this.calculateMetrics(metrics);
    this.metrics.get(key)!.push(calculated as Metrics);
  }

  /**
   * Calculate derived metrics and overall score
   */
  private calculateMetrics(m: Partial<Metrics>): Partial<Metrics> {
    // Calculate F1 if precision/recall available
    if (m.precision && m.recall) {
      m.f1Score =
        (2 * m.precision * m.recall) / (m.precision + m.recall) || 0;
    }

    // Calculate overall score
    const quality =
      (m.accuracy || 0) + (m.precision || 0) + (m.recall || 0) + (m.f1Score || 0);
    const qualityScore = quality / 4;

    const speedScore = m.latency
      ? Math.max(0, 1 - (m.latency || 100) / 100)
      : 0;

    const costUSD = m.costUSD || 0.05; // default to Copilot cost
    const efficiencyScore = Math.max(0, 1 - costUSD / 0.1); // normalize to $0.10

    const reliabilityScore =
      ((m.uptime || 0.99) +
        (m.consistent ? 1 : 0) +
        (m.safe ? 1 : 0) +
        (m.unbiased ? 1 : 0)) /
      4;

    m.overallScore =
      0.4 * qualityScore +
      0.3 * speedScore +
      0.2 * efficiencyScore +
      0.1 * reliabilityScore;

    return m;
  }

  /**
   * Get metrics for a specific model
   */
  getMetrics(model: string): Metrics[] {
    return this.metrics.get(model) || [];
  }

  /**
   * Compare two models
   */
  compare(
    model1: string,
    model2: string
  ): {
    model1Avg: Metrics;
    model2Avg: Metrics;
    winner: string;
    advantages: string[];
    disadvantages: string[];
  } {
    const m1 = this.getMetrics(model1);
    const m2 = this.getMetrics(model2);

    const avg1 = this.average(m1);
    const avg2 = this.average(m2);

    const advantages: string[] = [];
    const disadvantages: string[] = [];

    // Speed advantage
    if ((avg1.latency || 100) < (avg2.latency || 100)) {
      advantages.push(
        `${(((avg2.latency || 100) / (avg1.latency || 100) - 1) * 100).toFixed(0)}% faster`
      );
    } else {
      disadvantages.push(
        `${(((avg1.latency || 100) / (avg2.latency || 100) - 1) * 100).toFixed(0)}% slower`
      );
    }

    // Cost advantage
    if ((avg1.costUSD || 0.05) < (avg2.costUSD || 0.05)) {
      advantages.push(
        `${((avg2.costUSD || 0.05) / (avg1.costUSD || 0.05)).toFixed(0)}x cheaper`
      );
    }

    // Quality advantage
    if ((avg1.accuracy || 0) > (avg2.accuracy || 0)) {
      advantages.push(
        `${(((avg1.accuracy || 0) / (avg2.accuracy || 0)) * 100 - 100).toFixed(0)}% more accurate`
      );
    } else if ((avg1.accuracy || 0) < (avg2.accuracy || 0)) {
      disadvantages.push(
        `${(((avg2.accuracy || 0) / (avg1.accuracy || 0)) * 100 - 100).toFixed(0)}% less accurate`
      );
    }

    // Context awareness advantage
    if ((avg1.contextRelevance || 0) > (avg2.contextRelevance || 0)) {
      advantages.push(`Better context awareness`);
    }

    const winner =
      (avg1.overallScore || 0) > (avg2.overallScore || 0) ? model1 : model2;

    return {
      model1Avg: avg1 as Metrics,
      model2Avg: avg2 as Metrics,
      winner,
      advantages,
      disadvantages
    };
  }

  /**
   * Calculate average metrics
   */
  private average(metrics: Metrics[]): Partial<Metrics> {
    if (metrics.length === 0) return {};

    const avg: any = {};

    // Average all numeric fields
    const keys = Object.keys(metrics[0]) as (keyof Metrics)[];
    for (const key of keys) {
      const values = metrics
        .map(m => m[key])
        .filter(v => typeof v === 'number');

      if (values.length > 0) {
        avg[key] =
          values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }
    }

    return avg;
  }

  /**
   * Generate comparison report
   */
  generateReport(): string {
    let report = '\n📊 LIGHTNING METRICS REPORT\n';
    report += '═'.repeat(80) + '\n\n';

    const models = Array.from(this.metrics.keys());

    // Model averages
    report += 'MODEL AVERAGES:\n';
    report += '─'.repeat(80) + '\n';

    const averages = models.map(m => ({
      model: m,
      avg: this.average(this.getMetrics(m))
    }));

    averages.sort(
      (a, b) => (b.avg.overallScore || 0) - (a.avg.overallScore || 0)
    );

    averages.forEach((item, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
      report += `${medal} ${item.model.padEnd(15)} `;
      report += `Score: ${(item.avg.overallScore || 0).toFixed(3)} | `;
      report += `Latency: ${(item.avg.latency || 0).toFixed(0)}ms | `;
      report += `Cost: $${(item.avg.costUSD || 0).toFixed(4)} | `;
      report += `Accuracy: ${((item.avg.accuracy || 0) * 100).toFixed(0)}%\n`;
    });

    // Comparisons
    if (models.length >= 2) {
      report += '\n' + '─'.repeat(80) + '\n';
      report += 'COMPARISONS:\n';
      report += '─'.repeat(80) + '\n';

      // Lightning vs Copilot (if both exist)
      const lightningIdx = models.indexOf('lightning');
      const copilotIdx = models.indexOf('copilot');

      if (lightningIdx >= 0 && copilotIdx >= 0) {
        const comparison = this.compare('lightning', 'copilot');
        report += '\n⚡ LIGHTNING vs COPILOT:\n';
        report += `Winner: ${comparison.winner.toUpperCase()}\n`;
        report += `Advantages: ${comparison.advantages.join(', ')}\n`;
        report += `Disadvantages: ${comparison.disadvantages.join(', ')}\n`;
      }
    }

    return report;
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    const data: any = {};
    this.metrics.forEach((metrics, model) => {
      data[model] = metrics;
    });
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Hypothesis Test: Is Lightning ≥ Copilot?
 */
export function testHypothesis(
  lightningMetrics: Metrics[],
  copilotMetrics: Metrics[]
): {
  hypothesis: string;
  tStatistic: number;
  pValue: number;
  passed: boolean;
  confidence: string;
} {
  const lightningScores = lightningMetrics.map(m => m.overallScore);
  const copilotScores = copilotMetrics.map(m => m.overallScore);

  const lightningMean =
    lightningScores.reduce((a, b) => a + b, 0) / lightningScores.length;
  const copilotMean =
    copilotScores.reduce((a, b) => a + b, 0) / copilotScores.length;

  // Simplified t-test
  const lightningVar =
    lightningScores.reduce((sum, x) => sum + Math.pow(x - lightningMean, 2), 0) /
    (lightningScores.length - 1);
  const copilotVar =
    copilotScores.reduce((sum, x) => sum + Math.pow(x - copilotMean, 2), 0) /
    (copilotScores.length - 1);

  const pooledStdErr = Math.sqrt(
    (lightningVar / lightningScores.length + copilotVar / copilotScores.length)
  );

  const tStatistic = (lightningMean - copilotMean) / pooledStdErr;

  // Very simplified p-value (not exact, but directional)
  const pValue = Math.abs(tStatistic) > 2 ? 0.05 : 0.15;

  const passed = lightningMean >= copilotMean && pValue < 0.05;

  return {
    hypothesis:
      'H1: Lightning ≥ Copilot on overall score',
    tStatistic,
    pValue,
    passed,
    confidence: passed
      ? '✅ Hypothesis CONFIRMED (p < 0.05)'
      : '❌ Not statistically significant'
  };
}
