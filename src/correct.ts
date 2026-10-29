// The engine: tokenize → alias canon → fuzzy candidates → rank → rebuild sentence.
import { damerau, editScore } from "./levenshtein.ts";
import { LEXICON, canonPorts, canonToken } from "./lexicon.ts";
import { rankCandidates } from "./rank.ts";
export interface Correction { original: string; corrected: string; changed: boolean; fixes: Array<{ from: string; to: string; score: number; via: string }>; confidence: "high" | "medium" | "low"; }
export const DEFAULT_THRESHOLD = 2; // max edit distance for a typo candidate
export function tokenize(text: string): string[] { return text.split(/(\s+)/); }
// Source-aware fuzzy resolution: returns canonical + the edit distance of
// the SOURCE lexicon token (klieo→kleio d=1 → session-audit scores 0.9).
export function fuzzyResolve(tok: string): Array<{ to: string; d: number }> {
  const t = tok.toLowerCase();
  const exact = LEXICON.find((e) => e.token.toLowerCase() === t);
  if (exact) return exact.canonical && exact.canonical !== exact.token ? [{ to: exact.canonical, d: 0 }] : [];
  return LEXICON
    .map((e) => ({ to: e.canonical ?? e.token, d: damerau(e.token.toLowerCase(), t) }))
    .filter((x) => x.d <= DEFAULT_THRESHOLD && x.to.toLowerCase() !== t)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
}
export function candidatesFor(tok: string): string[] {
  const t = tok.toLowerCase();
  const exact = LEXICON.find((e) => e.token.toLowerCase() === t);
  if (exact) return exact.canonical && exact.canonical !== exact.token ? [exact.canonical] : [];
  // Fuzzy surface = ALL entries (incl aliases) so a typo of an alias token
  // resolves through its canonical (klieo → kleio → session-audit).
  const fuzzy = LEXICON
    .map((e) => ({ e, d: damerau(e.token.toLowerCase(), t) }))
    .filter((x) => x.d <= DEFAULT_THRESHOLD && x.e.token.toLowerCase() !== t)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
  const out: string[] = [];
  for (const { e } of fuzzy) {
    const canon = e.canonical ?? e.token;
    if (!out.includes(canon)) out.push(canon);
  }
  return out;
}
export async function correct(text: string, opts: { threshold?: number; maxFixes?: number; embed?: boolean } = {}): Promise<Correction> {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const maxFixes = opts.maxFixes ?? 3;
  const toks = tokenize(text);
  const fixes: Correction["fixes"] = [];
  let changed = false;
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    if (/^\s*$/.test(tok)) continue; // whitespace
    // KEY=VAL aware: canonicalize the KEY half (HERD_PORT=25100 → BORNITE_PORT=25100).
    const eq = tok.indexOf("=");
    if (eq > 0) {
      const k = tok.slice(0, eq);
      const ck = canonToken(k);
      if (ck !== k) {
        const v = tok.slice(eq);
        fixes.push({ from: k, to: ck, score: 1, via: "alias" });
        toks[i] = ck + v;
        changed = true;
      }
      continue;
    }
    const bare = tok.replace(/^[^A-Za-z0-9_]+|[^A-Za-z0-9_]+$/g, "");
    const pre = tok.slice(0, tok.indexOf(bare) === -1 ? 0 : tok.indexOf(bare));
    const post = tok.slice((tok.indexOf(bare) === -1 ? 0 : tok.indexOf(bare)) + bare.length);
    if (!bare) continue;
    const canon = canonToken(bare);
    if (canon !== bare) {
      fixes.push({ from: bare, to: canon, score: 1, via: "alias" });
      toks[i] = pre + canon + post;
      changed = true;
      continue;
    }
    const cands = candidatesFor(bare).slice(0, 8);
    if (cands.length === 0 || fixes.length >= maxFixes) continue;
    // Source-aware edit path: a d<=2 lexicon hit is a deterministic typo.
    const fr = fuzzyResolve(bare)[0];
    const ranked = opts.embed === false ? [] : await rankCandidates(bare, cands, {});
    const best = fr
      ? { token: fr.to, score: fr.d === 0 ? 1 : fr.d === 1 ? 0.9 : 0.8, via: "edit" as const }
      : ranked.length
        ? ranked[0]
        : { token: cands[0], score: editScore(bare, cands[0]), via: "edit" as const };
    if (best.score >= 0.82 || (best.via === "edit" && best.score >= 0.8)) {
      fixes.push({ from: bare, to: best.token, score: best.score, via: best.via });
      toks[i] = pre + best.token + post;
      changed = true;
    }
  }
  const confidence: Correction["confidence"] = fixes.length === 0 ? "low" : fixes.every((f) => f.via === "alias" || f.score >= 0.82) ? "high" : "medium";
  return { original: text, corrected: toks.join(""), changed, fixes, confidence };
}
// Pure keyword-flag helper (used by the hook for denial-mode detection).
export function containsDangerous(text: string): boolean {
  return /OMP_CLIPBOARD_COMMAND|rm -rf \/|>\s*\/dev\/null|--force-push/.test(text);
}
