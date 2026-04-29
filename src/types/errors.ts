/**
 * Custom errors for the static analysis system
 */

export class StaticAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaticAnalysisError';
  }
}

export class MethodTooLongError extends StaticAnalysisError {
  constructor(methodName: string, lineCount: number, maxLines: number) {
    super(
      `Method '${methodName}' has ${lineCount} lines, exceeds max of ${maxLines} lines`
    );
    this.name = 'MethodTooLongError';
  }
}

export class InvalidCodeError extends StaticAnalysisError {
  constructor(message: string) {
    super(`Invalid code: ${message}`);
    this.name = 'InvalidCodeError';
  }
}

export class GraphConstructionError extends StaticAnalysisError {
  constructor(message: string) {
    super(`Failed to construct graph: ${message}`);
    this.name = 'GraphConstructionError';
  }
}

export class FileOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileOperationError';
  }
}
