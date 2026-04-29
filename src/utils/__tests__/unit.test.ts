/**
 * Unit tests for all core modules
 */

import { DirectedGraph } from '../../types/graph';
import { StaticAnalyzer } from '../analyzer';
import { CodeSegmenter } from '../segmenter';
import * as fs from 'fs';
import * as path from 'path';

describe('StaticAnalyzer', () => {
  const testFile = path.join(__dirname, '../../sample.fixture.ts');

  it('should analyze method lengths', () => {
    if (!fs.existsSync(testFile)) {
      console.warn('Test file not found, skipping');
      return;
    }

    const methods = StaticAnalyzer.analyzeMethodLengths(testFile);
    expect(methods.length).toBeGreaterThan(0);
    expect(methods[0]).toHaveProperty('name');
    expect(methods[0]).toHaveProperty('lineCount');
  });

  it('should detect methods exceeding max length', () => {
    if (!fs.existsSync(testFile)) {
      console.warn('Test file not found, skipping');
      return;
    }

    const methods = StaticAnalyzer.analyzeMethodLengths(testFile);
    const violations = StaticAnalyzer.validateMethodLengths(methods, 24);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].type).toBe('method-length');
  });

  it('should generate violation report', () => {
    if (!fs.existsSync(testFile)) {
      console.warn('Test file not found, skipping');
      return;
    }

    const methods = StaticAnalyzer.analyzeMethodLengths(testFile);
    const violations = StaticAnalyzer.validateMethodLengths(methods, 24);
    const report = StaticAnalyzer.generateReport(testFile, violations);

    expect(report.file).toBe(testFile);
    expect(report.summary.total).toBe(violations.length);
    expect(report.timestamp).toBeTruthy();
  });
});

describe('DirectedGraph', () => {
  it('should add and retrieve nodes', () => {
    const graph = new DirectedGraph<string>();
    graph.addNode('A');
    graph.addNode('B');

    const nodes = graph.getNodes();
    expect(nodes).toContain('A');
    expect(nodes).toContain('B');
  });

  it('should add and traverse edges', () => {
    const graph = new DirectedGraph<string>();
    ['A', 'B', 'C'].forEach((n) => graph.addNode(n));
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');

    expect(graph.getNeighbors('A')).toContain('B');
    expect(graph.getNeighbors('B')).toContain('C');
  });

  it('should perform DFS traversal', () => {
    const graph = new DirectedGraph<string>();
    ['A', 'B', 'C', 'D'].forEach((n) => graph.addNode(n));
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'D');

    const visited: string[] = [];
    graph.dfs('A', (nodeId) => visited.push(nodeId));

    expect(visited).toContain('A');
    expect(visited).toContain('D');
  });

  it('should perform BFS traversal', () => {
    const graph = new DirectedGraph<string>();
    ['A', 'B', 'C'].forEach((n) => graph.addNode(n));
    graph.addEdge('A', 'B');
    graph.addEdge('A', 'C');

    const visited: string[] = [];
    graph.bfs('A', (nodeId) => visited.push(nodeId));

    expect(visited[0]).toBe('A');
    expect(visited).toContain('B');
    expect(visited).toContain('C');
  });

  it('should find shortest path', () => {
    const graph = new DirectedGraph<string>();
    ['A', 'B', 'C', 'D'].forEach((n) => graph.addNode(n));
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'D');

    const path = graph.shortestPath('A', 'D');
    expect(path).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should perform topological sort', () => {
    const graph = new DirectedGraph<string>();
    ['A', 'B', 'C'].forEach((n) => graph.addNode(n));
    graph.addEdge('A', 'B');
    graph.addEdge('A', 'C');

    const sorted = graph.topologicalSort();
    expect(sorted.length).toBe(3);
    expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
    expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('C'));
  });

  it('should report graph size', () => {
    const graph = new DirectedGraph<string>();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B');

    const size = graph.size();
    expect(size.nodes).toBe(2);
    expect(size.edges).toBe(1);
  });
});

describe('CodeSegmenter', () => {
  const testCode = `
function example() {
  const x = 1;
  const y = 2;
  return x + y;
}

function longMethod() {
  const a = 1;
  const b = 2;
  const c = 3;
  const d = 4;
  const e = 5;
  const f = 6;
  const g = 7;
  const h = 8;
  const i = 9;
  const j = 10;
  const k = 11;
  const l = 12;
  const m = 13;
  const n = 14;
  const o = 15;
  const p = 16;
  const q = 17;
  const r = 18;
  const s = 19;
  const t = 20;
  const u = 21;
  const v = 22;
  const w = 23;
  const x = 24;
  const y = 25;
  return a + b + c;
}
`;

  it('should segment code into chunks', () => {
    const segments = CodeSegmenter.segmentCode('test.ts', testCode, 24);
    expect(segments.length).toBeGreaterThan(0);

    segments.forEach((seg) => {
      expect(seg.lineCount).toBeLessThanOrEqual(24);
    });
  });

  it('should extract function names', () => {
    const segments = CodeSegmenter.segmentCode('test.ts', testCode);
    const names = segments.map((s) => s.name);
    expect(names.some((n) => n.includes('example') || n.includes('longMethod'))).toBe(true);
  });

  it('should classify segment types', () => {
    const segments = CodeSegmenter.segmentCode('test.ts', testCode);
    const types = segments.map((s) => s.type);
    expect(types).toContain('function');
  });

  it('should estimate complexity', () => {
    const complexCode = `
      if (a > 0) {
        if (b > 0) {
          for (let i = 0; i < 10; i++) {
            console.log(i);
          }
        }
      }
    `;
    const segments = CodeSegmenter.segmentCode('test.ts', complexCode);
    expect(segments[0].metadata.complexity).toBeGreaterThan(1);
  });

  it('should build segment manifest', () => {
    const manifest = CodeSegmenter.buildManifest('test.ts', testCode);
    expect(manifest.segments.length).toBeGreaterThan(0);
    expect(manifest.segmentMap.size).toBe(manifest.segments.length);
    expect(manifest.dependencyMap.size).toBe(manifest.segments.length);
  });

  it('should extract dependencies', () => {
    const codeWithDeps = `
      import axios from 'axios';
      function fetchData() {
        const result = processData(axios.get('url'));
        return result;
      }
    `;
    const segments = CodeSegmenter.segmentCode('test.ts', codeWithDeps);
    const hasDeps = segments.some((s) => s.dependencies.length > 0);
    expect(hasDeps).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should analyze and segment end-to-end', () => {
    const testFile = path.join(__dirname, '../../sample.fixture.ts');

    if (!fs.existsSync(testFile)) {
      console.warn('Test file not found, skipping');
      return;
    }

    const report = StaticAnalyzer.analyzeFile(testFile, 24);
    expect(report.violations).toBeDefined();

    const code = fs.readFileSync(testFile, 'utf-8');
    const manifest = CodeSegmenter.buildManifest(testFile, code, 24);
    expect(manifest.segments.length).toBeGreaterThan(0);

    manifest.segments.forEach((seg) => {
      expect(seg.lineCount).toBeLessThanOrEqual(24);
    });
  });
});
