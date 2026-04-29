#!/usr/bin/env node
/**
 * Project Generation A/B Test
 * Both Lightning and Copilot create a Java Micronaut Hello World Gradle project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n🎯 PROJECT GENERATION A/B TEST\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-test-'));
console.log(`📁 Test directory: ${tempDir}\n`);

const results = [];

// Test 1: Copilot generates project
console.log('🔄 Test 1: Copilot generates Java Micronaut Hello World\n');

const copilotPrompt = `Create a complete Java Micronaut Hello World project with Gradle.

Requirements:
- Use Gradle build system
- Create a simple HelloController that returns "Hello, World!" on GET /hello
- Include all necessary files: build.gradle, settings.gradle, micronaut-cli.properties
- Use Micronaut 4.0+
- Use Java 17+
- Generate the complete project structure

Return the complete project files content.`;

const copilotStart = Date.now();

try {
  console.log('Calling Copilot to generate project structure...\n');
  
  const copilotResponse = execSync(
    `gh copilot -p ${JSON.stringify(copilotPrompt)}`,
    {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024
    }
  );
  
  const copilotLatency = Date.now() - copilotStart;
  
  // Parse response to extract files
  const hasGradleFile = copilotResponse.includes('build.gradle') || copilotResponse.includes('gradle');
  const hasController = copilotResponse.includes('HelloController') || copilotResponse.includes('@Controller');
  const hasGradle = copilotResponse.includes('dependencies');
  
  console.log('✅ Copilot Response Received\n');
  console.log(`   Latency: ${copilotLatency}ms`);
  console.log(`   Response size: ${copilotResponse.length} chars`);
  console.log(`   Has gradle files: ${hasGradleFile}`);
  console.log(`   Has controller: ${hasController}`);
  console.log(`   Has dependencies: ${hasGradle}\n`);
  
  // Save Copilot response
  fs.writeFileSync(
    path.join(tempDir, 'copilot-response.txt'),
    copilotResponse
  );
  
  results.push({
    model: 'copilot',
    test: 'project-generation',
    latencyMs: copilotLatency,
    responseSize: copilotResponse.length,
    hasGradleFile,
    hasController,
    hasGradle,
    success: true
  });
} catch (err) {
  const copilotLatency = Date.now() - copilotStart;
  console.log(`❌ Copilot error after ${copilotLatency}ms: ${err.message}\n`);
  
  results.push({
    model: 'copilot',
    test: 'project-generation',
    latencyMs: copilotLatency,
    success: false,
    error: err.message
  });
}

console.log('───────────────────────────────────────────────────────────────────────\n');

// Test 2: Lightning generates project (simulate via prompt)
console.log('🚀 Test 2: Lightning generates Java Micronaut Hello World\n');

const lightningPrompt = `Generate minimal Java Micronaut Hello World project:
- build.gradle
- settings.gradle  
- src/main/java/hello/HelloController.java
- micronaut-cli.properties

Keep each file under 50 lines. Use Micronaut annotations.`;

const lightningStart = Date.now();

try {
  console.log('Calling Lightning (via Copilot for this test)...\n');
  
  // For now, use Copilot as Lightning too (to isolate both tools)
  const lightningResponse = execSync(
    `gh copilot -p ${JSON.stringify(lightningPrompt)}`,
    {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024
    }
  );
  
  const lightningLatency = Date.now() - lightningStart;
  
  const hasGradleFile = lightningResponse.includes('build.gradle') || lightningResponse.includes('gradle');
  const hasController = lightningResponse.includes('HelloController') || lightningResponse.includes('@Controller');
  const hasGradle = lightningResponse.includes('dependencies');
  
  console.log('✅ Lightning Response Received\n');
  console.log(`   Latency: ${lightningLatency}ms`);
  console.log(`   Response size: ${lightningResponse.length} chars`);
  console.log(`   Has gradle files: ${hasGradleFile}`);
  console.log(`   Has controller: ${hasController}`);
  console.log(`   Has dependencies: ${hasGradle}\n`);
  
  fs.writeFileSync(
    path.join(tempDir, 'lightning-response.txt'),
    lightningResponse
  );
  
  results.push({
    model: 'lightning',
    test: 'project-generation',
    latencyMs: lightningLatency,
    responseSize: lightningResponse.length,
    hasGradleFile,
    hasController,
    hasGradle,
    success: true
  });
} catch (err) {
  const lightningLatency = Date.now() - lightningStart;
  console.log(`❌ Lightning error after ${lightningLatency}ms: ${err.message}\n`);
  
  results.push({
    model: 'lightning',
    test: 'project-generation',
    latencyMs: lightningLatency,
    success: false,
    error: err.message
  });
}

console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log('📊 PROJECT GENERATION RESULTS\n');

const successfulResults = results.filter(r => r.success);

if (successfulResults.length >= 2) {
  const copilotResult = results.find(r => r.model === 'copilot');
  const lightningResult = results.find(r => r.model === 'lightning');
  
  console.log('Comparison:');
  console.log(`┌─────────┬──────────┬──────────────┬────────────────┐`);
  console.log(`│ Model   │ Latency  │ Size         │ Completeness   │`);
  console.log(`├─────────┼──────────┼──────────────┼────────────────┤`);
  
  if (copilotResult) {
    const quality = (copilotResult.hasGradleFile && copilotResult.hasController && copilotResult.hasGradle) 
      ? '✅ Full' 
      : '⚠️  Partial';
    console.log(`│ Copilot │ ${String(copilotResult.latencyMs + 'ms').padEnd(8)}│ ${String(copilotResult.responseSize + 'b').padEnd(12)}│ ${quality.padEnd(14)}│`);
  }
  
  if (lightningResult) {
    const quality = (lightningResult.hasGradleFile && lightningResult.hasController && lightningResult.hasGradle)
      ? '✅ Full'
      : '⚠️  Partial';
    console.log(`│ Lightning │ ${String(lightningResult.latencyMs + 'ms').padEnd(6)}│ ${String(lightningResult.responseSize + 'b').padEnd(12)}│ ${quality.padEnd(14)}│`);
  }
  
  console.log(`└─────────┴──────────┴──────────────┴────────────────┘`);
} else {
  console.log('⚠️  Not enough successful results for comparison\n');
}

// Save results
const reportFile = `test-project-generation-${Date.now()}.json`;
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  tempDir,
  results,
  files: {
    copilotResponse: path.join(tempDir, 'copilot-response.txt'),
    lightningResponse: path.join(tempDir, 'lightning-response.txt')
  }
}, null, 2));

console.log(`\n✅ Results saved to: ${reportFile}`);
console.log(`📁 Responses saved to: ${tempDir}\n`);

