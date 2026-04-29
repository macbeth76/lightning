#!/usr/bin/env node
/**
 * Build both Micronaut projects and compare
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\n🔨 BUILDING BOTH MICRONAUT PROJECTS\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const results = [];

// Build Copilot project
console.log('Building Copilot project...\n');

const copilotStart = Date.now();

try {
  const output = execSync(
    'cd /tmp/hello-copilot && gradle build 2>&1 | tail -30',
    { encoding: 'utf-8', timeout: 180000 }
  );
  
  const copilotLatency = Date.now() - copilotStart;
  const success = output.includes('BUILD SUCCESS') || !output.includes('ERROR');
  
  console.log(output);
  console.log(`\n✅ Copilot build: ${copilotLatency}ms - ${success ? 'SUCCESS' : 'FAILED'}\n`);
  
  results.push({
    model: 'copilot',
    latencyMs: copilotLatency,
    success,
    buildOutput: output.substring(0, 500)
  });
} catch (err) {
  const copilotLatency = Date.now() - copilotStart;
  console.log(`❌ Copilot build failed after ${copilotLatency}ms\n${err.message}\n`);
  
  results.push({
    model: 'copilot',
    latencyMs: copilotLatency,
    success: false,
    error: err.message.substring(0, 500)
  });
}

console.log('───────────────────────────────────────────────────────────────────────\n');

// Build Lightning project
console.log('Building Lightning project...\n');

const lightningStart = Date.now();

try {
  const output = execSync(
    'cd /tmp/hello-lightning && gradle build 2>&1 | tail -30',
    { encoding: 'utf-8', timeout: 180000 }
  );
  
  const lightningLatency = Date.now() - lightningStart;
  const success = output.includes('BUILD SUCCESS') || !output.includes('ERROR');
  
  console.log(output);
  console.log(`\n✅ Lightning build: ${lightningLatency}ms - ${success ? 'SUCCESS' : 'FAILED'}\n`);
  
  results.push({
    model: 'lightning',
    latencyMs: lightningLatency,
    success,
    buildOutput: output.substring(0, 500)
  });
} catch (err) {
  const lightningLatency = Date.now() - lightningStart;
  console.log(`❌ Lightning build failed after ${lightningLatency}ms\n${err.message}\n`);
  
  results.push({
    model: 'lightning',
    latencyMs: lightningLatency,
    success: false,
    error: err.message.substring(0, 500)
  });
}

console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log('📊 BUILD RESULTS\n');

results.forEach(r => {
  console.log(`${r.model.toUpperCase()}: ${r.success ? '✅ SUCCESS' : '❌ FAILED'} (${r.latencyMs}ms)\n`);
});

// Save results
const reportFile = `micronaut-build-results-${Date.now()}.json`;
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  projects: {
    copilot: '/tmp/hello-copilot',
    lightning: '/tmp/hello-lightning'
  },
  results
}, null, 2));

console.log(`✅ Results saved to: ${reportFile}\n`);

