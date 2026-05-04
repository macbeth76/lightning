/**
 * LightningAgent — main orchestrator.
 * Wires OllamaChat + ToolRegistry + GraphPipeline + ConversationStore.
 * One session = one ConversationStore instance.
 */

import { randomUUID } from 'crypto';
import { OllamaChat } from './ollama-chat';
import { ConversationStore } from './store';
import { GraphPipeline } from './graph-pipeline';
import { makeHandlers, makeContext, TOOL_DEFINITIONS } from './tools';
import { LIGHTNING_MODEL, OLLAMA_HOST, resolveOllamaHost } from './config';

export type AgentMode = 'chat' | 'fix' | 'spec' | 'explain' | 'review';

export interface AgentOptions {
  cwd?: string;
  model?: string;
  host?: string;
  sessionId?: string;
  /** Probe candidate hosts and pick the first reachable one. */
  autoHost?: boolean;
}

export class LightningAgent {
  private chat!: OllamaChat;
  private store: ConversationStore;
  private pipeline!: GraphPipeline;
  private cwd: string;
  private readonly _ready: Promise<void>;

  constructor(opts: AgentOptions = {}) {
    this.cwd = opts.cwd ?? process.cwd();
    const model = opts.model ?? LIGHTNING_MODEL;
    const sessionId = opts.sessionId ?? randomUUID();
    this.store = new ConversationStore(sessionId, this.cwd);

    this._ready = (async () => {
      const host = opts.host ?? (opts.autoHost ? await resolveOllamaHost(true) : OLLAMA_HOST);
      this.chat = new OllamaChat(host, model);
      this.pipeline = new GraphPipeline(host, model);
    })();
  }

  private async ready(): Promise<void> { await this._ready; }

  async ask(userMessage: string): Promise<string> {
    await this.ready();
    this.store.addMessage({ role: 'user', content: userMessage });
    const ctx = makeContext(this.cwd);
    const handlers = makeHandlers(ctx);
    const history = this.store.getMessages().map(m => ({
      role: m.role,
      content: m.content,
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    }));

    const result = await this.chat.run(history, TOOL_DEFINITIONS, handlers);
    this.store.addMessage({ role: 'assistant', content: result });
    return result;
  }

  async fix(task: string, targetFiles?: string[]): Promise<string> {
    await this.ready();
    const result = await this.pipeline.run({
      cwd: this.cwd,
      task,
      targetFiles,
    });
    const summary = `Fixed. Files written: ${result.filesWritten.length}, segments: ${result.segmentsGenerated}`;
    this.store.addMessage({ role: 'user', content: `fix: ${task}` });
    this.store.addMessage({ role: 'assistant', content: summary });
    return summary;
  }

  async explain(filePath: string): Promise<string> {
    return this.ask(`Explain the code in ${filePath}. Use analyze_file to read its segments, then summarize each one.`);
  }

  async review(filePath: string): Promise<string> {
    return this.ask(`Review ${filePath} for correctness, 24-line violations, and graph design issues. Use analyze_file and get_violations.`);
  }

  async spec(description: string): Promise<string> {
    await this.ready();
    return this.pipeline.run({
      cwd: this.cwd,
      task: `Generate TypeScript source files for: ${description}. Each function must be ≤24 lines.`,
    }).then(r => `Created ${r.filesWritten.length} files with ${r.segmentsGenerated} segments.`);
  }

  close(): void {
    this.store.close();
  }
}
