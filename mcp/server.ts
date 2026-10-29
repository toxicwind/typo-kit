#!/usr/bin/env bun
// typo-kit MCP drop-in — streamable HTTP JSON-RPC (flotilla reference shape).
// DECODE-MAX: every text arg auto-detects base64 and decodes first; the
// decode/compose tools chain the estate bins (shim, hook, vision-kit).
import { correct, canonSentence, candidatesFor, LEXICON, rankCandidates, containsDangerous, fuzzyResolve } from "../src/index.ts";
const DECODE_MAX = /^[A-Za-z0-9+/]*={0,2}$/;
export function isB64(s: string): boolean {
  if (s.length < 8 || s.length % 4 !== 0) return false;
  return DECODE_MAX.test(s);
}
// Decode ONLY when the payload undeniably decodes: roundtrip-stable AND the
// result contains whitespace (plain estate tokens like "bornite" decode to
// control garbage and must pass through untouched — incl. unpadded b64).
export function maybeDecode(s: string): string {
  try {
    if (!isB64(s)) return s;
    const decoded = Buffer.from(s, "base64").toString("utf8");
    if (!/\s/.test(decoded)) return s;
    if (Buffer.from(decoded).toString("base64").replace(/=+$/, "") !== s.replace(/=+$/, "")) return s;
    return decoded;
  } catch { return s; }
}
export const tools = [
  { name: "typo_correct", description: "Correct estate-domain typos/aliases (kleio→session-audit, herd→bornite, HERD_PORT→BORNITE_PORT). Text args auto-decode base64.", schema: { type: "object", properties: { text: { type: "string" }, embed: { type: "boolean" } }, required: ["text"] }, run: async (a: Record<string, unknown>) => await correct(maybeDecode(String(a.text ?? "")), { embed: a.embed !== false }) },
  { name: "typo_canon", description: "Canonicalize aliases only. herd_* → bornite_*, kleio → session-audit. b64 auto-decoded.", schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, run: async (a: Record<string, unknown>) => ({ corrected: canonSentence(maybeDecode(String(a.text ?? ""))) }) },
  { name: "typo_candidates", description: "Fuzzy candidates for one token (edit-distance ≤2 → canonical, embed-ranked when available). b64 auto-decoded.", schema: { type: "object", properties: { token: { type: "string" }, embed: { type: "boolean" } }, required: ["token"] }, run: async (a: Record<string, unknown>) => ({ candidates: fuzzyResolve(maybeDecode(String(a.token ?? ""))).map((x) => ({ to: x.to, d: x.d })), ranked: await rankCandidates(maybeDecode(String(a.token ?? "")), candidatesFor(maybeDecode(String(a.token ?? ""))), {}) }) },
  { name: "typo_decode", description: "Decode base64 → correct → report both payloads. The LG-root decode lane.", schema: { type: "object", properties: { b64: { type: "string" }, embed: { type: "boolean" } }, required: ["b64"] }, run: async (a: Record<string, unknown>) => { const raw = String(a.b64 ?? ""); const decoded = maybeDecode(raw); const r = await correct(decoded, { embed: a.embed !== false }); return { decoded, corrected: r.corrected, fixes: r.fixes, confidence: r.confidence }; } },
  { name: "typo_lexicon", description: "Dump the estate lexicon (token, kind, canonical) — b64-decoded query accepted.", schema: { type: "object", properties: { filter: { type: "string" } } }, run: async (a: Record<string, unknown>) => { const f = maybeDecode(String(a.filter ?? "")).toLowerCase().trim(); const words = f ? f.split(/\s+/).filter(Boolean) : []; return { entries: words.length ? LEXICON.filter((e) => { const hay = (e.token + " " + (e.canonical ?? "")).toLowerCase(); return words.every((w) => hay.includes(w)); }) : LEXICON, filter: words }; } },
  { name: "typo_danger", description: "Flag dangerous patterns the hook denies (clipboard writes, destructive). b64 auto-decoded.", schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, run: async (a: Record<string, unknown>) => ({ dangerous: containsDangerous(maybeDecode(String(a.text ?? ""))) }) },
  { name: "typo_vision", description: "Lint a screenshot: b64 image → vision-kit narrate (qwen3.6-35b) → typo-correct the OCR text. Falls back to a decode-only report if vision-kit absent.", schema: { type: "object", properties: { imageB64: { type: "string" } }, required: ["imageB64"] }, run: async (a: Record<string, unknown>) => {
    const b64 = String(a.imageB64 ?? "");
    try {
      const VK_URL = "file:///home/toxic/pens/ranch/products/vision-kit/src/index.mjs";
      const vk = (await import(VK_URL)) as { narratePage?: (o: { b64: string }) => Promise<{ said?: string }> } | null;
      const narr = await vk?.narratePage?.({ b64 });
      const r = await correct(narr?.said ?? "", { embed: false });
      return { source: "vision-kit", narrated: narr?.said, corrected: r.corrected, fixes: r.fixes };
    } catch (e) {
      return { source: "decode-only", error: String(e), payloadBytes: Math.round(b64.length * 3 / 4) };
    }
  } },
];
export const mcph = {
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/health") return Response.json({ ok: true, service: "typo-kit-mcp", tools: tools.length });
    if (req.method !== "POST" || url.pathname !== "/mcp") return Response.json({ ok: false, error: "not found" }, { status: 404 });
    let rpc: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
    try { rpc = await req.json(); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 }); }
    const id = rpc.id ?? null;
    if (rpc.method === "initialize") return Response.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "typo-kit-mcp", version: "1.1.0" } } });
    if (rpc.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (rpc.method === "tools/list") return Response.json({ jsonrpc: "2.0", id, result: { tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.schema })) } });
    if (rpc.method === "tools/call") {
      const params = rpc.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const t = tools.find((x) => x.name === name);
      if (!t) return Response.json({ jsonrpc: "2.0", id, error: { code: -32602, message: "unknown tool " + name } }, { status: 400 });
      try { return Response.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(await t.run(args)) }] } }); }
      catch (e) { return Response.json({ jsonrpc: "2.0", id, error: { code: -32603, message: String(e) } }, { status: 500 }); }
    }
    return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "unknown method " + rpc.method } }, { status: 400 });
  },
};
export function serve(port = Number(process.env.TYPO_KIT_PORT ?? 25229)) {
  return Bun.serve({ port, async fetch(req) { return mcph.handle(req); } });
}
if (import.meta.main) {
  const server = serve();
  console.log(`typo-kit-mcp: http://127.0.0.1:${server.port}/mcp (decode-max, ${tools.length} tools)`);
}
