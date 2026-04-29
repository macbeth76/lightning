#!/usr/bin/env node
/**
 * Real A/B Test: Lightning vs Copilot CLI
 * Uses actual code sample and compares real responses
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\n🔥 REAL A/B TESTING: Lightning vs Copilot CLI\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Real code sample from ab-test-suite
const realCode = `
function processPayment(amount, cardToken) {
  validateAmount(amount);
  const card = decryptCard(cardToken);
  chargeCard(card, amount);
  saveTransaction(amount, cardToken);
  sendReceipt(card.email, amount);
  updateInventory();
  logPaymentMetrics(amount);
}
`;

const testCases = [
  {
    id: 'test-001',
    name: 'Refactor Payment Processing',
    code: realCode,
    prompt: 'Refactor this payment function to follow Single Responsibility Principle. Each method should handle one responsibility. Keep methods under 24 lines.'
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
    prompt: 'This code has a race condition. If createSession is called twice concurrently, it might create duplicate sessions. How would you fix this?'
  }
];

const results = [];

for (const testCase of testCases) {
  console.log(`\n📌 ${testCase.name}\n`);
  console.log(`Code snippet:${testCase.code.substring(0, 80)}...`);
  console.log(`Prompt: ${testCase.prompt}\n`);

  // Test 1: Call Copilot
  console.log('  Calling Copilot CLI...');
  const copilotStart = Date.now();
  
  try {
    const fullPrompt = `Code:\n${testCase.code}\n\nTask: ${testCase.prompt}`;
    const copilotResponse = execSync(
      `gh copilot -p ${JSON.stringify(fullPrompt)}`,
      {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
    
    const copilotLatency = Date.now() - copilotStart;
    console.log(`  ✅ Copilot: ${copilotLatency}ms, ${copilotResponse.length} chars\n`);
    
    results.push({
      testCase: testCase.id,
      model: 'copilot',
      latencyMs: copilotLatency,
      responseLength: copilotResponse.length,
      tokenCount: Math.ceil(copilotResponse.split(/\s+/).length),
      success: true,
      sample: copilotResponse.substring(0, 200)
    });
  } catch (err) {
    console.log(`  ❌ Copilot error: ${err.message}\n`);
    results.push({
      testCase: testCase.id,
      model: 'copilot',
      latencyMs: Date.now() - copilotStart,
      success: false,
      error: err.message
    });
  }

  console.log('───────────────────────────────────────────────────────────────────────\n');
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════════════════\n');
console.log('📊 RESULTS SUMMARY\n');

const successfulResults = results.filter(r => r.success);

if (successfulResults.length > 0) {
  const avgLatency = successfulResults.reduce((sum, r) => sum + r.latencyMs, 0) / successfulResults.length;
  const avgResponse = successfulResults.reduce((sum, r) => sum + r.responseLength, 0) / successfulResults.length;
  
  console.log(`Tests completed: ${successfulResults.length}`);
  console.log(`Average Copilot latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`Average response size: ${avgResponse.toFixed(0)} chars`);
  console.log(`Average tokens: ${Math.ceil(successfulResults.reduce((sum, r) => sum + (r.tokenCount || 0), 0) / successfulResults.length)}\n`);
}

// Save detailed results
const reportFile = `real-ab-results-${Date.now()}.json`;
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  testCount: results.length,
  successCount: results.filter(r => r.success).length,
  results
}, null, 2));

console.log(`✅ Detailed results saved to: ${reportFile}\n`);
console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log('🎯 NEXT: Now we have real Copilot data to compare Lightning against!\n');

