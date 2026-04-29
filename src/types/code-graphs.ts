/**
 * Specialized graphs for code analysis
 */

import { DirectedGraph } from './graph';

export { DirectedGraph };

/**
 * Dependency Graph: tracks module/function dependencies
 * Nodes: file/function names, Edges: "depends on"
 */
export class DependencyGraph extends DirectedGraph<string> {
  /**
   * Add a dependency: from depends on to
   */
  addDependency(from: string, to: string): void {
    this.addEdge(from, to, 1);
  }

  /**
   * Get all dependencies of a module (direct)
   */
  getDependencies(moduleName: string): string[] {
    return this.getNeighbors(moduleName);
  }

  /**
   * Get all transitive dependencies
   */
  getTransitiveDependencies(moduleName: string): Set<string> {
    const deps = new Set<string>();
    this.dfs(moduleName, (nodeId) => {
      if (nodeId !== moduleName) {
        deps.add(nodeId);
      }
    });
    return deps;
  }

  /**
   * Detect circular dependencies
   */
  findCircularDependencies(): string[][] {
    return this.findSCCs().filter((scc) => scc.length > 1 || this.hasCircle(scc[0]));
  }

  /**
   * Check if a node has a self-loop (circular dependency to itself)
   */
  private hasCircle(nodeId: string): boolean {
    const neighbors = this.getNeighbors(nodeId);
    return neighbors.includes(nodeId);
  }
}

/**
 * Call Graph: tracks function invocations
 * Nodes: function names, Edges: "calls"
 */
export class CallGraph extends DirectedGraph<string> {
  /**
   * Add a function call: caller calls callee
   */
  addCall(caller: string, callee: string): void {
    this.addEdge(caller, callee, 1);
  }

  /**
   * Get direct callees of a function
   */
  getCallees(functionName: string): string[] {
    return this.getNeighbors(functionName);
  }

  /**
   * Get all functions that call a given function
   */
  getCallers(functionName: string): string[] {
    const callers: string[] = [];
    this.getNodes().forEach((nodeId) => {
      if (this.getNeighbors(nodeId).includes(functionName)) {
        callers.push(nodeId);
      }
    });
    return callers;
  }

  /**
   * Get call chain depth for a function
   */
  getCallDepth(functionName: string): number {
    let maxDepth = 0;
    const visited = new Set<string>();

    const traverse = (nodeId: string, depth: number): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);

      const callees = this.getCallees(nodeId);
      callees.forEach((callee) => traverse(callee, depth + 1));
    };

    traverse(functionName, 0);
    return maxDepth;
  }

  /**
   * Find recursive functions
   */
  findRecursiveFunctions(): string[] {
    const recursive: string[] = [];
    this.getNodes().forEach((nodeId) => {
      const callees = this.getCallees(nodeId);
      if (callees.includes(nodeId)) {
        recursive.push(nodeId);
      }
    });
    return recursive;
  }
}

/**
 * Task Graph: tracks TODOs/JIRAs and their dependencies
 * Nodes: task IDs, Edges: "blocks/depends-on"
 */
interface TaskNode {
  id: string;
  title: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

export class TaskGraph extends DirectedGraph<string> {
  private taskMetadata: Map<string, TaskNode> = new Map();

  /**
   * Add a task node
   */
  addTask(id: string, title: string, priority: number, status: 'pending' | 'in_progress' | 'done' | 'blocked'): void {
    this.addNode(id);
    this.taskMetadata.set(id, { id, title, priority, status });
  }

  /**
   * Add a task dependency: task1 depends on task2
   */
  addTaskDependency(task1: string, task2: string): void {
    this.addEdge(task1, task2, 1);
  }

  /**
   * Get tasks ready to work on (no pending dependencies)
   */
  getReadyTasks(): string[] {
    const ready: string[] = [];

    this.getNodes().forEach((taskId) => {
      const meta = this.taskMetadata.get(taskId);
      if (meta && meta.status === 'pending') {
        const dependencies = this.getNeighbors(taskId);
        const allDone = dependencies.every((depId) => {
          const depMeta = this.taskMetadata.get(depId);
          return depMeta && depMeta.status === 'done';
        });

        if (allDone) {
          ready.push(taskId);
        }
      }
    });

    return ready.sort((a, b) => {
      const priorityA = this.taskMetadata.get(a)?.priority ?? 0;
      const priorityB = this.taskMetadata.get(b)?.priority ?? 0;
      return priorityB - priorityA;
    });
  }

