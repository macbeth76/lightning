#!/usr/bin/env node
/**
 * CLI entry point for Lightning static analysis
 */

import { StaticAnalyzer } from './utils/analyzer';
import { GradleAnalyzer } from './utils/gradle-analyzer';
import { HooksSetup } from './utils/hooks-setup';
import { LightningChatEngine } from './utils/chat-engine';
import { GitHubActionsHandler } from './integrations/github-actions';
import { StaticAnalysisError, FileOperationError } from './types/errors';
import { CrudEngine, FileType } from './utils/crud-engine';

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    // Handle crud command
    if (args[0] === 'crud') {
      const operation = args[1];
      const filePath = args[2];
      const crudEngine = new CrudEngine();

      if (!operation || !filePath) {
        console.error('Usage: lightning crud <create|update|delete> <file> [options]');
        process.exit(1);
      }

      if (operation === 'create') {
        const type = (args[args.indexOf('--type') + 1] ?? 'service') as FileType;
        const description = args[args.indexOf('--description') + 1];
        const methodsIdx = args.indexOf('--methods');
        const methods = methodsIdx !== -1 ? args[methodsIdx + 1].split(',') : undefined;
        const result = await crudEngine.create(filePath, { type, description, methods });
        console.log(`✅ Created ${result.filePath} (${result.linesWritten} lines, ${result.violations} violations, ${result.attempts} attempt(s))`);
      } else if (operation === 'update') {
        const addMethod = args[args.indexOf('--add-method') + 1];
        const description = args[args.indexOf('--description') + 1];
        if (!addMethod) { console.error('--add-method <name> required'); process.exit(1); }
        const result = await crudEngine.update(filePath, { addMethod, description });
        console.log(`✅ Updated ${result.filePath} (+${result.linesWritten} lines, ${result.violations} violations)`);
      } else if (operation === 'delete') {
        const method = args[args.indexOf('--method') + 1];
        if (!method) { console.error('--method <name> required'); process.exit(1); }
        const result = crudEngine.delete(filePath, { method });
        console.log(`✅ Deleted method '${method}' from ${result.filePath}`);
      } else {
        console.error(`Unknown crud operation: ${operation}. Use create, update, or delete.`);
        process.exit(1);
      }

      process.exit(0);
    }

    // Handle chat command
    if (args[0] === 'chat') {
      const chatEngine = new LightningChatEngine();
      await chatEngine.start();
      process.exit(0);
    }

    // Handle GitHub Actions
    if (args[0] === 'github-actions' || args[0] === 'github') {
      try {
        const handler = new GitHubActionsHandler();
        const result = await handler.handlePullRequest();
        if (!result.success) {
          process.exit(1);
        }
        console.log('✓ GitHub Actions analysis complete');
        process.exit(0);
      } catch (error) {
        console.error('GitHub Actions error:', error);
        process.exit(1);
      }
    }

    // Handle hooks setup
    if (args.includes('--setup') || args.includes('--hooks')) {
      const hooksSetup = new HooksSetup();
      const action = args[args.indexOf('--setup') + 1] || args[args.indexOf('--hooks') + 1];

      if (action === 'hooks' || args.includes('--setup')) {
        const removeFlag = args.includes('--remove') || args.includes('--disable');
        const statusFlag = args.includes('--status');

        if (removeFlag) {
          await hooksSetup.remove();
        } else if (statusFlag) {
          await hooksSetup.status();
        } else {
          await hooksSetup.install();
        }
        process.exit(0);
      }
    }

    // Handle version
    if (args.includes('--version') || args.includes('-v')) {
      console.log('lightning@1.0.0');
      process.exit(0);
    }

    // Handle help
    if (args.includes('--help') || args.includes('-h') || args.length === 0) {
      console.log(`
Lightning CLI - Fast code analysis for small language models

USAGE:
  lightning [COMMAND] [OPTIONS]

COMMANDS:
  analyze <file-or-dir>         Analyze file or directory
  crud create <file>            Generate a new file via Ollama
  crud update <file>            Add a method to an existing file
  crud delete <file>            Remove a method from a file
  chat                          Interactive code generation chat
  github-actions                Analyze PR (runs in GitHub Actions)
  --setup hooks                 Install git hooks
  --version                     Show version
  --help                        Show this help

OPTIONS FOR CRUD:
  --type <type>                 File type: service|controller|model|repository|middleware|util
  --description <text>          Describe what to generate
  --methods <m1,m2>             Comma-separated methods to include (create only)
  --add-method <name>           Method name to add (update only)
  --method <name>               Method name to remove (delete only)

OPTIONS FOR ANALYZE:
  --max-length <n>              Max method length (default: 24)
  --with-suggestions            Get Ollama suggestions
  --fail-on-error               Exit with error if violations found
  --quiet                       Suppress output
  --gradle                      Analyze Gradle build files (not TypeScript)

OPTIONS FOR SETUP HOOKS:
  --remove                      Remove hooks
  --disable                     Disable hooks
  --status                      Show hook status
  --max-length <n>              Set max method length
  --fail-on <rule>              Rule to fail on

EXAMPLES:
  lightning crud create src/users/user.service.ts --type service --methods findAll,findById
  lightning crud update src/users/user.service.ts --add-method deleteById
  lightning crud delete src/users/user.service.ts --method deprecated
  lightning analyze src/
  lightning analyze src/ --max-length 20
  lightning analyze build.gradle --gradle
  lightning chat
  lightning --setup hooks
  lightning --setup hooks --status
  lightning --setup hooks --remove
  lightning github-actions      (runs in GitHub Actions CI)

For more info: https://github.com/user/lightning
`);
      process.exit(0);
    }

    // Handle analyze command
    if (args[0] === 'analyze' || (args.length > 0 && !args[0].startsWith('--'))) {
      const filePath = args[0] === 'analyze' ? args[1] : args[0];
      const maxLength = parseInt(
        args[args.indexOf('--max-length') + 1] || '24',
        10
      );
      const failOnError = args.includes('--fail-on-error');
      const quiet = args.includes('--quiet');
      const isGradle = args.includes('--gradle');

      if (!filePath) {
        console.error('Error: file or directory path required');
        process.exit(1);
      }

      const fs = require('fs');
      const isDir = fs.statSync(filePath).isDirectory();

      if (isGradle) {
        // Gradle analysis
        if (isDir) {
          const reports = GradleAnalyzer.analyzeDirectory(filePath, maxLength);

          if (!quiet) {
            if (reports.length === 0) {
              console.log(`✓ No Gradle violations found in ${filePath}`);
            } else {
              console.log(`Found ${reports.length} Gradle file(s) with violations:\n`);
              reports.forEach((report) => {
                console.log(`File: ${report.file}`);
                console.log(`  Tasks: ${report.summary.taskCount}`);
                console.log(`  Violations: ${report.summary.total}`);
                report.violations.forEach((v) => {
                  console.log(
                    `    [${v.severity.toUpperCase()}] Line ${v.line} (${v.rule}): ${v.message}`
                  );
                });
                console.log();
              });
            }
          }

          if (failOnError && reports.some(r => r.summary.errors > 0)) {
            process.exit(1);
          }
        } else {
          const report = GradleAnalyzer.analyzeFile(filePath, maxLength);

          if (!quiet) {
            if (report.violations.length === 0) {
              console.log(`✓ No Gradle violations found in ${filePath}`);
              console.log(`  ${report.summary.taskCount} task(s) analyzed`);
            } else {
              console.log(`File: ${report.file}`);
              console.log(`Tasks: ${report.summary.taskCount}`);
              console.log(`Violations: ${report.summary.total}\n`);
              report.violations.forEach((v) => {
                console.log(
                  `  [${v.severity.toUpperCase()}] Line ${v.line} (${v.rule}): ${v.message}`
                );
              });
            }
          }

          if (failOnError && report.summary.errors > 0) {
            process.exit(1);
          }
        }
      } else {
        // TypeScript/JavaScript analysis
        if (isDir) {
          const reports = StaticAnalyzer.analyzeDirectory(filePath, maxLength);

          if (!quiet) {
            if (reports.length === 0) {
              console.log(`✓ No violations found in ${filePath}`);
            } else {
              console.log(`Found ${reports.length} file(s) with violations:\n`);
              reports.forEach((report) => {
                console.log(`File: ${report.file}`);
                console.log(`  Summary: ${report.summary.total} violations`);
                report.violations.forEach((v) => {
                  console.log(
                    `    [${v.severity.toUpperCase()}] Line ${v.line}: ${v.message}`
                  );
                });
                console.log();
              });
            }
          }

          if (failOnError && reports.some(r => r.summary.errors > 0)) {
            process.exit(1);
          }
        } else {
          const report = StaticAnalyzer.analyzeFile(filePath, maxLength);

          if (!quiet) {
            if (report.violations.length === 0) {
              console.log(`✓ No violations found in ${filePath}`);
            } else {
              console.log(`File: ${report.file}`);
              console.log(`Violations: ${report.summary.total}\n`);
              report.violations.forEach((v) => {
                console.log(
                  `  [${v.severity.toUpperCase()}] Line ${v.line}: ${v.message}`
                );
              });
            }
          }

          if (failOnError && report.summary.errors > 0) {
            process.exit(1);
          }
        }
      }

      process.exit(0);
    }

    console.error('Unknown command. Use --help for usage info.');
    process.exit(1);
  } catch (error) {
    if (error instanceof StaticAnalysisError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof FileOperationError) {
      console.error(`File error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
