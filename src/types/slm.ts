/**
 * SLM backend abstraction layer
 */

export interface SLMRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface SLMResponse {
  text: string;
  tokensUsed: number;
  tokensPrompt: number;
  tokensCompletion: number;
  latencyMs: number;
  model: string;
  timestamp: string;
}

export interface SLMModel {
  name: string;
  version: string;
  parameterCount: number; // e.g., 1000000000 for 1B
  description: string;
}

/**
 * Abstract SLM provider interface
 */
export abstract class SLMProvider {
  abstract initialize(): Promise<void>;
  abstract isHealthy(): Promise<boolean>;
  abstract getAvailableModels(): Promise<SLMModel[]>;
  abstract generate(request: SLMRequest): Promise<SLMResponse>;
  abstract shutdown(): Promise<void>;
}

export interface OllamaConfig {
  host: string;
  port: number;
  timeout: number;
}

export interface OllamaModelInfo {
  name: string;
  digest: string;
  size: number;
  modifiedAt: string;
}

export interface OllamaPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  createdAt: string;
  response: string;
  done: boolean;
  context?: number[];
  totalDuration: number;
  loadDuration: number;
  promptEvalCount?: number;
  promptEvalDuration: number;
  evalCount?: number;
  evalDuration: number;
}

/**
 * Code segment for SLM analysis
 */
export interface CodeSegment {
  id: string;
  name: string;
  code: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  type: 'function' | 'class' | 'statement' | 'import' | 'export';
  dependencies: string[];
  metadata: Record<string, unknown>;
}

