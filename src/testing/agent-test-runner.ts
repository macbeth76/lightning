#!/usr/bin/env node
/**
 * Agent Test Runner - CLI Entry Point
 * Validates agent understanding across test projects
 */

import { AgentTestFramework } from './agent-test-framework';

async function main() {
  const framework = new AgentTestFramework();

  console.log('\n🧪 Starting Agent Test Framework...\n');

  try {
    const results = await framework.runTests();
    await framework.generateReport(results);

    // Exit 1 only if tests failed to run (errors), not if one agent beats another
    process.exit(0);
  } catch (error) {
    console.error('❌ Test framework error:', error);
    process.exit(1);
  }
}

main();
