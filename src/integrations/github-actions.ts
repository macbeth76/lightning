import * as fs from 'fs';
import { execSync } from 'child_process';
import { Violation } from '../types/violations';
import { EnhancedAnalyzer } from '../utils/enhanced-analyzer';
import { PRCommenter } from '../utils/pr-commenter';

/**
 * Handles GitHub Actions integration for Lightning.
 * Analyzes PR changes and posts results to GitHub.
 */
export class GitHubActionsHandler {
  private token: string;
  private repository: string;
  private serverUrl: string;
  private eventPath: string;
  private prNumber: number = 0;
  private commitSha: string = '';

  constructor() {
    this.token = process.env.GITHUB_TOKEN || '';
    this.repository = process.env.GITHUB_REPOSITORY || '';
    this.serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    this.eventPath = process.env.GITHUB_EVENT_PATH || '';

    if (!this.token || !this.repository) {
      throw new Error(
        'Missing required GitHub env vars: GITHUB_TOKEN, GITHUB_REPOSITORY'
      );
    }
  }

  /**
   * Main entry point: handle PR analysis.
   */
  async handlePullRequest(): Promise<{ success: boolean; violations: Violation[] }> {
    try {
      // Parse PR event
      const event = this.parseEvent();
      this.prNumber = event.number;
      this.commitSha = event.head.sha;

      // Get changed files
      const files = await this.getChangedFiles();

      // Analyze changed files
      const violations = await this.analyzeChanges(files);

      // Post comment
      await this.postComment(violations);

      // Set status
      await this.setStatus(violations);

      return { success: true, violations };
    } catch (error) {
      console.error('GitHub Actions handler error:', error);
      throw error;
    }
  }

  /**
   * Parse GitHub event payload.
   */
  private parseEvent(): {
    number: number;
    head: { sha: string };
    base: { ref: string };
  } {
    if (!this.eventPath || !fs.existsSync(this.eventPath)) {
      throw new Error(`Event path not found: ${this.eventPath}`);
    }

    const event = JSON.parse(fs.readFileSync(this.eventPath, 'utf-8'));
    if (!event.pull_request) {
      throw new Error('Not a pull request event');
    }

    return event.pull_request;
  }

  /**
   * Get list of changed files in PR.
   */
  private async getChangedFiles(): Promise<string[]> {
    const [owner, repo] = this.repository.split('/');
    const url = `${this.serverUrl}/repos/${owner}/${repo}/pulls/${this.prNumber}/files`;

    const response = (await this.githubApiCall('GET', url)) as Array<{
      filename: string;
    }>;
    const files: { filename: string }[] = response;

    // Filter to TypeScript/JavaScript files
    return files
      .map((f) => f.filename)
      .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
  }

  /**
   * Analyze changed files using Phase 1 analyzer.
   */
  private async analyzeChanges(files: string[]): Promise<Violation[]> {
    const analyzer = new EnhancedAnalyzer('github-pr');
    const allViolations: Violation[] = [];

    for (const file of files) {
      if (!fs.existsSync(file)) {
        continue;
      }

      try {
        const result = await analyzer.analyzeFile(file, false);
        if (result.violations && Array.isArray(result.violations)) {
          allViolations.push(
            ...result.violations.map((v: Violation) => ({
              ...v,
              file,
            }))
          );
        }
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }

    return allViolations;
  }

  /**
   * Post comment to PR with violations.
   */
  private async postComment(violations: Violation[]): Promise<void> {
    const [owner, repo] = this.repository.split('/');
    const commenter = new PRCommenter(violations);
    const body = commenter.formatViolations();

    // Check for existing comment
    const existingComment = await this.findExistingComment();

    if (existingComment) {
      // Update existing comment
      const url = `${this.serverUrl}/repos/${owner}/${repo}/issues/comments/${existingComment.id}`;
      await this.githubApiCall('PATCH', url, { body });
    } else {
      // Post new comment
      const url = `${this.serverUrl}/repos/${owner}/${repo}/issues/${this.prNumber}/comments`;
      await this.githubApiCall('POST', url, { body });
    }
  }

  /**
   * Find existing Lightning comment on PR.
   */
  private async findExistingComment(): Promise<{ id: number } | null> {
    const [owner, repo] = this.repository.split('/');
    const url = `${this.serverUrl}/repos/${owner}/${repo}/issues/${this.prNumber}/comments`;

    const comments = (await this.githubApiCall('GET', url)) as Array<{
      id: number;
      body: string;
    }>;
    const existing = comments.find((c) =>
      c.body.includes('⚡ Lightning Code Analysis')
    );

    return existing || null;
  }

  /**
   * Set GitHub status check.
   */
  private async setStatus(violations: Violation[]): Promise<void> {
    const [owner, repo] = this.repository.split('/');
    const commenter = new PRCommenter(violations);

    const url = `${this.serverUrl}/repos/${owner}/${repo}/statuses/${this.commitSha}`;

    const payload = {
      state: commenter.getStatus(),
      description: commenter.getStatusDescription(),
      context: 'lightning-analysis',
      target_url: 'https://github.com/features/actions',
    };

    await this.githubApiCall('POST', url, payload);
  }

  /**
   * Make GitHub API call with auth.
   */
  private async githubApiCall(
    method: string,
    url: string,
    body?: unknown
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    let cmd = `curl -s -X ${method} "${url}" -H "${Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('" -H "')}"`;

    if (body) {
      const bodyStr = JSON.stringify(body).replace(/"/g, '\\"');
      cmd += ` -d "${bodyStr}"`;
    }

    try {
      const output = execSync(cmd).toString();
      return JSON.parse(output);
    } catch (error) {
      console.error('GitHub API error:', error);
      throw error;
    }
  }

  /**
   * Get PR number for testing.
   */
  getPRNumber(): number {
    return this.prNumber;
  }

  /**
   * Get commit SHA for testing.
   */
  getCommitSha(): string {
    return this.commitSha;
  }
}
