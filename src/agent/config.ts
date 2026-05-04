/**
 * Central configuration for Lightning agent.
 * All model/host settings come from env vars with sensible defaults
 * sized for Jetson Orin 8GB (~2GB model, 4-5GB headroom).
 *
 * Endpoint priority (first reachable wins):
 *   1. OLLAMA_HOST env var (explicit override)
 *   2. Jetson Orin via Tailscale (JETSON_OLLAMA_HOST)
 *   3. localhost:11434 (default / local Ollama)
 *
 * Model priority:
 *   Jetson target: qwen3:1.7b  (~1.1GB, tools-capable)
 *   Dev/Windows:   qwen3-14b-16k or qwen2.5-coder:14b
 */

export const LIGHTNING_MODEL = process.env.LIGHTNING_MODEL ?? 'qwen3:1.7b';

/** Jetson Orin Ollama — reachable via Tailscale or USB ethernet (192.168.55.1) */
export const JETSON_OLLAMA_HOST = process.env.JETSON_OLLAMA_HOST ?? 'http://192.168.55.1:11434';

export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

/** Maximum lines per code segment — the core invariant. */
export const MAX_SEGMENT_LINES = 24;

/**
 * Resolve the best available Ollama host at runtime.
 * Tries OLLAMA_HOST first, then Jetson, then localhost.
 * Pass `probe=true` to do a live reachability check (async).
 */
export async function resolveOllamaHost(probe = false): Promise<string> {
  if (!probe) return OLLAMA_HOST;

  const candidates = [
    OLLAMA_HOST,
    JETSON_OLLAMA_HOST,
    'http://localhost:11434',
  ];

  for (const host of candidates) {
    try {
      const { default: axios } = await import('axios');
      await axios.get(`${host}/api/version`, { timeout: 2000 });
      return host;
    } catch {
      // try next
    }
  }
  return OLLAMA_HOST; // fallback even if unreachable
}
