import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Report locations and rule names, never matched credential values.
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const rules = [
  ["personal email", /\b[\w.+-]+@(?:qq|gmail|outlook|hotmail)\.com\b/i],
  [
    "private key",
    /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  ],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  ["AWS key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["API token", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/],
  ["private machine path", /[A-Z]:[\\/](?:Users|Learning|AI|Obsidian)[\\/]/i],
];
const problems = [];
for (const file of files) {
  if (
    /^(?:\.private|personal|backups|node_modules|web-dist|dist|build)\//.test(
      file,
    ) ||
    /(?:^|\/)\.env(?:\.|$)/.test(file) ||
    /\.(?:bundle|pem|p12|key|log)$/.test(file) ||
    /(?:^|\/)gatsby-(?:backup|diagnostic)-[^/]+\.json$/.test(file)
  )
    problems.push(`${file}: private/generated file is tracked`);
  let bytes;
  try {
    bytes = readFileSync(file);
  } catch {
    continue;
  } // Staged removals.
  if (bytes.subarray(0, 8000).includes(0)) continue;
  const text = bytes.toString("utf8");
  for (const [name, pattern] of rules)
    if (pattern.test(text)) problems.push(`${file}: ${name}`);
}
const seed = JSON.parse(readFileSync("src/data/seed.json", "utf8"));
const manifest = JSON.parse(
  readFileSync("content/books/manifest.json", "utf8"),
);
if (manifest.sourceDir !== "content/books/sources")
  problems.push(
    "manifest: public source directory must be repository-relative",
  );
if (!seed.every((book) => book.author === "Gatsby · 原创示例"))
  problems.push("seed: keep personal books outside the public demo catalog");
for (const book of manifest.books)
  if (
    book.author !== "Gatsby · 原创示例" ||
    !/^[a-z0-9-]+\.json$/.test(book.file)
  )
    problems.push("manifest: only the original demo catalog belongs here");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Public-file checks passed (${files.length} tracked files). This does not certify arbitrary content rights or replace a history audit.`,
  );
