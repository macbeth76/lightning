/**
 * Metrics database using JSON file storage (no external SQLite dependency)
 * Tracks violations and improvements over time
 */

import * as fs from 'fs';

export interface MetricsSnapshot {
  projectId: string;
  timestamp: string;
  totalViolations: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  filesAnalyzed?: number;
  avgSeverity?: number;
}

export interface StoredViolation {
  projectId: string;
  filePath: string;
  violationType: string;
  severity: string;
  lineNumber: number;
  message: string;
  rule: string;
  timestamp: string;
}

export class MetricsDB {
  private metricsFile: string;
  private violationsFile: string;

  constructor(dbPath: string = './metrics') {
    this.metricsFile = `${dbPath}-metrics.json`;
    this.violationsFile = `${dbPath}-violations.json`;
    this.initializeFiles();
  }

  /**
   * Initialize JSON files if they don't exist
   */
  private initializeFiles(): void {
    if (!fs.existsSync(this.metricsFile)) {
      fs.writeFileSync(this.metricsFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.violationsFile)) {
      fs.writeFileSync(this.violationsFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Record a single violation
   */
  recordViolation(projectId: string, violation: any): void {
    try {
      const violations = JSON.parse(fs.readFileSync(this.violationsFile, 'utf-8')) || [];

      const stored: StoredViolation = {
        projectId,
        filePath: violation.file || '',
        violationType: violation.type || 'other',
        severity: violation.severity || 'info',
        lineNumber: violation.line || 0,
        message: violation.message || '',
        rule: violation.rule || 'unknown',
        timestamp: new Date().toISOString()
      };

      violations.push(stored);

      // Keep last 1000 violations
      if (violations.length > 1000) {
        violations.splice(0, violations.length - 1000);
      }

      fs.writeFileSync(this.violationsFile, JSON.stringify(violations, null, 2));
    } catch (error) {
      console.warn('Failed to record violation:', error);
    }
  }

  /**
   * Record a metrics snapshot
   */
  recordMetrics(metrics: MetricsSnapshot): void {
    try {
      const all = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8')) || [];

      all.push(metrics);

      // Keep last 100 snapshots
      if (all.length > 100) {
        all.splice(0, all.length - 100);
      }

      fs.writeFileSync(this.metricsFile, JSON.stringify(all, null, 2));
    } catch (error) {
      console.warn('Failed to record metrics:', error);
    }
  }

  /**
   * Get improvement percentage vs previous run
   */
  async getImprovement(projectId: string): Promise<number> {
    try {
      const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8')) || [];
      const projectMetrics = metrics.filter((m: MetricsSnapshot) => m.projectId === projectId);

      if (projectMetrics.length < 2) {
        return 0;
      }

      const latest = projectMetrics[projectMetrics.length - 1];
      const previous = projectMetrics[projectMetrics.length - 2];

      const improvement = ((previous.totalViolations - latest.totalViolations) / previous.totalViolations) * 100;
      return Math.round(improvement * 100) / 100;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get latest metrics
   */
  async getLatestMetrics(projectId: string): Promise<MetricsSnapshot | null> {
    try {
      const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8')) || [];
      const projectMetrics = metrics.filter((m: MetricsSnapshot) => m.projectId === projectId);

      if (projectMetrics.length === 0) {
        return null;
      }

      return projectMetrics[projectMetrics.length - 1];
    } catch (error) {
      return null;
    }
  }

  /**
   * Get trend over last 30 days
   */
  async getTrend(projectId: string): Promise<MetricsSnapshot[]> {
    try {
      const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8')) || [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      return metrics.filter(
        (m: MetricsSnapshot) => m.projectId === projectId && m.timestamp >= thirtyDaysAgo
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Close database (no-op for JSON implementation)
   */
  close(): void {
    // JSON files are automatically flushed
  }
}
