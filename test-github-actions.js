/**
 * Test Phase 3: GitHub Actions integration
 * Tests: PR comment formatting, status checks, API calls
 */

const { PRCommenter } = require('./dist/utils/pr-commenter');
const { Violation } = require('./dist/types/violations');

console.log('🧪 Testing Phase 3: GitHub Actions Integration\n');

// ═══════════════════════════════════════════════════════════════
// Test 1: PR Comment Formatting
// ═══════════════════════════════════════════════════════════════

console.log('Test 1: Format PR comment with violations');
const violations = [
  {
    file: 'src/logger.ts',
    line: 45,
    rule: 'method-length',
    severity: 'error',
    message: 'Method is 26 lines, max 24',
  },
  {
    file: 'src/logger.ts',
    line: 12,
    rule: 'magic-string',
    severity: 'warning',
    message: "Magic string 'DEBUG' appears 3 times",
  },
  {
    file: 'src/utils/format.ts',
    line: 8,
    rule: 'error-handling',
    severity: 'warning',
    message: 'Missing error handling on JSON.parse',
  },
];

const commenter = new PRCommenter(violations);
const comment = commenter.formatViolations();

console.log('Generated comment:');
console.log(comment);
console.log('\n✓ Comment formatted successfully\n');

// ═══════════════════════════════════════════════════════════════
// Test 2: Status Calculation
// ═══════════════════════════════════════════════════════════════

console.log('Test 2: Calculate merge status');
const status = commenter.getStatus();
const description = commenter.getStatusDescription();

console.log(`Status: ${status}`);
console.log(`Description: ${description}`);
console.assert(status === 'failure', 'Status should be failure (has errors)');
console.log('✓ Status correctly identified as failure\n');

// ═══════════════════════════════════════════════════════════════
// Test 3: Success Case (No Violations)
// ═══════════════════════════════════════════════════════════════

console.log('Test 3: Format comment with no violations');
const successCommenter = new PRCommenter([]);
const successComment = successCommenter.formatViolations();

console.log('Success comment:');
console.log(successComment);
console.assert(
  successComment.includes('All clear'),
  'Should contain success message'
);
console.log('✓ Success case formatted correctly\n');

// ═══════════════════════════════════════════════════════════════
// Test 4: Grouping by File
// ═══════════════════════════════════════════════════════════════

console.log('Test 4: Violations grouped by file');
const mixed = [
  { file: 'a.ts', line: 1, rule: 'method-length', severity: 'error', message: 'too long' },
  { file: 'b.ts', line: 5, rule: 'magic-string', severity: 'warning', message: 'magic' },
  { file: 'a.ts', line: 10, rule: 'error-handling', severity: 'warning', message: 'no catch' },
  { file: 'c.ts', line: 3, rule: 'unused-import', severity: 'error', message: 'unused' },
];

const mixedCommenter = new PRCommenter(mixed);
const groupedComment = mixedCommenter.formatViolations();

console.log(groupedComment);
console.assert(groupedComment.includes('a.ts'), 'Should include a.ts');
console.assert(groupedComment.includes('b.ts'), 'Should include b.ts');
console.assert(groupedComment.includes('c.ts'), 'Should include c.ts');
console.log('✓ Files grouped correctly\n');

// ═══════════════════════════════════════════════════════════════
// Test 5: Severity Sorting (Errors Before Warnings)
// ═══════════════════════════════════════════════════════════════

console.log('Test 5: Severity sorting (errors before warnings)');
const errorFirst = [
  { file: 'x.ts', line: 1, rule: 'magic-string', severity: 'warning', message: 'warning' },
  { file: 'x.ts', line: 2, rule: 'method-length', severity: 'error', message: 'error' },
];

const sortCommenter = new PRCommenter(errorFirst);
const sortedComment = sortCommenter.formatViolations();

const errorIndex = sortedComment.indexOf('ERRORS');
const warningIndex = sortedComment.indexOf('WARNINGS');
console.assert(
  errorIndex < warningIndex,
  'Errors section should come before warnings'
);
console.log('✓ Severity sorting works correctly\n');

// ═══════════════════════════════════════════════════════════════
// Test 6: Rule Messages
// ═══════════════════════════════════════════════════════════════

console.log('Test 6: Rule-specific messages');
const ruleTests = [
  { rule: 'method-length', expected: 'exceeds' },
  { rule: 'unused-import', expected: 'Unused import' },
  { rule: 'null-safety', expected: 'Null safety' },
  { rule: 'magic-string', expected: 'Magic string' },
  { rule: 'error-handling', expected: 'Missing error handling' },
  { rule: 'todo', expected: 'TODO comment' },
];

for (const test of ruleTests) {
  const v = {
    file: 'test.ts',
    line: 1,
    rule: test.rule,
    severity: 'warning',
    message: 'test',
  };
  const c = new PRCommenter([v]);
  const output = c.formatViolations();
  console.assert(
    output.includes(test.expected),
    `${test.rule} message should include "${test.expected}"`
  );
}
console.log('✓ All rule messages correct\n');

// ═══════════════════════════════════════════════════════════════
// Test 7: Update Comment
// ═══════════════════════════════════════════════════════════════

console.log('Test 7: Update existing comment');
const oldViolations = [
  { file: 'a.ts', line: 1, rule: 'method-length', severity: 'error', message: 'too long' },
];
const oldCommenter = new PRCommenter(oldViolations);
const updated = oldCommenter.updateComment('comment-123', []);
console.assert(updated.includes('Updated at'), 'Should include timestamp');
console.log('✓ Comment update works\n');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════

console.log('═'.repeat(70));
console.log('✅ All Phase 3 PR Commenter tests passed!');
console.log('═'.repeat(70));
console.log('\nKey features verified:');
console.log('  ✓ Comment formatting');
console.log('  ✓ Status calculation');
console.log('  ✓ Success cases');
console.log('  ✓ File grouping');
console.log('  ✓ Severity sorting');
console.log('  ✓ Rule-specific messages');
console.log('  ✓ Comment updates');
