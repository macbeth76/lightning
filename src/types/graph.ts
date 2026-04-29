/**
 * Generic graph data structure and algorithms
 */

export interface GraphNode<T = string> {
  id: T;
  data?: Record<string, unknown>;
}

export interface GraphEdge<T = string> {
  from: T;
  to: T;
  weight?: number;
  data?: Record<string, unknown>;
}

export interface Graph<T = string> {
  nodes: Map<T, GraphNode<T>>;
  edges: Map<string, GraphEdge<T>>;
  adjacencyList: Map<T, T[]>;
}

/**
 * Generic graph implementation with common algorithms
 */
export class DirectedGraph<T = string> {
  private nodes: Map<T, GraphNode<T>> = new Map();
  private adjacencyList: Map<T, T[]> = new Map();
  private edgeMap: Map<string, GraphEdge<T>> = new Map();

  /**
   * Add a node to the graph
   */
  addNode(id: T, data?: Record<string, unknown>): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, data });
      this.adjacencyList.set(id, []);
    }
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(from: T, to: T, weight: number = 1): void {
    this.addNode(from);
    this.addNode(to);

    const edgeKey = `${String(from)}->${String(to)}`;
    if (!this.edgeMap.has(edgeKey)) {
      this.edgeMap.set(edgeKey, { from, to, weight });
      const neighbors = this.adjacencyList.get(from);
      if (neighbors && !neighbors.includes(to)) {
        neighbors.push(to);
      }
    }
  }

  /**
   * Get all nodes
   */
  getNodes(): T[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: T): T[] {
    return this.adjacencyList.get(nodeId) || [];
  }

  /**
   * Depth-first search (DFS)
   */
  dfs(startId: T, callback: (nodeId: T) => void): void {
    const visited = new Set<T>();

    const visit = (id: T): void => {
      if (visited.has(id)) return;
      visited.add(id);
      callback(id);

      const neighbors = this.getNeighbors(id);
      neighbors.forEach((neighbor) => visit(neighbor));
    };

    visit(startId);
  }

  /**
   * Breadth-first search (BFS)
   */
  bfs(startId: T, callback: (nodeId: T) => void): void {
    const visited = new Set<T>();
    const queue: T[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current !== undefined) {
        callback(current);

        const neighbors = this.getNeighbors(current);
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
    }
  }

  /**
   * Topological sort (for DAGs)
   */
  topologicalSort(): T[] {
    const visited = new Set<T>();
    const stack: T[] = [];

    const visit = (nodeId: T): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const neighbors = this.getNeighbors(nodeId);
      neighbors.forEach((neighbor) => visit(neighbor));

      stack.push(nodeId);
    };

    this.getNodes().forEach((nodeId) => visit(nodeId));
    return stack.reverse();
  }

  /**
   * Find strongly connected components (Kosaraju's algorithm)
   */
  findSCCs(): T[][] {
    const visited = new Set<T>();
    const stack: T[] = [];

    // First DFS to populate stack
    const dfsOrder = (nodeId: T): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const neighbors = this.getNeighbors(nodeId);
      neighbors.forEach((neighbor) => dfsOrder(neighbor));

      stack.push(nodeId);
    };

    this.getNodes().forEach((nodeId) => dfsOrder(nodeId));

    // Reverse graph
    const reverseGraph = new DirectedGraph<T>();
    this.getNodes().forEach((nodeId) => {
      reverseGraph.addNode(nodeId);
    });

    this.edgeMap.forEach((edge) => {
      reverseGraph.addEdge(edge.to, edge.from);
    });

    // Second DFS on reversed graph
    const components: T[][] = [];
    const visited2 = new Set<T>();

    const dfsComponent = (nodeId: T, component: T[]): void => {
      if (visited2.has(nodeId)) return;
      visited2.add(nodeId);
      component.push(nodeId);

      const neighbors = reverseGraph.getNeighbors(nodeId);
      neighbors.forEach((neighbor) => dfsComponent(neighbor, component));
    };

    while (stack.length > 0) {
      const nodeId = stack.pop();
      if (nodeId !== undefined && !visited2.has(nodeId)) {
        const component: T[] = [];
        dfsComponent(nodeId, component);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Find shortest path between two nodes (BFS)
   */
  shortestPath(from: T, to: T): T[] {
    const visited = new Set<T>();
    const parent: Map<T, T | null> = new Map();
    const queue: T[] = [from];

    visited.add(from);
    parent.set(from, null);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      if (current === to) {
        const path: T[] = [];
        let node: T | null = to;
        while (node !== null) {
          path.unshift(node);
          node = parent.get(node) ?? null;
        }
        return path;
      }

      const neighbors = this.getNeighbors(current);
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);
          queue.push(neighbor);
        }
      });
    }

    return [];
  }

  /**
   * Check if node exists
   */
  hasNode(nodeId: T): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Get graph size
   */
  size(): { nodes: number; edges: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edgeMap.size,
    };
  }
}
