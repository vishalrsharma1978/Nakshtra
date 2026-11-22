import { test } from "node:test";
import assert from "node:assert/strict";
import { computeKundli, summarizeKundliForAi } from "../src/index";

const INPUT = {
  date: "1992-10-25",
  time: "14:30",
  utcOffsetMinutes: 330,
  latitude: 19.076,
  longitude: 72.8777,
};

test("AI kundli summary covers all charts, dashas, transit and varshaphal", () => {
  const s = summarizeKundliForAi(INPUT, computeKundli(INPUT), {
    name: "Test",
    now: new Date(Date.UTC(2026, 0, 15)),
  });
  for (const c of [
    "D1",
    "D2",
    "D3",
    "D4",
    "D7",
    "D9",
    "D10",
    "D12",
    "D16",
    "D20",
    "D24",
    "D27",
    "D30",
    "D40",
    "D45",
    "D60",
  ]) {
    assert.ok(s.includes(`${c} `), `missing ${c}`);
  }
  for (const key of [
    "LAGNA: Aquarius",
    "ASHTAKAVARGA",
    "CURRENT PERIOD",
    "TRANSIT",
    "VARSHAPHAL",
    "Gulika",
    "Bhrigu Bindu",
    "Arudha",
  ]) {
    assert.ok(s.includes(key), `missing ${key}`);
  }
  assert.ok(s.length < 12000, `summary too long: ${s.length}`);
});

test("AI context lists the only dates the AI may quote, all from computed tables", () => {
  const k = computeKundli(INPUT);
  const s = summarizeKundliForAi(INPUT, k, {
    now: new Date(Date.UTC(2026, 0, 15)),
  });
  assert.ok(s.includes("ALLOWED DATES"));
  const allowedBlock = s.slice(s.indexOf("ALLOWED DATES"));
  // Every Mahadasha boundary is listed exactly as computed
  for (const d of k.dashas) {
    const start = d.start.toISOString().slice(0, 10);
    const end = d.end.toISOString().slice(0, 10);
    assert.ok(
      allowedBlock.includes(`${d.lord} Mahadasha: ${start} to ${end}`),
      `missing ${d.lord} mahadasha`,
    );
  }
  // Every date in the allowed block is a computed dasha/antardasha/varsha date
  const computed = new Set<string>();
  for (const d of k.dashas) {
    computed.add(d.start.toISOString().slice(0, 10));
    computed.add(d.end.toISOString().slice(0, 10));
  }
  for (const m of allowedBlock.matchAll(/\d{4}-\d{2}-\d{2}/g)) {
    const inAntar = s.slice(0, s.indexOf("ALLOWED DATES")).includes(m[0]);
    assert.ok(
      computed.has(m[0]) || inAntar,
      `date ${m[0]} is not backed by a computed table`,
    );
  }
});
