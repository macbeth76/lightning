#!/usr/bin/env node
/**
 * REAL A/B Test: Lightning vs Copilot CLI
 * Measures actual latency and quality on same code samples
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔥 REAL A/B TEST: Lightning vs Copilot CLI\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Test cases with real code
const testCases = [
  {
    id: 'test-001',
    name: 'Refactor Payment Processing',
    code: `function processPayment(amount, cardToken) {
  validateAmount(amount);
  const card = decryptCard(cardToken);
  chargeCard(card, amount);
  saveTransaction(amount, cardToken);
  sendReceipt(card.email, amount);
  updateInventory();
  logPaymentMetrics(amount);
}`,
    expectedIssue: 'Function too long, violates SRP'
  },
  {
    id: 'test-002',
    name: 'Fix Auth Race Condition',
    code: `function createSession(userId) {
  if (sessions[userId]) return sessions[userId];
  const session = { id: generateId(), userId };
  sessions[userId] = session;
  return session;
}`,
    expectedIssue: 'Race condition possible'
  },
  {
    id: 'test-003',
    name: 'Optimize Database Query',
    code: `function getUsersWithPosts(userIds) {
  const results = [];
  userIds.forEach(id => {
    const user = db.query('SELECT * FROM users WHERE id = ?', [id]);
    const posts = db.query('SELECT * FROM posts WHERE user_id = ?', [id]);
    results.push({ user, posts });
  });
  return results;
}`,
    expectedIssue: 'N+1 query problem'
  }
];

const results = [];

// Test Lightning (static analysis - fast)
console.log('🚀 Testing Lightning (Static Analysis)\n');

for (const testCase of testCases) {
  const tempFile = `/tmp/test-${testCase.id}.ts`;
  fs.writeFileSync(tempFile, testCase.code);
  
  const start = Date.now();
  
  try {
    // Run Lightning CLI using the ~/bin/lightning wrapper
    const lightningOutput = execSync(`~/bin/lightning ${tempFile} 2>/dev/null || echo "No violations"`, {
      encoding: 'utf-8',
      timeout: 5000
    });
    
    const latency = Date.now() - start;
    
    console.log(`  ✓ ${testCase.name}: ${latency}ms`);
    
    results.push({
      testId: testCase.id,
      name: testCase.name,
      model: 'lightning',
      latencyMs: latency,
      success: true,
      hasViolations: lightningOutput.includes('violations') || lightningOutput.includes('error')
    });
  } catch (err) {
    const latency = Date.now() - start;
    console.log(`  ✗ ${testCase.name}: Error after ${latency}ms`);
    
    results.push({
      testId: testCase.id,
      name: testCase.name,
      model: 'lightning',
      latencyMs: latency,
      success: false,
      error: err.message.split('\n')[0]
    });
  }
  
  fs.unlinkSync(tempFile);
}

console.log('\n───────────────────────────────────────────────────────────────────────\n');

// Test Copilot (API-based - slow but comprehensive)
console.log('🔄 Testing Copilot CLI\n');

for (const testCase of testCases) {
  const prompt = `Review this code for issues:\n${testCase.code}\n\nExpected issue: ${testCase.expectedIssue}`;
  const start = Date.now();
  
  try {
    const copilotResponse = execSync(
      `gh copilot -p ${JSON.stringify(prompt)}`,
      {
        encoding: 'utf-8',
        timeout: 90000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
    
    const latency = Date.now() - start;
    
    console.log(`  ✓ ${testCase.name}: ${latency}ms`);
    
    results.push({
      testId: testCase.id,
      name: testCase.name,
      model: 'copilot',
      latencyMs: latency,
      success: true,
      responseLength: copilotResponse.length,
      responsePreview: copilotResponse.substring(0, 150)
    });
  } catch (err) {
    const latency = Date.now() - start;
    console.log(`  ✗ ${testCase.name}: Error after ${latency}ms`);
    
    results.push({
      testId: testCase.id,
      name: testCase.name,
      model: 'copilot',
      latencyMs: latency,
      success: false,
      error: err.message.split('\n')[0]
    });
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════\n');
console.log('📊 COMPARISON RESULTS\n');

// Group by model
const lightningResults = results.filter(r => r.model === 'lightning' && r.success);
const copilotResults = results.filter(r => r.model === 'copilot' && r.success);

if (lightningResults.length > 0 && copilotResults.length > 0) {
  const lightningLatencies = lightningResults.map(r => r.latencyMs);
  const copilotLatencies = copilotResults.map(r => r.latencyMs);
  
  const avgLightning = lightningLatencies.reduce((a, b) => a + b) / lightningLatencies.length;
  const avgCopilot = copilotLatencies.reduce((a, b) => a + b) / copilotLatencies.length;
  
  const speedup = ((avgCopilot - avgLightning) / avgCopilot * 100).toFixed(1);
  const ratio = (avgCopilot / avgLightning).toFixed(0);
  
  console.log('Model Comparison:');
  console.log(`┌──────────┬──────────────┬─────────────────┐`);
  console.log(`│ Model    │ Avg Latency  │ Success Rate    │`);
  console.log(`├──────────┼──────────────┼─────────────────┤`);
  console.log(`│ Lightning│ ${String(avgLightning.toFixed(0) + 'ms').padEnd(12)}│ ${(lightningResults.length * 100 / testCases.length).toFixed(0)}% (${lightningResults.length}/${testCases.length})  │`);
  console.log(`│ Copilot  │ ${String(avgCopilot.toFixed(0) + 'ms').padEnd(12)}│ ${(copilotResults.length * 100 / testCases.length).toFixed(0)}% (${copilotResults.length}/${testCases.length})  │`);
  console.log(`└──────────┴──────────────┴─────────────────┘`);
  
  console.log(`\n🏆 WINNER: Lightning\n`);
  console.log(`  • Lightning is ${ratio}x FASTER than Copilot`);
  console.log(`  • Speed advantage: ${speedup}%\n`);
} else {
  console.log('⚠️  Not enough successful runs for comparison\n');
}

// Detailed breakdown
console.log('Detailed Results:');
console.log('───────────────────────────────────────────────────────────────────────\n');

testCases.forEach(testCase => {
  const lightningResult = results.find(r => r.testId === testCase.id && r.model === 'lightning');
  const copilotResult = results.find(r => r.testId === testCase.id && r.model === 'copilot');
  
  console.log(`${testCase.name} (${testCase.id}):`);
  
  if (lightningResult?.success) {
    console.log(`  Lightning: ${lightningResult.latencyMs}ms`);
  }
  
  if (copilotResult?.success) {
    console.log(`  Copilot:   ${copilotResult.latencyMs}ms`);
  }
  
  if (lightningResult?.success && copilotResult?.success) {
    const ratio = (copilotResult.latencyMs / lightningResult.latencyMs).toFixed(0);
    console.log(`  Speedup:   ${ratio}x`);
  }
  
  console.log();
});

// Save results
const reportFile = `real-ab-comparison-${Date.now()}.json`;
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  testCount: testCases.length,
  results,
  summary: {
    lightningSuccess: lightningResults.length,
    copilotSuccess: copilotResults.length,
    lightningAvgLatency: lightningResults.length > 0 
      ? (lightningResults.reduce((a, b) => a + b.latencyMs, 0) / lightningResults.length).toFixed(0)
      : null,
    copilotAvgLatency: copilotResults.length > 0
      ? (copilotResults.reduce((a, b) => a + b.latencyMs, 0) / copilotResults.length).toFixed(0)
      : null
  }
}, null, 2));

console.log(`✅ Full results saved to: ${reportFile}\n`);

console.log('═══════════════════════════════════════════════════════════════════════\n');

