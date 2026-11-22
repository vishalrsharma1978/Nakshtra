import { test } from "node:test";
import assert from "node:assert/strict";
import { computeKundli } from "../src/index";
import { computeSpecialPoints, computeVargaCharts } from "../src/kundliExtras";
import {
  designerChart,
  NUM_FONT,
  NUM_HALF,
} from "../../../apps/mobile/src/lib/kundliChart";

// Sample births across eras, latitudes and times so retrograde-heavy and crowded charts occur.
const BIRTHS = [
  ["1992-10-25", "14:30", 330, 19.076, 72.8777],
  ["2000-01-01", "12:00", 330, 28.6139, 77.209],
  ["1985-03-14", "06:10", 330, 13.0827, 80.2707],
  ["1978-07-02", "23:45", 330, 22.5726, 88.3639],
  ["2003-11-19", "03:20", 330, 26.9124, 75.7873],
  ["1969-12-05", "17:05", 330, 12.9716, 77.5946],
  ["1999-08-08", "09:00", 60, 51.5074, -0.1278],
  ["2010-05-21", "00:10", -300, 40.7128, -74.006],
] as const;

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** House polygons of the 400x400 North-Indian chart, in house order 1..12. */
const POLYS: number[][][] = [
  [
    [200, 200],
    [100, 100],
    [200, 0],
    [300, 100],
  ],
  [
    [0, 0],
    [200, 0],
    [100, 100],
  ],
  [
    [0, 0],
    [100, 100],
    [0, 200],
  ],
  [
    [200, 200],
    [100, 100],
    [0, 200],
    [100, 300],
  ],
  [
    [0, 200],
    [100, 300],
    [0, 400],
  ],
  [
    [0, 400],
    [100, 300],
    [200, 400],
  ],
  [
    [200, 200],
    [100, 300],
    [200, 400],
    [300, 300],
  ],
  [
    [200, 400],
    [300, 300],
    [400, 400],
  ],
  [
    [400, 200],
    [300, 300],
    [400, 400],
  ],
  [
    [200, 200],
    [300, 100],
    [400, 200],
    [300, 300],
  ],
  [
    [400, 0],
    [300, 100],
    [400, 200],
  ],
  [
    [200, 0],
    [400, 0],
    [300, 100],
  ],
];

const inside = (x: number, y: number, p: number[][]) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      c = !c;
  }
  return c;
};

/** Rashi numbers: text anchor x, baseline y, value; one per house, in house order. */
function numbers(svg: string) {
  return [
    ...svg.matchAll(
      /<text x="([\d.-]+)" y="([\d.-]+)" class="hn" style="font-size:(\d+)px">(\d+)<\/text>/g,
    ),
  ].map((m) => {
    const font = +m[3];
    const cy = +m[2] - font * 0.35;
    return { cx: +m[1], cy, font, value: +m[4] };
  });
}

/** Planet text lines: anchor x, baseline y, font size and the words drawn. */
function planetLines(svg: string) {
  return [
    ...svg.matchAll(
      /<text x="([\d.-]+)" y="([\d.-]+)" class="pl" style="font-size:(\d+)px">(.*?)<\/text>/g,
    ),
  ].map((m) => {
    const body = m[4].replace(/<tspan> <\/tspan>/g, " ");
    const words = [
      ...body.matchAll(/<tspan fill="#[0-9a-f]{6}">([^<]*)<\/tspan>/g),
    ].map((w) => w[1]);
    return { x: +m[1], y: +m[2], font: +m[3], words };
  });
}

function chartFor(
  date: string,
  off: number,
  lat: number,
  lon: number,
  time: string,
) {
  const input = {
    date,
    time,
    utcOffsetMinutes: off,
    latitude: lat,
    longitude: lon,
  };
  const k = computeKundli(input);
  return computeVargaCharts(k, computeSpecialPoints(input, k));
}

const render = (c: ReturnType<typeof chartFor>[number]) =>
  designerChart({
    title: c.code,
    lagnaSignIndex: c.lagnaSignIndex,
    planets: c.markers.map((m) => ({
      label: m.label,
      houseFromLagna: ((m.signIndex - c.lagnaSignIndex + 12) % 12) + 1,
    })),
    accent: "#7a1f1f",
    gold: "#b8860b",
  });

