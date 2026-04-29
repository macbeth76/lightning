/**
 * Integration tests for graph engine and code segmentation
 */

import { DirectedGraph, DependencyGraph, CallGraph, TaskGraph, ASTGraph } from '../types/code-graphs';
import { CodeSegmenter } from '../utils/segmenter';

describe('Graph Theory Engine', () => {
  describe('DirectedGraph', () => {
    it('should add nodes and edges', () => {
      const graph = new DirectedGraph<string>();
      graph.addNode('A');
      graph.addNode('B');
      graph.addEdge('A', 'B');

      expect(graph.getNeighbors('A')).toContain('B');
      expect(graph.size().nodes).toBe(2);
      expect(graph.size().edges).toBe(1);
    });

    it('should perform DFS correctly', () => {
      const graph = new DirectedGraph<string>();
      ['A', 'B', 'C', 'D'].forEach((node) => graph.addNode(node));
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const visited: string[] = [];
      graph.dfs('A', (nodeId) => visited.push(nodeId));

      expect(visited).toContain('A');
      expect(visited).toContain('B');
      expect(visited).toContain('C');
      expect(visited).toContain('D');
    });

    it('should perform BFS correctly', () => {
      const graph = new DirectedGraph<string>();
      ['A', 'B', 'C'].forEach((node) => graph.addNode(node));
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');

      const visited: string[] = [];
      graph.bfs('A', (nodeId) => visited.push(nodeId));

      expect(visited[0]).toBe('A');
      expect(visited).toContain('B');
      expect(visited).toContain('C');
    });

    it('should perform topological sort on DAG', () => {
      const graph = new DirectedGraph<string>();
      ['A', 'B', 'C', 'D'].forEach((node) => graph.addNode(node));
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'D');

      const sorted = graph.topologicalSort();
      expect(sorted.length).toBe(4);
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('C'));
      expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('D'));
    });

    it('should find shortest path', () => {
      const graph = new DirectedGraph<string>();
      ['A', 'B', 'C', 'D'].forEach((node) => graph.addNode(node));
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const path = graph.shortestPath('A', 'D');
      expect(path).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('DependencyGraph', () => {
    it('should track dependencies', () => {
      const depGraph = new DependencyGraph();
      depGraph.addDependency('module-a', 'module-b');
      depGraph.addDependency('module-b', 'module-c');

      expect(depGraph.getDependencies('module-a')).toContain('module-b');
      expect(depGraph.getTransitiveDependencies('module-a')).toContain('module-c');
    });

    it('should detect circular dependencies', () => {
      const depGraph = new DependencyGraph();
      depGraph.addDependency('module-a', 'module-b');
      depGraph.addDependency('module-b', 'module-c');
      depGraph.addDependency('module-c', 'module-a');

      const cycles = depGraph.findCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('CallGraph', () => {
    it('should track function calls', () => {
      const callGraph = new CallGraph();
      callGraph.addCall('funcA', 'funcB');
      callGraph.addCall('funcB', 'funcC');

      expect(callGraph.getCallees('funcA')).toContain('funcB');
      expect(callGraph.getCallDepth('funcA')).toBe(2);
    });

    it('should identify recursive functions', () => {
      const callGraph = new CallGraph();
      callGraph.addCall('recursive', 'recursive');

      const recursive = callGraph.findRecursiveFunctions();
      expect(recursive).toContain('recursive');
    });
  });

  describe('TaskGraph', () => {
    it('should manage tasks with priorities', () => {
      const taskGraph = new TaskGraph();
      taskGraph.addTask('task-1', 'First task', 10, 'pending');
      taskGraph.addTask('task-2', 'Second task', 5, 'pending');

      const sorted = taskGraph.bubbleSortTasks();
      expect(sorted[0]).toBe('task-1'); // Higher priority first
    });

    it('should find ready tasks (no pending dependencies)', () => {
      const taskGraph = new TaskGraph();
      taskGraph.addTask('task-a', 'Task A', 10, 'pending');
      taskGraph.addTask('task-b', 'Task B', 5, 'pending');
      taskGraph.addTaskDependency('task-b', 'task-a');

      const ready = taskGraph.getReadyTasks();
      expect(ready).toContain('task-a');
      expect(ready).not.toContain('task-b');
    });
  });

  describe('ASTGraph', () => {
    it('should represent code structure', () => {
      const astGraph = new ASTGraph();
      astGraph.addASTNode('func-1', 'function', 'myFunc', 10, 20);
      astGraph.addASTNode('func-2', 'function', 'helperFunc', 22, 28);

      const functions = astGraph.getFunctions();
      expect(functions).toContain('func-1');
      expect(functions).toContain('func-2');
    });

    it('should provide structure summary', () => {
      const astGraph = new ASTGraph();
      astGraph.addASTNode('func-1', 'function', 'myFunc', 1, 10);
      astGraph.addASTNode('class-1', 'class', 'MyClass', 12, 30);
      astGraph.addASTNode('var-1', 'variable', 'x', 32, 32);

      const summary = astGraph.getSummary();
      expect(summary.functions).toBe(1);
      expect(summary.classes).toBe(1);
      expect(summary.variables).toBe(1);
    });
  });
});

describe('Code Segmentation', () => {
  const sampleCode = `
function exampleFunction() {
  const x = 1;
  const y = 2;
  const z = x + y;
  console.log(z);
  if (z > 0) {
    console.log('positive');
  }
  const a = [1, 2, 3];
  a.forEach((item) => {
    console.log(item);
  });
  return z;
}

function anotherFunction() {
  console.log('test');
}
`;

  it('should segment code into chunks', () => {
    const segments = CodeSegmenter.segmentCode('test.ts', sampleCode, 24);
    expect(segments.length).toBeGreaterThan(0);
    segments.forEach((seg) => {
      expect(seg.lineCount).toBeLessThanOrEqual(24);
    });
  });

  it('should extract dependencies', () => {
    const segments = CodeSegmenter.segmentCode('test.ts', sampleCode, 24);
    const hasDeps = segments.some((seg) => seg.dependencies.length > 0);
    expect(hasDeps).toBe(true); // Should find at least console.log, forEach
  });

  it('should build segment manifest', () => {
    const manifest = CodeSegmenter.buildManifest('test.ts', sampleCode);
    expect(manifest.segments.length).toBeGreaterThan(0);
    expect(manifest.segmentMap.size).toBeGreaterThan(0);
    expect(manifest.dependencyMap.size).toBeGreaterThan(0);
  });

  it('should classify segment types', () => {
    const segments = CodeSegmenter.segmentCode('test.ts', sampleCode);
    const types = segments.map((s) => s.type);
    expect(types).toContain('function');
  });

  it('should estimate complexity', () => {
    const complexCode = `
      if (x > 0) {
        if (y > 0) {
          for (let i = 0; i < 10; i++) {
            switch(i) {
              case 0: break;
              case 1: break;
            }
          }
        }
      }
    `;
    const segments = CodeSegmenter.segmentCode('test.ts', complexCode);
    expect(segments[0].metadata.complexity).toBeGreaterThan(1);
  });
});
