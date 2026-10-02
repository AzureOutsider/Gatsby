import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Modal } from "../../components/UI";
import { useLearning } from "../../store/LearningProvider";
import {
  backup,
  dayKey,
  importBackup,
  validateBackup,
} from "../../store/learning";
export function DataTools({ onClose }: { onClose: () => void }) {
  const {
    data,
    update,
    notify,
    storageWarning,
    diagnostic,
    retryLoad,
    resetData,
    canExport,
  } = useLearning();
  const [payload, setPayload] = useState<unknown>(null),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [mode, setMode] = useState("merge");
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup(data), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `gatsby-backup-${dayKey(new Date())}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("学习数据已导出");
  }
  function exportDiagnostic() {
    const report = {
      app: "Gatsby",
      reportVersion: 1,
      origin: window.location.origin,
      diagnostic,
      note: "仅包含错误位置及分类，不包含词条原文、学习记录或完整备份。",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `gatsby-diagnostic-${dayKey(new Date())}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("诊断报告已导出，不包含学习内容。");
  }
  function reset() {
    if (
      !confirm(
        "确定清除学习测试数据并重新开始？\n将删除此浏览器当前地址下 Gatsby / English Study 的自定义内容、复习记录、轮次进度、设置及旧版快照，恢复内置原创示例词书。\n不会清理其他网站的数据。没有外部备份时无法恢复这些测试数据。",
      )
    )
      return;
    if (resetData()) onClose();
  }
  async function choose(file?: File) {
    setPayload(null);
    setName("");
    setError("");
    if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024)
        throw new Error("备份过大，请使用小于 30 MB 的备份。");
      const value: unknown = JSON.parse(await file.text());
      validateBackup(value);
      setPayload(value);
      setName(file.name);
    } catch (error) {
      setError(error instanceof Error ? error.message : "备份读取失败");
    }
  }
  function importData() {
    if (!payload) return;
    if (
      (mode === "replace" || storageWarning) &&
      !confirm("恢复备份会替换当前数据，请确认已保留所需备份。继续吗？")
    )
      return;
    try {
      if (
        update(
          (data) =>
            importBackup(data, payload, mode === "replace" || !!storageWarning),
          true,
        )
      ) {
        notify("学习数据已恢复");
        onClose();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "导入失败");
    }
  }
  return (
    <Modal title="学习数据，自己保管" onClose={onClose}>
      <p className="modal-copy">
        备份包含内容库、复习调度、学习记录与未完成轮次。兼容旧版 English Study
        的 JSON 备份。
      </p>
      {diagnostic && (
        <section
          className="data-section diagnostic-panel"
          aria-label="数据诊断"
        >
          <h3>
            {diagnostic.operation === "read"
              ? "读取失败的具体原因"
              : diagnostic.operation === "reset"
                ? "重置未完成"
                : "保存未完成"}
          </h3>
          <p className="form-error" role="alert">
            {diagnostic.message}
          </p>
          <dl>
            <dt>错误代码</dt>
            <dd>{diagnostic.code}</dd>
            <dt>来源</dt>
            <dd>
              {diagnostic.source} · {diagnostic.section}
            </dd>
            <dt>存储位置</dt>
            <dd>{diagnostic.storageKey}</dd>
            <dt>字段位置</dt>
            <dd>{diagnostic.field}</dd>
          </dl>
          <p className="form-help">{diagnostic.suggestion}</p>
          <div className="diagnostic-actions">
            <button className="quiet-btn" onClick={retryLoad}>
              重新读取
            </button>
            <button className="quiet-btn" onClick={exportDiagnostic}>
              导出诊断报告
            </button>
          </div>
          <p className="form-help">
            诊断报告不含学习内容，可发送给开发者排查。它不是学习数据备份。
          </p>
        </section>
      )}
      <section className="data-section reset-section">
        <h3>不保留测试数据，重新开始</h3>
        <p className="modal-copy">
          清空自定义内容、学习记录、轮次进度及旧版快照，恢复内置词书。只作用于当前浏览器、当前地址的学习数据。
        </p>
        <button className="quiet-btn danger" onClick={reset}>
          清除旧测试数据，重新开始
        </button>
        <p className="form-help">
          此操作需要确认；没有外部备份时无法恢复。不会影响其他网站。
        </p>
      </section>
      <div className="data-section">
        <h3>保存一份副本</h3>
        <button
          className="primary-btn"
          onClick={exportData}
          disabled={!canExport}
        >
          <Download size={18} aria-hidden="true" />
          导出 JSON 备份
        </button>
        {!canExport && (
          <p className="form-help">
            当前原始数据尚未成功读取，不能将页面的默认词书导出为原数据备份。可先查看诊断，或清除测试数据重新开始。
          </p>
        )}
      </div>
      {storageWarning && canExport && (
        <p className="form-help">
          当前存储读取失败，但仍可导出本页面最后一次成功读取的数据。它可能不包含其他窗口的新修改。
        </p>
      )}
      <div className="data-section">
        <h3>从备份继续</h3>
        <label className="file-field">
          <Upload size={18} aria-hidden="true" />
          选择备份文件
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void choose(e.target.files?.[0])}
          />
        </label>
        <p className="form-help">{name || "尚未选择文件"}</p>
        <label>
          导入方式
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="merge">合并到现有数据</option>
            <option value="replace">覆盖现有数据</option>
          </select>
        </label>
        <p className="form-help">
          合并时，同 ID 内容以备份为准；当前进行中的轮次优先保留。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="quiet-btn" disabled={!payload} onClick={importData}>
          导入选中的备份
        </button>
      </div>
    </Modal>
  );
}
