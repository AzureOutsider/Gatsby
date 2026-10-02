import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
const checker = resolve("scripts/check-public.mjs");
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith("gatsby-public-check-")
    )
      throw new Error("Refusing to clean an unexpected test directory");
    rmSync(root, { recursive: true, force: true });
  }
});
function fixture(extra?: [string, string]) {
  const root = mkdtempSync(join(tmpdir(), "gatsby-public-check-"));
  roots.push(root);
  mkdirSync(join(root, "src/data"), { recursive: true });
  mkdirSync(join(root, "content/books"), { recursive: true });
  writeFileSync(
    join(root, "src/data/seed.json"),
    JSON.stringify([{ author: "Gatsby · 原创示例" }]),
  );
  writeFileSync(
    join(root, "content/books/manifest.json"),
    JSON.stringify({ sourceDir: "content/books/sources", books: [] }),
  );
  if (extra) writeFileSync(join(root, extra[0]), extra[1]);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root, stdio: "pipe" });
  return root;
}
function check(root: string) {
  return execFileSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
}
it("accepts an original public catalog", () => {
  expect(check(fixture())).toContain("Public-file checks passed");
});
it.each(["gatsby-backup-2026.json", "gatsby-diagnostic-2026.json"])(
  "rejects an already tracked personal export: %s",
  (filename) => {
    expect(() =>
      check(
        fixture([
          filename,
          JSON.stringify({
            items: ["private-import"],
            logs: ["private progress"],
          }),
        ]),
      ),
    ).toThrow();
  },
);
it("rejects a private email without printing its value", () => {
  const email = ["private", "qq.com"].join("@");
  try {
    check(fixture(["notes.txt", email]));
    throw new Error("Expected privacy checker failure");
  } catch (error) {
    const output = String((error as { stderr?: unknown }).stderr);
    expect(output).toContain("notes.txt: personal email");
    expect(output).not.toContain(email);
  }
});
