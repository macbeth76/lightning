/**
 * Central configuration for Lightning agent.
 * All model/host settings come from env vars with sensible defaults
 * sized for Jetson Orin 8GB (~2GB model, 4-5GB headroom).
 */

export const LIGHTNING_MODEL = process.env.LIGHTNING_MODEL ?? 'qwen2.5-coder:3b';

export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

/** Maximum lines per code segment — the core invariant. */
export const MAX_SEGMENT_LINES = 24;
