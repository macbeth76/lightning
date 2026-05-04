/**
 * GraphPipeline — graph-first code generation pipeline.
 * Order: build graph → identify target nodes → generate each segment → validate → assemble.
 * The LLM never sees more than 24 lines at a time.
 */

import { ProjectGraphAnalyzer } from '../utils/project-graph-analyzer';
import { OllamaChat } from './ollama-chat';
import { makeHandlers, makeContext, TOOL_DEFINITIONS } from './tools';
import { LIGHTNING_MODEL, OLLAMA_HOST, MAX_SEGMENT_LINES } from './config';

export interface PipelineOptions {
  cwd: string;
  task: string;
  targetFiles?: string[];
  model?: string;
  host?: string;
}

export interface PipelineResult {
  filesWritten: string[];
  segmentsGenerated: number;
  violations: string[];
}

export class GraphPipeline {
  private chat: OllamaChat;

  constructor(host: string = OLLAMA_HOST, model: string = LIGHTNING_MODEL) {
    this.chat = new OllamaChat(host, model);
  }

  async run(opts: PipelineOptions): Promise<PipelineResult> {
    const ctx = makeContext(opts.cwd);
    const handlers = makeHandlers(ctx);

    const analyzer = new ProjectGraphAnalyzer(opts.cwd);
    await analyzer.buildGraph();
    const graphSummary = await analyzer.generateGraphSummary();

    const systemPrompt = this.buildSystemPrompt(graphSummary, opts.cwd);
    const userPrompt = this.buildUserPrompt(opts.task, opts.targetFiles);

    await this.chat.run(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      TOOL_DEFINITIONS,
      handlers
    );

    return {
      filesWritten: [...ctx.filesWritten],
      segmentsGenerated: [...ctx.segmentCache.values()]
        .reduce((n, segs) => n + segs.length, 0),
      violations: [],
    };
  }

  private buildSystemPrompt(graphSummary: string, cwd: string): string {
    return [
      `You are Lightning, a local AI coding agent. You enforce two invariants:`,
      `1. Every code segment MUST be ≤${MAX_SEGMENT_LINES} lines (use write_file which validates this).`,
      `2. All code generation follows graph theory: analyze the project graph first,`,
      `   identify which nodes (files/segments) need to change, then generate one node at a time.`,
      ``,
      `Working directory: ${cwd}`,
      ``,
      `Project graph summary:`,
      graphSummary,
      ``,
      `Workflow:`,
      `- Call build_graph to understand dependencies`,
      `- Call analyze_file on files you need to change`,
      `- Generate segment-by-segment using write_file (24-line max per function/block)`,
      `- Verify with get_violations`,
      `- Call done when finished`,
    ].join('\n');
  }

  private buildUserPrompt(task: string, targetFiles?: string[]): string {
    const fileHint = targetFiles?.length
      ? `\nFocus on: ${targetFiles.join(', ')}`
      : '';
    return `Task: ${task}${fileHint}`;
  }
}
