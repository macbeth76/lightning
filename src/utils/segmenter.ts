/**
 * Code segmentation: break code into ≤24-line segments for SLM consumption
 */


export interface CodeSegment {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  code: string;
  type: 'function' | 'class' | 'block' | 'statement';
  name: string;
  dependencies: string[];
  metadata: Record<string, unknown>;
}

export interface SegmentManifest {
  file: string;
  segments: CodeSegment[];
  segmentMap: Map<string, CodeSegment>;
  dependencyMap: Map<string, string[]>;
}

/**
 * Segment code using graph boundaries
 */
export class CodeSegmenter {
  private static readonly MAX_SEGMENT_LENGTH = 24;

  /**
   * Parse code lines into segments
   */
  static segmentCode(
    file: string,
    code: string,
    maxLength: number = this.MAX_SEGMENT_LENGTH
  ): CodeSegment[] {
    const lines = code.split('\n');
    const segments: CodeSegment[] = [];
    let currentSegment: string[] = [];
    let segmentStartLine = 0;
    let segmentId = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentSegment.push(line);

      // Check for natural breaking points (end of function, class, etc.)
      const isBreakPoint =
        line.trim().endsWith('}') &&
        currentSegment.length > 0 &&
        this.isBalancedBraces(currentSegment.join('\n'));

      if (currentSegment.length >= maxLength || isBreakPoint) {
        if (currentSegment.length > 0) {
          const segment = this.createSegment(
            file,
            segmentId++,
            segmentStartLine + 1,
            i + 1,
            currentSegment.join('\n')
          );
          segments.push(segment);
          currentSegment = [];
          segmentStartLine = i + 1;
        }
      }
    }

    // Add remaining lines
    if (currentSegment.length > 0) {
      const segment = this.createSegment(
        file,
        segmentId,
        segmentStartLine + 1,
        lines.length,
        currentSegment.join('\n')
      );
      segments.push(segment);
    }

    return segments;
  }

  /**
   * Check if braces are balanced in code
   */
  private static isBalancedBraces(code: string): boolean {
    let count = 0;
    for (const char of code) {
      if (char === '{') count++;
      else if (char === '}') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Create a segment object
   */
  private static createSegment(
    file: string,
    id: number,
    startLine: number,
    endLine: number,
    code: string
  ): CodeSegment {
    const lineCount = code.split('\n').length;
    const name = this.extractSegmentName(code);

    return {
      id: `${file}:segment:${id}`,
      file,
      startLine,
      endLine,
      lineCount,
      code,
      type: this.classifySegment(code),
      name,
      dependencies: this.extractDependencies(code),
      metadata: {
        complexity: this.estimateComplexity(code),
        hasImports: code.includes('import '),
        hasAsync: code.includes('async '),
      },
    };
  }

  /**
   * Extract function/class name from segment
   */
  private static extractSegmentName(code: string): string {
    const functionMatch = code.match(/(?:function|async function)\s+(\w+)/);
    if (functionMatch) return functionMatch[1];

    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];

    const methodMatch = code.match(/(\w+)\s*\([^)]*\)\s*[:{]/);
    if (methodMatch) return methodMatch[1];

    return '<segment>';
  }

  /**
   * Classify segment type
   */
  private static classifySegment(code: string): 'function' | 'class' | 'block' | 'statement' {
    if (code.match(/(?:function|async function)\s+\w+/)) return 'function';
    if (code.match(/class\s+\w+/)) return 'class';
    if (code.match(/\{[\s\S]*\}/)) return 'block';
    return 'statement';
  }

  /**
   * Extract dependencies (imports, function calls)
   */
  private static extractDependencies(code: string): string[] {
    const deps = new Set<string>();

    // Extract imports
    const importMatches = code.matchAll(/import\s+(?:.*?)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      deps.add(match[1]);
    }

    // Extract function calls
    const callMatches = code.matchAll(/\b(\w+)\s*\(/g);
    for (const match of callMatches) {
      const func = match[1];
      if (
        !this.isKeyword(func) &&
        !this.isBuiltin(func) &&
        func !== 'function' &&
        func !== 'class'
      ) {
        deps.add(func);
      }
    }

    return Array.from(deps);
  }

  /**
   * Check if identifier is a keyword
   */
  private static isKeyword(word: string): boolean {
    const keywords = new Set([
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'try',
      'catch',
      'finally',
      'return',
      'break',
      'continue',
      'throw',
      'const',
      'let',
      'var',
      'function',
      'class',
      'async',
      'await',
      'yield',
    ]);
    return keywords.has(word);
  }

  /**
   * Check if identifier is a builtin
   */
  private static isBuiltin(word: string): boolean {
    const builtins = new Set([
      'console',
      'Math',
      'Object',
      'Array',
      'String',
      'Number',
      'Boolean',
      'Date',
      'JSON',
      'Promise',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
    ]);
    return builtins.has(word);
  }

  /**
   * Estimate cyclomatic complexity
   */
  private static estimateComplexity(code: string): number {
    let complexity = 1;
    complexity += (code.match(/\bif\b/g) || []).length;
    complexity += (code.match(/\belse\s+if\b/g) || []).length;
    complexity += (code.match(/\bcase\b/g) || []).length;
    complexity += (code.match(/\bfor\b/g) || []).length;
    complexity += (code.match(/\bwhile\b/g) || []).length;
    complexity += (code.match(/\bcatch\b/g) || []).length;
    complexity += (code.match(/[?:]\s*[^:]/g) || []).length / 2; // ternary operator
    return complexity;
  }

  /**
   * Build segment manifest with dependency map
   */
  static buildManifest(
    file: string,
    code: string,
    maxLength: number = this.MAX_SEGMENT_LENGTH
  ): SegmentManifest {
    const segments = this.segmentCode(file, code, maxLength);
    const segmentMap = new Map<string, CodeSegment>();
    const dependencyMap = new Map<string, string[]>();

    segments.forEach((segment) => {
      segmentMap.set(segment.id, segment);
      dependencyMap.set(segment.id, segment.dependencies);
    });

    return {
      file,
      segments,
      segmentMap,
      dependencyMap,
    };
  }
}
