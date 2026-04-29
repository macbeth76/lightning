/**
 * Unit tests for MCP integration
 */

import { GitHubMCPClient } from '../github-mcp';
import { JiraMCPClient } from '../jira-mcp';
import { ContextLoader } from '../context-loader';
import { StaticAnalysisError } from '../../types/errors';

describe('MCP Integration', () => {
  describe('GitHubMCPClient', () => {
    it('should create a client instance', () => {
      const client = new GitHubMCPClient();
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection errors gracefully', async () => {
      const client = new GitHubMCPClient();
      // Mock: connection will fail without valid MCP setup
      try {
        await client.connect();
      } catch (err) {
        expect(err instanceof StaticAnalysisError).toBe(true);
      }
    });
  });

  describe('JiraMCPClient', () => {
    it('should create a client instance', () => {
      const client = new JiraMCPClient();
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection errors gracefully', async () => {
      const client = new JiraMCPClient();
      try {
        await client.connect();
      } catch (err) {
        expect(err instanceof StaticAnalysisError).toBe(true);
      }
    });
  });

  describe('ContextLoader', () => {
    it('should create a context loader with injected clients', () => {
      const githubClient = new GitHubMCPClient();
      const jiraClient = new JiraMCPClient();
      const loader = new ContextLoader(githubClient, jiraClient);
      expect(loader).toBeDefined();
    });

    it('should create a context loader with default clients', () => {
      const loader = new ContextLoader();
      expect(loader).toBeDefined();
    });

    it('should assemble prompt correctly', async () => {
      const loader = new ContextLoader();
      const mockContext = {
        type: 'github-issue' as const,
        sourceId: 'torvalds/linux#1',
        title: 'Test Issue',
        description: 'Test Description',
        url: 'https://github.com/torvalds/linux/issues/1',
        metadata: { labels: ['bug', 'critical'] },
      };

      const mockSegments = [
        {
          id: 'seg1',
          name: 'function test',
          code: 'function test() {\n  return 42;\n}',
          startLine: 1,
          endLine: 3,
          lineCount: 3,
          type: 'function' as const,
          dependencies: [],
          metadata: { complexity: 1 },
        },
      ];

      // Use private method via type assertion for testing
      const prompt = (loader as unknown as { assemblePrompt(context: unknown, segments: unknown): string }).assemblePrompt(
        mockContext,
        mockSegments
      );

      expect(prompt).toContain('CONTEXT: GITHUB-ISSUE');
      expect(prompt).toContain('ID: torvalds/linux#1');
      expect(prompt).toContain('TITLE: Test Issue');
      expect(prompt).toContain('CODE SEGMENTS:');
      expect(prompt).toContain('function test');
    });
  });
});
