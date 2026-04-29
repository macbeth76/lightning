#!/usr/bin/env node

/**
 * Test hooks setup functionality
 */

const { HooksSetup } = require('./dist/utils/hooks-setup');

async function test() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           Testing Lightning Hooks Setup                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const hooksSetup = new HooksSetup();

    // Show status before
    console.log('📋 Current status (before setup):\n');
    await hooksSetup.status();

    console.log('\n🔧 Note: To actually install hooks, run:');
    console.log('   lightning --setup hooks\n');
    console.log('   Or from repo: node dist/cli.js --setup hooks\n');

  } catch (error) {
    if (error.message.includes('Not a git repository')) {
      console.log('⚠️  Not in a git repository (expected if testing)');
      console.log('To test hooks setup:\n');
      console.log('  1. cd to a git repo');
      console.log('  2. Run: lightning --setup hooks');
      console.log('  3. Run: git status  # View the .git/hooks directory\n');
    } else {
      console.error('Error:', error.message);
    }
  }
}

test().catch(console.error);
