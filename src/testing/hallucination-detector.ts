/**
 * Hallucination Detector
 * Catches false positives: tech mentioned but NOT in dependencies
 */

export interface HallucinationResult {
  isHallucinating: boolean;
  falsePositives: string[];
  confidence: number;
}

export class HallucinationDetector {
  /**
   * Tech keywords and their package names (≤24 lines)
   */
  private readonly techMap: Record<string, string[]> = {
    mongodb: ['mongodb', 'mongoose'],
    postgresql: ['pg', 'postgres'],
    mysql: ['mysql', 'mysql2'],
    redis: ['redis', 'ioredis'],
    dynamodb: ['aws-sdk', '@aws-sdk/client-dynamodb', 'dynamodb'],
    express: ['express'],
    fastify: ['fastify'],
    grpc: ['@grpc/grpc-js', '@grpc/proto-loader'],
    kubernetes: ['kubernetes-client'],
    docker: ['dockerode'],
    react: ['react', 'react-dom'],
    vue: ['vue'],
    angular: ['@angular/core'],
  };

  /**
   * Detect hallucinations in agent output (≤24 lines)
   */
  detect(output: string, availableDeps: string[]): HallucinationResult {
    const lower = output.toLowerCase();
    const falsePositives: string[] = [];

    for (const [tech, packages] of Object.entries(this.techMap)) {
      const mentioned = lower.includes(tech) || lower.includes(tech.replace(/\s+/, ''));
      const available = packages.some((p) =>
        availableDeps.some((d) => d.toLowerCase().includes(p.toLowerCase()))
      );

      if (mentioned && !available) {
        falsePositives.push(tech);
      }
    }

    const confidence = 1.0 - falsePositives.length * 0.2;
    return {
      isHallucinating: falsePositives.length > 0,
      falsePositives,
      confidence: Math.max(0, confidence),
    };
  }
}
