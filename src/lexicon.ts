// Estate-domain lexicon + alias canonicalization (rename-roundup ground truth).
export interface LexEntry { token: string; kind: "cmd" | "product" | "daemon" | "port" | "alias" | "pen" | "host" | "agent" | "net" | "proto" | "file" | "tool"; canonical?: string; }
// Canonical product/daemon names (2026-10-29 post-reorg truth).
export const LEXICON: LexEntry[] = [
  { token: "bornite", kind: "product", canonical: "bornite" },
  { token: "herd", kind: "alias", canonical: "bornite" },
  { token: "llama_swap", kind: "alias", canonical: "bornite" },
  { token: "llama-swap", kind: "alias", canonical: "bornite" },
  { token: "kleio", kind: "product", canonical: "session-audit" },
  { token: "session-audit", kind: "cmd", canonical: "session-audit" },
  { token: "kleio-helper", kind: "alias", canonical: "session-audit" },
  { token: "thorn", kind: "alias", canonical: "session-audit" },
  { token: "pitchfork", kind: "daemon", canonical: "pitchfork" },
  { token: "thresher", kind: "daemon", canonical: "thresher" },
  { token: "flotilla", kind: "product", canonical: "flotilla" },
  { token: "squawk", kind: "daemon", canonical: "squawk" },
  { token: "corral", kind: "product", canonical: "corral" },
  { token: "kairos", kind: "product", canonical: "kairos" },
  { token: "geode", kind: "pen", canonical: "geode" },
  { token: "barn", kind: "pen", canonical: "barn" },
  { token: "ranch", kind: "pen", canonical: "ranch" },
  { token: "olympus", kind: "pen", canonical: "olympus" },
  { token: "nuvio", kind: "product", canonical: "nuvio" },
  { token: "aether", kind: "product", canonical: "aether" },
  { token: "awrawr", kind: "host", canonical: "awrawr" },
  { token: "tau", kind: "agent", canonical: "tau" },
  { token: "kappa", kind: "agent", canonical: "kappa" },
  { token: "vision-kit", kind: "product", canonical: "vision-kit" },
  { token: "typo-kit", kind: "product", canonical: "typo-kit" },
  { token: "mcp", kind: "proto", canonical: "mcp" },
  { token: "ports.env", kind: "file", canonical: "ports.env" },
  { token: "HERD_PORT", kind: "port", canonical: "BORNITE_PORT" },
  { token: "LLAMA_SWAP_PORT", kind: "port", canonical: "BORNITE_PORT" },
  { token: "hashline", kind: "tool", canonical: "hashline" },
  { token: "funnel", kind: "net", canonical: "funnel" },
  { token: "tailscale", kind: "net", canonical: "tailscale" },
  { token: "estate", kind: "pen", canonical: "estate" },
];
// Port env canonicalization: *_PORT aliases always flatten to canonical target.
export const PORT_ALIASES: Record<string, string> = {
  HERD_PORT: "BORNITE_PORT", LLAMA_SWAP_PORT: "BORNITE_PORT",
  YOTE_PORT: "YOTE_RELAY_PORT", MCPPROXY_API_KEY: "THRESHER_API_KEY",
};
export function canonPorts(text: string): string {
  for (const [oldK, newK] of Object.entries(PORT_ALIASES)) text = text.split(oldK).join(newK);
  return text;
}
// Whole-token alias resolution (case-insensitive; keeps case of the match).
export function canonToken(tok: string): string {
  const low = tok.toLowerCase();
  for (const e of LEXICON) {
    if (e.token.toLowerCase() === low) return e.canonical ?? e.token;
  }
  return tok;
}
export function canonSentence(text: string): string {
  return canonPorts(text.split(/(\b)/).map((p) => /^[A-Za-z][A-Za-z0-9_.-]*$/.test(p) ? canonToken(p) : p).join(""));
}
