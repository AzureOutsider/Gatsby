import { useId, useMemo, useRef, useState } from "react";
import type { Book } from "../../types";
import { Modal } from "../../components/UI";
import { contentTypes } from "../../data/design";
import {
  previewUnits,
  serializeUnits,
  formatLabels,
  type ImportFormat,
} from "./parse";
import { ImportPreview } from "./ImportPreview";
import { useLearning } from "../../store/LearningProvider";
import { saveBook } from "../../store/learning";
export function BookEditor({
  book,
  onClose,
}: {
  book?: Book;
  onClose: () => void;
}) {
  const { data, update, notify } = useLearning();
  const fieldId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const fileRequest = useRef(0);
  const [title, setTitle] = useState(book?.title || ""),
    [type, setType] = useState(book?.type || "单词书");
  const [author, setAuthor] = useState(book?.author || ""),
    [description, setDescription] = useState(book?.description || "");
  const [raw, setRaw] = useState(book ? serializeUnits(book.units) : ""),
    [error, setError] = useState("");
  const [format, setFormat] = useState<ImportFormat>(book ? "lines" : "auto");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const result = useMemo(
    () => previewUnits(raw, type, !!book, format),
    [raw, type, book, format],
  );
  const errors = result.issues.filter((issue) => issue.severity === "error");
  const warnings = result.issues.filter(
    (issue) => issue.severity === "warning",
  );
  function selectLine(line: number) {
    const editor = input.current;
    if (!editor) return;
    const lines = raw.split("\n");
    const start = lines
      .slice(0, line - 1)
      .reduce((total, value) => total + value.length + 1, 0);
    editor.focus();
    editor.setSelectionRange(start, start + (lines[line - 1]?.length || 0));
    editor.scrollTop =
      (line - 1) * Number.parseFloat(getComputedStyle(editor).lineHeight);
  }
  function contentChanged(value: string) {
    setRaw(value);
    setAcknowledged(false);
    setError("");
    setFileError("");
  }
  async function readFile(file?: File) {
    if (!file) return;
    const request = ++fileRequest.current;
    setReading(true);
    setError("");
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("请选择小于 5 MB 的文本文件。");
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (
        !extension ||
        !["md", "txt", "csv", "srt", "vtt", "ass"].includes(extension)
      )
        throw new Error(
          "不支持此文件格式。请选择 MD、TXT、CSV、SRT、VTT 或 ASS 文件。",
        );
      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        throw new Error(
          "读取文件失败，请检查文件是否仍可访问，然后重新选择文件。",
        );
      }
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        throw new Error(
          "文件不是有效的 UTF-8 文本。请在文本编辑器中另存为 UTF-8 后重试。",
        );
      }
      if (request !== fileRequest.current) return;
      if (text.includes("\0"))
        throw new Error("文件包含二进制内容，请使用 UTF-8 文本文件。");
      if (!text.trim()) throw new Error("文件为空，请选择包含学习内容的文件。");
      contentChanged(text.replace(/\r\n?/g, "\n"));
      setFileName(file.name);
      setFormat(
        extension === "csv"
          ? "csv"
          : ["srt", "vtt", "ass"].includes(extension)
            ? "subtitles"
            : "auto",
      );
      if (["srt", "vtt", "ass"].includes(extension)) setType("影视台词");
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ""));
    } catch (error) {
      if (request === fileRequest.current) {
        const message =
          error instanceof Error
            ? error.message
            : "读取文件失败，请重新选择文件。";
        setError(message);
        setFileError(message);
      }
    } finally {
      if (request === fileRequest.current) setReading(false);
    }
  }
  function submit() {
    setSubmitted(true);
    if (reading) return;
    if (fileError) {
      setError(
        `${fileError} 原有输入仍保留，请重新选择文件或修改学习单元后再保存。`,
      );
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    const units = result.units;
    if (
      !title.trim() ||
      !units.length ||
      errors.length ||
      (warnings.length && !acknowledged)
    ) {
      setError(
        !title.trim()
          ? "请填写词书标题。"
          : errors.length
            ? `发现 ${errors.length} 个错误，请按行号修正后再保存。`
            : !units.length
              ? "没有可导入的学习单元，请检查内容或解析格式。"
              : "请核对预览并确认警告内容后再保存。",
      );
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    if (
      book &&
      data.round?.cards.some((card) => card.itemId === book.id) &&
      !confirm("编辑会结束正在使用这份内容的当前轮次，已有反馈会保留。继续吗？")
    )
      return;
    if (
      update((data) =>
        saveBook(data, {
          id: book?.id || `import-${crypto.randomUUID()}`,
          title: title.trim(),
          type,
          author: author.trim() || "本地内容",
          description: description.trim() || "你的私人英语收藏。",
          units,
          level: book?.level || "自定义",
        }),
      )
    ) {
      notify(`已保存 ${units.length} 个学习单元`);
      onClose();
    } else {
      setError(
        "保存失败，内容尚未导入。请查看页面提示或数据诊断后重试，当前输入已保留。",
      );
      requestAnimationFrame(() => summary.current?.focus());
    }
  }
  return (
    <Modal
      title={book ? "编辑学习内容" : "把喜欢的英语，放进来"}
      onClose={onClose}
      wide
    >
      <form
        className="editor-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {error && (
          <div
            className="form-error import-error-summary"
            ref={summary}
            tabIndex={-1}
            role="alert"
          >
            <p>{error}</p>
            <button
              type="button"
              className="text-btn"
              onClick={() =>
                !title.trim()
                  ? titleInput.current?.focus()
                  : selectLine(errors[0]?.line || warnings[0]?.line || 1)
              }
            >
              定位需要检查的字段
            </button>
          </div>
        )}
        <div className="form-row">
          <label>
            标题
            <input
              ref={titleInput}
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError("");
              }}
              aria-invalid={submitted && !title.trim()}
              aria-describedby={
                submitted && !title.trim()
                  ? `${fieldId}-title-error`
                  : undefined
              }
              required
              placeholder="例如：Viva La Vida"
            />
          </label>
          <label>
            内容类型
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setAcknowledged(false);
                setError("");
              }}
            >
              {contentTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        {submitted && !title.trim() && (
          <p className="form-error" id={`${fieldId}-title-error`}>
            标题不能为空。
          </p>
        )}
        <label>
          来源
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="歌手、影视作品或词书名称"
          />
        </label>
        <label>
          简介
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          解析格式
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as ImportFormat);
              setAcknowledged(false);
              setError("");
            }}
          >
            {(Object.keys(formatLabels) as ImportFormat[]).map((key) => (
              <option key={key} value={key}>
                {formatLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          学习单元
          <textarea
            id={`${fieldId}-units`}
            ref={input}
            className="units-editor"
            rows={8}
            value={raw}
            onChange={(e) => contentChanged(e.target.value)}
            disabled={reading}
            aria-invalid={
              !!errors.length || (submitted && !result.units.length)
            }
            aria-describedby={`${fieldId}-help${result.issues.length ? " import-issues" : ""}`}
            placeholder={
              "linger | 流连；逗留 | The melody lingered. | 注意词尾发音"
            }
            required
          />
        </label>
        <p className="form-help" id={`${fieldId}-help`}>
          每行：英文 | 中文释义 | 例句 | 笔记。也支持 CSV、Markdown 列表和 SRT /
          VTT / ASS 字幕。只导入你有权使用的内容。 文件请使用 UTF-8
          编码，大小不超过 5 MB。
        </p>
        {!!errors.length && (
          <p className="form-error">
            学习单元有 {errors.length} 个错误，请在下方预览中点击行号修正。
          </p>
        )}
        {!book && (
          <label className="file-field">
            从文件读取
            <input
              type="file"
              accept=".md,.txt,.csv,.srt,.vtt,.ass"
              onChange={(e) => {
                void readFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {(reading || fileName) && (
          <p className="form-help" role="status">
            {reading
              ? "正在读取文件…"
              : `已读取：${fileName}。可在上方继续修正内容。`}
          </p>
        )}
        <ImportPreview result={result} onLine={selectLine} />
        {!!warnings.length && (
          <label className="import-acknowledgement">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => {
                setAcknowledged(e.target.checked);
                setError("");
              }}
            />
            我已核对预览，接受以上 {warnings.length} 个警告并继续保存。
          </label>
        )}
        <div className="modal-actions">
          <button className="quiet-btn" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-btn" type="submit" disabled={reading}>
            {book ? "保存修改" : "建立学习卡片"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
