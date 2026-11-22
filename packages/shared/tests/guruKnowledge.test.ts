import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerQuestion,
  buildGuruContext,
  computeKundli,
  computeNumerology,
  detectIntent,
  digitalRoot,
  gemSafetyNote,
  nameNumber,
  numbersCompatible,
} from "../src/index";

const INPUT = {
  date: "1992-10-25",
  time: "14:30",
  utcOffsetMinutes: 330,
  latitude: 19.076,
  longitude: 72.8777,
};
const NOW = new Date(Date.UTC(2026, 0, 15));
const ctx = buildGuruContext(INPUT, computeKundli(INPUT), {
  name: "Asha Verma",
  now: NOW,
});

test("digitalRoot reduces to a single digit", () => {
  assert.equal(digitalRoot(25), 7);
  assert.equal(digitalRoot(1992), 3);
  assert.equal(digitalRoot(9), 9);
  assert.equal(digitalRoot(0), 0);
});

test("numerology: mulank, bhagyank and personal year follow the standard method", () => {
  const n = computeNumerology("1992-10-25", "Asha", 2026);
  assert.equal(n.mulank, 7); // 25 -> 2+5
  assert.equal(n.bhagyank, 2); // 1+9+9+2+1+0+2+5 = 29 -> 11 -> 2
  assert.equal(n.mulankPlanet, "Ketu");
  assert.ok(n.nameNumber !== null && n.nameNumber >= 1 && n.nameNumber <= 9);
  assert.ok(n.personalYear >= 1 && n.personalYear <= 9);
});

test("name number uses Chaldean values", () => {
  // A(1)+S(3)+H(5)+A(1) = 10 -> 1
  assert.equal(nameNumber("Asha"), 1);
  assert.equal(nameNumber("   "), null);
});

test("number compatibility is symmetric for friendly numbers", () => {
  assert.equal(numbersCompatible(1, 3), "good");
  assert.equal(numbersCompatible(3, 1), "good");
});

test("gem safety refuses stones for dusthana-only lords and shadow planets", () => {
  assert.equal(gemSafetyNote("Rahu", [6]).safe, false);
  assert.equal(gemSafetyNote("Saturn", [6, 8]).safe, false);
  assert.equal(gemSafetyNote("Jupiter", [5, 9]).safe, true);
});

test("detects gemstone, numerology and shortfall questions", () => {
  assert.equal(detectIntent("Which gemstone suits me?"), "gemstone");
  assert.equal(detectIntent("Is ruby good for me?"), "gemstone");
  assert.equal(detectIntent("Tell me my numerology"), "numerology");
  assert.equal(detectIntent("What is my mulank?"), "numerology");
  assert.equal(
    detectIntent("What are my weak planets and remedies?"),
    "shortfall",
  );
});

test("gemstone answer is chart based and carries safety cautions", () => {
  const a = answerQuestion("Which gemstone suits me?", ctx);
  assert.equal(a.intent, "gemstone");
  assert.ok(/qualified astrologer/i.test(a.text));
  assert.ok(/Lagna lord/.test(a.text));
  assert.ok(!/undefined|NaN/.test(a.text + (a.simple ?? "")));
});

test("a named stone gets an answer for that stone", () => {
  const a = answerQuestion("Is yellow sapphire good for me?", ctx);
  assert.equal(a.intent, "gemstone");
  assert.ok(/Jupiter/.test(a.simple ?? ""));
});

test("shortfall answer names weak planets with specific remedies", () => {
  const a = answerQuestion("What are my weak planets?", ctx);
  assert.equal(a.intent, "shortfall");
  assert.ok(/chant|Mangal|balanced/i.test(a.text));
  assert.ok(!/undefined|NaN/.test(a.text + (a.simple ?? "")));
});

test("numerology answer uses the birth date", () => {
  const a = answerQuestion("Tell me my numerology", ctx);
  assert.equal(a.intent, "numerology");
  assert.ok((a.simple ?? "").includes("birth number is 7"));
  assert.ok(/Personal year 2026/.test(a.text));
});
