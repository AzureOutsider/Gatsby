import type { Unit } from "../../types";

export type ImportFormat = "auto" | "lines" | "csv" | "subtitles";
export interface ImportIssue {
  line: number;
  severity: "error" | "warning";
  message: string;
}
export interface ImportResult {
  units: Unit[];
  lines: number[];
  issues: ImportIssue[];
  skipped: number;
  format: Exclude<ImportFormat, "auto">;
}
export const formatLabels = {
  auto: "自动识别",
  lines: "逐行 / Markdown",
  csv: "CSV",
  subtitles: "SRT / VTT / ASS 字幕",
};
export const serializeUnits = (units: Unit[]) =>
  units
    .map((unit) =>
      [unit.prompt, unit.answer, unit.context, unit.note]
        .map((value) => value.replace(/\r?\n/g, " ").replace(/\|/g, "／"))
        .join(" | "),
    )
    .join("\n");

interface Row {
  fields: string[];
  line: number;
}
function csvRows(raw: string, issues: ImportIssue[]): Row[] {
  const rows: Row[] = [];
  let fields: string[] = [],
    value = "",
    quoted = false,
    afterQuote = false;
  let line = 1,
    start = 1,
    malformed = false;
  function finish() {
    fields.push(value.trim());
    if (malformed)
      issues.push({
        line: start,
        severity: "error",
        message:
          "CSV 引号位置错误。含逗号或换行的字段请用双引号包裹，内部双引号写成两个双引号。",
      });
    else rows.push({ fields, line: start });
    fields = [];
    value = "";
    afterQuote = false;
    malformed = false;
  }
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (quoted) {
      if (char === '"' && raw[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        value += char;
        if (char === "\n") line++;
      }
    } else if (char === '"') {
      if (value.trim() || afterQuote) malformed = true;
      quoted = true;
    } else if (char === ",") {
      fields.push(value.trim());
      value = "";
      afterQuote = false;
    } else if (char === "\n") {
      finish();
      line++;
      start = line;
    } else if (afterQuote && !/\s/.test(char)) {
      malformed = true;
      value += char;
    } else value += char;
  }
  if (quoted)
    issues.push({
      line: start,
      severity: "error",
      message: "CSV 双引号未闭合，请补齐引号后重试。",
    });
  else if (value || fields.length || malformed) finish();
  return rows;
}

