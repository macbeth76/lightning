import { Violation } from '../types/violations';

/**
 * Formats code violations as a GitHub PR comment.
 * Groups by file, sorts by severity, adds fix suggestions.
 */
export class PRCommenter {
  private violations: Violation[];

  constructor(violations: Violation[]) {
    this.violations = violations;
  }

  /**
   * Format all violations as markdown PR comment.
   */
  formatViolations(): string {
    if (this.violations.length === 0) {
      return this.formatSuccess();
    }

    const grouped = this.groupByFile();
    const summary = this.calculateStatus();

    let comment = '⚡ Lightning Code Analysis\n';
    comment += `Analyzed ${Object.keys(grouped).length} file(s) changed in this PR\n\n`;
    comment += `📊 Summary: ${summary.errors} error(s), ${summary.warnings} warning(s)\n\n`;

    if (summary.errors > 0) {
      comment += '🔴 ERRORS (Must fix before merge)\n';
      comment += '─'.repeat(70) + '\n\n';
      comment += this.formatByFile(grouped, 'error');
      comment += '\n';
    }

    if (summary.warnings > 0) {
      comment += '🟡 WARNINGS (Recommended to fix)\n';
      comment += '─'.repeat(70) + '\n\n';
      comment += this.formatByFile(grouped, 'warning');
      comment += '\n';
    }

    comment += '─'.repeat(70) + '\n\n';
    comment += this.formatMergeStatus(summary);
    comment += '\n\n🤖 Powered by Lightning - Smaller models, faster feedback\n';

    return comment;
  }

  /**
   * Group violations by file path.
   */
  private groupByFile(): Record<string, Violation[]> {
    return this.violations.reduce(
      (acc, v) => {
        if (!acc[v.file]) {
          acc[v.file] = [];
        }
        acc[v.file].push(v);
        return acc;
      },
      {} as Record<string, Violation[]>
    );
  }

  /**
   * Format violations for a single severity level.
   */
  private formatByFile(
    grouped: Record<string, Violation[]>,
    severity: string
  ): string {
    let output = '';

    for (const file of Object.keys(grouped).sort()) {
      const fileViolations = grouped[file]
        .filter((v) => v.severity === severity)
        .sort((a, b) => (a.line || 0) - (b.line || 0));

      if (fileViolations.length === 0) continue;

      output += `**${file}**\n`;

      for (const v of fileViolations) {
        output += `\n• Line ${v.line}: ${this.formatRuleMessage(v)}\n`;
        output += `  ${this.formatSuggestion(v)}\n`;
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Format rule-specific message.
   */
  private formatRuleMessage(v: Violation): string {
    switch (v.rule) {
      case 'method-length':
        return `Method exceeds ${v.message}`;
      case 'unused-import':
        return `Unused import: ${v.message}`;
      case 'null-safety':
        return `Null safety: ${v.message}`;
      case 'magic-string':
        return `Magic string should be constant: ${v.message}`;
      case 'error-handling':
        return `Missing error handling: ${v.message}`;
      case 'todo':
        return `TODO comment: ${v.message}`;
      default:
        return v.message;
    }
  }

  /**
   * Format actionable suggestion for fix.
   */
  private formatSuggestion(v: Violation): string {
    switch (v.rule) {
      case 'method-length':
        return '💡 Split into smaller helper methods for better readability';
      case 'unused-import':
        return '💡 Remove unused import or implement if needed';
      case 'null-safety':
        return '💡 Add null check or optional chaining (?.)';
      case 'magic-string':
        return '💡 Extract to a named constant at top of file';
      case 'error-handling':
        return '💡 Wrap in try-catch or handle error case';
      case 'todo':
        return '💡 Complete TODO or create GitHub issue and link it';
      default:
        return '💡 Review and fix this violation';
    }
  }

  /**
   * Calculate summary of errors and warnings.
   */
  private calculateStatus(): { errors: number; warnings: number } {
    return {
      errors: this.violations.filter((v) => v.severity === 'error').length,
      warnings: this.violations.filter((v) => v.severity === 'warning').length,
    };
  }

  /**
   * Format merge status based on violations.
   */
  private formatMergeStatus(summary: {
    errors: number;
    warnings: number;
  }): string {
    if (summary.errors > 0) {
      return `✅ Status: **MERGE BLOCKED** - Fix ${summary.errors} error(s) to proceed`;
    }
    if (summary.warnings > 0) {
      return `⚠️ Status: **WARNINGS ONLY** - Merge allowed but please review`;
    }
    return `✅ Status: **ALL CLEAR** - No violations found`;
  }

  /**
   * Format success message when no violations.
   */
  private formatSuccess(): string {
    return (
      '⚡ Lightning Code Analysis\n\n' +
      '✅ All clear! No violations found in this PR.\n\n' +
      '🤖 Powered by Lightning - Smaller models, faster feedback'
    );
  }

  /**
   * Get merge status string for GitHub status check.
   */
  getStatus(): 'success' | 'failure' {
    const hasErrors = this.violations.some((v) => v.severity === 'error');
    return hasErrors ? 'failure' : 'success';
  }

  /**
   * Get description for GitHub status check.
   */
  getStatusDescription(): string {
    const summary = this.calculateStatus();
    if (summary.errors > 0) {
      return `Lightning found ${summary.errors} error(s) and ${summary.warnings} warning(s)`;
    }
    if (summary.warnings > 0) {
      return `Lightning found ${summary.warnings} warning(s) - review recommended`;
    }
    return 'Lightning analysis passed - all clear!';
  }

  /**
   * Update existing comment with new violations (for re-analysis).
   */
  updateComment(_commentId: string, violations: Violation[]): string {
    const updater = new PRCommenter(violations);
    let comment = updater.formatViolations();
    comment += `\n\n*Updated at ${new Date().toISOString()}*`;
    return comment;
  }
}
