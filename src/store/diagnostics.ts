export class DataValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public code = "INVALID_SCHEMA",
  ) {
    super(`${message}（${field}）`);
    this.name = "DataValidationError";
  }
}
export interface DataDiagnostic {
  code: string;
  operation: "read" | "save" | "reset";
  source: string;
  storageKey: string;
  section: string;
  field: string;
  message: string;
  suggestion: string;
  detectedAt: string;
}
const sections: Record<string, string> = {
  items: "内容库",
  logs: "复习记录",
  schedule: "复习计划",
  round: "当前轮次",
  rounds: "轮次历史",
  roundSize: "每轮数量",
  dailyGoal: "每日目标",
  practiceMode: "练习模式",
  homeBookIds: "首页展示词书",
  version: "数据版本",
  state: "整体学习数据",
};
export function diagnoseData(
  error: unknown,
  source: string,
  storageKey: string,
  field = "state",
  operation: DataDiagnostic["operation"] = "read",
): DataDiagnostic {
  if (error instanceof DataValidationError) field = error.field;
  const section = sections[field.split(/[.[]/)[0]] || "学习数据";
  // DOMException can come from another browser realm and need not instanceof Error.
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  let code = "UNEXPECTED_STORAGE_ERROR",
    message = "处理学习数据时发生未预期错误。",
    suggestion = "重新打开应用；若仍失败，可导出诊断报告。";
  if (name === "SecurityError" || name === "NotAllowedError") {
    code = "STORAGE_ACCESS_DENIED";
    message = "浏览器禁止访问本地存储。";
    suggestion =
      "请允许此网站使用本地存储，或在普通浏览窗口打开。重置数据不能解除浏览器限制。";
  } else if (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED"
  ) {
    code = "STORAGE_QUOTA_EXCEEDED";
    message = "浏览器存储空间不足，无法保存。";
    suggestion =
      "先导出备份，再释放浏览器存储空间。不要清除其他网站数据来尝试修复。";
  } else if (name === "SyntaxError") {
    code = "INVALID_JSON";
    message = `${section}不是有效的 JSON 数据。`;
    suggestion = "可恢复有效备份；如果这些只是测试数据，可清除后重新开始。";
  } else if (error instanceof DataValidationError) {
    code = error.code;
    message = `${section}校验失败：${error.message}`;
    suggestion =
      code === "UNSUPPORTED_VERSION"
        ? "请使用支持该数据版本的程序，不要直接覆盖重要数据。"
        : "数据字段与当前版本不兼容。可恢复备份，或在不需要测试数据时重新开始。";
  }
  // Never include raw values, native parser snippets, or arbitrary exception messages.
  return {
    code,
    operation,
    source,
    storageKey,
    section,
    field,
    message,
    suggestion,
    detectedAt: new Date().toISOString(),
  };
}
