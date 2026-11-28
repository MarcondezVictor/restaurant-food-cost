// Fails when a color is written outside the design tokens (R4, AGENTS.md:
// theme tokens only). Colors live in app/globals.css (@theme) and in its
// mirror components/ui/tokens.ts; everywhere else a screen uses a token class
// such as `bg-surface` or `text-danger`.
//
// Run: node scripts/check-colors.mjs   (part of `npm run verify`)
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Folders with code that draws screens.
export const SCANNED_DIRS = ["app", "components", "modules", "lib"];
export const SCANNED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".css",
];

// The only files allowed to spell a color.
export const ALLOWED_FILES = ["app/globals.css", "components/ui/tokens.ts"];

const COLOR_PATTERNS = [
  // Not followed by a letter, digit or hyphen, so "#add-item" is not a color.
  {
    name: "hex",
    regex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
  },
  {
    name: "function",
    regex: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g,
  },
];

// Every color literal in a text, with its 1-based line number.
export function findColorLiterals(text) {
  const found = [];
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    for (const { regex } of COLOR_PATTERNS) {
      for (const match of line.matchAll(regex)) {
        found.push({ line: index + 1, value: match[0] });
      }
    }
  });
  return found;
}

function listFiles(root, dir) {
  const full = join(root, dir);
  let entries;
  try {
    entries = readdirSync(full, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(root, path);
    return SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
      ? [path.split(sep).join("/")]
      : [];
  });
}

// Problems found under `root`, as readable lines.
export function checkColors(root) {
  const problems = [];
  for (const dir of SCANNED_DIRS) {
    for (const file of listFiles(root, dir)) {
      if (ALLOWED_FILES.includes(file)) continue;
      const text = readFileSync(join(root, file), "utf8");
      for (const { line, value } of findColorLiterals(text)) {
        problems.push(
          `${file}:${line}  "${value}" is a color outside the tokens; use a token class (bg-surface, text-danger, ...) or add the token to app/globals.css and components/ui/tokens.ts`,
        );
      }
    }
  }
  return problems;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.cwd();
  const problems = checkColors(root);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} color(s) outside the tokens.`);
    process.exit(1);
  }
  console.log("No colors outside the tokens.");
}
