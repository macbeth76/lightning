/**
 * Ollama SLM provider implementation
 */

import * as http from 'http';
import { SLMProvider, SLMRequest, SLMResponse, SLMModel, OllamaConfig, OllamaPullResponse, OllamaGenerateResponse } from '../types/slm';
import { StaticAnalysisError } from '../types/errors';

export class OllamaProvider extends SLMProvider {
  private config: OllamaConfig;
  private availableModels: SLMModel[] = [];

  constructor(config: Partial<OllamaConfig> = {}) {
    super();
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 11434,
      timeout: config.timeout || 300000,
    };
  }

  /**
   * Initialize Ollama provider
   */
  async initialize(): Promise<void> {
    try {
      const healthy = await this.isHealthy();
      if (!healthy) {
        throw new StaticAnalysisError(
          `Ollama server not responding at ${this.config.host}:${this.config.port}`
        );
      }

      this.availableModels = await this.getAvailableModels();
      console.log(`Ollama initialized with ${this.availableModels.length} models`);
    } catch (err) {
      throw new StaticAnalysisError(`Failed to initialize Ollama: ${(err as Error).message}`);
    }
  }

  /**
   * Check if Ollama server is healthy
   */
  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://${this.config.host}:${this.config.port}/api/tags`, () => {
        resolve(true);
      });

      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<SLMModel[]> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://${this.config.host}:${this.config.port}/api/tags`,
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              const models: SLMModel[] = (response.models || []).map((m: { name: string; size: number }) => ({
                name: m.name,
                version: m.name.split(':')[1] || 'latest',
                parameterCount: m.size, // Approximate
                description: m.name,
              }));
              resolve(models);
            } catch (err) {
              reject(new StaticAnalysisError(`Failed to parse Ollama models: ${(err as Error).message}`));
            }
          });
        }
      );

      req.on('error', (err) =>
        reject(new StaticAnalysisError(`Failed to fetch Ollama models: ${(err as Error).message}`))
      );

      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new StaticAnalysisError('Ollama request timeout'));
      });
    });
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ name: modelName, stream: false });

      const options = {
        hostname: this.config.host,
        port: this.config.port,
        path: '/api/pull',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data) as OllamaPullResponse;
            if (response.status === 'success') {
              resolve();
            } else {
              reject(new StaticAnalysisError(`Failed to pull model: ${response.status}`));
            }
          } catch (err) {
            reject(new StaticAnalysisError(`Failed to parse pull response: ${(err as Error).message}`));
          }
        });
      });

      req.on('error', (err) =>
        reject(new StaticAnalysisError(`Failed to pull model: ${(err as Error).message}`))
      );

      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new StaticAnalysisError('Model pull timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Generate completion from Ollama
   */
  async generate(request: SLMRequest): Promise<SLMResponse> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const postData = JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: false,
        options: {
          num_predict: request.maxTokens || 500,
          temperature: request.temperature ?? 0.7,
          top_p: request.topP ?? 0.9,
        },
      });

      const options = {
        hostname: this.config.host,
        port: this.config.port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data) as OllamaGenerateResponse;
            const latencyMs = Date.now() - startTime;

            const tokensPrompt = response.promptEvalCount || 0;
            const tokensCompletion = response.evalCount || 0;
            const tokensUsed = tokensPrompt + tokensCompletion;

            resolve({
              text: response.response,
              tokensUsed,
              tokensPrompt,
              tokensCompletion,
              latencyMs,
              model: request.model,
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            reject(new StaticAnalysisError(`Failed to parse generate response: ${(err as Error).message}`));
          }
        });
      });

      req.on('error', (err) =>
        reject(new StaticAnalysisError(`Failed to generate: ${(err as Error).message}`))
      );

      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new StaticAnalysisError('Generate request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Shutdown Ollama connection
   */
  async shutdown(): Promise<void> {
    // Ollama runs as a service, no explicit shutdown needed
  }
}

/**
 * Singleton Ollama instance
 */
let ollamaInstance: OllamaProvider | null = null;

export async function getOllamaProvider(
  config?: Partial<OllamaConfig>
): Promise<OllamaProvider> {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaProvider(config);
    await ollamaInstance.initialize();
  }
  return ollamaInstance;
}
