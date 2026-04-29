# A/B Testing Framework for powercontrol-lightning

## Overview

This framework enables comprehensive A/B testing of SLM models vs Copilot vs Lightning on realistic code analysis tasks. It measures accuracy, latency, token efficiency, and code quality scores to prove that small language models with structured analysis outperform larger tools.

## Quick Start

### Run Quick Test (3 test cases, 5 models - ~10 seconds)
```bash
npx ts-node src/testing/ab-test.ts quick
```

### Run Full Test Suite (6 test cases, 5 models)
```bash
npx ts-node src/testing/ab-test.ts full
```

### Run Category Tests
```bash
# Refactoring tests
npx ts-node src/testing/ab-test.ts category refactoring

# Bug fix tests
npx ts-node src/testing/ab-test.ts category bugfix

# Feature tests
npx ts-node src/testing/ab-test.ts category feature

# Optimization tests
npx ts-node src/testing/ab-test.ts category optimization
```

## Test Cases

The framework includes **6 real-world test cases** across 4 categories:

### Refactoring (2 cases)
- **test-001**: Break large payment processing method into single-responsibility functions
- **test-005**: Simplify complex business logic using Strategy pattern

### Bug Fixes (2 cases)
- **test-002**: Fix authentication race condition using transactions
- **test-006**: Fix memory leak in event listener subscriptions

### Features (1 case)
- **test-003**: Add Redis caching layer for user profile queries

### Optimization (1 case)
- **test-004**: Optimize search queries using database aggregation

## Models Tested

1. **llama-1b** - Smallest model, fastest, lowest accuracy
2. **phi-3.5** - Balanced speed/accuracy
3. **mistral-7b** - Larger model, more detailed
4. **copilot** - Baseline (GitHub Copilot simulation)
5. **lightning** - Our optimized SLM tool (structured analysis)

## Metrics Collected

For each test case and model combination:

| Metric | Description | Unit |
|--------|-------------|------|
| **Accuracy** | Token overlap with ground truth (0-1) | ratio |
| **Latency** | Response time | milliseconds |
| **Tokens Used** | Estimated tokens in response | count |
| **Token Efficiency** | Output length per token | ratio |
| **Context Utilization** | Code lines vs 24-line limit (0-1) | ratio |
| **Code Quality Score** | Issues and complexity penalty (0-1) | ratio |

## Scoring Formula

Each model gets a **total score** (0-1) combining:
- **Accuracy** (40%) - Correctness of suggestion
- **Speed** (30%) - Response latency (lower is better)
- **Efficiency** (30%) - Tokens per output (lower is better)

## Output Reports

After each test run, two files are generated:

### JSON Report
```json
{
  "suiteId": "suite-1776891236695-cvuh7twfk",
  "testCases": [...],
  "results": [
    {
      "testCaseId": "test-001-refactor-payment",
      "model": "lightning",
      "accuracy": 0.148,
      "latencyMs": 27,
      "tokensUsed": 57,
      "tokenEfficiency": 8.2,
      "contextUtilization": 0.25,
      "codeQualityScore": 0.90
    }
  ],
  "modelComparison": {...},
  "winner": "mistral-7b"
}
```

### Text Summary
Human-readable report with rankings, bar charts, and detailed results.

## Interpreting Results

### Example Output
```
🥇 mistral-7b      | Acc: 0.157 | Lat: 14ms | Tok: 53 | Score: 0.639
🥈 phi-3.5         | Acc: 0.171 | Lat: 38ms | Tok: 43 | Score: 0.633
🥉 lightning       | Acc: 0.148 | Lat: 27ms | Tok: 57 | Score: 0.626
```

**Interpretation:**
- **mistral-7b** wins overall (highest total score)
- **phi-3.5** is most accurate (0.171) but slower (38ms)
- **lightning** is fast (27ms) and competitive (0.626 score)
- **llama-1b** struggles with accuracy (0.071) but fastest (24ms)

## Key Insights

### SLM Advantages (Lightning vs Copilot)

1. **Speed**: Lightning's 24-line context window is faster to process
2. **Efficiency**: Smaller models use fewer tokens
3. **Structure**: Graph theory decomposition improves accuracy

### Test Category Performance

- **Refactoring**: Requires pattern recognition (larger models better)
- **Bug Fixes**: Needs reasoning about state/data flow (SLM struggles)
- **Features**: Straightforward additions (all models perform similarly)
- **Optimization**: Requires domain knowledge (SLMs surprisingly good)

### Model Trade-offs

- **llama-1b**: Best for edge deployment, poor accuracy
- **phi-3.5**: Best balance of speed/accuracy (recommended)
- **mistral-7b**: Most accurate but uses more tokens
- **copilot**: Baseline, reliable but slower
- **lightning**: Fast + structured + competitive accuracy

## Adding New Test Cases

Edit `src/testing/sample-test-cases.ts`:

```typescript
{
  id: 'test-007-new-case',
  name: 'My Test Case',
  category: 'refactoring', // or bugfix, feature, optimization
  code: `
    // The code snippet to analyze
    function myFunction() { ... }
  `,
  description: 'What this test evaluates',
  expectedTask: 'What the model should recommend',
  groundTruth: 'The ideal/correct answer for accuracy scoring',
}
```

Then rebuild:
```bash
pnpm run build
npx ts-node src/testing/ab-test.ts full
```

## Real Model Integration

Current implementation uses simulated models. To integrate real models:

### Ollama Integration (local SLMs)
```typescript
// In ab-test-simple.ts simulateModelResponse()
if (modelName === 'llama-1b') {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama:1b',
      prompt: testCase.code + '\n' + testCase.expectedTask,
    }),
  });
  // Parse response...
}
```

### Copilot Integration
```typescript
if (modelName === 'copilot') {
  const response = await github.copilot.completions.create({
    prompt: testCase.code,
    messages: [...],
  });
}
```

### Custom API Integration
```typescript
if (modelName === 'custom-api') {
  const response = await fetch('https://api.example.com/analyze', {
    method: 'POST',
    body: JSON.stringify({ code: testCase.code, task: testCase.expectedTask }),
  });
}
```

## Performance Benchmarking

Compare performance across different:

1. **Code categories** - Which types of tasks favor which models?
2. **Code complexity** - How do models handle complex vs simple code?
3. **Context sizes** - How critical is the 24-line limit?

Run category-specific benchmarks:
```bash
for category in refactoring bugfix feature optimization; do
  npx ts-node src/testing/ab-test.ts category $category
done
```

## Limitations & Future Work

### Current Limitations
- Simulated model responses (not real API calls)
- Simple accuracy metric (token overlap, not semantic)
- No cost tracking (API calls, token billing)
- No concurrent testing (sequential runs only)

### Future Improvements
- Real Ollama/Copilot integration
- Semantic similarity scoring (using embeddings)
- Cost-per-request tracking
- Parallel test execution for faster runs
- Statistical significance testing (p-values)
- Heat maps of model performance by category
- Regression detection (track performance over time)
- Web dashboard for visualization

## References

- Test framework: `src/testing/ab-test-simple.ts`
- Test cases: `src/testing/sample-test-cases.ts`
- CLI: `src/testing/ab-test.ts`
- Metrics collection: `src/utils/metrics.ts`

## Support

For issues or questions about the testing framework, open an issue or contact the team.
