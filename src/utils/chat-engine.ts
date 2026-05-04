/**
 * Lightning Chat Engine
 * Interactive code generation with automatic 24-line validation
 */

import * as readline from 'readline';
import { LightningAgent } from '../agent';

export class LightningChatEngine {
  private rl: readline.Interface;
  private isInteractive: boolean;
  private isClosed = false;
  private agent: LightningAgent;

  constructor() {
    this.isInteractive = process.stdin.isTTY;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.agent = new LightningAgent({ cwd: process.cwd() });
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
            while (processing) {
              await new Promise(r => setTimeout(r, 10));
            }
            console.log('\n✅ Goodbye!\n');
            this.agent.close();
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

  private async processUserInput(input: string): Promise<void> {
    console.log('\n⚡ Lightning is thinking...\n');
    try {
      const result = await this.agent.ask(input);
      console.log(`\n⚡ Lightning:\n${result}\n`);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
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
