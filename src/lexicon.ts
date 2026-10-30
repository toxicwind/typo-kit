/* Estate-domain lexicon: tokens → canonical names + kind. Kept deterministic (no network).
   Edits here require a test. */
export type LexKind = "alias" | "cmd" | "daemon" | "port" | "product" | "pen" | "host" | "agent" | "net" | "proto" | "file" | "tool";
export interface LexEntry { token: string; kind: LexKind; canonical: string; alias?: string; }

export const LEXICON: LexEntry[] = [
  { token: "kleio", kind: "product", canonical: "session-audit", alias: "kleio-helper" },
  { token: "kleio-helper", kind: "alias", canonical: "session-audit" },
  { token: "thorn", kind: "alias", canonical: "session-audit" },
  { token: "session-audit", kind: "cmd", canonical: "session-audit" },
  { token: "bornite", kind: "product", canonical: "bornite" },
  { token: "herd", kind: "alias", canonical: "bornite" },
  { token: "HERD_PORT", kind: "port", canonical: "BORNITE_PORT" },
  { token: "LLAMA_SWAP_PORT", kind: "port", canonical: "BORNITE_PORT" },
  { token: "llama-swap", kind: "alias", canonical: "bornite" },
  { token: "yote", kind: "product", canonical: "yote" },
  { token: "yote-relay", kind: "alias", canonical: "yote" },
  { token: "YOTE_PORT", kind: "port", canonical: "YOTE_RELAY_PORT" },
  { token: "YOTE_CORE_PORT", kind: "port", canonical: "YOTE_CORE_PORT" },
  { token: "rig", kind: "product", canonical: "rig" },
  { token: "estate-router", kind: "product", canonical: "estate-router" },
  { token: "estate-router-ts", kind: "alias", canonical: "estate-router" },
  { token: "prometheus", kind: "product", canonical: "prometheus" },
  { token: "grafana", kind: "product", canonical: "grafana" },
  { token: "null-g-proxy", kind: "product", canonical: "null-g-proxy" },
  { token: "ghas-api", kind: "product", canonical: "ghas-api" },
  { token: "ghas-mcp", kind: "product", canonical: "ghas-mcp" },
  { token: "mesh-hub", kind: "product", canonical: "mesh-hub" },
  { token: "brand", kind: "product", canonical: "brand" },
  { token: "bench-radar", kind: "product", canonical: "bench-radar" },
  { token: "yote-core", kind: "alias", canonical: "yote" },
  { token: "tau", kind: "pen", canonical: "tau" },
  { token: "kappa", kind: "pen", canonical: "kappa" },
  { token: "kilo", kind: "pen", canonical: "kilo" },
  { token: "muse", kind: "pen", canonical: "muse" },
  { token: "skopos", kind: "pen", canonical: "skopos" },
  { token: "keryx", kind: "pen", canonical: "keryx" },
  { token: "rhodochrosite", kind: "product", canonical: "rhodochrosite" },
  { token: "kryptos", kind: "product", canonical: "kryptos" },
  { token: "keygate", kind: "product", canonical: "keygate" },
  { token: "keypool", kind: "product", canonical: "keypool" },
  { token: "secretsmith", kind: "product", canonical: "secretsmith" },
  { token: "thresher", kind: "product", canonical: "thresher" },
  { token: "flotilla", kind: "product", canonical: "flotilla" },
  { token: "flotilla-mcp", kind: "product", canonical: "flotilla-mcp" },
  { token: "squawk", kind: "product", canonical: "squawk" },
  { token: "corral", kind: "product", canonical: "corral" },
  { token: "barn", kind: "pen", canonical: "barn" },
  { token: "olympus", kind: "pen", canonical: "olympus" },
  { token: "geode", kind: "pen", canonical: "geode" },
  { token: "awrawr", kind: "pen", canonical: "awrawr" },
  { token: "nuvio", kind: "product", canonical: "nuvio" },
  { token: "nuvio-webos", kind: "product", canonical: "nuvio-webos" },
  { token: "aether", kind: "product", canonical: "aether" },
  { token: "strem", kind: "alias", canonical: "aether" },
  { token: "ipk", kind: "tool", canonical: "ipk" },
  { token: "ports.env", kind: "file", canonical: "ports.env" },
  { token: "hashline", kind: "tool", canonical: "hashline" },
  { token: "funnel", kind: "net", canonical: "funnel" },
  { token: "tailscale", kind: "net", canonical: "tailscale" },
  { token: "estate", kind: "pen", canonical: "estate" },
];

export const PORT_ALIASES: Record<string, string> = {
  HERD_PORT: "BORNITE_PORT", LLAMA_SWAP_PORT: "BORNITE_PORT",
  YOTE_PORT: "YOTE_RELAY_PORT", YOTE_CORE_PORT: "YOTE_CORE_PORT",
  MCPPROXY_API_KEY: "THRESHER_API_KEY",
};
export function canonPorts(text: string): string {
  for (const [oldK, newK] of Object.entries(PORT_ALIASES)) text = text.split(oldK).join(newK);
  return text;
}
export function canonToken(tok: string): string {
  const e = LEXICON.find((x) => x.token.toLowerCase() === tok.toLowerCase());
  return e ? (e.canonical === e.token ? e.token : e.canonical) : tok;
}
export function canonSentence(text: string): string {
  let out = canonPorts(text);
  const words = out.match(/[A-Za-z0-9_]+=/g) ?? [];
  for (const w of words) {
    const k = w.slice(0, -1);
    const c = canonToken(k);
    if (c !== k) out = out.split(`${k}=`).join(`${c}=`);
  }
  return out;
}

function damerau(a: string, b: string): number {
  const A = a.toLowerCase(), B = b.toLowerCase();
  if (A === B) return 0;
  const n = A.length, m = B.length;
  if (n === 0) return m; if (m === 0) return n;
  let prev: number[] = [], curr: number[] = [];
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1])
        curr[j] = Math.min(curr[j], prev[j - 2] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

export function fuzzyResolve(tok: string): Array<{ to: string; d: number }> {
  const t = tok.toLowerCase();
  const exact = LEXICON.find((e) => e.token.toLowerCase() === t);
  if (exact) return exact.canonical && exact.canonical !== exact.token ? [{ to: exact.canonical, d: 0 }] : [];
  return LEXICON
    .map((e) => ({ to: e.canonical ?? e.token, d: damerau(e.token.toLowerCase(), t) }))
    .filter((x) => x.d <= 2 && x.to.toLowerCase() !== t)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
}
