import { describe, expect, it } from "vitest";
import { previewUnits } from "../src/features/library/parse";

describe("import parsing and row diagnostics", () => {
  it("handles BOM, CRLF, quoted commas, escaped quotes and multiline fields with source line numbers", () => {
    const result = previewUnits(
      '\uFEFFword,meaning,example,note\r\n"dear","亲爱的","Hello, dear!","say ""hi"""\r\n"linger","逗留","Line one\r\nLine two",note\r\nnext,下一个,,',
      "单词书",
    );
    expect(result.format).toBe("csv");
    expect(result.issues).toEqual([]);
    expect(result.lines).toEqual([2, 3, 5]);
    expect(result.units[0]).toMatchObject({
      context: "Hello, dear!",
      note: 'say "hi"',
    });
    expect(result.units[1].context).toBe("Line one\nLine two");
    expect(result.skipped).toBe(1);
  });
  it("reports unclosed and misplaced quotes instead of silently importing broken rows", () => {
    const result = previewUnits('okay,正常\n"broken,错误', "单词书");
    expect(result.units.map((unit) => unit.prompt)).toEqual(["okay"]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        line: 2,
        severity: "error",
        message: expect.stringContaining("未闭合"),
      }),
    ]);
    expect(previewUnits('a,"b"oops', "单词书").issues[0].message).toContain(
      "引号位置",
    );
  });
  it("reports missing prompts, long entries and normalized duplicates at original lines", () => {
    const result = previewUnits(
      `# Words\nword | 单词\nWORD | 字词\n | 缺少英文\n${"a".repeat(501)} | 超长`,
      "单词书",
    );
    expect(result.units).toHaveLength(1);
    expect(result.issues.map((issue) => [issue.line, issue.severity])).toEqual([
      [3, "error"],
      [4, "error"],
      [5, "error"],
    ]);
    expect(result.issues[0].message).toContain("第 2 行");
  });
  it("previews Markdown tables and warns about absent meanings and unexpected columns", () => {
    const result = previewUnits(
      "| 英文 | 中文 | 例句 | 笔记 |\n| --- | --- | --- | --- |\n| glimmer | 微光 | A glimmer. | note |\n- linger\nextra | 多余 | example | note | more",
      "歌曲笔记",
    );
    expect(result.units).toHaveLength(3);
    expect(result.skipped).toBe(2);
    expect(result.issues.map((issue) => [issue.line, issue.severity])).toEqual([
      [4, "warning"],
      [5, "warning"],
    ]);
    expect(result.units[2].note).toBe("note | more");
  });
  it("does not interpret ordinary timestamps and commas as CSV when line format is selected", () => {
    const result = previewUnits(
      "say hello | 问好 | Hello, world at 10:30. | note",
      "单词书",
      false,
      "lines",
    );
    expect(result.units[0].context).toBe("Hello, world at 10:30.");
    expect(result.issues).toEqual([]);
  });
  it("recognizes quoted CSV containing pipes and keeps arrows inside ordinary examples", () => {
    const csv = previewUnits('"either | or","二者之一","A --> B"', "单词书");
    expect(csv.format).toBe("csv");
    expect(csv.units[0]).toMatchObject({
      prompt: "either | or",
      context: "A --> B",
    });
    expect(csv.issues).toEqual([]);
    const lines = previewUnits("arrow | 箭头 | A --> B", "单词书");
    expect(lines.format).toBe("lines");
    expect(lines.issues).toEqual([]);
  });
  it("reports malformed subtitle timelines without importing the cue", () => {
    const result = previewUnits(
      "WEBVTT\n\n00:99:01.000 --> broken\nHello!",
      "影视台词",
    );
    expect(result.units).toEqual([]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        line: 3,
        severity: "error",
        message: expect.stringContaining("时间轴"),
      }),
    );
    expect(
      previewUnits("00:01.000 --> 00:02.000 align:start\nHello!", "影视台词")
        .units[0].prompt,
    ).toBe("Hello!");
  });
  it("ignores VTT metadata, keeps dialogue containing a speaker name and de-duplicates repeated cues with a warning", () => {
    const result = previewUnits(
      "WEBVTT\n\nNOTE comment\nThis is metadata\n\ncue-1\n00:00:01.000 --> 00:00:02.000\n<v Amy>Amy: Hello!</v>\n\ncue-2\n00:00:03.000 --> 00:00:04.000\nAmy: Hello!",
      "影视台词",
    );
    expect(result.units.map((unit) => unit.prompt)).toEqual(["Amy: Hello!"]);
    expect(result.lines).toEqual([8]);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.every((issue) => issue.severity === "warning")).toBe(
      true,
    );
    expect(result.issues[1].message).toContain("仅保留首次");
  });
  it("preserves ASS commas and line breaks and reports damaged dialogue rows", () => {
    const result = previewUnits(
      "[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\i1}Hello, friend!\\NGood day.\nDialogue: malformed",
      "影视台词",
    );
    expect(result.units[0].prompt).toBe("Hello, friend! Good day.");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ line: 3, severity: "error" }),
    );
  });
  it("asks for the correct content type for subtitle input and validates explicit subtitle format", () => {
    expect(
      previewUnits("1\n00:00:01,000 --> 00:00:02,000\nHello!", "单词书")
        .issues[0].message,
    ).toContain("影视台词");
    expect(
      previewUnits("not subtitles", "影视台词", false, "subtitles").issues[0]
        .severity,
    ).toBe("error");
    expect(previewUnits("", "单词书").units).toEqual([]);
  });
});
