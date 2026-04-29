/**
 * CLI entry point for benchmark runner.
 * Usage: pnpm run benchmark
 */

import { runBenchmark } from './benchmark-runner';

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});
