/**
 * Final A/B Comparison: Lightning with Improvements vs Copilot
 * Tests: Code analysis, project generation, and improvement tracking
 */

const { EnhancedAnalyzer } = require('./dist/utils/enhanced-analyzer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_FILES = [
  './src/utils/analyzer.ts',
  './src/utils/advanced-rules.ts',
  './src/utils/metrics-db.ts'
];

async function runLightningAnalysis() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Lightning Analysis with Improvements              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const analyzer = new EnhancedAnalyzer('lightning-final-test');
  const results = [];

  for (const file of TEST_FILES) {
    console.log(`📁 Analyzing: ${file}`);
    const startTime = Date.now();

    try {
      const result = await analyzer.analyzeFile(file, false);
      const latencyMs = Date.now() - startTime;

      results.push({
        file,
        violations: result.violations.length,
        errorCount: result.metrics.errorCount,
        warningCount: result.metrics.warningCount,
        infoCount: result.metrics.infoCount,
        latencyMs,
        avgSeverity: result.metrics.avgSeverity
      });

      console.log(`   ✓ ${result.violations.length} violations found`);
      console.log(`   ✓ ${result.metrics.errorCount} errors, ${result.metrics.warningCount} warnings, ${result.metrics.infoCount} infos`);
      console.log(`   ✓ Latency: ${latencyMs}ms\n`);

      if (result.violations.length > 0) {
        console.log(`   Top violations:`);
        result.violations.slice(0, 3).forEach(v => {
          console.log(`     - [${v.type}] ${v.message} (line ${v.line})`);
        });
        console.log();
      }
    } catch (error) {
      console.error(`   ✗ Error: ${error.message}\n`);
    }
  }

  analyzer.close();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Summary                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const totalViolations = results.reduce((sum, r) => sum + r.violations, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length);

  console.log('Lightning Results:');
  console.log(`  Total Violations: ${totalViolations}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);
  console.log(`  Avg Latency: ${avgLatency}ms`);

  // Copilot comparison
  console.log('\n┌────────────────────────────────────────────────────────┐');
  console.log('│ Comparison with Copilot CLI (from prior tests)        │');
  console.log('├────────────────────────────────────────────────────────┤');
  console.log('│ Copilot latency: 56,620ms (avg 3 tests)               │');
  console.log('│ Lightning latency: ' + avgLatency + 'ms (avg ' + TEST_FILES.length + ' files)             │');
  console.log('│ Speed improvement: ' + (Math.round(56620 / avgLatency)) + 'x faster                         │');
  console.log('│                                                        │');
  console.log('│ Lightning Detection:                                   │');
  console.log('│  • Method length violations (24-line limit)            │');
  console.log('│  • Unused imports                                      │');
  console.log('│  • Missing null checks                                 │');
  console.log('│  • Magic strings (hardcoded values)                    │');
  console.log('│  • Missing error handling                              │');
  console.log('│  • TODO/FIXME comments                                 │');
  console.log('│                                                        │');
  console.log('│ Copilot Detection:                                     │');
  console.log('│  • Implicit (fuzzy, not deterministic)                 │');
  console.log('│  • Uses LLM inference (slower)                         │');
  console.log('│  • Prone to hallucinations                             │');
  console.log('└────────────────────────────────────────────────────────┘\n');

  // Write results to file
  const outputFile = `lightning-final-ab-${Date.now()}.json`;
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    testFiles: TEST_FILES,
    lightningResults: results,
    summary: {
      totalViolations,
      totalErrors,
      totalWarnings,
      avgLatencyMs: avgLatency
    },
    copilotComparison: {
      avgLatencyMs: 56620,
      speedImprovement: Math.round(56620 / avgLatency) + 'x'
    }
  }, null, 2));

  console.log(`📊 Results saved to: ${outputFile}\n`);

  return results;
}

// Run the test
runLightningAnalysis().catch(console.error);
