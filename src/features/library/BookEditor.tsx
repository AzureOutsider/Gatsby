import { useState } from "react";
import type { Book } from "../../types";
import { Modal } from "../../components/UI";
import { contentTypes } from "../../data/design";
import { parseUnits, serializeUnits } from "./parse";
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
  const [title, setTitle] = useState(book?.title || ""),
    [type, setType] = useState(book?.type || "单词书");
  const [author, setAuthor] = useState(book?.author || ""),
    [description, setDescription] = useState(book?.description || "");
  const [raw, setRaw] = useState(book ? serializeUnits(book.units) : ""),
    [error, setError] = useState("");
  async function readFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("请选择小于 5 MB 的文本文件。");
      setRaw(await file.text());
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "读取文件失败");
    }
  }
  function submit() {
    const units = parseUnits(raw, type, !!book);
    if (!title.trim() || !units.length) {
      setError("请填写标题，并至少提供一个有效学习单元。");
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
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="form-row">
          <label>
            标题
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="例如：Viva La Vida"
            />
          </label>
          <label>
            内容类型
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {contentTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
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
          学习单元
          <textarea
            className="units-editor"
            rows={8}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={
              "linger | 流连；逗留 | The melody lingered. | 注意词尾发音"
            }
            required
          />
        </label>
        <p className="form-help">
          每行：英文 | 中文释义 | 例句 | 笔记。也支持 CSV、Markdown 列表和 SRT /
          VTT / ASS 字幕。只导入你有权使用的内容。
        </p>
        {!book && (
          <label className="file-field">
            从文件读取
            <input
              type="file"
              accept=".md,.txt,.csv,.srt,.vtt,.ass"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="quiet-btn" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-btn" type="submit">
            {book ? "保存修改" : "建立学习卡片"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
