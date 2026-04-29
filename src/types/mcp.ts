/**
 * MCP (Model Context Protocol) types for GitHub and Jira integration
 */

/**
 * GitHub Issue/PR context
 */
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  url: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
}

export interface GitHubPullRequest extends GitHubIssue {
  isDraft: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface GitHubRepository {
  owner: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  url: string;
  filesChanged: GitHubFileChange[];
}

export interface GitHubFileChange {
  filename: string;
  status: 'added' | 'removed' | 'modified';
  additions: number;
  deletions: number;
  patch?: string;
}

/**
 * Jira Ticket context
 */
export interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  status: string;
  priority: 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest';
  assignee: string | null;
  reporter: string;
  created: string;
  updated: string;
  dueDate: string | null;
  url: string;
  labels: string[];
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface JiraIssueLink {
  type: string;
  linkedTicket: JiraTicket;
}

/**
 * MCP Client interface
 */
export interface IMCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/**
 * GitHub MCP Client interface
 */
export interface IGitHubMCPClient extends IMCPClient {
  getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue>;
  getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest>;
  getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit>;
  getRepository(owner: string, repo: string): Promise<GitHubRepository>;
}

/**
 * Jira MCP Client interface
 */
export interface IJiraMCPClient extends IMCPClient {
  getTicket(ticketKey: string): Promise<JiraTicket>;
  getComments(ticketKey: string): Promise<JiraComment[]>;
  getIssueLinks(ticketKey: string): Promise<JiraIssueLink[]>;
}

/**
 * MCP Context (combined GitHub/Jira data)
 */
export interface MCPContext {
  type: 'github-issue' | 'github-pr' | 'jira-ticket';
  sourceId: string;
  title: string;
  description: string;
  url: string;
  metadata: Record<string, unknown>;
}