  /**
   * Bubble sort tasks by priority and dependency status
   */
  bubbleSortTasks(): string[] {
    const tasks = this.getNodes().slice();

    for (let i = 0; i < tasks.length; i++) {
      for (let j = 0; j < tasks.length - i - 1; j++) {
        const task1 = tasks[j];
        const task2 = tasks[j + 1];
        const meta1 = this.taskMetadata.get(task1);
        const meta2 = this.taskMetadata.get(task2);

        if (meta1 && meta2) {
          // Sort by: status (pending > blocked > in_progress > done), then priority
          const statusOrder = {
            pending: 3,
            blocked: 2,
            in_progress: 1,
            done: 0,
          };

          const statusDiff =
            statusOrder[meta2.status as keyof typeof statusOrder] -
            statusOrder[meta1.status as keyof typeof statusOrder];

          if (statusDiff !== 0 || statusDiff === 0) {
            if (statusDiff > 0 || (statusDiff === 0 && meta2.priority > meta1.priority)) {
              [tasks[j], tasks[j + 1]] = [tasks[j + 1], tasks[j]];
            }
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Get critical path (longest path through dependencies)
   */
  getCriticalPath(): string[] {
    const sorted = this.topologicalSort();
    let longestPath: string[] = [];

    sorted.forEach((nodeId) => {
      const path = [nodeId];
      let current = nodeId;

      while (true) {
        const neighbors = this.getNeighbors(current);
        if (neighbors.length === 0) break;

        current = neighbors[0];
        path.push(current);
      }

      if (path.length > longestPath.length) {
        longestPath = path;
      }
    });

    return longestPath;
  }

  /**
   * Get task metadata
   */
  getTaskMetadata(taskId: string): TaskNode | undefined {
    return this.taskMetadata.get(taskId);
  }
}

/**
 * AST (Abstract Syntax Tree) Graph: represents code structure
 * Nodes: AST nodes, Edges: parent-child, references
 */
interface ASTNodeInfo {
  id: string;
  type: 'function' | 'class' | 'variable' | 'import' | 'statement';
  name: string;
  startLine: number;
  endLine: number;
}

export class ASTGraph extends DirectedGraph<string> {
  private nodeMetadata: Map<string, ASTNodeInfo> = new Map();

  /**
   * Add an AST node
   */
  addASTNode(
    id: string,
    type: 'function' | 'class' | 'variable' | 'import' | 'statement',
    name: string,
    startLine: number,
    endLine: number
  ): void {
    this.addNode(id);
    this.nodeMetadata.set(id, { id, type, name, startLine, endLine });
  }

  /**
   * Add an AST edge (parent-child or reference)
   */
  addASTEdge(parentId: string, childId: string): void {
    this.addEdge(parentId, childId, 1);
  }

  /**
   * Get all children of an AST node
   */
  getChildren(nodeId: string): string[] {
    return this.getNeighbors(nodeId);
  }

  /**
   * Get all functions in the tree
   */
  getFunctions(): string[] {
    return this.getNodes().filter((nodeId) => {
      const meta = this.nodeMetadata.get(nodeId);
      return meta && meta.type === 'function';
    });
  }

  /**
   * Get code structure summary
   */
  getSummary(): {
    functions: number;
    classes: number;
    variables: number;
    imports: number;
  } {
    let functions = 0;
    let classes = 0;
    let variables = 0;
    let imports = 0;

    this.nodeMetadata.forEach((meta) => {
      if (meta.type === 'function') functions++;
      else if (meta.type === 'class') classes++;
      else if (meta.type === 'variable') variables++;
      else if (meta.type === 'import') imports++;
    });

    return { functions, classes, variables, imports };
  }

  /**
   * Get AST node metadata
   */
  getNodeMetadata(nodeId: string): ASTNodeInfo | undefined {
    return this.nodeMetadata.get(nodeId);
  }
}
