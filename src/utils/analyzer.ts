/**
 * Static analysis engine — method length enforcement via TypeScript compiler API.
 */

import * as fs from 'fs';
import * as path from 'path';
import { InvalidCodeError } from '../types/errors';
import { Violation, ViolationReport, MethodMetrics } from '../types/violations';
import { extractMethodMetrics } from './ast-analyzer';

/**
 * Analyze a single TypeScript file for violations
 */
export class StaticAnalyzer {
  /**
   * Parse TypeScript source code and identify methods with line counts.
   * Uses the TypeScript compiler API for accurate structural analysis —
   * no false positives on control-flow keywords (if/for/while etc.).
   */
  static analyzeMethodLengths(filePath: string): MethodMetrics[] {
    try {
      return extractMethodMetrics(filePath);
    } catch (err) {
      throw new InvalidCodeError(
        `Failed to analyze file ${filePath}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Validate method lengths against max limit
   */
  static validateMethodLengths(
    methods: MethodMetrics[],
    maxLength: number = 24
  ): Violation[] {
    const violations: Violation[] = [];

    methods.forEach((method, index) => {
      if (method.lineCount > maxLength) {
        violations.push({
          id: `method-length-${index}`,
          type: 'method-length',
          severity: 'error',
          file: method.file,
          line: method.startLine,
          column: 0,
          message: `Method '${method.name}' is ${method.lineCount} lines, exceeds max of ${maxLength}`,
          rule: 'max-method-length',
        });
      }
    });

    return violations;
  }

  /**
   * Generate violation report
   */
  static generateReport(
    file: string,
    violations: Violation[]
  ): ViolationReport {
    const summary = {
      total: violations.length,
      errors: violations.filter((v) => v.severity === 'error').length,
      warnings: violations.filter((v) => v.severity === 'warning').length,
      infos: violations.filter((v) => v.severity === 'info').length,
    };

    return {
      timestamp: new Date().toISOString(),
      file,
      violations,
      summary,
    };
  }

  /**
   * Analyze a TypeScript file end-to-end
   */
  static analyzeFile(filePath: string, maxMethodLength: number = 24): ViolationReport {
    if (!fs.existsSync(filePath)) {
      throw new InvalidCodeError(`File not found: ${filePath}`);
    }

    const methods = this.analyzeMethodLengths(filePath);
    const violations = this.validateMethodLengths(methods, maxMethodLength);
    return this.generateReport(filePath, violations);
  }

  /**
   * Analyze all TypeScript files in a directory
   */
  static analyzeDirectory(
    dirPath: string,
    maxMethodLength: number = 24
  ): ViolationReport[] {
    if (!fs.existsSync(dirPath)) {
      throw new InvalidCodeError(`Directory not found: ${dirPath}`);
    }

    const reports: ViolationReport[] = [];

    const walkDir = (dir: string): void => {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.startsWith('node_modules')) {
          walkDir(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
          try {
            const report = this.analyzeFile(fullPath, maxMethodLength);
            if (report.violations.length > 0) {
              reports.push(report);
            }
          } catch (err) {
            console.warn(`Skipping file ${fullPath}: ${(err as Error).message}`);
          }
        }
      });
    };

    walkDir(dirPath);
    return reports;
  }
}
