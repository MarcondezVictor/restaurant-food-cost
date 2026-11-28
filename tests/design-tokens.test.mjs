import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { COLORS, TAP_PX, TEXT_PX } from "../components/ui/tokens.ts";
import { checkColors, findColorLiterals } from "../scripts/check-colors.mjs";

const CSS = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const ROOT_PX = 16;

// --- contrast (WCAG 2.x) ----------------------------------------------------

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every text color on every background it is drawn on. Badges, errors and
// the current tab sit on cards (surface) and on the screen (bg).
const TEXT_ON_BACKGROUND = [
  ...["fg", "muted", "accent", "ok", "warn", "danger"].flatMap((text) =>
    ["bg", "surface"].map((background) => [text, background]),
  ),
  ["accent-fg", "accent"], // primary button label
];

for (const [text, background] of TEXT_ON_BACKGROUND) {
  test(`contrast ${text} on ${background} is at least 4.5:1`, () => {
    const ratio = contrast(COLORS[text], COLORS[background]);
    assert.ok(
      ratio >= 4.5,
      `${text} (${COLORS[text]}) on ${background} (${COLORS[background]}) is ${ratio.toFixed(2)}:1`,
    );
  });
}

// Outlines of what you tap (fields, secondary buttons, chips, + and -) must
// stand out from the screen and the card: WCAG 1.4.11 asks 3:1 for non-text
// parts of a control. `border` is left out on purpose: it is decorative only
// (card outlines, dividers), so it needs no minimum and must never outline
// something you tap.
const CONTROL_ON_BACKGROUND = [
  ["control", "bg"],
  ["control", "surface"],
];

for (const [outline, background] of CONTROL_ON_BACKGROUND) {
  test(`contrast ${outline} on ${background} is at least 3:1`, () => {
    const ratio = contrast(COLORS[outline], COLORS[background]);
    assert.ok(
      ratio >= 3,
      `${outline} (${COLORS[outline]}) on ${background} (${COLORS[background]}) is ${ratio.toFixed(2)}:1`,
    );
  });
}

test("the contrast formula matches known values", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(2), "21.00");
  assert.equal(contrast("#777777", "#ffffff").toFixed(2), "4.48");
});

// --- CSS <-> tokens.ts mirror ----------------------------------------------

function themeValues(prefix) {
  const values = {};
  const regex = new RegExp(`--${prefix}-([a-z-]+):\\s*([^;]+);`, "g");
  for (const [, name, value] of CSS.matchAll(regex)) {
    if (name.includes("--")) continue; // e.g. --text-body--line-height
    values[name] = value.trim();
  }
  return values;
}

test("colors in globals.css and tokens.ts are the same", () => {
  assert.deepEqual(themeValues("color"), { ...COLORS });
});

test("type sizes in globals.css and tokens.ts are the same", () => {
  const css = Object.fromEntries(
    Object.entries(themeValues("text"))
      .filter(([name]) => !name.endsWith("-line-height"))
      .map(([name, value]) => [name, parseFloat(value) * ROOT_PX]),
  );
  assert.deepEqual(css, { ...TEXT_PX });
});

test("type sizes are in rem, so the root font size scales them", () => {
  for (const [name, value] of Object.entries(themeValues("text"))) {
    assert.match(value, /^[\d.]+rem$/, `--text-${name} is ${value}`);
  }
});

test("body text is at least 16 px; only captions are smaller", () => {
  for (const [name, px] of Object.entries(TEXT_PX)) {
    if (name === "caption") continue;
    assert.ok(px >= 16, `${name} is ${px} px`);
  }
});

test("the tap size is 44 px in globals.css and tokens.ts", () => {
  assert.equal(TAP_PX, 44);
  assert.equal(parseFloat(themeValues("spacing").tap) * ROOT_PX, TAP_PX);
});

test("Tailwind's default colors, sizes and radii are turned off", () => {
  for (const namespace of ["color", "text", "radius"]) {
    assert.match(CSS, new RegExp(`--${namespace}-\\*:\\s*initial;`));
  }
});

// --- colors outside the tokens ---------------------------------------------

test("findColorLiterals finds hex and color functions, with line numbers", () => {
  const text = [
    'const a = "#fff";',
    "style={{ color: 'rgb(1, 2, 3)' }}",
    "bg-[#0a0a0bcc] oklch(0.5 0.1 20)",
    'href="#main" id="#add-item" className="bg-surface"',
  ].join("\n");
  assert.deepEqual(findColorLiterals(text), [
    { line: 1, value: "#fff" },
    { line: 2, value: "rgb(" },
    { line: 3, value: "#0a0a0bcc" },
    { line: 3, value: "oklch(" },
  ]);
});

test("checkColors flags a color in a screen and allows the token files", () => {
  const root = mkdtempSync(join(tmpdir(), "check-colors-"));
  try {
    mkdirSync(join(root, "app"), { recursive: true });
    mkdirSync(join(root, "components", "ui"), { recursive: true });
    writeFileSync(join(root, "app", "globals.css"), "--color-bg: #0a0a0b;");
    writeFileSync(join(root, "components", "ui", "tokens.ts"), 'bg: "#0a0a0b"');
    writeFileSync(
      join(root, "app", "page.tsx"),
      'export default () => <p className="text-[#ff0000]">oi</p>;',
    );
    const problems = checkColors(root);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^app\/page\.tsx:1 {2}"#ff0000"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
