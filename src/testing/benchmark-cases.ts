/**
 * Benchmark test cases — 30 deterministic cases across 4 categories.
 * Static-analysis: exact violation count expected (deterministic).
 * Constrained-gen: compile + zero-violation gate.
 * Refactor: violations === 0 AND compiles after refactor.
 * Classification: keyword-based (unavoidable for NL output).
 */

export type BenchmarkCategory =
  | 'static-analysis'
  | 'constrained-gen'
  | 'refactor'
  | 'project-classification';

export interface BenchmarkCase {
  id: string;
  category: BenchmarkCategory;
  prompt: string;
  /** Inline TypeScript source for analysis/refactor cases */
  code?: string;
  /** Keywords required in correct output (gen/classification) */
  groundTruth: string[];
  /** Expected exact violation count — enables deterministic scoring */
  expectedViolationCount?: number;
  /** Generated code must compile with tsc */
  mustCompile?: boolean;
  /** Generated code must have zero 24-line violations */
  mustHaveZeroViolations?: boolean;
  /** Number of repeat runs for generative cases (averages results) */
  runs?: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a function body of exactly N lines (signature + body + closing brace) */
function makeFunction(name: string, bodyLines: number): string {
  const body = Array.from({ length: bodyLines - 2 }, (_, i) => `  const v${i} = ${i};`);
  return [`function ${name}(): void {`, ...body, '}'].join('\n');
}

/** Build a class with one method of exactly N lines */
function makeClassMethod(name: string, methodLines: number): string {
  const body = Array.from({ length: methodLines - 2 }, (_, i) => `    const x${i} = ${i};`);
  return [`class Svc {\n  ${name}(): void {`, ...body, '  }\n}'].join('\n');
}

// ── static-analysis (10 cases) ───────────────────────────────────────────────

export const ANALYSIS_CASES: BenchmarkCase[] = [
  {
    id: 'sa-001',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: makeFunction('tooLong', 26),
    groundTruth: [],
    expectedViolationCount: 1,
  },
  {
    id: 'sa-002',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: makeFunction('clean', 5),
    groundTruth: [],
    expectedViolationCount: 0,
  },
  {
    id: 'sa-003',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: [makeFunction('ok', 10), makeFunction('bad', 30)].join('\n\n'),
    groundTruth: [],
    expectedViolationCount: 1,
  },
  {
    id: 'sa-004',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: makeClassMethod('process', 28),
    groundTruth: [],
    expectedViolationCount: 1,
  },
  {
    id: 'sa-005',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: (() => {
      const body = Array.from({ length: 23 }, (_, i) => `  const a${i} = ${i};`);
      return [`const fn = (): void => {`, ...body, '};'].join('\n');
    })(),
    groundTruth: [],
    expectedViolationCount: 1,  // 25-line arrow function
  },
  {
    id: 'sa-006',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: (() => {
      const body = Array.from({ length: 24 }, (_, i) => `    const b${i} = ${i};`);
      return [`class A {\n  constructor() {`, ...body, '  }\n}'].join('\n');
    })(),
    groundTruth: [],
    expectedViolationCount: 1,  // 26-line constructor
  },
  {
    id: 'sa-007',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: [
      makeFunction('a', 26),
      makeFunction('b', 30),
      makeFunction('c', 25),
    ].join('\n\n'),
    groundTruth: [],
    expectedViolationCount: 3,
  },
  {
    id: 'sa-008',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: makeFunction('exactly24', 24),
    groundTruth: [],
    expectedViolationCount: 0,  // boundary: exactly 24 = pass
  },
  {
    id: 'sa-009',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: makeFunction('justOver', 25),
    groundTruth: [],
    expectedViolationCount: 1,  // 25 = one over boundary
  },
  {
    id: 'sa-010',
    category: 'static-analysis',
    prompt: 'Count 24-line violations in this TypeScript code. Respond with only JSON: {"violationCount": N}',
    code: [makeFunction('p', 5), makeFunction('q', 10), makeFunction('r', 3)].join('\n\n'),
    groundTruth: [],
    expectedViolationCount: 0,
  },
];

// ── constrained-gen (10 cases) ───────────────────────────────────────────────

export const GENERATION_CASES: BenchmarkCase[] = [
  {
    id: 'cg-001', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript UserService class with findAll() and findById(id: string) methods.',
    groundTruth: ['UserService', 'findAll', 'findById'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-002', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript Lambda handler that validates an email and returns statusCode 200 or 400.',
    groundTruth: ['handler', 'email', 'statusCode'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-003', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript ProductController class with getAll(), getById(id: string), and create(data: unknown) methods.',
    groundTruth: ['ProductController', 'getAll', 'getById', 'create'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-004', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript Express middleware function that logs request method and URL.',
    groundTruth: ['middleware', 'req', 'res', 'next'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-005', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript Order interface and OrderRepository class with save(order: Order) and findById(id: string) methods.',
    groundTruth: ['Order', 'OrderRepository', 'save', 'findById'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-006', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript utility module with truncate(str: string, max: number) and slugify(str: string) functions.',
    groundTruth: ['truncate', 'slugify', 'string'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-007', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript AuthService class with login(email: string, password: string) and logout(token: string) methods.',
    groundTruth: ['AuthService', 'login', 'logout'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-008', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript error handler Express middleware that returns JSON with status and message.',
    groundTruth: ['error', 'status', 'message', 'json'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-009', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript healthCheck function that returns { status: "ok", uptime: number }.',
    groundTruth: ['healthCheck', 'status', 'uptime'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'cg-010', category: 'constrained-gen', runs: 3,
    prompt: 'Generate a TypeScript enum Direction with NORTH, SOUTH, EAST, WEST and a move(dir: Direction) function.',
    groundTruth: ['Direction', 'NORTH', 'SOUTH', 'move'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
];

// ── refactor (5 cases) ───────────────────────────────────────────────────────

export const REFACTOR_CASES: BenchmarkCase[] = [
  {
    id: 'rf-001', category: 'refactor', runs: 2,
    prompt: 'Refactor this TypeScript so no function exceeds 24 lines. All original exports must remain. Return only TypeScript code.',
    code: makeFunction('process', 35),
    groundTruth: ['function', 'process'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'rf-002', category: 'refactor', runs: 2,
    prompt: 'Refactor this TypeScript so no function exceeds 24 lines. All original exports must remain. Return only TypeScript code.',
    code: makeClassMethod('execute', 30),
    groundTruth: ['class', 'execute'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'rf-003', category: 'refactor', runs: 2,
    prompt: 'Refactor this TypeScript so no function exceeds 24 lines. All original exports must remain. Return only TypeScript code.',
    code: [makeFunction('a', 28), makeFunction('b', 26)].join('\n\n'),
    groundTruth: ['function', 'a', 'b'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'rf-004', category: 'refactor', runs: 2,
    prompt: 'Refactor this TypeScript so no function exceeds 24 lines. All original exports must remain. Return only TypeScript code.',
    code: makeFunction('validate', 40),
    groundTruth: ['function', 'validate'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
  {
    id: 'rf-005', category: 'refactor', runs: 2,
    prompt: 'Refactor this TypeScript so no function exceeds 24 lines. All original exports must remain. Return only TypeScript code.',
    code: makeClassMethod('transform', 32),
    groundTruth: ['class', 'transform'],
    mustCompile: true, mustHaveZeroViolations: true,
  },
];

// ── project-classification (5 cases) ─────────────────────────────────────────

export const CLASSIFICATION_CASES: BenchmarkCase[] = [
  {
    id: 'pc-001', category: 'project-classification',
    prompt: 'What architecture pattern does this TypeScript project use?',
    code: 'test-projects/lambda_crud',
    groundTruth: ['lambda', 'serverless', 'handler'],
  },
  {
    id: 'pc-002', category: 'project-classification',
    prompt: 'What architecture pattern does this TypeScript project use?',
    code: 'test-projects/express_api',
    groundTruth: ['express', 'api', 'rest'],
  },
  {
    id: 'pc-003', category: 'project-classification',
    prompt: 'What architecture pattern does this TypeScript project use?',
    code: 'src',
    groundTruth: ['cli', 'tool', 'utility', 'analysis'],
  },
  {
    id: 'pc-004', category: 'project-classification',
    prompt: 'What type of files does this project primarily contain?',
    code: 'src/utils',
    groundTruth: ['utility', 'helper', 'module', 'function'],
  },
  {
    id: 'pc-005', category: 'project-classification',
    prompt: 'What architecture pattern does this TypeScript project use?',
    code: 'src/testing',
    groundTruth: ['test', 'benchmark', 'eval', 'analysis'],
  },
];

export const ALL_CASES: BenchmarkCase[] = [
  ...ANALYSIS_CASES,
  ...GENERATION_CASES,
  ...REFACTOR_CASES,
  ...CLASSIFICATION_CASES,
];
