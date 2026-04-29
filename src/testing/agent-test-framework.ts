/**
 * Agent Test Framework
 * Validates that agents truly understand project structure.
 * Includes semantic scoring, hallucination detection, and regression tracking.
 */

import * as fs from 'fs';
import * as path from 'path';
import { OllamaAgent } from './ollama-agent';
import { TemplateAgent } from './template-agent';
import { ProjectGraphAnalyzer } from '../utils/project-graph-analyzer';
import { SemanticScorer } from './semantic-scorer';
import { HallucinationDetector } from './hallucination-detector';
import { TestResultsDB, StoredResult } from './test-results-db';

interface TestCase {
  name: string;
  projectPath: string;
  groundTruth: string;
  keywords: string[];
}

interface TestResult {
  case: TestCase;
  graphOutput: string;
  ollamaOutput: string;
  templateOutput: string;
  graphAccuracy: number;
  ollamaAccuracy: number;
  templateAccuracy: number;
  ollamaHallucinating: boolean;
  hallucinationDetails: string[];
}

const TEST_CASES: TestCase[] = [
  {
    name: 'lambda_crud',
    projectPath: 'test-projects/lambda_crud',
    groundTruth: 'AWS Lambda CRUD service for Users with DynamoDB backend',
    keywords: ['lambda', 'dynamodb', 'handler', 'aws', 'serverless'],
  },
  {
    name: 'express_api',
    projectPath: 'test-projects/express_api',
    groundTruth: 'Express.js REST API with PostgreSQL database',
    keywords: ['express', 'rest', 'api', 'postgresql', 'route'],
  },
  {
    name: 'microservice',
    projectPath: 'test-projects/microservice',
    groundTruth: 'gRPC microservice with Kubernetes deployment',
    keywords: ['grpc', 'microservice', 'proto', 'service'],
  },
];

export class AgentTestFramework {
  private ollamaAgent = new OllamaAgent();
  private templateAgent = new TemplateAgent();
  private semanticScorer = new SemanticScorer();
  private hallucDetector = new HallucinationDetector();
  private db = new TestResultsDB();
  private runId = new Date().toISOString();

  /**
   * Run all test cases with semantic scoring (≤24 lines)
   */
  async runTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of TEST_CASES) {
      console.log(`\n🔍 Testing: ${testCase.name}...`);
      const absPath = path.resolve(process.cwd(), testCase.projectPath);
      const { graph, ollama, template, deps } = await this.analyzeProject(absPath);

      const result: TestResult = {
        case: testCase,
        graphOutput: graph,
        ollamaOutput: ollama,
        templateOutput: template,
        graphAccuracy: this.scoreWithSemantics(graph, testCase.keywords),
        ollamaAccuracy: this.scoreWithSemantics(ollama, testCase.keywords),
        templateAccuracy: this.scoreWithSemantics(template, testCase.keywords),
        ollamaHallucinating: this.hallucDetector.detect(ollama, deps).isHallucinating,
        hallucinationDetails: this.hallucDetector.detect(ollama, deps).falsePositives,
      };

      results.push(result);
      await this.storeResult(result);
    }

    return results;
  }

  /**
   * Analyze with semantic scoring (≤24 lines)
   */
  private scoreWithSemantics(output: string, keywords: string[]): number {
    const lower = output.toLowerCase();
    let scored = 0;

    for (const kw of keywords) {
      const directMatch = lower.includes(kw.toLowerCase());
      if (directMatch) {
        scored += 1;
      } else {
        const semantic = this.semanticScorer.cosineSimilarity(kw, output);
        if (semantic > 0.6) scored += 0.5;
      }
    }

    return Math.min(1.0, scored / keywords.length);
  }

  /**
   * Run all three agents on one project (≤24 lines)
   */
  private async analyzeProject(
    absPath: string
  ): Promise<{ graph: string; ollama: string; template: string; deps: string[] }> {
    const analyzer = new ProjectGraphAnalyzer(absPath);
    await analyzer.buildGraph();
    const graph = await analyzer.generateGraphSummary();
    const template = this.templateAgent.analyze(absPath);
    const ollama = await this.ollamaAgent.analyze(absPath);
    const pkgPath = path.join(absPath, 'package.json');
    let deps: string[] = [];
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    } catch {
      // no deps
    }
    return { graph, ollama, template, deps };
  }

  /**
   * Store results in database for regression tracking (≤24 lines)
   */
  private async storeResult(result: TestResult): Promise<void> {
    const stored: StoredResult[] = [
      {
        testName: result.case.name,
        agentType: 'graph',
        accuracy: result.graphAccuracy,
        hallucinating: false,
        falsePositives: '',
        timestamp: new Date().toISOString(),
        runId: this.runId,
      },
      {
        testName: result.case.name,
        agentType: 'ollama',
        accuracy: result.ollamaAccuracy,
        hallucinating: result.ollamaHallucinating,
        falsePositives: result.hallucinationDetails.join(','),
        timestamp: new Date().toISOString(),
        runId: this.runId,
      },
      {
        testName: result.case.name,
        agentType: 'template',
        accuracy: result.templateAccuracy,
        hallucinating: false,
        falsePositives: '',
        timestamp: new Date().toISOString(),
        runId: this.runId,
      },
    ];

    for (const s of stored) {
      await this.db.store(s);
    }
  }

  /**
   * Print detailed results with hallucination info (≤24 lines)
   */
  async generateReport(results: TestResult[]): Promise<void> {
    let graphTotal = 0, ollamaTotal = 0, templateTotal = 0;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('AGENT TEST FRAMEWORK RESULTS (with semantic scoring)');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const r of results) {
      const halluc = r.ollamaHallucinating ? ` ⚠️ HALLUCINATING: ${r.hallucinationDetails.join(', ')}` : '';
      const winner = r.ollamaAccuracy >= r.templateAccuracy ? '✓' : '⚠';
      console.log(`Test: ${r.case.name}  [${winner}]${halluc}`);
      console.log(`  Graph:   ${pct(r.graphAccuracy)}  "${r.graphOutput.substring(0, 50)}..."`);
      console.log(`  Ollama:  ${pct(r.ollamaAccuracy)}  "${r.ollamaOutput.substring(0, 50)}..."`);
      console.log(`  Template:${pct(r.templateAccuracy)}  "${r.templateOutput.substring(0, 50)}..."`);
      console.log('');
      graphTotal += r.graphAccuracy;
      ollamaTotal += r.ollamaAccuracy;
      templateTotal += r.templateAccuracy;
    }

    const n = results.length;
    const diff = ((ollamaTotal - templateTotal) / n) * 100;
    console.log('─── Overall Accuracy ─────────────────────────────────────');
    console.log(`  Graph:    ${avg(graphTotal, n)}`);
    console.log(`  Ollama:   ${avg(ollamaTotal, n)}`);
    console.log(`  Template: ${avg(templateTotal, n)}`);
    console.log(`  Δ Improvement: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════\n');

    await this.db.close();
  }
}

function pct(score: number): string {
  return `${(score * 100).toFixed(0)}%`.padEnd(4);
}

function avg(total: number, n: number): string {
  return `${((total / n) * 100).toFixed(1)}%`;
}
