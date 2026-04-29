/**
 * Gradle Build File Analyzer
 * Applies the 24-line rule to Gradle tasks and detects dependency issues
 * Core Philosophy: Same 24-line limit as code methods
 */

import * as fs from 'fs';
import * as path from 'path';
import { InvalidCodeError } from '../types/errors';

/**
 * Task violation interface
 */
export interface TaskViolation {
  taskName: string;
  rule: 'task-length' | 'dependency-cycle' | 'orphaned-task' | 'complex-task';
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Task node for dependency graph
 */
interface TaskNode {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  dependencies: string[];
  content: string;
}

/**
 * Gradle file analysis report
 */
export interface GradleAnalysisReport {
  file: string;
  tasks: TaskNode[];
  violations: TaskViolation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    taskCount: number;
  };
}

export class GradleAnalyzer {
  /**
   * Analyze a Gradle build file
   */
  static analyzeFile(
    filePath: string,
    maxTaskLength: number = 24
  ): GradleAnalysisReport {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const tasks = this.extractTasks(content);
      const violations: TaskViolation[] = [];

      // Check task length violations
      tasks.forEach((task) => {
        if (task.lineCount > maxTaskLength) {
          violations.push({
            taskName: task.name,
            rule: 'task-length',
            line: task.startLine,
            message: `Task '${task.name}' is ${task.lineCount} lines, exceeds max of ${maxTaskLength}`,
            severity: 'error',
          });
        }
      });

      // Check for complex tasks (too many dependencies)
      tasks.forEach((task) => {
        if (task.dependencies.length > 5) {
          violations.push({
            taskName: task.name,
            rule: 'complex-task',
            line: task.startLine,
            message: `Task '${task.name}' has ${task.dependencies.length} dependencies, exceeds recommended max of 5`,
            severity: 'warning',
          });
        }
      });

      // Check for cycles
      const cycles = this.detectCycles(tasks);
      cycles.forEach((cycle) => {
        violations.push({
          taskName: cycle.taskName,
          rule: 'dependency-cycle',
          line: cycle.line,
          message: `Circular dependency detected: ${cycle.cycle}`,
          severity: 'error',
        });
      });

      // Check for orphaned tasks
      const orphaned = this.findOrphanedTasks(tasks);
      orphaned.forEach((task) => {
        violations.push({
          taskName: task.name,
          rule: 'orphaned-task',
          line: task.startLine,
          message: `Task '${task.name}' is never invoked as a dependency`,
          severity: 'warning',
        });
      });

      // Sort violations by line number
      violations.sort((a, b) => a.line - b.line);

      return {
        file: filePath,
        tasks,
        violations,
        summary: {
          total: violations.length,
          errors: violations.filter((v) => v.severity === 'error').length,
          warnings: violations.filter((v) => v.severity === 'warning').length,
          taskCount: tasks.length,
        },
      };
    } catch (err) {
      throw new InvalidCodeError(
        `Failed to analyze Gradle file ${filePath}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Analyze a directory for Gradle files
   */
  static analyzeDirectory(
    dirPath: string,
    maxTaskLength: number = 24
  ): GradleAnalysisReport[] {
    const reports: GradleAnalysisReport[] = [];

    try {
      const findGradleFiles = (dir: string): string[] => {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        entries.forEach((entry) => {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip node_modules and other common exclusions
            if (!['node_modules', '.git', 'build', 'dist'].includes(entry.name)) {
              files.push(...findGradleFiles(fullPath));
            }
          } else if (
            entry.name === 'build.gradle' ||
            entry.name.endsWith('.gradle')
          ) {
            files.push(fullPath);
          }
        });

        return files;
      };

      const gradleFiles = findGradleFiles(dirPath);

      gradleFiles.forEach((file) => {
        const report = this.analyzeFile(file, maxTaskLength);
        if (report.violations.length > 0 || report.tasks.length > 0) {
          reports.push(report);
        }
      });
    } catch (err) {
      throw new InvalidCodeError(
        `Failed to analyze directory ${dirPath}: ${(err as Error).message}`
      );
    }

    return reports;
  }

  /**
   * Extract all task blocks from Gradle file content
   */
  private static extractTasks(content: string): TaskNode[] {
    const tasks: TaskNode[] = [];
    const lines = content.split('\n');

    // Pattern to match task definitions
    // Handles: task name { , task 'name' { , task "name" { , task('name') { , task("name") {
    const taskPattern = /^\s*task\s*\(?['"]?(\w+)['"]?\)?\s*\{/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(taskPattern);

      if (match) {
        const taskName = match[1];
        const startLine = i + 1;

        // Find the closing brace
        let braceCount = 1;
        let endLineIndex = i + 1;

        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j];

          // Count braces
          for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }

          if (braceCount === 0) {
            endLineIndex = j;
            break;
          }
        }

        const endLine = endLineIndex + 1;
        const taskContent = lines.slice(i, endLineIndex + 1).join('\n');
        const lineCount = endLineIndex - i + 1;

        // Extract dependencies
        const dependencies = this.extractDependencies(taskContent);

        tasks.push({
          name: taskName,
          startLine,
          endLine,
          lineCount,
          dependencies,
          content: taskContent,
        });

        // Skip past this task
        i = endLineIndex;
      }
    }

    return tasks;
  }

  /**
   * Extract task dependencies from a task block
   */
  private static extractDependencies(taskContent: string): string[] {
    const dependencies: string[] = [];

    // Match dependsOn patterns
    const dependsOnPattern = /dependsOn\s*\(?['"]?(\w+)['"]?\)?/g;
    let match;

    while ((match = dependsOnPattern.exec(taskContent)) !== null) {
      dependencies.push(match[1]);
    }

    // Also match task { dependsOn [...] } patterns
    const arrayPattern = /dependsOn\s*\[\s*([^\]]+)\s*\]/g;
    let arrayMatch;

    while ((arrayMatch = arrayPattern.exec(taskContent)) !== null) {
      const deps = arrayMatch[1]
        .split(',')
        .map((d) => d.trim().replace(/['"\s]/g, ''))
        .filter((d) => d.length > 0);
      dependencies.push(...deps);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Detect circular dependencies in task graph
   */
  private static detectCycles(
    tasks: TaskNode[]
  ): Array<{ taskName: string; line: number; cycle: string }> {
    const cycles: Array<{ taskName: string; line: number; cycle: string }> = [];
    const taskMap = new Map(tasks.map((t) => [t.name, t]));

    // Check each task for cycles
    tasks.forEach((task) => {
      const visited = new Set<string>();
      const path: string[] = [];

      const hasCycle = (taskName: string): string | null => {
        if (visited.has(taskName)) {
          // Found a cycle
          const cycleStart = path.indexOf(taskName);
          if (cycleStart !== -1) {
            return [...path.slice(cycleStart), taskName].join(' → ');
          }
          return null;
        }

        visited.add(taskName);
        path.push(taskName);

        const currentTask = taskMap.get(taskName);
        if (currentTask) {
          for (const dep of currentTask.dependencies) {
            const cycle = hasCycle(dep);
            if (cycle) {
              return cycle;
            }
          }
        }

        path.pop();
        return null;
      };

      const cycle = hasCycle(task.name);
      if (cycle) {
        cycles.push({
          taskName: task.name,
          line: task.startLine,
          cycle,
        });
      }
    });

    return cycles;
  }

  /**
   * Find orphaned tasks (tasks never invoked as dependencies)
   */
  private static findOrphanedTasks(tasks: TaskNode[]): TaskNode[] {
    const orphaned: TaskNode[] = [];
    const allDependencies = new Set<string>();

    // Collect all dependencies
    tasks.forEach((task) => {
      task.dependencies.forEach((dep) => {
        allDependencies.add(dep);
      });
    });

    // Find tasks that are never depended on
    tasks.forEach((task) => {
      if (!allDependencies.has(task.name)) {
        orphaned.push(task);
      }
    });

    return orphaned;
  }

  /**
   * Get task dependency graph as adjacency list
   */
  static getTaskGraph(tasks: TaskNode[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    tasks.forEach((task) => {
      graph.set(task.name, task.dependencies);
    });

    return graph;
  }

  /**
   * Find the longest dependency chain
   */
  static getLongestDependencyChain(tasks: TaskNode[]): string[] {
    const graph = this.getTaskGraph(tasks);
    let longestChain: string[] = [];

    const dfs = (taskName: string, chain: string[]): void => {
      const newChain = [...chain, taskName];

      if (newChain.length > longestChain.length) {
        longestChain = newChain;
      }

      const deps = graph.get(taskName) || [];
      deps.forEach((dep) => {
        if (!newChain.includes(dep)) {
          dfs(dep, newChain);
        }
      });
    };

    tasks.forEach((task) => {
      dfs(task.name, []);
    });

    return longestChain;
  }
}
