/**
 * AST-based method length analyzer using the TypeScript compiler API.
 * Replaces regex heuristics with accurate structural analysis.
 * Handles: FunctionDeclaration, MethodDeclaration, ArrowFunction,
 *          FunctionExpression, Constructor, get/set accessors.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import { MethodMetrics } from '../types/violations';

/** Parse a TypeScript file and return metrics for every function-like node */
export function extractMethodMetrics(filePath: string): MethodMetrics[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath, content, ts.ScriptTarget.Latest, /* setParentNodes */ true
  );

  const methods: MethodMetrics[] = [];

  function visit(node: ts.Node): void {
    if (isFunctionLike(node) && hasBody(node)) {
      const name = extractName(node, sourceFile);
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      methods.push({
        name,
        file: filePath,
        startLine: start.line + 1,  // convert 0-indexed → 1-indexed
        endLine: end.line + 1,
        lineCount: end.line - start.line + 1,
        complexity: 0,
        violations: [],
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return methods;
}

/** Compile-check a single TypeScript file; returns errors without emitting */
export function checkCompiles(filePath: string): { ok: boolean; errors: string[] } {
  const program = ts.createProgram([filePath], {
    noEmit: true,
    strict: false,           // be lenient for generated code snippets
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    skipLibCheck: true,
    allowJs: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const errors: string[] = [];
  diagnostics.forEach(d => {
    if (d.category === ts.DiagnosticCategory.Error) {
      errors.push(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    }
  });
  return { ok: errors.length === 0, errors };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** Only count nodes that have a block body (skip expression-body arrows like `x => x+1`) */
function hasBody(node: ts.Node): boolean {
  const fn = node as ts.FunctionLikeDeclaration;
  return fn.body !== undefined && ts.isBlock(fn.body);
}

function extractName(node: ts.Node, sourceFile: ts.SourceFile): string {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isMethodDeclaration(node)) return node.name.getText(sourceFile);
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (ts.isGetAccessorDeclaration(node)) return `get ${node.name.getText(sourceFile)}`;
  if (ts.isSetAccessorDeclaration(node)) return `set ${node.name.getText(sourceFile)}`;

  // Arrow / function expression — climb to variable/property declaration for name
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (parent && ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  return '<anonymous>';
}
