import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Modal } from "../../components/UI";
import { useLearning } from "../../store/LearningProvider";
import { homeBooks } from "../../store/learning";

export function HomeBookPicker({ onClose }: { onClose: () => void }) {
  const { data, update, notify } = useLearning();
  const [selected, setSelected] = useState(() =>
    homeBooks(data).map((book) => book.id),
  );
  const [error, setError] = useState("");
  const books = selected.flatMap((id) => {
    const book = data.items.find((item) => item.id === id);
    return book ? [book] : [];
  });
  function move(index: number, offset: number) {
    const ids = books.map((book) => book.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    setSelected(ids);
  }
  return (
    <Modal title="选择首页展示词书" onClose={onClose}>
      <form
        className="home-book-picker"
        onSubmit={(event) => {
          event.preventDefault();
          const ids = books.map((book) => book.id);
          if (!ids.length) {
            setError("请至少选择一本词书。");
            return;
          }
          if (update((current) => ({ ...current, homeBookIds: ids }))) {
            notify("首页展示词书已保存");
            onClose();
          }
        }}
      >
        <p className="modal-copy">
          选择 1–3 本词书，按下面的顺序展示在“下一段，读什么”。
        </p>
        <fieldset>
          <legend>展示顺序</legend>
          <ol className="home-book-order">
            {books.map((book, index) => (
              <li key={book.id}>
                <span className="home-book-number">{index + 1}</span>
                <strong>{book.title}</strong>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`上移 ${book.title}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`下移 ${book.title}`}
                  disabled={index === books.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          {!books.length && <p className="form-help">在下方勾选想读的词书。</p>}
        </fieldset>
        <fieldset>
          <legend aria-live="polite">
            内容库 · 已选 {books.length} / 3 本
          </legend>
          <div className="home-book-options">
            {data.items.map((book) => {
              const checked = books.some((item) => item.id === book.id);
              const disabled = !checked && books.length >= 3;
              return (
                <label
                  key={book.id}
                  className={`home-book-option ${disabled ? "unavailable" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      const ids = books.map((item) => item.id);
                      setSelected(
                        checked
                          ? ids.filter((id) => id !== book.id)
                          : [...ids, book.id],
                      );
                      setError("");
                    }}
                  />
                  <span>
                    <strong>{book.title}</strong>
                    <small>
                      {book.type} · {book.author}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="form-help">
            已选满三本时，先取消一本，再选择其他词书。
          </p>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="home-book-picker-footer">
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setSelected(data.items.slice(0, 3).map((book) => book.id));
              setError("");
            }}
          >
            恢复默认
          </button>
          <div className="modal-actions">
            <button type="button" className="quiet-btn" onClick={onClose}>
              取消
            </button>
            <button className="primary-btn">保存选择</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
