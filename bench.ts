#!/usr/bin/env bun
// typo-kit bench — damerau + alias canon throughput (bun-first perf proof)
import { performance } from "node:perf_hooks";
import { damerau, canonSentence, correct } from "./src/index.ts";
const N = 100_000;
let t0 = performance.now();
let acc = 0;
for (let i = 0; i < N; i++) acc += damerau("pitchfork", "pitckfork");
const dlMs = (performance.now() - t0).toFixed(1);
t0 = performance.now();
for (let i = 0; i < N; i++) canonSentence("HERD_PORT kleio herd daemon");
const canonMs = (performance.now() - t0).toFixed(1);
t0 = performance.now();
for (let i = 0; i < 1_000; i++) await correct("run kleio report", { embed: false });
const corMs = (performance.now() - t0).toFixed(1);
console.log(JSON.stringify({ damerau_100k_ms: dlMs, canon_100k_ms: canonMs, correct_1k_ms: corMs, opsPerSec: Math.round(1000 / (Number(dlMs) / N)) }, null, 2));
