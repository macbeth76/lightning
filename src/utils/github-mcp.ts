/**
 * GitHub MCP Client - connects to GitHub via Model Context Protocol
 * Uses environment variables for authentication and MCP connection details
 */

import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubRepository,
  IGitHubMCPClient,
} from '../types/mcp';
import { StaticAnalysisError } from '../types/errors';

export class GitHubMCPClient implements IGitHubMCPClient {
  private connected = false;

  /**
   * Connect to GitHub MCP (validates token availability)
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new StaticAnalysisError(
        'GITHUB_TOKEN environment variable not set. Set it to enable GitHub MCP.'
      );
    }

    // Validate token format (basic check)
    if (token.length < 20) {
      throw new StaticAnalysisError(
        'GITHUB_TOKEN appears invalid. Expected a GitHub personal access token.'
      );
    }

    this.connected = true;
  }

  /**
   * Disconnect from GitHub MCP
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get a GitHub issue (mock implementation for testing)
   */
  async getIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<GitHubIssue> {
    if (!this.connected) {
      throw new StaticAnalysisError('GitHub MCP not connected');
    }

    // This is a stub - real implementation would call the GitHub API via MCP
    const issue: GitHubIssue = {
      id: issueNumber,
      number: issueNumber,
      title: `Issue #${issueNumber}`,
      body: 'Issue body would go here',
      state: 'open',
      url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
      creator: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labels: [],
    };

    return issue;
  }

  /**
   * Get a GitHub pull request (mock implementation for testing)
   */
  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequest> {
    if (!this.connected) {
      throw new StaticAnalysisError('GitHub MCP not connected');
    }

    const pr: GitHubPullRequest = {
      id: prNumber,
      number: prNumber,
      title: `PR #${prNumber}`,
      body: 'PR body would go here',
      state: 'open',
      url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
      creator: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labels: [],
      isDraft: false,
      commits: 1,
      additions: 10,
      deletions: 5,
      changedFiles: 1,
    };

    return pr;
  }

  /**
   * Get a GitHub commit (mock implementation for testing)
   */
  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
    if (!this.connected) {
      throw new StaticAnalysisError('GitHub MCP not connected');
    }

    const commit: GitHubCommit = {
      sha,
      message: 'Commit message',
      author: 'User Name',
      timestamp: new Date().toISOString(),
      url: `https://github.com/${owner}/${repo}/commit/${sha}`,
      filesChanged: [],
    };

    return commit;
  }

  /**
   * Get a GitHub repository (mock implementation for testing)
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    if (!this.connected) {
      throw new StaticAnalysisError('GitHub MCP not connected');
    }

    const repository: GitHubRepository = {
      owner,
      name: repo,
      description: 'Repository description',
      url: `https://github.com/${owner}/${repo}`,
      language: 'TypeScript',
      stars: 0,
    };

    return repository;
  }
}
