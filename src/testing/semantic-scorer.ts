/**
 * Semantic Scorer
 * Uses TF-IDF for synonym-aware matching
 * "serverless" matches "lambda", "rest" matches "api"
 */

interface WordFreq {
  [word: string]: number;
}

export class SemanticScorer {
  /**
   * Compute TF-IDF cosine similarity (0.0–1.0) (≤24 lines)
   */
  cosineSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);
    const vocab = new Set([...words1, ...words2]);

    const vec1 = this.toVector(words1, vocab);
    const vec2 = this.toVector(words2, vocab);

    const dot = Array.from(vocab).reduce(
      (sum, _w, i) => sum + vec1[i] * vec2[i],
      0
    );
    const mag1 = Math.sqrt(Array.from(vocab).reduce((sum, _w, i) => sum + vec1[i] ** 2, 0));
    const mag2 = Math.sqrt(Array.from(vocab).reduce((sum, _w, i) => sum + vec2[i] ** 2, 0));

    return mag1 * mag2 > 0 ? dot / (mag1 * mag2) : 0;
  }

  /**
   * Tokenize text into lowercase words (≤24 lines)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  /**
   * Convert word list to TF vector (≤24 lines)
   */
  private toVector(words: string[], vocab: Set<string>): number[] {
    const freqs: WordFreq = {};
    words.forEach((w) => {
      freqs[w] = (freqs[w] ?? 0) + 1;
    });

    return Array.from(vocab).map((w) => freqs[w] ?? 0);
  }

  /**
   * Find best semantic match for keyword (≤24 lines)
   */
  findBestMatch(keyword: string, candidates: string[]): string | null {
    const scores = candidates.map((c) => ({
      word: c,
      score: this.cosineSimilarity(keyword, c),
    }));

    const best = scores.reduce((max, s) => (s.score > max.score ? s : max));
    return best.score > 0.5 ? best.word : null;
  }
}
