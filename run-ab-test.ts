#!/usr/bin/env node
/**
 * A/B Testing Runner
 * Compares different SLM models on code analysis tasks
 */

import { InMemoryTestHarness } from './src/testing/ab-test-simple';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  suiteId: string;
  description: string;
  testCases: any[];
  models: string[];
  metrics: string[];
}

async function runABTests() {
  console.log('\n⚡ Lightning CLI - A/B Testing Suite\n');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Load test suite
  const suiteFile = path.join(__dirname, 'ab-test-suite.json');
  if (!fs.existsSync(suiteFile)) {
    console.error('❌ Test suite file not found:', suiteFile);
    process.exit(1);
  }

  const suite: TestSuite = JSON.parse(fs.readFileSync(suiteFile, 'utf-8'));
  console.log(`📋 Test Suite: ${suite.suiteId}`);
  console.log(`📝 Description: ${suite.description}`);
  console.log(`🧪 Test Cases: ${suite.testCases.length}`);
  console.log(`🤖 Models: ${suite.models.join(', ')}`);
  console.log('\n───────────────────────────────────────────────────────────────────────\n');

  // Initialize harness
  const harness = new InMemoryTestHarness();

  // Run tests
  const results: any[] = [];

  for (const testCase of suite.testCases) {
    console.log(`\n📌 ${testCase.name} (${testCase.id})`);
    console.log(`   Category: ${testCase.category}`);
    console.log(`   ${testCase.description}`);
    console.log(`   Expected: ${testCase.expectedTask}`);
    console.log('\n   Running on models:');

    const caseResults: any = {
      testCaseId: testCase.id,
      name: testCase.name,
      results: {},
    };

    for (const model of suite.models) {
      try {
        const result = await (harness as any).runTestCase(testCase, model);
        caseResults.results[model] = result;

        console.log(`   ✓ ${model}:`);
        console.log(`     • Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
        console.log(`     • Latency: ${result.latencyMs}ms`);
        console.log(`     • Tokens: ${result.tokensUsed}`);
        console.log(`     • Token Efficiency: ${result.tokenEfficiency.toFixed(2)}`);
        console.log(`     • Code Quality: ${result.codeQualityScore.toFixed(2)}/10`);
        console.log(`     • Context Utilization: ${(result.contextUtilization * 100).toFixed(1)}%`);
      } catch (error) {
        console.log(`   ✗ ${model}: Error - ${(error as Error).message}`);
      }
    }

    results.push(caseResults);
  }

  // Generate summary report
  console.log('\n═══════════════════════════════════════════════════════════════════════\n');
  console.log('📊 SUMMARY REPORT\n');

  // Calculate model rankings
  const modelScores: any = {};
  for (const model of suite.models) {
    modelScores[model] = {
      accuracy: 0,
      latency: 0,
      efficiency: 0,
      quality: 0,
      context: 0,
      count: 0,
    };
  }

  for (const result of results) {
    for (const model of suite.models) {
      if (result.results[model]) {
        const r = result.results[model];
        modelScores[model].accuracy += r.accuracy;
        modelScores[model].latency += r.latencyMs;
        modelScores[model].efficiency += r.tokenEfficiency;
        modelScores[model].quality += r.codeQualityScore;
        modelScores[model].context += r.contextUtilization;
        modelScores[model].count++;
      }
    }
  }

  // Average the scores
  for (const model of suite.models) {
    const score = modelScores[model];
    if (score.count > 0) {
      score.accuracy /= score.count;
      score.latency /= score.count;
      score.efficiency /= score.count;
      score.quality /= score.count;
      score.context /= score.count;
    }
  }

  // Display comparison table
  console.log('Model Comparison:');
  console.log('┌─────────────┬──────────┬─────────┬───────────┬─────────┬────────────┐');
  console.log('│ Model       │ Accuracy │ Latency │ Efficiency│ Quality │ Context    │');
  console.log('├─────────────┼──────────┼─────────┼───────────┼─────────┼────────────┤');

  for (const model of suite.models) {
    const score = modelScores[model];
    const accuracy = (score.accuracy * 100).toFixed(0).padStart(6);
    const latency = score.latency.toFixed(0).padStart(5);
    const efficiency = score.efficiency.toFixed(2).padStart(7);
    const quality = score.quality.toFixed(1).padStart(5);
    const context = (score.context * 100).toFixed(0).padStart(6);

    console.log(`│ ${model.padEnd(11)} │ ${accuracy}% │ ${latency}ms │ ${efficiency} │ ${quality}/10 │ ${context}%      │`);
  }

  console.log('└─────────────┴──────────┴─────────┴───────────┴─────────┴────────────┘');

  // Calculate winner
  let bestModel = '';
  let bestScore = -Infinity;

  for (const model of suite.models) {
    const score = modelScores[model];
    // Weighted scoring: 40% accuracy, 30% speed (inverse latency), 20% efficiency, 10% quality
    const compositeScore =
      score.accuracy * 0.4 +
      (1 - Math.min(score.latency / 100, 1)) * 0.3 +
      score.efficiency * 0.2 +
      (score.quality / 10) * 0.1;

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestModel = model;
    }
  }

  console.log(`\n🏆 Winner: ${bestModel} (Score: ${bestScore.toFixed(3)})\n`);

  // Key insights
  console.log('📈 Key Insights:');
  console.log(`   • Fastest: ${suite.models.reduce((a, b) => modelScores[a].latency < modelScores[b].latency ? a : b)}`);
  console.log(`   • Most Accurate: ${suite.models.reduce((a, b) => modelScores[a].accuracy > modelScores[b].accuracy ? a : b)}`);
  console.log(`   • Most Efficient: ${suite.models.reduce((a, b) => modelScores[a].efficiency > modelScores[b].efficiency ? a : b)}`);
  console.log(`   • Best Quality: ${suite.models.reduce((a, b) => modelScores[a].quality > modelScores[b].quality ? a : b)}\n`);

  // Save results
  const reportFile = path.join(__dirname, `ab-test-results-${Date.now()}.json`);
  fs.writeFileSync(
    reportFile,
    JSON.stringify(
      {
        suiteId: suite.suiteId,
        timestamp: new Date().toISOString(),
        testResults: results,
        modelScores,
        winner: bestModel,
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${reportFile}\n`);
}

// Run tests
runABTests().catch(console.error);