/** Box of a rashi number (generous: two digits wide). */
const numBox = (n: { cx: number; cy: number; value: number }): Rect => {
  const w = n.value >= 10 ? NUM_HALF.w * 1.7 : NUM_HALF.w;
  return {
    x0: n.cx - w,
    x1: n.cx + w,
    y0: n.cy - NUM_HALF.h,
    y1: n.cy + NUM_HALF.h,
  };
};

/** Box of a planet line (generous: 0.78 em per glyph, 0.95 em ascender). */
const lineBox = (l: {
  x: number;
  y: number;
  font: number;
  words: string[];
}): Rect => {
  const w = l.words.join(" ").length * l.font * 0.78;
  return {
    x0: l.x - w / 2,
    x1: l.x + w / 2,
    y0: l.y - l.font * 0.95,
    y1: l.y + l.font * 0.25,
  };
};

const hit = (a: Rect, b: Rect) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test("each of the 12 rashi numbers sits inside its own house and is not covered or crowded", () => {
  for (const [date, time, off, lat, lon] of BIRTHS) {
    for (const c of chartFor(date, off, lat, lon, time)) {
      const n = numbers(render(c));
      assert.equal(n.length, 12, `${date} ${c.code} numbers`);
      n.forEach((d, i) => {
        assert.ok(d.font >= NUM_FONT, `${date} ${c.code} number too small`);
        const b = numBox(d);
        for (const [x, y] of [
          [d.cx, d.cy],
          [b.x0, b.y0],
          [b.x1, b.y0],
          [b.x0, b.y1],
          [b.x1, b.y1],
        ])
          assert.ok(
            inside(x, y, POLYS[i]),
            `${date} ${c.code}: number of house ${i + 1} leaves its house`,
          );
      });
      for (let i = 0; i < n.length; i++)
        for (let j = i + 1; j < n.length; j++)
          assert.ok(
            !hit(numBox(n[i]), numBox(n[j])),
            `${date} ${c.code}: numbers ${i + 1} and ${j + 1} touch`,
          );
    }
  }
});

test("planet text stays inside the chart, never covers a number, and nothing is dropped", () => {
  for (const [date, time, off, lat, lon] of BIRTHS) {
    for (const c of chartFor(date, off, lat, lon, time)) {
      const svg = render(c);
      const lines = planetLines(svg);
      assert.equal(
        lines.flatMap((l) => l.words).length,
        c.markers.length,
        `${date} ${c.code}: every planet/point is drawn`,
      );
      const nums = numbers(svg).map(numBox);
      for (const l of lines) {
        assert.ok(l.font >= 10, `${date} ${c.code} font ${l.font}px too small`);
        const b = lineBox(l);
        assert.ok(
          b.x0 >= 0 && b.x1 <= 400 && b.y0 >= 0 && b.y1 <= 400,
          `${date} ${c.code}: "${l.words.join(" ")}" leaves the chart`,
        );
        for (const nb of nums)
          assert.ok(
            !hit(b, nb),
            `${date} ${c.code}: "${l.words.join(" ")}" covers a rashi number`,
          );
      }
      // planet lines never overlap each other
      for (let i = 0; i < lines.length; i++)
        for (let j = i + 1; j < lines.length; j++)
          assert.ok(
            !hit(lineBox(lines[i]), lineBox(lines[j])),
            `${date} ${c.code}: planet lines overlap`,
          );
    }
  }
});

test("chart text is Hindi and numbers 1-12 each appear once", () => {
  const c = chartFor("1992-10-25", 330, 19.076, 72.8777, "14:30")[0];
  const svg = render(c);
  const texts = [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim(),
  );
  for (const t of texts)
    assert.ok(!/[A-Za-z]{2,}/.test(t), `English text on chart: ${t}`);
  const nums = numbers(svg)
    .map((n) => n.value)
    .sort((a, b) => a - b);
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});