export function previewUnits(
  raw: string,
  type: string,
  edit = false,
  requested: ImportFormat = "auto",
): ImportResult {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const input = text.split("\n");
  const first =
    input.find((line) => line.trim() && !/^[#>]/.test(line.trim())) || "";
  const format =
    requested !== "auto"
      ? requested
      : /^\s*(?:\d[^\n]*-->|Dialogue:|WEBVTT)/im.test(text)
        ? "subtitles"
        : first.includes(",") &&
            (!first.includes("|") || first.trimStart().startsWith('"')) &&
            !/^[-*]\s|^\d+[.)]\s/.test(first.trim())
          ? "csv"
          : "lines";
  const result: ImportResult = {
    units: [],
    lines: [],
    issues: [],
    skipped: 0,
    format,
  };
  const seen = new Map<string, number>();
  function issue(
    line: number,
    severity: ImportIssue["severity"],
    message: string,
  ) {
    result.issues.push({ line, severity, message });
  }
  function add(fields: string[], line: number, subtitle = false) {
    const [prompt = "", answer = "", context = "", ...notes] = fields;
    if (!prompt.trim()) {
      issue(line, "error", "缺少英文词条，请填写第一列。");
      return;
    }
    if (prompt.length > (subtitle ? 250 : 500)) {
      issue(
        line,
        "error",
        `英文内容过长（${prompt.length} 字符），请拆分到 ${subtitle ? 250 : 500} 字符以内。`,
      );
      return;
    }
    const key = prompt.trim().normalize("NFKC").toLowerCase();
    const previous = seen.get(key);
    if (previous !== undefined) {
      issue(
        line,
        subtitle ? "warning" : "error",
        subtitle
          ? `字幕与第 ${previous} 行重复，仅保留首次出现的台词。`
          : `“${prompt}”与第 ${previous} 行重复，请合并或删除重复词条。`,
      );
      return;
    }
    seen.set(key, line);
    if (!answer.trim() || /^待补充(台词)?释义$/.test(answer.trim()))
      issue(
        line,
        "warning",
        subtitle
          ? "字幕没有中文译文，将暂存为“待补充台词释义”。"
          : "缺少中文释义，将暂存为“待补充释义”。建议补充后再导入。",
      );
    if (!subtitle && fields.length > 4)
      issue(
        line,
        "warning",
        "超过四列，多余列将合并到笔记。若例句含逗号，请检查 CSV 引号。",
      );
    result.units.push({
      kind:
        subtitle || type === "影视台词"
          ? "句子"
          : type === "歌曲笔记"
            ? "短语"
            : "词汇",
      prompt: prompt.trim(),
      answer: answer.trim() || (subtitle ? "待补充台词释义" : "待补充释义"),
      context: subtitle ? prompt.trim() : context,
      note: subtitle
        ? "字幕导入；可在编辑内容中补充译文和场景。"
        : notes.join(" | "),
    });
    result.lines.push(line);
  }
  if (format === "subtitles") {
    if (type !== "影视台词")
      issue(1, "error", "字幕内容请将“内容类型”改为“影视台词”。");
    let inCue = false,
      metadata = false;
    const ass = /^Dialogue:/im.test(text);
    input.forEach((original, index) => {
      let line = original.trim();
      if (!line) {
        inCue = false;
        metadata = false;
        return;
      }
      if (ass) {
        if (!/^Dialogue:/i.test(line)) {
          result.skipped++;
          return;
        }
        const parts = line.split(",");
        if (parts.length < 10) {
          issue(
            index + 1,
            "error",
            "ASS Dialogue 行缺少字段，请检查字幕文件。",
          );
          return;
        }
        line = parts.slice(9).join(",");
      } else {
        if (/^(NOTE|STYLE|REGION)(\s|$)/.test(line)) metadata = true;
        if (metadata || /^WEBVTT/.test(line)) {
          result.skipped++;
          return;
        }
        if (line.includes("-->")) {
          if (
            !/^(?:\d+:)?[0-5]\d:[0-5]\d[.,]\d{3}\s+-->\s+(?:\d+:)?[0-5]\d:[0-5]\d[.,]\d{3}(?:\s+.*)?$/.test(
              line,
            )
          ) {
            issue(
              index + 1,
              "error",
              "字幕时间轴格式错误，请使用 00:00:01,000 --> 00:00:02,000（VTT 使用小数点）。",
            );
            inCue = false;
            return;
          }
          inCue = true;
          result.skipped++;
          return;
        }
        if (!inCue) {
          result.skipped++;
          return;
        }
      }
      line = line
        .replace(/<[^>]+>|\{[^}]+\}/g, "")
        .replace(/\\[Nn]/g, " ")
        .trim();
      if (line) add([line], index + 1, true);
      else result.skipped++;
    });
    if (!/-->|^Dialogue:/im.test(text) && text.trim())
      issue(
        1,
        "error",
        "未找到字幕时间轴或 ASS Dialogue，请检查格式或改用逐行模式。",
      );
  } else {
    const rows =
      format === "csv"
        ? csvRows(text, result.issues)
        : input.map((original, index) => {
            let line = original.trim();
            if (
              !line ||
              (!edit &&
                (/^[#>]/.test(line) ||
                  /^[-|:\s]+$/.test(line) ||
                  /^```/.test(line)))
            )
              return { line: index + 1, fields: [] };
            line = line.replace(/^[-*]\s+|^\d+[.)]\s+/, "");
            const fields = line.includes("|")
              ? (line.startsWith("|") && line.endsWith("|")
                  ? line.slice(1, -1)
                  : line
                ).split("|")
              : line.split(/[：:]/);
            return {
              line: index + 1,
              fields: fields.map((field) => field.trim()),
            };
          });
    rows.forEach(({ fields, line }) => {
      if (!fields.length || fields.every((field) => !field)) {
        if (input[line - 1]?.trim()) result.skipped++;
        return;
      }
      if (
        !edit &&
        /^(英文|单词|word|term|english)$/i.test(fields[0]) &&
        /^(meaning|definition|释义|中文|中文释义|翻译)$/i.test(fields[1] || "")
      ) {
        result.skipped++;
        return;
      }
      add(fields, line);
    });
  }
  return result;
}
export function parseUnits(raw: string, type: string, edit = false): Unit[] {
  return previewUnits(raw, type, edit).units;
}
