/**
 * Validator — synchronous 24-line enforcer.
 * Wraps CodeSegmenter and throws on any segment that exceeds MAX_SEGMENT_LINES.
 * Called before every write_file operation; <1ms CPU cost.
 */

import { CodeSegmenter } from '../utils/segmenter';
import { MAX_SEGMENT_LINES } from './config';

export interface ValidationResult {
  valid: boolean;
  violations: ViolationDetail[];
}

export interface ViolationDetail {
  segmentIndex: number;
  lineCount: number;
  preview: string;
}

export function validateCode(code: string, filePath: string): ValidationResult {
  const segments = CodeSegmenter.segmentCode(filePath, code, MAX_SEGMENT_LINES);
  const violations: ViolationDetail[] = [];

  segments.forEach((seg, idx) => {
    if (seg.lineCount > MAX_SEGMENT_LINES) {
      violations.push({
        segmentIndex: idx,
        lineCount: seg.lineCount,
        preview: seg.code.split('\n').slice(0, 3).join('\n'),
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

export function assertValid(code: string, filePath: string): void {
  const result = validateCode(code, filePath);
  if (!result.valid) {
    const details = result.violations
      .map(v => `  segment ${v.segmentIndex}: ${v.lineCount} lines (max ${MAX_SEGMENT_LINES})\n    ${v.preview}`)
      .join('\n');
    throw new Error(`24-line violation in ${filePath}:\n${details}`);
  }
}
