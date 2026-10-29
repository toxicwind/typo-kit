import { describe, expect, it } from "bun:test";
import { damerau, cosine, prefixLen } from "../src/levenshtein.ts";
import { canonSentence, canonPorts, LEXICON, PORT_ALIASES } from "../src/lexicon.ts";
import { correct, candidatesFor, containsDangerous, DEFAULT_THRESHOLD } from "../src/correct.ts";
import { rankCandidates } from "../src/rank.ts";
describe("damerau", () => {
  it("transposition costs 1", () => expect(damerau("kleio", "kleio")).toBe(0));
  it("typo klieo → kleio = 1 transposition", () => expect(damerau("klieo", "kleio")).toBe(1));
  it("herd → bornite exceeds threshold", () => expect(damerau("herd", "bornite")).toBeGreaterThan(DEFAULT_THRESHOLD));
});
describe("cosine", () => {
  it("identical = 1", () => expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1));
  it("orthogonal = 0", () => expect(cosine([1, 0], [0, 1])).toBe(0));
  it("prefix helper", () => expect(prefixLen("pitchfork", "pitchforks")).toBe(9));
});
describe("lexicon canon", () => {
  it("whole-token alias kleio → session-audit", () => expect(canonSentence("run kleio report")).toBe("run session-audit report"));
  it("herd flattens to bornite", () => expect(canonSentence("restart herd daemon")).toBe("restart bornite daemon"));
  it("port alias HERD_PORT → BORNITE_PORT", () => expect(canonPorts("HERD_PORT=25100")).toBe("BORNITE_PORT=25100"));
  it("PORT_ALIASES covers legacy trio", () => {
    expect(PORT_ALIASES.HERD_PORT).toBe("BORNITE_PORT");
    expect(PORT_ALIASES.LLAMA_SWAP_PORT).toBe("BORNITE_PORT");
    expect(PORT_ALIASES.YOTE_PORT).toBe("YOTE_RELAY_PORT");
  });
  it("lexicon has pen + daemon + agent kinds", () => {
    const kinds = new Set(LEXICON.map((e) => e.kind));
    expect(kinds.has("pen")).toBe(true);
    expect(kinds.has("daemon")).toBe(true);
    expect(kinds.has("alias")).toBe(true);
  });
});
describe("candidatesFor", () => {
  it("kleio typo proposal includes session-audit via alias", () => expect(candidatesFor("kleio").length).toBeGreaterThan(0));
  it("bornite itself → no candidates", () => expect(candidatesFor("bornite")).toEqual([]));
});
describe("correct()", () => {
  it("fixes alias kleio → session-audit", async () => {
    const r = await correct("run kleio --all", { embed: false });
    expect(r.changed).toBe(true);
    expect(r.corrected).toContain("session-audit");
    expect(r.fixes[0].via).toBe("alias");
  });
  it("canonicalizes ports", async () => {
    const r = await correct("HERD_PORT=25100", { embed: false });
    expect(r.corrected).toContain("BORNITE_PORT");
  });

  it("klieo typo resolves through alias to session-audit", async () => {
    const r = await correct("run klieo report", { embed: false });
    expect(r.changed).toBe(true);
    expect(r.corrected).toContain("session-audit");
  });
  it("no-op on clean estate sentence", async () => {
    const r = await correct("restart thresher and open flotilla", { embed: false });
    expect(r.changed).toBe(false);
  });
  it("confidence high only for alias-grade fixes", async () => {
    const r = await correct("kleio kleio HERD_PORT", { embed: false });
    expect(r.confidence).toBe("high");
  });
  it("dangerous pattern flagged", () => {
    expect(containsDangerous("echo x > /dev/null")).toBe(true);
    expect(containsDangerous("echo hi")).toBe(false);
  });
});
describe("rankCandidates fallback", () => {
  it("edit-distance fallback when no embed URL", async () => {
    const r = await rankCandidates("klieo", ["kleio", "kappa", "kairos"]);
    expect(r.length).toBe(3);
    expect(r[0].token).toBe("kleio");
    expect(r[0].via).toBe("edit");
  });
});
