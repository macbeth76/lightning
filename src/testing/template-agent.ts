/**
 * Template Agent
 * Describes a project using only keyword/package.json matching.
 * This is the "dumb" baseline agent for comparison.
 */

import * as fs from 'fs';
import * as path from 'path';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class TemplateAgent {
  /**
   * Analyze a project via package.json keyword matching only (≤24 lines)
   */
  analyze(projectPath: string): string {
    const pkg = this.loadPackage(path.join(projectPath, 'package.json'));
    const stack = this.detectStack(pkg);
    const pattern = this.detectPattern(projectPath, pkg);
    return `This is a ${pattern} using ${stack}`;
  }

  /**
   * Load and parse package.json safely (≤24 lines)
   */
  private loadPackage(pkgPath: string): PackageJson {
    try {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJson;
    } catch {
      return {};
    }
  }

  /**
   * Detect tech stack from dependency names (≤24 lines)
   */
  private detectStack(pkg: PackageJson): string {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const found: string[] = [];
    if (deps['aws-sdk'] || deps['@aws-sdk/client-dynamodb']) found.push('AWS SDK');
    if (deps['express']) found.push('Express');
    if (deps['pg']) found.push('PostgreSQL');
    if (deps['@grpc/grpc-js']) found.push('gRPC');
    if (deps['protobufjs']) found.push('Protobuf');
    return found.length > 0 ? found.join(', ') : 'unknown stack';
  }

  /**
   * Detect architectural pattern from project name (≤24 lines)
   */
  private detectPattern(projectPath: string, pkg: PackageJson): string {
    const name = (pkg.name ?? path.basename(projectPath)).toLowerCase();
    if (name.includes('lambda') || name.includes('handler')) return 'Lambda function';
    if (name.includes('api') || name.includes('rest')) return 'REST API';
    if (name.includes('microservice') || name.includes('grpc')) return 'microservice';
    return 'Node.js application';
  }
}
