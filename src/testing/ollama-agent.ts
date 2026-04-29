/**
 * Ollama Agent
 * Builds a graph of the project and asks Ollama to describe it.
 * This is the "intelligent" agent under test.
 */

import axios from 'axios';
import { ProjectGraphAnalyzer } from '../utils/project-graph-analyzer';

export class OllamaAgent {
  private readonly model = 'phi3:mini';
  private readonly baseUrl = 'http://host.docker.internal:11434';

  /**
   * Analyze a project using graph theory + Ollama (≤24 lines)
   */
  async analyze(projectPath: string): Promise<string> {
    const analyzer = new ProjectGraphAnalyzer(projectPath);
    await analyzer.buildGraph();
    const graphSummary = await analyzer.generateGraphSummary();
    const fileContext = analyzer.getGraphForContext();
    return this.queryOllama(graphSummary, fileContext);
  }

  /**
   * Send graph context to Ollama for project description (≤24 lines)
   */
  private async queryOllama(summary: string, context: string): Promise<string> {
    const prompt = `You are a code analyst. Identify this project's architecture and technology stack.

${context}

Graph summary: ${summary}

Respond with ONE sentence: "This is a [architecture] using [list the specific technologies from the dependencies above]."
Use the exact dependency names (e.g. express, grpc, dynamodb) in your response.`;

    try {
      const res = await axios.post(
        `${this.baseUrl}/api/generate`,
        { model: this.model, prompt, stream: false },
        { timeout: 30000 }
      );
      return (res.data.response ?? '').trim();
    } catch {
      return 'Error: Ollama unavailable';
    }
  }
}
