/**
 * OllamaChat — agentic /api/chat loop with tool calling.
 * Runs until the model calls the `done` tool or max iterations reached.
 * Uses a keep-alive axios instance; one connection per agent session.
 */

import axios, { AxiosInstance } from 'axios';
import { LIGHTNING_MODEL, OLLAMA_HOST } from './config';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

const MAX_ITERATIONS = 30;

export class OllamaChat {
  private http: AxiosInstance;
  private model: string;

  constructor(host: string = OLLAMA_HOST, model: string = LIGHTNING_MODEL) {
    this.model = model;
    this.http = axios.create({
      baseURL: host,
      timeout: 120_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async run(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    handlers: Map<string, ToolHandler>
  ): Promise<string> {
    const history = [...messages];
    const toolDefs = tools.map(t => ({ type: 'function' as const, function: t }));

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const res = await this.http.post('/api/chat', {
        model: this.model,
        messages: history,
        tools: toolDefs,
        stream: false,
      });

      const msg: ChatMessage = res.data.message;
      history.push(msg);

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return msg.content ?? '';
      }

      const results = await Promise.all(
        msg.tool_calls.map(async tc => {
          if (tc.function.name === 'done') {
            const args = JSON.parse(tc.function.arguments || '{}');
            return { id: tc.id, result: args.result ?? '' };
          }
          const handler = handlers.get(tc.function.name);
          if (!handler) {
            return { id: tc.id, result: `Error: unknown tool ${tc.function.name}` };
          }
          const args = JSON.parse(tc.function.arguments || '{}');
          const result = await handler(args);
          return { id: tc.id, result };
        })
      );

      for (const { id, result } of results) {
        const tc = msg.tool_calls!.find(t => t.id === id)!;
        if (tc.function.name === 'done') {
          return result;
        }
        history.push({ role: 'tool', content: result, tool_call_id: id });
      }
    }

    return 'Max iterations reached without completion.';
  }
}
