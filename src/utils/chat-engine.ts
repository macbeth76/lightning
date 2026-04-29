/**
 * Lightning Chat Engine
 * Interactive code generation with automatic 24-line validation
 */

import * as readline from 'readline';
import axios from 'axios';
import { StaticAnalyzer } from './analyzer';
import { ProjectGenerator } from './project-generator';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class LightningChatEngine {
  private rl: readline.Interface;
  private history: ChatMessage[] = [];
  private isInteractive: boolean;
  private isClosed = false;
  private ollamaModel = 'phi3:mini'; // 3.8B - ultra fast for 24-line code blocks
  private useOllama = true; // Enable Ollama for interactive mode

  constructor() {
    this.isInteractive = process.stdin.isTTY;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Start interactive chat
   */
  async start(): Promise<void> {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          ⚡ Lightning Chat - Interactive Code Gen ⚡      ║
║                                                            ║
║  Ask Lightning to generate code. It validates as it goes. ║
║  Type 'exit' to quit, 'help' for commands                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Add a safety timeout to prevent hanging
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 60000); // 60 second max
    });

    await Promise.race([this.chat(), timeoutPromise]);
  }

  /**
   * Main chat loop
   */
  private async chat(): Promise<void> {
    return new Promise((resolve) => {
      let processing = false;

      // When readline closes, resolve
      this.rl.on('close', () => {
        this.isClosed = true;
        resolve();
      });

      // When stdin closes (EOF), mark that we should exit after current processing
      let shouldClose = false;
      process.stdin.on('end', () => {
        shouldClose = true;
      });

      const askQuestion = () => {
        if (this.isClosed) return;
        
        if (!this.isInteractive) {
          process.stdout.write('You: ');
        }
        this.rl.question(this.isInteractive ? 'You: ' : '', async (input) => {
          if (input.toLowerCase() === 'exit') {
            // Wait for any in-flight processing
            while (processing) {
              await new Promise(r => setTimeout(r, 10));
            }
            console.log('\n✅ Goodbye!\n');
            this.rl.close();
            return;
          }

          if (input.toLowerCase() === 'help') {
            this.showHelp();
            if (!this.isClosed) askQuestion();
            return;
          }

          if (input.trim() === '') {
            if (!this.isClosed && !shouldClose) askQuestion();
            else if (shouldClose) this.rl.close();
            return;
          }

          processing = true;
          try {
            await Promise.race([
              this.processUserInput(input),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
            ]);
          } catch (err) {
            console.log(`\n⚠️ Request timed out\n`);
          }
          processing = false;
          
          // If stdin ended and processing is done, close
          if (shouldClose) {
            this.rl.close();
          } else if (!this.isClosed) {
            askQuestion();
          }
        });
      };

      askQuestion();
    });
  }

  /**
   * Process user request - use Ollama to determine intent and route to appropriate tool
   */
  private async processUserInput(input: string): Promise<void> {
    this.history.push({ role: 'user', content: input });

    console.log('\n⚡ Lightning is thinking...\n');

    try {
      // Use Ollama to understand intent and extract parameters
      const intent = await this.detectIntent(input);

      if (intent.action === 'create-project') {
        await this.handleProjectCreation(intent);
      } else if (intent.action === 'generate-code') {
        await this.handleCodeGeneration(input);
      } else {
        // Default to code generation
        await this.handleCodeGeneration(input);
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  /**
   * Detect user intent - use regex for speed, Ollama optional
   */
  private async detectIntent(prompt: string): Promise<any> {
    // Fast regex-based detection (no Ollama call for speed)
    const lower = prompt.toLowerCase();

    // Check for project creation keywords
    if (/creat.*project|scaffold|set.*up.*project/i.test(lower)) {
      return {
        action: 'create-project',
        projectType: this.detectProjectType(lower),
        features: this.extractFeatures(lower),
        description: prompt,
      };
    }

    // Default to code generation
    return {
      action: 'generate-code',
      projectType: null,
      features: [],
      description: prompt,
    };
  }

  /**
   * Handle project creation
   */
  private async handleProjectCreation(intent: any): Promise<void> {
    console.log('📦 Creating project...\n');
    try {
      const config = {
        name: intent.name || require('path').basename(process.cwd()),
        type: intent.projectType || 'lambda',
        description: intent.description,
        features: intent.features || [],
        outputDir: process.cwd(),
      };

      await ProjectGenerator.generateProject(config);

      this.history.push({
        role: 'assistant',
        content: `Generated ${config.type} project with features: ${config.features.join(', ')}`,
      });
    } catch (error) {
      console.log(
        `❌ Project creation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      );
    }
  }

  /**
   * Handle code generation
   */
  private async handleCodeGeneration(prompt: string): Promise<void> {
    try {
      const code = await this.generateCode(prompt);
      const analysis = await this.validateCode(code);

      this.history.push({
        role: 'assistant',
        content: code,
      });

      console.log('Lightning:\n');
      console.log('```typescript');
      console.log(code);
      console.log('```\n');

      if (analysis.violations.length === 0) {
        console.log('✅ Code Analysis: PASS');
        console.log('   All functions ≤ 24 lines');
        console.log('   All rules satisfied\n');
      } else {
        console.log('⚠️  Code Analysis: VIOLATIONS FOUND\n');
        analysis.violations.forEach((v: any) => {
          console.log(`   ${v.rule}: ${v.message}`);
        });
        console.log();
      }
    } catch (error) {
      console.log(
        `❌ Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      );
    }
  }

  /**
   * Detect project type from prompt
   */
  private detectProjectType(lower: string): 'lambda' | 'api' | 'service' | 'cli' {
    if (lower.includes('api') || lower.includes('rest')) return 'api';
    if (lower.includes('service')) return 'service';
    if (lower.includes('cli')) return 'cli';
    return 'lambda';
  }

  /**
   * Extract features from prompt
   */
  private extractFeatures(lower: string): string[] {
    const features: string[] = [];
    if (lower.includes('cloudwatch')) features.push('cloudwatch');
    if (lower.includes('dynamodb')) features.push('dynamodb');
    if (lower.includes('s3')) features.push('s3');
    if (lower.includes('sns')) features.push('sns');
    if (lower.includes('sqs')) features.push('sqs');
    if (lower.includes('test') || lower.includes('testing')) features.push('testing');
    if (lower.includes('auth')) features.push('authentication');
    if (lower.includes('error')) features.push('error-handling');
    return features;
  }

  /**
   * Generate code using Ollama for interactive mode, templates as fallback
   */
  private async generateCode(prompt: string): Promise<string> {
    // Only use Ollama in true interactive TTY mode (not piped input)
    if (this.useOllama && this.isInteractive) {
      try {
        return await this.callOllama(prompt);
      } catch (error: any) {
        console.log('⚠️ Ollama unavailable, using templates instead...');
      }
    }

    console.log('📝 Generating code from templates...');
    return this.generateTemplateCode(prompt);
  }

  /**
   * Call Ollama API for code generation
   * Uses qwen2.5-coder:7b for fast, accurate TypeScript generation
   */
  private async callOllama(prompt: string, timeoutMs: number = 30000): Promise<string> {
    const systemPrompt = `You are Lightning, an expert code generation assistant.
Generate ONLY valid TypeScript/JavaScript code.
Every function MUST be ≤24 lines.
No markdown wrapper, just clean code.
If code would exceed 24 lines, split into multiple functions or simplify.`;

    const fullPrompt = `${systemPrompt}\n\nUser request: ${prompt}`;

    try {
      const response = await axios.post('http://host.docker.internal:11434/api/generate', {
        model: this.ollamaModel,
        prompt: fullPrompt,
        stream: false,
      }, {
        timeout: timeoutMs,
      });

      const code = response.data.response || '';
      // Clean up response - remove markdown wrappers if present
      const cleaned = code
        .replace(/^```(?:typescript|ts|javascript|js)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
      
      return cleaned;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama not running on host.docker.internal:11434');
      }
      throw error;
    }
  }

  /**
   * Fallback template generation
   */
  private generateTemplateCode(prompt: string): string {
    if (prompt.toLowerCase().includes('lambda')) {
      return this.generateLambda(prompt);
    }
    if (prompt.toLowerCase().includes('api')) {
      return this.generateAPI(prompt);
    }
    if (prompt.toLowerCase().includes('service')) {
      return this.generateService(prompt);
    }
    return this.generateGeneric(prompt);
  }

  /**
   * Generate Lambda handler
   */
  private generateLambda(_prompt: string): string {
    const isUserValidation = _prompt.toLowerCase().includes('user') || _prompt.toLowerCase().includes('validat');

    if (isUserValidation) {
      return `export async function handler(event: any): Promise<any> {
  const { email, name } = event.body || {};
  
  if (!validate(email, name)) {
    return error(400, 'Invalid input');
  }

  const user = { email, name, createdAt: new Date() };
  await saveUser(user);

  return success(201, user);
}

function validate(email: string, name: string): boolean {
  return email && email.includes('@') && name.length > 0;
}

function saveUser(user: any): Promise<void> {
  console.log('Saving user:', user);
  return Promise.resolve();
}

function error(code: number, message: string): object {
  return { statusCode: code, body: JSON.stringify({ error: message }) };
}

function success(code: number, data: any): object {
  return { statusCode: code, body: JSON.stringify(data) };
}`;
    }

    return `export async function handler(event: any): Promise<any> {
  console.log('Event received:', event);

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: 'Lambda executed' }),
  };

  return response;
}`;
  }

  /**
   * Generate API endpoint
   */
  private generateAPI(_prompt: string): string {
    return `import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  const user = { id: 1, name, email };
  res.status(201).json(user);
});

app.listen(3000, () => {
  console.log('API running on port 3000');
});`;
  }

  /**
   * Generate service
   */
  private generateService(_prompt: string): string {
    return `export class UserService {
  private users = new Map<string, any>();

  createUser(name: string, email: string): any {
    const user = { id: Date.now(), name, email };
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): any | undefined {
    return this.users.get(id);
  }

  listUsers(): any[] {
    return Array.from(this.users.values());
  }
}`;
  }

  /**
   * Generic code generation
   */
  private generateGeneric(prompt: string): string {
    return `// Generated based on: "${prompt}"
export function process(data: any): any {
  console.log('Processing:', data);
  return { success: true, data };
}`;
  }

  /**
   * Validate generated code
   */
  private async validateCode(code: string): Promise<any> {
    // Write temp file
    const tempFile = '/tmp/lightning-chat-gen-' + Date.now() + '.ts';
    const fs = await import('fs');
    fs.writeFileSync(tempFile, code);

    try {
      const report = StaticAnalyzer.analyzeFile(tempFile);
      return { violations: report.violations };
    } finally {
      fs.unlinkSync(tempFile);
    }
  }

  /**
   * Show help
   */
  private showHelp(): void {
    console.log(`
Commands:
  exit              Exit chat
  help              Show this help

Examples:
  Create a TypeScript Lambda that validates users
  Generate a REST API with Express
  Build a service for managing tasks
    `);
  }
}
