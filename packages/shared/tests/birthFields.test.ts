import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampDate,
  daysInMonth,
  displayDate,
  displayTime,
  formatDate,
  formatTime,
  from12h,
  parseDate,
  parseTime,
  to12h,
  validateBirthDate,
  yearRange,
} from "../src/birthFields";

test("daysInMonth handles leap years", () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2023, 2), 28);
  assert.equal(daysInMonth(1900, 2), 28); // century, not leap
  assert.equal(daysInMonth(2000, 2), 29); // divisible by 400
  assert.equal(daysInMonth(2023, 4), 30);
  assert.equal(daysInMonth(2023, 12), 31);
});

test("parseDate accepts only real calendar dates", () => {
  assert.deepEqual(parseDate("1990-05-15"), { year: 1990, month: 5, day: 15 });
  assert.equal(parseDate("1990-02-30"), null);
  assert.equal(parseDate("2023-02-29"), null);
  assert.deepEqual(parseDate("2024-02-29"), { year: 2024, month: 2, day: 29 });
  assert.equal(parseDate("1990-13-01"), null);
  assert.equal(parseDate("15-05-1990"), null);
  assert.equal(parseDate(""), null);
  assert.equal(parseDate(null), null);
});

test("formatDate round-trips and pads", () => {
  assert.equal(formatDate({ year: 1990, month: 5, day: 7 }), "1990-05-07");
  assert.deepEqual(parseDate(formatDate({ year: 2001, month: 12, day: 31 })), {
    year: 2001,
    month: 12,
    day: 31,
  });
});

test("clampDate keeps the day valid after month/year change", () => {
  assert.deepEqual(clampDate({ year: 2023, month: 2, day: 31 }), {
    year: 2023,
    month: 2,
    day: 28,
  });
  assert.deepEqual(clampDate({ year: 2024, month: 2, day: 31 }), {
    year: 2024,
    month: 2,
    day: 29,
  });
  assert.deepEqual(clampDate({ year: 2023, month: 4, day: 31 }), {
    year: 2023,
    month: 4,
    day: 30,
  });
  assert.deepEqual(clampDate({ year: 2023, month: 5, day: 31 }), {
    year: 2023,
    month: 5,
    day: 31,
  });
});

test("parseTime / formatTime", () => {
  assert.deepEqual(parseTime("14:30"), { hour: 14, minute: 30 });
  assert.deepEqual(parseTime("14:30:00"), { hour: 14, minute: 30 });
  assert.deepEqual(parseTime("00:00"), { hour: 0, minute: 0 });
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("12:60"), null);
  assert.equal(parseTime("9:30"), null);
  assert.equal(parseTime(""), null);
  assert.equal(formatTime({ hour: 5, minute: 7 }), "05:07");
});

test("12-hour conversion covers midnight and noon", () => {
  assert.deepEqual(to12h({ hour: 0, minute: 5 }), {
    hour12: 12,
    minute: 5,
    period: "AM",
  });
  assert.deepEqual(to12h({ hour: 12, minute: 0 }), {
    hour12: 12,
    minute: 0,
    period: "PM",
  });
  assert.deepEqual(to12h({ hour: 14, minute: 30 }), {
    hour12: 2,
    minute: 30,
    period: "PM",
  });
  assert.deepEqual(to12h({ hour: 9, minute: 15 }), {
    hour12: 9,
    minute: 15,
    period: "AM",
  });
  for (let h = 0; h < 24; h++) {
    assert.deepEqual(
      from12h(to12h({ hour: h, minute: 42 })),
      { hour: h, minute: 42 },
      `hour ${h}`,
    );
  }
});

test("display helpers", () => {
  assert.equal(displayDate("1990-05-15"), "15 May 1990");
  assert.equal(displayDate("bad"), "");
  assert.equal(displayTime("14:30"), "2:30 PM");
  assert.equal(displayTime("00:00"), "12:00 AM");
  assert.equal(displayTime(""), "");
});

test("validateBirthDate rejects future, pre-1900 and invalid dates", () => {
  const today = new Date(2026, 10, 22); // 22 Nov 2026
  assert.equal(validateBirthDate("1990-05-15", today), null);
  assert.equal(validateBirthDate("2026-11-22", today), null); // today is allowed
  assert.match(validateBirthDate("2026-11-23", today) ?? "", /future/);
  assert.match(validateBirthDate("1899-12-31", today) ?? "", /1900/);
  assert.match(validateBirthDate("1990-02-30", today) ?? "", /valid/);
});

test("yearRange is newest first and inclusive", () => {
  assert.deepEqual(yearRange(2020, 2023), [2023, 2022, 2021, 2020]);
});
