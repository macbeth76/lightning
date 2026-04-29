/**
 * Normalized violation model from ESLint and TypeScript analysis
 */

export interface Violation {
  id: string;
  type: 'method-length' | 'type-error' | 'lint' | 'unused-variable' | 'other' | 'unused-import' | 'null-safety' | 'magic-string' | 'error-handling' | 'todo';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column: number;
  message: string;
  rule?: string;
  fix?: {
    range: [number, number];
    text: string;
  };
}

export interface ViolationReport {
  timestamp: string;
  file: string;
  violations: Violation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface MethodMetrics {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  complexity: number;
  violations: Violation[];
}
