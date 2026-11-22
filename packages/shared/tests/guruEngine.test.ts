import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerQuestion,
  buildGuruContext,
  computeKundli,
  detectIntent,
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

test("detects the intent of common questions", () => {
  const cases: [string, string][] = [
    ["How is my career going?", "career"],
    ["When will I get married?", "marriage"],
    ["Will I have children?", "children"],
    ["Is my wealth going to improve?", "wealth"],
    ["How will my health be?", "health"],
    ["Am I Manglik?", "mangal"],
    ["Which dasha am I running?", "dasha"],
    ["Am I in Sade Sati?", "sadesati"],
    ["What are the current transits?", "transit"],
    ["What remedies should I do?", "remedy"],
    ["What is my lucky colour?", "lucky"],
    ["Will I settle abroad?", "foreign"],
    ["Namaste", "greeting"],
    ["मैं मांगलिक हूँ?", "mangal"],
    ["मेरी नौकरी कैसी रहेगी", "career"],
  ];
  for (const [q, intent] of cases) {
    assert.equal(detectIntent(q), intent, q);
  }
});

test("answers are grounded in the kundli and never empty", () => {
  const questions = [
    "How is my career?",
    "When will I get married?",
    "Will I have children?",
    "How is my wealth?",
    "How is my health?",
    "How is my education?",
    "Will I buy property?",
    "Will I go abroad?",
    "What is my spiritual path?",
    "Am I Manglik?",
    "Which dasha am I running?",
    "What are the current transits?",
    "Am I in Sade Sati?",
    "How is this year for me?",
    "Suggest remedies",
    "What are my lucky colours?",
    "Tell me about my personality",
    "Explain my kundli chart",
  ];
  for (const q of questions) {
    const a = answerQuestion(q, ctx);
    assert.ok(a.text.length > 60, `short answer for: ${q}`);
    assert.notEqual(a.intent, "unknown", q);
    assert.ok(!a.text.includes("undefined"), `undefined leaked in: ${q}`);
    assert.ok(!a.text.includes("NaN"), `NaN leaked in: ${q}`);
  }
});

test("every builtin answer has a short plain-language version", () => {
  for (const q of [
    "How is my career?",
    "Am I Manglik?",
    "Which dasha am I running?",
    "Am I in Sade Sati?",
    "What are the current transits?",
    "How is this year for me?",
    "Suggest remedies",
    "What are my lucky colours?",
    "Tell me about my personality",
    "Explain my kundli chart",
    "When will I get married?",
  ]) {
    const a = answerQuestion(q, ctx);
    const s = a.simple ?? "";
    assert.ok(s.length > 20, q);
    assert.ok(!/undefined|NaN|null/.test(s), q);
    assert.ok(s.length < 1600, `${q} too long: ${s.length}`);
    if (!/lucky/i.test(q)) {
      assert.ok(
        s.split(/[.!?]\s/).length >= 2,
        `${q} should be a few sentences`,
      );
    }
  }
});

test("answers differ between different birth charts (not monotonous)", () => {
  const other = {
    date: "1985-03-12",
    time: "06:10",
    utcOffsetMinutes: 330,
    latitude: 28.6139,
    longitude: 77.209,
  };
  const ctx2 = buildGuruContext(other, computeKundli(other), { now: NOW });
  for (const q of [
    "How is my career?",
    "How is my wealth?",
    "Which dasha am I running?",
    "Tell me about my personality",
    "Suggest remedies",
  ]) {
    const a = answerQuestion(q, ctx).simple;
    const b = answerQuestion(q, ctx2).simple;
    assert.notEqual(a, b, q);
  }
});

test("different questions about the same chart give different answers", () => {
  const set = new Set(
    ["How is my career?", "How is my wealth?", "How is my health?"].map(
      (q) => answerQuestion(q, ctx).simple,
    ),
  );
  assert.equal(set.size, 3);
});

test("mangal answer matches the computed kundli", () => {
  const a = answerQuestion("Am I Manglik?", ctx);
  const k = ctx.kundli;
  assert.ok(
    a.text.includes(k.manglik ? "you ARE Manglik" : "NOT Manglik") ||
      a.text.includes("CANCELLED"),
  );
});

test("dasha answer names the running mahadasha", () => {
  const a = answerQuestion("Which dasha am I running?", ctx);
  const nowMs = NOW.getTime();
  const maha = ctx.kundli.dashas.find(
    (d) => d.start.getTime() <= nowMs && nowMs < d.end.getTime(),
  )!;
  assert.ok(a.text.includes(`${maha.lord} Mahadasha`));
});

test("sensitive questions get a safe reply with expert handoff", () => {
  for (const q of [
    "When will I die?",
    "Will I get cancer?",
    "Should I get a divorce?",
  ]) {
    const a = answerQuestion(q, ctx);
    assert.equal(a.suggestExpert, true, q);
    assert.ok(/sensitive|professional/i.test(a.text), q);
  }
});

test("asking for an expert suggests booking", () => {
  const a = answerQuestion("I want to talk to an expert astrologer", ctx);
  assert.equal(a.suggestExpert, true);
});

test("without birth details the guru asks for them", () => {
  const a = answerQuestion("How is my career?", null);
  assert.ok(/birth details/i.test(a.text));
  assert.equal(a.suggestExpert, true);
});

test("unknown questions list what the guru can answer", () => {
  const a = answerQuestion("What is the capital of France?", ctx);
  assert.equal(a.intent, "unknown");
  assert.ok(/career/i.test(a.text));
});
