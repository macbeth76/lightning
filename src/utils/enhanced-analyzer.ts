/**
 * Enhanced Lightning Analyzer
 * Combines: Static analysis + Advanced rules + Ollama suggestions + SQLite tracking
 */

import { StaticAnalyzer } from './analyzer';
import { AdvancedRules } from './advanced-rules';
import { OllamaClient, OllamaResponse } from './ollama-client';
import { MetricsDB } from './metrics-db';
import * as fs from 'fs';

export interface EnhancedAnalysisResult {
  violations: any[];
  suggestions: Map<string, OllamaResponse>;
  metrics: {
    totalViolations: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    avgSeverity: number;
  };
  latencyMs: number;
  improvementVsPrevious: number;
}

export class EnhancedAnalyzer {
  private ollama: OllamaClient;
  private metricsDB: MetricsDB;
  private projectId: string;

  constructor(projectId: string, ollamaHost?: string) {
    this.projectId = projectId;
    this.ollama = new OllamaClient(ollamaHost);
    this.metricsDB = new MetricsDB(`./metrics-${projectId}.db`);
  }

  /**
   * Comprehensive analysis of a file
   */
  async analyzeFile(filePath: string, generateSuggestions: boolean = false): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    const allViolations: any[] = [];

    try {
      // 1. Static analysis (method length)
      const staticViolations = StaticAnalyzer.analyzeFile(filePath).violations;
      allViolations.push(...staticViolations);

      // 2. Advanced rules
      allViolations.push(...AdvancedRules.detectUnusedImports(filePath));
      allViolations.push(...AdvancedRules.detectMissingNullChecks(filePath));
      allViolations.push(...AdvancedRules.detectMagicStrings(filePath));
      allViolations.push(...AdvancedRules.detectMissingErrorHandling(filePath));
      allViolations.push(...AdvancedRules.detectTODOComments(filePath));

      // 3. Get Ollama suggestions for critical violations
      const suggestions = new Map<string, OllamaResponse>();

      if (generateSuggestions && allViolations.length > 0) {
        const isOllamaAvailable = await this.ollama.checkAvailability();

        if (isOllamaAvailable) {
          const criticalViolations = allViolations
            .filter(v => v.severity === 'error')
            .slice(0, 3); // Top 3 errors

          for (const violation of criticalViolations) {
            const code = fs.readFileSync(filePath, 'utf-8').split('\n')[violation.line - 1] || '';
            const suggestion = await this.ollama.getSuggestion({
              codeSnippet: code,
              violation: violation.message,
              language: 'TypeScript'
            });

            suggestions.set(violation.id, suggestion);
          }
        }
      }

      // 4. Calculate metrics
      const metrics = {
        totalViolations: allViolations.length,
        errorCount: allViolations.filter(v => v.severity === 'error').length,
        warningCount: allViolations.filter(v => v.severity === 'warning').length,
        infoCount: allViolations.filter(v => v.severity === 'info').length,
        avgSeverity: this.calculateAvgSeverity(allViolations)
      };

      // 5. Record metrics
      allViolations.forEach(v => this.metricsDB.recordViolation(this.projectId, v));
      this.metricsDB.recordMetrics({
        projectId: this.projectId,
        timestamp: new Date().toISOString(),
        ...metrics
      });

      // 6. Get improvement
      const improvement = await this.metricsDB.getImprovement(this.projectId);

      const latencyMs = Date.now() - startTime;

      return {
        violations: allViolations,
        suggestions,
        metrics,
        latencyMs,
        improvementVsPrevious: improvement
      };
    } catch (error) {
      throw new Error(`Analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate average severity (0-1 scale)
   */
  private calculateAvgSeverity(violations: any[]): number {
    const severityMap: Record<string, number> = {
      'error': 1.0,
      'warning': 0.5,
      'info': 0.2
    };

    if (violations.length === 0) return 0;

    const total = violations.reduce((sum, v) => sum + (severityMap[v.severity] || 0), 0);
    return total / violations.length;
  }

  /**
   * Close database
   */
  close(): void {
    this.metricsDB.close();
  }
}
