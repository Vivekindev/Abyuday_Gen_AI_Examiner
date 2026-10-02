import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  normalizeAttempts,
  summarizeResults,
  rankScores,
  withinPeriod,
} from "../client/src/lib/results.js";

test("analytics distinguish average score from question-weighted accuracy", () => {
  const rows = normalizeAttempts([
    {
      id: "a",
      isEnded: true,
      results: { score: 1, total: 1, incorrect: 0, unanswered: 0 },
    },
    {
      id: "b",
      isEnded: true,
      results: { score: 0, total: 9, incorrect: 6, unanswered: 3 },
    },
    { id: "c", isEnded: false, results: null },
  ]);
  const summary = summarizeResults(rows);
  assert.equal(summary.completed.length, 2);
  assert.equal(summary.average, 50);
  assert.equal(summary.accuracy, 10);
  assert.equal(summary.best, 100);
  assert.equal(summary.incorrect, 6);
  assert.equal(summary.unanswered, 3);
});
test("empty and older results never imply a zero score or invented answer breakdown", () => {
  assert.equal(summarizeResults([]).average, null);
  const summary = summarizeResults(
    normalizeAttempts([{ isEnded: true, results: { score: 1, total: 3 } }]),
  );
  assert.equal(summary.detailed, false);
  assert.equal(summary.incorrect, 2);
  assert.equal(
    normalizeAttempts([{ isEnded: true, results: { total: 0 } }])[0].percentage,
    null,
  );
});
test("equal team scores share a competition rank and filter by completion date", () => {
  const rows = normalizeAttempts(
    [
      { id: "a", score: 4, total: 5, finishedAt: "2026-09-30" },
      { id: "b", score: 8, total: 10, finishedAt: "2026-10-01" },
      { id: "c", score: 1, total: 5, finishedAt: "2026-09-01" },
    ],
    true,
  );
  assert.deepEqual(
    rankScores(rows).map((row) => [row.id, row.rank]),
    [
      ["b", 1],
      ["a", 1],
      ["c", 3],
    ],
  );
  assert.equal(rows[0].id, "a");
  const now = Date.parse("2026-10-02");
  assert.equal(rows.filter((row) => withinPeriod(row, "7", now)).length, 2);
  assert.equal(withinPeriod({ date: "invalid" }, "7", now), false);
});
test("theme boot respects stored preferences, system appearance, and unavailable storage", () => {
  const script = readFileSync(
    new URL("../client/public/theme-init.js", import.meta.url),
    "utf8",
  );
  for (const [preference, systemDark, expected] of [
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["system", true, "dark"],
    [null, false, "light"],
    ["invalid", true, "dark"],
    ["blocked", true, "dark"],
  ]) {
    const element = { dataset: {}, style: {} };
    vm.runInNewContext(script, {
      localStorage: {
        getItem: () => {
          if (preference === "blocked") throw Error("Storage blocked");
          return preference;
        },
      },
      window: { matchMedia: () => ({ matches: systemDark }) },
      document: { documentElement: element },
    });
    assert.equal(element.dataset.theme, expected);
    assert.equal(element.style.colorScheme, expected);
  }
});
