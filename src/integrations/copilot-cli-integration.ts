/**
 * Real Copilot CLI Integration
 * Calls the actual `gh copilot` command for real A/B testing
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CopilotRequest {
  code: string;
  task: string;
  language?: string;
}

export interface CopilotResponse {
  success: boolean;
  output: string;
  suggestions?: string[];
  error?: string;
  latencyMs: number;
  tokensEstimated?: number;
}

/**
 * Call real Copilot CLI with a code analysis request
 */
export async function callCopilotCLI(request: CopilotRequest): Promise<CopilotResponse> {
  const startTime = Date.now();

  try {
    const prompt = `
Code Analysis Task
==================
Language: ${request.language || 'TypeScript'}
Task: ${request.task}

Code:
\`\`\`
${request.code}
\`\`\`

Provide specific, actionable suggestions.
`;

    // Call gh copilot explain (analyzes code)
    const { stdout, stderr } = await execAsync(
      `echo ${JSON.stringify(prompt)} | gh copilot explain --`,
      {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    const latencyMs = Date.now() - startTime;

    return {
      success: !stderr,
      output: stdout.trim(),
      latencyMs,
      tokensEstimated: Math.ceil(stdout.split(/\s+/).length / 1.3),
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      output: '',
      error: (error as Error).message,
      latencyMs,
    };
  }
}

/**
 * Check if Copilot CLI is installed and authenticated
 */
export async function checkCopilotAvailability(): Promise<{
  installed: boolean;
  authenticated: boolean;
  version?: string;
}> {
  try {
    const { stdout } = await execAsync('gh auth status 2>&1');
    const authenticated = stdout.includes('Logged in');
    
    const versionCheck = await execAsync('gh --version 2>&1');
    const versionMatch = versionCheck.stdout.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    return {
      installed: true,
      authenticated,
      version,
    };
  } catch (error) {
    return {
      installed: false,
      authenticated: false,
    };
  }
}
