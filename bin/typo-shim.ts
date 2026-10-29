#!/usr/bin/env bun
// typo-shim — pipe/args text corrector. Zero deps, fail-loud, JSON mode.
import { correct, canonSentence, containsDangerous } from "../src/index.ts";
const args = process.argv.slice(2);
const flags = { json: false, canonOnly: false, embed: true, list: false, debug: false };
const pos: string[] = [];
for (const a of args) {
  if (a === "--json") flags.json = true;
  else if (a === "--canon-only") flags.canonOnly = true;
  else if (a === "--no-embed") flags.embed = false;
  else if (a === "--list") flags.list = true;
  else if (a === "--debug") flags.debug = true;
  else pos.push(a);
}
let input = pos.join(" ");
if (!input) input = await Bun.stdin.text();
if (flags.list) {
  const { LEXICON } = await import("../src/lexicon.ts");
  console.log(LEXICON.map((e) => `${e.token}	${e.kind}	${e.canonical ?? ""}`).join("\n"));
  process.exit(0);
}
if (flags.canonOnly) { console.log(canonSentence(input)); process.exit(0); }
const res = await correct(input, { embed: flags.embed });
if (flags.json) {
  const out: Record<string, unknown> = { ...res, dangerous: containsDangerous(input) };
  if (flags.debug) out.tokens = input.split(/(\s+)/);
  console.log(JSON.stringify(out, null, 2));
} else {
  if (containsDangerous(input)) console.error("[typo-shim] warning: dangerous pattern present (hook will deny)");
  console.log(res.corrected);
  if (flags.debug) console.error(JSON.stringify(res.fixes));
}
