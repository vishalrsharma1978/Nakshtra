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
