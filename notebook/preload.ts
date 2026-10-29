// typo-kit notebook preload — import in tau OR kappa eval kernels.
// Usage (one line, once per kernel):  await import("/home/toxic/pens/ranch/products/typo-kit/notebook/preload.ts")
// Injects: globalThis.typo = { correct, canon, candidates, damerau, danger, shake }
import { correct, canonSentence, candidatesFor, damerau, containsDangerous } from "../src/index.ts";
import type { Correction } from "../src/correct.ts";
type TypoKit = { correct: (t: string, o?: { embed?: boolean }) => Promise<Correction>; canon: (t: string) => string; candidates: (t: string) => string[]; damerau: (a: string, b: string) => number; danger: (t: string) => boolean; shake: (t: string) => Promise<{ in: string; out: string; fixes: Correction["fixes"] }> };
const api: TypoKit = {
  correct: (t, o) => correct(t, o),
  canon: canonSentence,
  candidates: candidatesFor,
  damerau,
  danger: containsDangerous,
  shake: async (t) => { const r = await correct(t); return { in: t, out: r.corrected, fixes: r.fixes }; },
};
(globalThis as Record<string, unknown>).typo = api;
console.log("[typo-kit] notebook preload ready: typo.correct / typo.canon / typo.shake / typo.candidates / typo.danger / typo.damerau");
export { api };
