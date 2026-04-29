/**
 * Gradle Analyzer Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { GradleAnalyzer } from '../gradle-analyzer';

describe('GradleAnalyzer', () => {
  const testFixturesDir = path.join(__dirname, '../../__tests__/fixtures/gradle');

  // Create test fixtures if they don't exist
  beforeAll(() => {
    if (!fs.existsSync(testFixturesDir)) {
      fs.mkdirSync(testFixturesDir, { recursive: true });
    }
  });

  describe('Task Parsing', () => {
    it('should extract simple tasks from build.gradle', () => {
      const testFile = path.join(testFixturesDir, 'simple-tasks.gradle');
      const content = `
task build {
  println 'Building...'
}

task test {
  println 'Testing...'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.tasks).toHaveLength(2);
      expect(report.tasks[0].name).toBe('build');
      expect(report.tasks[1].name).toBe('test');

      fs.unlinkSync(testFile);
    });

    it('should extract tasks with parentheses', () => {
      const testFile = path.join(testFixturesDir, 'tasks-with-parens.gradle');
      const content = `
task('compile') {
  println 'Compiling...'
}

task "assemble" {
  println 'Assembling...'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.tasks).toHaveLength(2);
      expect(report.tasks[0].name).toBe('compile');
      expect(report.tasks[1].name).toBe('assemble');

      fs.unlinkSync(testFile);
    });

    it('should count lines correctly', () => {
      const testFile = path.join(testFixturesDir, 'line-count.gradle');
      const content = `task build {
  println 'Line 1'
  println 'Line 2'
  println 'Line 3'
}`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.tasks[0].lineCount).toBe(5);

      fs.unlinkSync(testFile);
    });
  });

  describe('Task Length Violations (24-line rule)', () => {
    it('should detect tasks exceeding 24 lines', () => {
      const testFile = path.join(testFixturesDir, 'long-task.gradle');

      // Create a task with 30 lines
      const lines = ['task longTask {'];
      for (let i = 0; i < 28; i++) {
        lines.push(`  println 'Line ${i + 1}'`);
      }
      lines.push('}');

      const content = lines.join('\n');
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const lengthViolations = report.violations.filter(
        (v) => v.rule === 'task-length'
      );
      expect(lengthViolations).toHaveLength(1);
      expect(lengthViolations[0].severity).toBe('error');
      expect(lengthViolations[0].taskName).toBe('longTask');
      expect(lengthViolations[0].message).toContain('exceeds max of 24');

      fs.unlinkSync(testFile);
    });

    it('should allow tasks with exactly 24 lines', () => {
      const testFile = path.join(testFixturesDir, 'task-24-lines.gradle');

      // Create a task with exactly 24 lines (including braces)
      const lines = ['task perfectTask {'];
      for (let i = 0; i < 22; i++) {
        lines.push(`  println 'Line ${i + 1}'`);
      }
      lines.push('}');

      const content = lines.join('\n');
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const lengthViolations = report.violations.filter(
        (v) => v.rule === 'task-length'
      );
      expect(lengthViolations).toHaveLength(0);

      fs.unlinkSync(testFile);
    });

    it('should allow tasks under 24 lines', () => {
      const testFile = path.join(testFixturesDir, 'short-task.gradle');

      const content = `task shortTask {
  println 'Building...'
  println 'Done!'
}`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      // Filter to check if there are task-length violations
      const lengthViolations = report.violations.filter(
        (v) => v.rule === 'task-length'
      );
      expect(lengthViolations).toHaveLength(0);

      fs.unlinkSync(testFile);
    });
  });

  describe('Dependency Extraction', () => {
    it('should extract simple dependencies', () => {
      const testFile = path.join(testFixturesDir, 'simple-deps.gradle');
      const content = `
task build {
  dependsOn 'compile'
}

task test {
  dependsOn 'build'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.tasks[0].dependencies).toContain('compile');
      expect(report.tasks[1].dependencies).toContain('build');

      fs.unlinkSync(testFile);
    });

    it('should extract array-style dependencies', () => {
      const testFile = path.join(testFixturesDir, 'array-deps.gradle');
      const content = `
task build {
  dependsOn ['compile', 'lint', 'test']
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.tasks[0].dependencies).toContain('compile');
      expect(report.tasks[0].dependencies).toContain('lint');
      expect(report.tasks[0].dependencies).toContain('test');

      fs.unlinkSync(testFile);
    });

    it('should remove duplicate dependencies', () => {
      const testFile = path.join(testFixturesDir, 'dup-deps.gradle');
      const content = `
task build {
  dependsOn 'compile'
  dependsOn 'compile'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.tasks[0].dependencies).toEqual(['compile']);

      fs.unlinkSync(testFile);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect simple circular dependencies (A -> B -> A)', () => {
      const testFile = path.join(testFixturesDir, 'cycle-simple.gradle');
      const content = `
task A {
  dependsOn 'B'
}

task B {
  dependsOn 'A'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const cycleViolations = report.violations.filter(
        (v) => v.rule === 'dependency-cycle'
      );
      expect(cycleViolations.length).toBeGreaterThan(0);
      expect(cycleViolations[0].severity).toBe('error');

      fs.unlinkSync(testFile);
    });

    it('should detect complex circular dependencies (A -> B -> C -> A)', () => {
      const testFile = path.join(testFixturesDir, 'cycle-complex.gradle');
      const content = `
task A {
  dependsOn 'B'
}

task B {
  dependsOn 'C'
}

task C {
  dependsOn 'A'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const cycleViolations = report.violations.filter(
        (v) => v.rule === 'dependency-cycle'
      );
      expect(cycleViolations.length).toBeGreaterThan(0);

      fs.unlinkSync(testFile);
    });

    it('should not flag acyclic dependencies', () => {
      const testFile = path.join(testFixturesDir, 'no-cycle.gradle');
      const content = `
task compile {
  println 'Compiling...'
}

task test {
  dependsOn 'compile'
}

task build {
  dependsOn 'test'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const cycleViolations = report.violations.filter(
        (v) => v.rule === 'dependency-cycle'
      );
      expect(cycleViolations).toHaveLength(0);

      fs.unlinkSync(testFile);
    });
  });

  describe('Orphaned Task Detection', () => {
    it('should detect tasks that are never invoked', () => {
      const testFile = path.join(testFixturesDir, 'orphaned.gradle');
      const content = `
task unused {
  println 'Never called'
}

task build {
  dependsOn 'compile'
}

task compile {
  println 'Compiling...'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const orphanViolations = report.violations.filter(
        (v) => v.rule === 'orphaned-task'
      );
      expect(orphanViolations.length).toBeGreaterThan(0);
      expect(orphanViolations[0].taskName).toBe('unused');

      fs.unlinkSync(testFile);
    });

    it('should not flag tasks that are dependencies', () => {
      const testFile = path.join(testFixturesDir, 'no-orphan.gradle');
      const content = `
task build {
  dependsOn 'compile'
}

task compile {
  println 'Compiling...'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const orphanViolations = report.violations.filter(
        (v) => v.rule === 'orphaned-task' && v.taskName === 'compile'
      );
      expect(orphanViolations).toHaveLength(0);

      fs.unlinkSync(testFile);
    });
  });

  describe('Complex Task Detection', () => {
    it('should warn on tasks with too many dependencies', () => {
      const testFile = path.join(testFixturesDir, 'complex-task.gradle');
      const content = `
task build {
  dependsOn ['compile', 'lint', 'test', 'doc', 'package', 'publish']
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const complexViolations = report.violations.filter(
        (v) => v.rule === 'complex-task'
      );
      expect(complexViolations.length).toBeGreaterThan(0);
      expect(complexViolations[0].severity).toBe('warning');

      fs.unlinkSync(testFile);
    });

    it('should allow tasks with up to 5 dependencies', () => {
      const testFile = path.join(testFixturesDir, 'moderate-task.gradle');
      const content = `
task build {
  dependsOn ['compile', 'lint', 'test', 'doc', 'package']
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const complexViolations = report.violations.filter(
        (v) => v.rule === 'complex-task'
      );
      expect(complexViolations).toHaveLength(0);

      fs.unlinkSync(testFile);
    });
  });

  describe('Report Summary', () => {
    it('should generate correct summary statistics', () => {
      const testFile = path.join(testFixturesDir, 'summary.gradle');
      const content = `
task shortTask {
  println 'OK'
}

task build {
  dependsOn 'shortTask'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      expect(report.summary.taskCount).toBe(2);
      // After building dependency, both tasks are in graph and not orphaned
      const lengthErrors = report.violations.filter((v) => v.rule === 'task-length');
      expect(lengthErrors).toHaveLength(0);

      fs.unlinkSync(testFile);
    });

    it('should count errors and warnings correctly', () => {
      const testFile = path.join(testFixturesDir, 'summary-mixed.gradle');

      const lines = ['task longTask {'];
      for (let i = 0; i < 28; i++) {
        lines.push(`  println 'Line ${i + 1}'`);
      }
      lines.push('}');
      lines.push('');
      lines.push('task complexTask {');
      lines.push("  dependsOn ['a', 'b', 'c', 'd', 'e', 'f']");
      lines.push('}');

      const content = lines.join('\n');
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);

      const errorCount = report.violations.filter((v) => v.severity === 'error').length;
      const warningCount = report.violations.filter((v) => v.severity === 'warning').length;

      // Should have task-length error and complex-task warning
      expect(errorCount).toBeGreaterThanOrEqual(1); // task-length
      expect(warningCount).toBeGreaterThanOrEqual(1); // complex-task

      fs.unlinkSync(testFile);
    });
  });

  describe('Task Graph Analysis', () => {
    it('should create adjacency list for task graph', () => {
      const testFile = path.join(testFixturesDir, 'graph.gradle');
      const content = `
task A {
  dependsOn 'B'
}

task B {
  dependsOn ['C', 'D']
}

task C {
  println 'C'
}

task D {
  println 'D'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);
      const graph = GradleAnalyzer.getTaskGraph(report.tasks);

      expect(graph.get('A')).toEqual(['B']);
      expect(graph.get('B')).toContain('C');
      expect(graph.get('B')).toContain('D');

      fs.unlinkSync(testFile);
    });

    it('should find longest dependency chain', () => {
      const testFile = path.join(testFixturesDir, 'chain.gradle');
      const content = `
task A {
  dependsOn 'B'
}

task B {
  dependsOn 'C'
}

task C {
  dependsOn 'D'
}

task D {
  println 'D'
}
`;
      fs.writeFileSync(testFile, content);

      const report = GradleAnalyzer.analyzeFile(testFile);
      const chain = GradleAnalyzer.getLongestDependencyChain(report.tasks);

      expect(chain).toContain('A');
      expect(chain).toContain('B');
      expect(chain).toContain('C');
      expect(chain).toContain('D');

      fs.unlinkSync(testFile);
    });
  });

  describe('Directory Analysis', () => {
    it('should analyze multiple gradle files in directory', () => {
      const testDir = path.join(testFixturesDir, 'multi-dir');
      const subdir = path.join(testDir, 'sub');

      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(subdir, { recursive: true });

      fs.writeFileSync(
        path.join(testDir, 'build.gradle'),
        'task build { println "build" }'
      );
      fs.writeFileSync(
        path.join(subdir, 'build.gradle'),
        'task test { println "test" }'
      );

      const reports = GradleAnalyzer.analyzeDirectory(testDir);

      expect(reports.length).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(path.join(testDir, 'build.gradle'));
      fs.unlinkSync(path.join(subdir, 'build.gradle'));
      fs.rmdirSync(subdir);
      fs.rmdirSync(testDir);
    });
  });
});
