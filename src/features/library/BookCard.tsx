import {
  ArrowUpRight,
  BookOpen,
  Film,
  Music2,
  FileText,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Book } from "../../types";
import { Progress } from "../../components/UI";
import { useLearning } from "../../store/LearningProvider";
import { bookProgress, resetBook } from "../../store/learning";
export function BookCard({
  book,
  onStart,
  onEdit,
}: {
  book: Book;
  onStart: (id: string) => void;
  onEdit?: (book: Book) => void;
}) {
  const { data, update, notify } = useLearning();
  const Icon =
    book.type === "歌曲笔记"
      ? Music2
      : book.type === "影视台词"
        ? Film
        : book.type === "文章"
          ? FileText
          : BookOpen;
  const progress = bookProgress(data, book.id);
  function reset(remove: boolean) {
    if (
      !confirm(
        `${remove ? "删除内容及对应复习记录" : "重置学习进度"}：“${book.title}”？正在使用它的轮次也会结束。建议先在学习记录页导出备份。`,
      )
    )
      return;
    if (update((data) => resetBook(data, book.id, remove)))
      notify(
        remove ? "内容已删除；如需恢复，请导入先前备份。" : "学习进度已重置。",
      );
  }
  return (
    <article
      className={`book-card glass-panel book-${book.type === "歌曲笔记" ? "music" : book.type === "影视台词" ? "film" : "words"}`}
    >
      <div className="book-top">
        <span className="book-symbol">
          <Icon size={25} aria-hidden="true" />
        </span>
        <span className="badge">{book.type}</span>
      </div>
      <button className="book-title" onClick={() => onStart(book.id)}>
        <h3>{book.title}</h3>
      </button>
      <p className="book-author">{book.author}</p>
      <p className="book-description">{book.description}</p>
      <div className="book-progress">
        <span>{book.units.length} 个学习单元</span>
        <span>已掌握 {progress}%</span>
      </div>
      <Progress value={progress} label={`${book.title} 掌握进度`} />
      <footer className="book-footer">
        <button className="text-btn" onClick={() => onStart(book.id)}>
          开始学习 <ArrowUpRight size={18} aria-hidden="true" />
        </button>
        {onEdit && (
          <div className="book-tools">
            <button
              className="icon-btn"
              title="编辑内容"
              aria-label={`编辑 ${book.title}`}
              onClick={() => onEdit(book)}
            >
              <Pencil size={17} />
            </button>
            <button
              className="icon-btn"
              title="重置进度"
              aria-label={`重置 ${book.title} 的进度`}
              onClick={() => reset(false)}
            >
              <RotateCcw size={17} />
            </button>
            <button
              className="icon-btn danger"
              title="删除内容"
              aria-label={`删除 ${book.title}`}
              onClick={() => reset(true)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}
