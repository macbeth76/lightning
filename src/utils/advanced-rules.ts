/**
 * Advanced detection rules beyond method length
 */

import * as fs from 'fs';
import { Violation } from '../types/violations';

export class AdvancedRules {
  /**
   * Detect unused imports in TypeScript files
   */
  static detectUnusedImports(filePath: string): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Match import statements
      const importPattern = /^\s*import\s+(?:{([^}]+)}|(\w+))/;
      const imports: Map<string, number> = new Map();

      lines.forEach((line, index) => {
        const match = line.match(importPattern);
        if (match) {
          const names = match[1] ? match[1].split(',').map(n => n.trim()) : [match[2]];
          names.forEach(name => {
            if (name) imports.set(name, index + 1);
          });
        }
      });

      // Check which imports are used
      for (const [name, importLine] of imports) {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        let usageCount = 0;

        lines.forEach((line, index) => {
          if (index + 1 !== importLine) {
            usageCount += (line.match(regex) || []).length;
          }
        });

        if (usageCount === 0) {
          violations.push({
            id: `unused-import-${importLine}`,
            type: 'unused-import',
            severity: 'warning',
            file: filePath,
            line: importLine,
            column: 1,
            message: `Unused import: ${name}`,
            rule: 'unused-imports'
          });
        }
      }

      return violations.slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect missing null checks
   */
  static detectMissingNullChecks(filePath: string): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Look for property access without optional chaining or null checks
      const unsafeAccessPattern = /\b(\w+)\.(\w+)\b(?!\s*\?\.)/g;

      lines.forEach((line, index) => {
        let match;
        while ((match = unsafeAccessPattern.exec(line)) !== null) {
          // Skip if it's in a comment or string
          if (!line.includes('//') || line.indexOf(match[0]) < line.indexOf('//')) {
            violations.push({
              id: `null-safety-${index}-${match.index}`,
              type: 'null-safety',
              severity: 'warning',
              file: filePath,
              line: index + 1,
              column: match.index + 1,
              message: `Potential null reference: ${match[1]}.${match[2]} - consider using optional chaining ?.`,
              rule: 'null-safety'
            });
          }
        }
      });

      return violations.slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect magic strings (hardcoded values)
   */
  static detectMagicStrings(filePath: string): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Match quoted strings
      const stringPattern = /['"`]([^'"`]{3,})['"` ]/g;
      const stringMap: Map<string, number[]> = new Map();

      lines.forEach((line, index) => {
        let match;
        while ((match = stringPattern.exec(line)) !== null) {
          const str = match[1];
          if (!stringMap.has(str)) {
            stringMap.set(str, []);
          }
          stringMap.get(str)!.push(index + 1);
        }
      });

      // Find strings that appear multiple times
      for (const [str, lineNumbers] of stringMap) {
        if (lineNumbers.length >= 2 && str.length > 5) {
          violations.push({
            id: `magic-string-${str.substring(0, 10)}`,
            type: 'magic-string',
            severity: 'info',
            file: filePath,
            line: lineNumbers[0],
            column: 1,
            message: `Magic string "${str}" appears ${lineNumbers.length} times - consider extracting to constant`,
            rule: 'magic-strings'
          });
        }
      }

      return violations.slice(0, 3);
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect missing error handling (API calls without try-catch)
   */
  static detectMissingErrorHandling(filePath: string): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Match API calls: fetch, http.*, db.*
      const apiCallPattern = /(fetch|http\.\w+|db\.\w+|client\.\w+)\s*\(/g;

      lines.forEach((line, index) => {
        const hasApiCall = apiCallPattern.test(line);
        const hasTryCatch = line.includes('try') || (index > 0 && lines[index - 1].includes('try'));

        if (hasApiCall && !hasTryCatch) {
          violations.push({
            id: `error-handling-${index}`,
            type: 'error-handling',
            severity: 'warning',
            file: filePath,
            line: index + 1,
            column: 1,
            message: `API call without error handling - wrap in try-catch`,
            rule: 'error-handling'
          });
        }
      });

      return violations.slice(0, 3);
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect TODO/FIXME comments
   */
  static detectTODOComments(filePath: string): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const todoPattern = /(TODO|FIXME|HACK|XXX)\s*:\s*(.+)/i;

      lines.forEach((line, index) => {
        const match = line.match(todoPattern);
        if (match) {
          violations.push({
            id: `todo-${index}`,
            type: 'todo',
            severity: 'info',
            file: filePath,
            line: index + 1,
            column: 1,
            message: `${match[1]}: ${match[2]}`,
            rule: 'todos'
          });
        }
      });

      return violations.slice(0, 5);
    } catch (error) {
      return [];
    }
  }
}
