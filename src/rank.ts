// Embedding client (llama.cpp-compatible /embed or OpenAI-compatible /embeddings) + gating.
import { cosine, editScore } from "./levenshtein.ts";
export interface EmbedModel { model: string; dim: number; ctx: number; availability: "none" | "mock" | "live"; }
export const EMBED_CONTRACT: EmbedModel = { model: "Qwen3-Embedding-0.6B-GGUF", dim: 1024, ctx: 32768, availability: "none" };
export interface RankOpts { url?: string; timeoutMs?: number; instruct?: string; }
const INST_PREFIX = "Given a web search query, retrieve relevant passages that answer the query: ";
// OpenAI-compatible embeddings call (llama.cpp --embedding serves /v1/embeddings).
export async function embedOne(text: string, opts: RankOpts = {}): Promise<number[] | null> {
  const url = opts.url ?? process.env.TYPO_EMBED_URL;
  if (!url) return null;
  const body = { model: EMBED_CONTRACT.model, input: opts.instruct ? INST_PREFIX + text : text };
  try {
    const r = await fetch(`${url}/v1/embeddings`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(opts.timeoutMs ?? 1500),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: Array<{ embedding: number[] }> };
    return j.data?.[0]?.embedding ?? null;
  } catch { return null; }
}
export async function rankCandidates(query: string, candidates: string[], opts: RankOpts = {}): Promise<Array<{ token: string; score: number; via: "embed" | "edit" }>> {
  if (candidates.length === 0) return [];
  const qv = await embedOne(query, opts);
  if (qv) {
    const scored: Array<{ token: string; score: number; via: "embed" | "edit" }> = [];
    for (const c of candidates) {
      const cv = await embedOne(c, opts);
      if (cv) scored.push({ token: c, score: cosine(qv, cv), via: "embed" });
    }
    if (scored.length) return scored.sort((a, b) => b.score - a.score);
  }
  // ← deterministic edit-distance fallback (embedding endpoint absent)
  return candidates
    .map((c) => ({ token: c, score: editScore(query, c), via: "edit" as const }))
    .sort((a, b) => b.score - a.score);
}
