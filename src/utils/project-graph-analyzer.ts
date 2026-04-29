/**
 * Project Graph Analyzer
 * Uses graph theory to understand project structure
 * Builds nodes (files) and edges (imports) for fast analysis
 */

import * as fs from 'fs';
import * as path from 'path';

interface GraphNode {
  path: string;
  type: 'file' | 'package' | 'dependency';
  language?: 'ts' | 'js' | 'json';
  lines?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  type: 'import' | 'dependency';
}

interface ProjectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootDir: string;
  fileCount: number;
}

export class ProjectGraphAnalyzer {
  private rootDir: string;
  private graph: ProjectGraph;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
    this.graph = { nodes: [], edges: [], rootDir, fileCount: 0 };
  }

  /**
   * Build project graph by scanning files (≤24 lines)
   */
  async buildGraph(): Promise<ProjectGraph> {
    const files = await this.scanDirectory(this.rootDir);
    this.graph.nodes = files;
    this.graph.fileCount = files.length;

    await this.detectDependencies();
    this.analyzePatterns();

    return this.graph;
  }

  /**
   * Scan directory for TypeScript/JavaScript files (≤24 lines)
   */
  private async scanDirectory(dir: string, depth = 0): Promise<GraphNode[]> {
    if (depth > 3) return [];

    const nodes: GraphNode[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(this.rootDir, fullPath);

      if (entry.isDirectory()) {
        nodes.push(...await this.scanDirectory(fullPath, depth + 1));
      } else if (this.isRelevantFile(entry.name)) {
        nodes.push(this.createNode(relPath, entry.name));
      }
    }

    return nodes;
  }

  /**
   * Check if file is relevant for analysis (≤24 lines)
   */
  private isRelevantFile(filename: string): boolean {
    const extensions = ['.ts', '.js', '.json', '.yml', '.yaml'];
    const ignored = ['node_modules', '.git', 'dist', 'build'];
    return extensions.some((ext) => filename.endsWith(ext)) &&
           !ignored.some((ig) => filename.includes(ig));
  }

  /**
   * Create graph node for file (≤24 lines)
   */
  private createNode(relPath: string, filename: string): GraphNode {
    let language: 'ts' | 'js' | 'json' | undefined;
    if (filename.endsWith('.ts')) language = 'ts';
    else if (filename.endsWith('.js')) language = 'js';
    else if (filename.endsWith('.json')) language = 'json';

    return {
      path: relPath,
      type: filename === 'package.json' ? 'package' : 'file',
      language,
      lines: this.countFileLines(relPath),
    };
  }

  /**
   * Count lines in file (≤24 lines)
   */
  private countFileLines(filePath: string): number {
    try {
      const content = fs.readFileSync(
        path.join(this.rootDir, filePath),
        'utf8'
      );
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  /**
   * Detect dependencies from package.json (≤24 lines)
   */
  private async detectDependencies(): Promise<void> {
    const packagePath = path.join(this.rootDir, 'package.json');

    try {
      const pkgContent = fs.readFileSync(packagePath, 'utf8');
      const pkg = JSON.parse(pkgContent);

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep] of Object.entries(deps)) {
        this.graph.edges.push({
          from: 'package.json',
          to: dep as string,
          type: 'dependency',
        });
      }
    } catch {
      // No package.json or parsing failed
    }
  }

  /**
   * Scan TypeScript source files for import statements (≤24 lines)
   */
  private scanImports(): string[] {
    const imports: string[] = [];
    const tsFiles = this.graph.nodes.filter((n) => n.language === 'ts');

    for (const node of tsFiles.slice(0, 5)) {
      try {
        const content = fs.readFileSync(path.join(this.rootDir, node.path), 'utf8');
        const matches = content.match(/^import\s+.+\s+from\s+['"]([^'"]+)['"]/gm) ?? [];
        imports.push(...matches.slice(0, 8));
      } catch {
        // skip unreadable files
      }
    }

    return imports;
  }

  /**
   * Analyze patterns from file names AND dependencies (≤24 lines)
   */
  private analyzePatterns(): void {
    const deps = this.graph.edges.filter((e) => e.type === 'dependency').map((e) => e.to);
    const depStr = deps.join(' ').toLowerCase();
    const pathStr = this.graph.nodes.map((n) => n.path).join(' ').toLowerCase();

    const patterns = {
      hasLambda: pathStr.includes('handler') || depStr.includes('aws-lambda') || depStr.includes('aws-sdk'),
      hasDatabase: pathStr.includes('db') || depStr.includes('dynamodb') || depStr.includes('pg') || depStr.includes('mongo'),
      hasAPI: pathStr.includes('route') || depStr.includes('express') || depStr.includes('fastify'),
      hasGrpc: depStr.includes('grpc'),
      hasMicroservice: depStr.includes('grpc') || pathStr.includes('service'),
      languages: new Set<string>(this.graph.nodes.filter((n) => n.language).map((n) => n.language as string)),
    };

    (this.graph as any).analysis = patterns;
    (this.graph as any).deps = deps;
  }

  /**
   * Generate human-readable summary from graph (≤24 lines)
   */
  async generateGraphSummary(): Promise<string> {
    const analysis = (this.graph as any).analysis || {};
    const langs = Array.from(analysis.languages || []).join(', ');
    const deps: string[] = (this.graph as any).deps ?? [];

    const parts = [`${this.graph.fileCount} files (${langs})`];
    if (analysis.hasLambda) parts.push('Lambda/serverless handler');
    if (analysis.hasDatabase) parts.push('database layer');
    if (analysis.hasAPI) parts.push('REST API routes');
    if (analysis.hasGrpc) parts.push('gRPC service');
    if (analysis.hasMicroservice && !analysis.hasGrpc) parts.push('microservice');
    if (deps.length > 0) parts.push(`deps: ${deps.slice(0, 6).join(', ')}`);

    return parts.join(', ') + '.';
  }

  /**
   * Get graph for Ollama context — includes actual deps and import lines (≤24 lines)
   */
  getGraphForContext(): string {
    const files = this.graph.nodes
      .filter((n) => n.type === 'file' && n.language)
      .slice(0, 10)
      .map((n) => `  ${n.path} (${n.lines} lines)`)
      .join('\n');

    const deps = this.graph.edges
      .filter((e) => e.type === 'dependency')
      .map((e) => e.to)
      .join(', ');

    const imports = this.scanImports().slice(0, 6).join('\n  ');

    return `Files:\n${files}\n\nPackage deps: ${deps || 'none'}\n\nKey imports:\n  ${imports}`;
  }
}
