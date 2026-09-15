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
  const { data, update, notify, storageWarning } = useLearning();
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
      <div className="data-section">
        <h3>保存一份副本</h3>
        <button
          className="primary-btn"
          onClick={exportData}
          disabled={!!storageWarning}
        >
          <Download size={18} aria-hidden="true" />
          导出 JSON 备份
        </button>
      </div>
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
