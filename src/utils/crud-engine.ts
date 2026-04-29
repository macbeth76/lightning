/**
 * CrudEngine — Ollama-driven file operations with 24-line enforcement.
 * Create, update, and delete TypeScript files/methods atomically.
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { StaticAnalyzer } from './analyzer';
import { FileOperationError } from '../types/errors';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://host.docker.internal:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'phi3:mini';
const MAX_RETRIES = 3;
const MAX_LINES = 24;

export type FileType = 'service' | 'controller' | 'model' | 'repository' | 'middleware' | 'util';

export interface CreateOptions {
  type: FileType;
  description?: string;
  methods?: string[];
}

export interface UpdateOptions {
  addMethod: string;
  description?: string;
}

export interface DeleteOptions {
  method: string;
}

export interface CrudResult {
  filePath: string;
  operation: 'create' | 'update' | 'delete';
  success: boolean;
  linesWritten: number;
  violations: number;
  attempts: number;
}

/** Ollama-driven file CRUD with 24-line enforcement */
export class CrudEngine {
  /**
   * Generate and write a new TypeScript file via Ollama.
   * Retries up to MAX_RETRIES times if violations are detected.
   */
  async create(filePath: string, options: CreateOptions): Promise<CrudResult> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const { content, attempts } = await this.generateWithRetry(
      this.buildCreatePrompt(filePath, options)
    );

    this.writeAtomic(filePath, content);
    const violations = this.countViolations(filePath);

    return {
      filePath, operation: 'create', success: true,
      linesWritten: content.split('\n').length, violations, attempts,
    };
  }

  /**
   * Add a new method to an existing file via Ollama.
   * Splices generated method before the final closing brace.
   */
  async update(filePath: string, options: UpdateOptions): Promise<CrudResult> {
    if (!fs.existsSync(filePath)) {
      throw new FileOperationError(`File not found: ${filePath}`);
    }

    const existing = fs.readFileSync(filePath, 'utf-8');
    const { content: newMethod, attempts } = await this.generateWithRetry(
      this.buildUpdatePrompt(filePath, existing, options)
    );

    const updated = this.spliceMethod(existing, newMethod);
    this.writeAtomic(filePath, updated);
    const violations = this.countViolations(filePath);

    return {
      filePath, operation: 'update', success: true,
      linesWritten: newMethod.split('\n').length, violations, attempts,
    };
  }

  /**
   * Remove a named method from an existing file.
   * Finds method by name, removes from signature to closing brace.
   */
  delete(filePath: string, options: DeleteOptions): CrudResult {
    if (!fs.existsSync(filePath)) {
      throw new FileOperationError(`File not found: ${filePath}`);
    }

    const original = fs.readFileSync(filePath, 'utf-8');
    const updated = this.removeMethod(original, options.method);

    if (updated === original) {
      throw new FileOperationError(`Method '${options.method}' not found in ${filePath}`);
    }

    this.writeAtomic(filePath, updated);

    return {
      filePath, operation: 'delete', success: true,
      linesWritten: updated.split('\n').length, violations: 0, attempts: 1,
    };
  }

  /** Generate code with retry on 24-line violations */
  private async generateWithRetry(prompt: string): Promise<{ content: string; attempts: number }> {
    let attempts = 0;
    let lastContent = '';

    for (let i = 0; i < MAX_RETRIES; i++) {
      attempts++;
      const code = await this.callOllama(i === 0 ? prompt : this.buildFixPrompt(lastContent));
      if (!code) break;
      lastContent = code;

      const tmp = `/tmp/crud-check-${Date.now()}.ts`;
      fs.writeFileSync(tmp, code);
      const report = StaticAnalyzer.analyzeFile(tmp);
      fs.unlinkSync(tmp);

      if (report.violations.length === 0) return { content: code, attempts };
    }

    return { content: lastContent || this.fallback(prompt), attempts };
  }

  /** Write content atomically via tmp file swap */
  private writeAtomic(filePath: string, content: string): void {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, filePath);
  }

  /** Splice new method before the last closing brace of the file */
  private spliceMethod(existing: string, newMethod: string): string {
    const lastBrace = existing.lastIndexOf('}');
    if (lastBrace === -1) return `${existing}\n\n${newMethod}`;
    return `${existing.slice(0, lastBrace)}\n${newMethod}\n${existing.slice(lastBrace)}`;
  }

  /** Remove a named method block from source using brace counting */
  private removeMethod(source: string, methodName: string): string {
    const lines = source.split('\n');
    const startIdx = lines.findIndex(l => new RegExp(`\\b${methodName}\\s*[\\(\\{]`).test(l));
    if (startIdx === -1) return source;

    let braces = 0, endIdx = startIdx, found = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { braces++; found = true; }
        else if (ch === '}') braces--;
      }
      if (found && braces === 0) { endIdx = i; break; }
    }

    return [...lines.slice(0, startIdx), ...lines.slice(endIdx + 1)].join('\n');
  }

  private countViolations(filePath: string): number {
    return StaticAnalyzer.analyzeFile(filePath).violations.length;
  }

  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await axios.post(OLLAMA_URL, {
        model: OLLAMA_MODEL, prompt, stream: false,
      }, { timeout: 30000 });
      return (response.data?.response ?? '')
        .replace(/^```(?:typescript|ts)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
    } catch { return ''; }
  }

  private buildCreatePrompt(filePath: string, options: CreateOptions): string {
    const name = path.basename(filePath, '.ts');
    const methods = options.methods?.join(', ') ?? 'none specified';
    return `Generate a TypeScript ${options.type} class named ${name}.
${options.description ? `Description: ${options.description}` : ''}
Methods to include: ${methods}
Rules:
- Every method MUST be ≤ ${MAX_LINES} lines
- No 'any' types — use strict TypeScript
- Use interface for object shapes
- Use process.env for config — no hardcoded values
- Export the class as default
Return ONLY valid TypeScript code, no markdown fences.`;
  }

  private buildUpdatePrompt(_filePath: string, existing: string, options: UpdateOptions): string {
    return `Add a method named '${options.addMethod}' to this TypeScript file.
${options.description ? `Description: ${options.description}` : ''}
Existing code:
${existing}
Rules:
- The new method MUST be ≤ ${MAX_LINES} lines
- No 'any' types
- Return ONLY the new method body (not the whole class), no markdown fences.`;
  }

  private buildFixPrompt(violating: string): string {
    return `This TypeScript code has methods exceeding ${MAX_LINES} lines. Refactor each method to be ≤ ${MAX_LINES} lines by extracting helpers.
Code:
${violating}
Return ONLY valid TypeScript, no markdown fences.`;
  }

  private fallback(prompt: string): string {
    return `// Generated fallback — Ollama unavailable\n// Prompt: ${prompt.slice(0, 80)}\nexport class Handler {\n  handle(input: unknown): unknown {\n    return input;\n  }\n}\n`;
  }
}
