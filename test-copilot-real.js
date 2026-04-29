#!/usr/bin/env node
/**
 * Real A/B Test: Call actual Copilot CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\n⚡ Lightning CLI - REAL Copilot CLI Integration Test\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Check if gh is installed and authenticated
console.log('📋 Checking system status...\n');

try {
  const authStatus = execSync('gh auth status 2>&1', { encoding: 'utf-8' });
  console.log('✅ GitHub CLI authenticated');
  console.log(authStatus.split('\n')[0]);
} catch (err) {
  console.error('❌ GitHub CLI not authenticated. Run: gh auth login');
  process.exit(1);
}

const testTask = 'Refactor this function to follow Single Responsibility Principle. Each function should do one thing. Keep functions under 24 lines.';

console.log('\n📌 Test Case: Payment Processing Refactor\n');
console.log('Task:', testTask);
console.log('\n───────────────────────────────────────────────────────────────────────\n');

console.log('🤖 Calling real Copilot CLI (gh copilot -p)...\n');

const startTime = Date.now();

try {
  // Use gh copilot with -p for prompt (correct syntax)
  const copilotResponse = execSync(
    `gh copilot -p ${JSON.stringify(testTask)}`,
    {
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  const latency = Date.now() - startTime;

  console.log('✅ REAL Copilot Response Received!\n');
  console.log('───────────────────────────────────────────────────────────────────────\n');
  console.log('Full Response:');
  console.log(copilotResponse);
  console.log('\n───────────────────────────────────────────────────────────────────────\n');
  console.log(`⏱️  REAL Latency: ${latency}ms`);
  console.log(`📊 Tokens: ~${Math.ceil(copilotResponse.split(/\s+/).length)}\n`);

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    source: 'REAL Copilot CLI (gh copilot -p)',
    latencyMs: latency,
    responseLength: copilotResponse.length,
    tokenCount: Math.ceil(copilotResponse.split(/\s+/).length),
    success: true,
    fullResponse: copilotResponse
  };

  const filename = `real-copilot-test-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`📁 Results saved to: ${filename}\n`);

  console.log('═══════════════════════════════════════════════════════════════════════\n');
  console.log('🎯 SUCCESS: Copilot CLI Integration Working!\n');
  console.log('📊 Key Metrics from REAL Copilot:\n');
  console.log(`  • Latency: ${latency}ms`);
  console.log(`  • Tokens generated: ${results.tokenCount}`);
  console.log(`  • Response size: ${(copilotResponse.length / 1024).toFixed(2)} KB\n`);
  console.log('This proves we can now run real A/B tests!\n');

} catch (error) {
  const latency = Date.now() - startTime;
  console.error('❌ Error calling Copilot CLI:');
  console.error(error.message);
  console.error(`Time before error: ${latency}ms\n`);
  process.exit(1);
}
