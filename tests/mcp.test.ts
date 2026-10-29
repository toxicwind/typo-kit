import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { isB64, maybeDecode, serve } from "../mcp/server.ts";
let server: ReturnType<typeof serve>;
let port: number;
beforeAll(async () => { server = serve(0); port = Number(server.port); });
afterAll(() => { server.stop(true); });
const rpc = async (body: unknown, sid?: string) => {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (sid) h["mcp-session-id"] = sid;
  const r = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST", headers: h, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() as any };
};
describe("decode-max helpers", () => {
  it("isB64 rejects plain text", () => { expect(isB64("run kleio")).toBe(false); });
  it("isB64 accepts padded b64", () => { expect(isB64(Buffer.from("klieo").toString("base64"))).toBe(true); });
  it("maybeDecode roundtrips", () => { const b = Buffer.from("run klieo HERD_PORT=1").toString("base64"); expect(maybeDecode(b)).toBe("run klieo HERD_PORT=1"); });
  it("maybeDecode leaves plain text alone", () => { expect(maybeDecode("restart thresher")).toBe("restart thresher"); });
});
describe("MCP surface", () => {
  it("health", async () => { const r = await fetch(`http://127.0.0.1:${port}/health`); expect(r.status).toBe(200); });
  it("initialize", async () => { const { status, json } = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {} } }); expect(status).toBe(200); expect(json.result.serverInfo.name).toBe("typo-kit-mcp"); });
  it("tools/list has all 7", async () => { const { json } = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }); const names = json.result.tools.map((t: any) => t.name); expect(names).toContain("typo_correct"); expect(names).toContain("typo_decode"); expect(names).toContain("typo_vision"); expect(names.length).toBe(7); });
  it("typo_correct decodes b64 input", async () => { const b = Buffer.from("run klieo report").toString("base64"); const { json } = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "typo_correct", arguments: { text: b } } }); const out = JSON.parse(json.result.content[0].text); expect(out.corrected).toContain("session-audit"); });
  it("typo_decode reports decoded + corrected", async () => { const b = Buffer.from("herd daemon HERD_PORT=1").toString("base64"); const { json } = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "typo_decode", arguments: { b64: b } } }); const out = JSON.parse(json.result.content[0].text); expect(out.decoded).toContain("herd daemon"); expect(out.corrected).toContain("bornite daemon"); });
  it("typo_danger decodes b64", async () => { const b = Buffer.from("echo x > /dev/null").toString("base64"); const { json } = await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "typo_danger", arguments: { text: b } } }); const out = JSON.parse(json.result.content[0].text); expect(out.dangerous).toBe(true); });
  it("typo_lexicon supports filter", async () => { const { json } = await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "typo_lexicon", arguments: { filter: Buffer.from("vision kit").toString("base64") } } }); const out = JSON.parse(json.result.content[0].text); expect(out.entries.length).toBeGreaterThanOrEqual(1); });
});
