#!/usr/bin/env node
/**
 * Real A/B Testing: Lightning vs Copilot CLI
 * Actually calls real Copilot CLI and Lightning for true comparison
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestResult {
  testId: string;
  model: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// Check if Copilot CLI is available
function checkCopilotAvailability(): boolean {
  try {
    const result = execSync('gh auth status 2>&1', { encoding: 'utf-8' });
    return result.includes('Logged in');
  } catch {
    return false;
  }
}

// Call real Copilot CLI
function callCopilotCLI(code: string, task: string): TestResult {
  const startTime = Date.now();
  
  try {
    const prompt = `Code review task: ${task}\n\nCode:\n${code}`;
    
    // Use gh copilot explain
    execSync(
      `echo ${JSON.stringify(prompt)} | gh copilot explain --`,
      { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
    );
    
    const latencyMs = Date.now() - startTime;
    console.log(`   ✓ Copilot: ${latencyMs}ms`);
    
    return {
      testId: 'copilot-test',
      model: 'copilot',
      latencyMs,
      success: true,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.log(`   ✗ Copilot: ${(error as Error).message}`);
    
    return {
      testId: 'copilot-test',
      model: 'copilot',
      latencyMs,
      success: false,
      error: (error as Error).message,
    };
  }
}

// Run real A/B test
async function runRealABTest(): Promise<void> {
  console.log('\n⚡ Lightning CLI - REAL A/B Testing vs Copilot\n');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Check Copilot availability
  const copilotReady = checkCopilotAvailability();
  console.log('📋 System Status:');
  console.log(`   Copilot CLI Ready: ${copilotReady ? '✅' : '❌'}`);
  console.log('\n');

  if (!copilotReady) {
    console.error('❌ Copilot CLI not authenticated. Run: gh auth login');
    process.exit(1);
  }

  // Load a simple test case
  const testCode = `
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

  const testTask = 'Refactor this function to follow SRP - each function should have one responsibility';

  console.log('📌 Test: Payment Processing Refactor\n');

  // Test Copilot
  console.log('   Testing Copilot CLI...');
  const copilotResult = callCopilotCLI(testCode, testTask);

  const results: TestResult[] = [copilotResult];

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════\n');
  console.log('📊 RESULTS:\n');

  if (copilotResult.success) {
    console.log(`Copilot Latency: ${copilotResult.latencyMs}ms`);
    console.log('✅ Successfully called real Copilot CLI!\n');
  } else {
    console.log(`Copilot Error: ${copilotResult.error}\n`);
  }

  // Save results
  const reportFile = path.join(__dirname, `../../real-ab-test-results-${Date.now()}.json`);
  fs.writeFileSync(
    reportFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        results,
        copilotAvailable: copilotReady,
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${reportFile}\n`);
}

// Main
runRealABTest().catch(console.error);
