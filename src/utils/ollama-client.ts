/**
 * Ollama Client for local code suggestions
 * Connects to GPU-enabled Ollama for fast inference (100-500ms)
 */

import { execSync } from 'child_process';

export interface OllamaRequest {
  codeSnippet: string;
  violation: string;
  language?: string;
}

export interface OllamaResponse {
  suggestion: string;
  latencyMs: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

export class OllamaClient {
  private host: string = 'http://localhost:11434';
  private model: string = 'mistral'; // or llama2, neural-chat, etc.

  constructor(host?: string, model?: string) {
    if (host) this.host = host;
    if (model) this.model = model;
  }

  /**
   * Check if Ollama is running and model is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Try to curl Ollama API
      const result = execSync(`curl -s ${this.host}/api/tags`, { encoding: 'utf-8' });
      return result.includes(this.model);
    } catch {
      return false;
    }
  }

  /**
   * Get suggestion from Ollama for a code violation
   */
  async getSuggestion(request: OllamaRequest): Promise<OllamaResponse> {
    const startTime = Date.now();

    try {
      const prompt = `You are a code review expert. ${request.language || 'Java'} code.

Issue: ${request.violation}

Code:
\`\`\`
${request.codeSnippet}
\`\`\`

Provide a brief, actionable refactoring suggestion (1-3 sentences). Be specific and code-focused.`;

      // Call Ollama API
      const payload = {
        model: this.model,
        prompt,
        stream: false,
        temperature: 0.3 // Low temperature for consistent suggestions
      };

      const result = execSync(
        `curl -s -X POST ${this.host}/api/generate -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`,
        { encoding: 'utf-8', timeout: 10000 }
      );

      const response = JSON.parse(result);
      const latencyMs = Date.now() - startTime;

      return {
        suggestion: response.response?.trim() || 'No suggestion available',
        latencyMs,
        tokensUsed: response.prompt_eval_count + response.eval_count || 0,
        success: true
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        suggestion: '',
        latencyMs,
        tokensUsed: 0,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Batch suggestions for multiple violations
   */
  async getSuggestions(requests: OllamaRequest[]): Promise<OllamaResponse[]> {
    return Promise.all(requests.map(req => this.getSuggestion(req)));
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.model = model;
  }
}
