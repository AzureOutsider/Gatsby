import { useState } from "react";
import { formatLabels, type ImportResult } from "./parse";

export function ImportPreview({
  result,
  onLine,
}: {
  result: ImportResult;
  onLine: (line: number) => void;
}) {
  const [page, setPage] = useState(0);
  const [issuePage, setIssuePage] = useState(0);
  const errors = result.issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warnings = result.issues.length - errors;
  const pages = Math.max(1, Math.ceil(result.units.length / 10));
  const current = Math.min(page, pages - 1);
  const issuePages = Math.max(1, Math.ceil(result.issues.length / 10));
  const currentIssue = Math.min(issuePage, issuePages - 1);
  return (
    <section className="import-preview" aria-label="导入预览">
      <h3>导入预览</h3>
      <p className="form-help" role="status">
        {formatLabels[result.format]} · 已识别 {result.units.length} 个单元 ·{" "}
        {errors} 个错误 · {warnings} 个警告 · 跳过 {result.skipped}{" "}
        行标题、表头或字幕信息
      </p>
      {!!result.issues.length && (
        <div className="import-issues" id="import-issues">
          <p>错误需修正后保存；警告内容请核对。点击行号可定位到原文。</p>
          <ul>
            {result.issues
              .slice(currentIssue * 10, currentIssue * 10 + 10)
              .map((issue, index) => (
                <li
                  key={`${issue.line}-${index}`}
                  className={
                    issue.severity === "error" ? "form-error" : "import-warning"
                  }
                >
                  <button
                    className="text-btn"
                    type="button"
                    onClick={() => onLine(issue.line)}
                  >
                    第 {issue.line} 行
                  </button>
                  <span>
                    {issue.severity === "error" ? "错误" : "警告"}：
                    {issue.message}
                  </span>
                </li>
              ))}
          </ul>
          {issuePages > 1 && (
            <div className="preview-pagination">
              <button
                type="button"
                className="text-btn"
                disabled={!currentIssue}
                onClick={() => setIssuePage(currentIssue - 1)}
              >
                上一页问题
              </button>
              <span>
                问题第 {currentIssue + 1} / {issuePages} 页
              </span>
              <button
                type="button"
                className="text-btn"
                disabled={currentIssue === issuePages - 1}
                onClick={() => setIssuePage(currentIssue + 1)}
              >
                下一页问题
              </button>
            </div>
          )}
        </div>
      )}
      {result.units.length ? (
        <>
          <ol className="import-cards" start={current * 10 + 1}>
            {result.units
              .slice(current * 10, current * 10 + 10)
              .map((unit, index) => (
                <li key={current * 10 + index}>
                  <div className="import-card-heading">
                    <strong>{unit.prompt}</strong>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => onLine(result.lines[current * 10 + index])}
                    >
                      第 {result.lines[current * 10 + index]} 行
                    </button>
                  </div>
                  <p>{unit.answer}</p>
                  {unit.context && (
                    <p className="muted">例句：{unit.context}</p>
                  )}
                  {unit.note && <p className="muted">笔记：{unit.note}</p>}
                </li>
              ))}
          </ol>
          {pages > 1 && (
            <div className="preview-pagination">
              <button
                type="button"
                className="quiet-btn"
                disabled={!current}
                onClick={() => setPage(current - 1)}
              >
                上一页预览
              </button>
              <span>
                第 {current + 1} / {pages} 页 · 每页最多 10 个单元
              </span>
              <button
                type="button"
                className="quiet-btn"
                disabled={current === pages - 1}
                onClick={() => setPage(current + 1)}
              >
                下一页预览
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="form-help">
          尚未识别到学习单元，请检查内容或切换解析格式。
        </p>
      )}
    </section>
  );
}
