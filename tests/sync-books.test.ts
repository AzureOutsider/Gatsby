import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "gatsby-sync-books-"));
  const source = join(root, "source");
  const manifest = join(root, "manifest.json");
  const seed = join(root, "seed.json");
  const file = join(source, "Orbit.csv");
  const metadata = {
    id: "orbit",
    file: "Orbit.csv",
    type: "歌曲笔记",
    title: "Orbit",
    author: "Test Artist",
    level: "自定义",
    description: "测试词书。",
  };
  return { root, source, manifest, seed, file, metadata };
}

it("adds a valid missing CSV book to seed.json", () => {
  const data = fixture();
  mkdirSync(data.source);
  writeFileSync(
    data.file,
    "# Orbit\nword,meaning,example\nlinger,逗留,The memory lingered.\nfade,消退,The light faded.\n",
  );
  writeFileSync(data.manifest, JSON.stringify({ version: 1, books: [data.metadata] }));
  writeFileSync(data.seed, "[]\n");
  execFileSync(
    process.execPath,
    [
      resolve("scripts/sync-books.mjs"),
      "--manifest",
      data.manifest,
      "--seed",
      data.seed,
      "--source-dir",
      data.source,
      "--apply",
    ],
    { encoding: "utf8" },
  );
  const seed = JSON.parse(readFileSync(data.seed, "utf8"));
  expect(seed).toHaveLength(1);
  expect(seed[0]).toMatchObject({ id: "orbit", title: "Orbit" });
  expect(seed[0].units).toHaveLength(2);
  expect(seed[0].file).toBeUndefined();
});

it("rejects duplicate prompts before changing the seed", () => {
  const data = fixture();
  mkdirSync(data.source);
  writeFileSync(
    data.file,
    "word,meaning,example\nlinger,逗留,One.\nlinger,再次逗留,Two.\n",
  );
  writeFileSync(data.manifest, JSON.stringify({ version: 1, books: [data.metadata] }));
  writeFileSync(data.seed, "[]\n");
  expect(() =>
    execFileSync(
      process.execPath,
      [
        resolve("scripts/sync-books.mjs"),
        "--manifest",
        data.manifest,
        "--seed",
        data.seed,
        "--source-dir",
        data.source,
        "--apply",
      ],
      { encoding: "utf8", stdio: "pipe" },
    ),
  ).toThrow();
  expect(readFileSync(data.seed, "utf8")).toBe("[]\n");
});
