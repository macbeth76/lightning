/**
 * Context Loader - fetches GitHub/Jira context + code, assembles for SLM analysis
 */

import type { MCPContext } from '../types/mcp';
import type { CodeSegment } from './segmenter';
import { GitHubMCPClient } from './github-mcp';
import { JiraMCPClient } from './jira-mcp';

export interface ContextAssembly {
  context: MCPContext;
  codeSegments: CodeSegment[];
  assembledPrompt: string;
}

export class ContextLoader {
  private githubClient: GitHubMCPClient;
  private jiraClient: JiraMCPClient;

  constructor(githubClient?: GitHubMCPClient, jiraClient?: JiraMCPClient) {
    this.githubClient = githubClient || new GitHubMCPClient();
    this.jiraClient = jiraClient || new JiraMCPClient();
  }

  /**
   * Load GitHub issue context
   */
  async loadGitHubIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    codeSegments?: CodeSegment[]
  ): Promise<ContextAssembly> {
    await this.githubClient.connect();

    const issue = await this.githubClient.getIssue(owner, repo, issueNumber);
    const context: MCPContext = {
      type: 'github-issue',
      sourceId: `${owner}/${repo}#${issueNumber}`,
      title: issue.title,
      description: issue.body,
      url: issue.url,
      metadata: {
        creator: issue.creator,
        labels: issue.labels,
        state: issue.state,
        createdAt: issue.createdAt,
      },
    };

    const assembledPrompt = this.assemblePrompt(context, codeSegments || []);

    return {
      context,
      codeSegments: codeSegments || [],
      assembledPrompt,
    };
  }

  /**
   * Load GitHub PR context
   */
  async loadGitHubPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    codeSegments?: CodeSegment[]
  ): Promise<ContextAssembly> {
    await this.githubClient.connect();

    const pr = await this.githubClient.getPullRequest(owner, repo, prNumber);
    const context: MCPContext = {
      type: 'github-pr',
      sourceId: `${owner}/${repo}#${prNumber}`,
      title: pr.title,
      description: pr.body,
      url: pr.url,
      metadata: {
        creator: pr.creator,
        labels: pr.labels,
        isDraft: pr.isDraft,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
      },
    };

    const assembledPrompt = this.assemblePrompt(context, codeSegments || []);

    return {
      context,
      codeSegments: codeSegments || [],
      assembledPrompt,
    };
  }

  /**
   * Load Jira ticket context
   */
  async loadJiraTicket(
    ticketKey: string,
    codeSegments?: CodeSegment[]
  ): Promise<ContextAssembly> {
    await this.jiraClient.connect();

    const ticket = await this.jiraClient.getTicket(ticketKey);
    const comments = await this.jiraClient.getComments();

    const context: MCPContext = {
      type: 'jira-ticket',
      sourceId: ticketKey,
      title: ticket.summary,
      description: ticket.description,
      url: ticket.url,
      metadata: {
        status: ticket.status,
        priority: ticket.priority,
        assignee: ticket.assignee,
        reporter: ticket.reporter,
        labels: ticket.labels,
        comments: comments.map((c) => `${c.author}: ${c.body}`),
      },
    };

    const assembledPrompt = this.assemblePrompt(context, codeSegments || []);

    return {
      context,
      codeSegments: codeSegments || [],
      assembledPrompt,
    };
  }

  /**
   * Assemble context + code segments into a prompt for SLM
   */
  private assemblePrompt(context: MCPContext, segments: CodeSegment[]): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push(`CONTEXT: ${context.type.toUpperCase()}`);
    lines.push(`ID: ${context.sourceId}`);
    lines.push(`TITLE: ${context.title}`);
    lines.push('='.repeat(60));
    lines.push('');
    lines.push('DESCRIPTION:');
    lines.push(context.description);
    lines.push('');

    if (segments.length > 0) {
      lines.push('CODE SEGMENTS:');
      lines.push('-'.repeat(60));
      segments.forEach((seg, i) => {
        lines.push(`[Segment ${i + 1}/${segments.length}] ${seg.name} (lines ${seg.startLine}-${seg.endLine})`);
        lines.push('');
        lines.push(seg.code);
        lines.push('');
      });
    }

    lines.push('='.repeat(60));
    lines.push('TASK: Analyze the above code in context of the issue/PR.');
    lines.push('Provide actionable suggestions for implementation or review.');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Cleanup connections
   */
  async disconnect(): Promise<void> {
    await this.githubClient.disconnect();
    await this.jiraClient.disconnect();
  }
}
