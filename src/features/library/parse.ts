import type { Unit } from "../../types";
export const serializeUnits = (units: Unit[]) =>
  units
    .map((unit) =>
      [unit.prompt, unit.answer, unit.context, unit.note]
        .map((value) => value.replace(/\r?\n/g, " ").replace(/\|/g, "／"))
        .join(" | "),
    )
    .join("\n");
function csvFields(line: string) {
  const fields: string[] = [];
  let value = "",
    quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"' && quoted) {
      value += '"';
      i++;
    } else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else value += c;
  }
  fields.push(value.trim());
  return fields;
}
export function parseUnits(raw: string, type: string, edit = false): Unit[] {
  const result: Unit[] = [];
  const subtitle = type === "影视台词" && /-->|^Dialogue:/im.test(raw);
  for (let line of raw.replace(/\r/g, "").split("\n")) {
    line = line.trim();
    if (!line) continue;
    if (subtitle) {
      if (
        /^(\d+|WEBVTT.*|NOTE.*|STYLE.*|\[.*\]|Format:.*|ScriptType:.*|Title:.*)$/.test(
          line,
        ) ||
        /-->/.test(line)
      )
        continue;
      if (/^Dialogue:/i.test(line)) line = line.split(",").slice(9).join(",");
      else if (/^\w+\s*:/.test(line)) continue;
      line = line
        .replace(/<[^>]+>|\{[^}]+\}/g, "")
        .replace(/\\[Nn]/g, " ")
        .trim();
      if (line.length > 1 && line.length <= 250)
        result.push({
          kind: "句子",
          prompt: line,
          answer: "待补充台词释义",
          context: line,
          note: "字幕导入；可在编辑内容中补充译文和场景。",
        });
      continue;
    }
    if (
      !edit &&
      (/^[#>]/.test(line) ||
        /^[-|:\s]+$/.test(line) ||
        /^(word|term|english)\s*[,|]/i.test(line))
    )
      continue;
    line = line.replace(/^[-*]\s+|^\d+[.)]\s+/, "");
    const fields = line.includes("|")
      ? line
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((x) => x.trim())
      : line.includes(",")
        ? csvFields(line)
        : line.split(/[：:]/).map((x) => x.trim());
    const [prompt, answer, context, ...notes] = fields;
    if (
      !prompt ||
      /^(英文|单词|word|term|english)$/i.test(prompt) ||
      prompt.length > 500
    )
      continue;
    result.push({
      kind:
        type === "歌曲笔记" ? "短语" : type === "影视台词" ? "句子" : "词汇",
      prompt,
      answer: answer || "待补充释义",
      context: context || "",
      note: notes.join(" | ") || "",
    });
  }
  return result;
}
