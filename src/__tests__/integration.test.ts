import * as fs from 'fs';
import * as path from 'path';
import { CodeSegmenter } from '../utils/segmenter';
import { MetricsCollector, SLMMetric } from '../utils/metrics';

describe('End-to-End Pipeline', () => {
  const testDbPath = path.join(__dirname, '../../test-metrics.db');

  afterAll(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should run full analysis pipeline', () => {
    const code = `
function example() {
  const x = 1;
  const y = 2;
  return x + y;
}
    `;

    const manifest = CodeSegmenter.buildManifest('test.ts', code, 24);
    expect(manifest.segments.length).toBeGreaterThan(0);

    manifest.segments.forEach((seg) => {
      expect(seg.lineCount).toBeLessThanOrEqual(24);
    });
  });

  it('should collect and store metrics', () => {
    const collector = new MetricsCollector(testDbPath);

    collector.addTestCase('test-1', 'Sample Test', 'input code', 'expected output');

    const metric: SLMMetric = {
      id: 'metric-1',
      testCaseId: 'test-1',
      model: 'llama2',
      accuracy: 0.85,
      latencyMs: 450,
      tokensUsed: 156,
      tokenEfficiency: 0.25,
      contextUtilization: 0.65,
      codeQualityScore: 0.9,
      timestamp: new Date().toISOString(),
    };

    collector.recordMetric(metric);

    const retrieved = collector.getMetricsForModel('llama2');
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].accuracy).toBe(0.85);

    collector.close();
  });

  it('should validate segmentation', () => {
    const funcCode = `function add(a: number, b: number): number {
  return a + b;
}`;

    const funcSegments = CodeSegmenter.segmentCode('func.ts', funcCode);
    expect(funcSegments.length).toBeGreaterThan(0);
    expect(funcSegments.every((s) => s.lineCount <= 24)).toBe(true);
  });
});
