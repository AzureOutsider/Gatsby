import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Book } from "../types";
import { useLearning } from "../store/LearningProvider";
import { PageHead, Empty } from "../components/UI";
import { contentTypes } from "../data/design";
import { BookCard } from "../features/library/BookCard";
import { BookEditor } from "../features/library/BookEditor";
export function LibraryPage({ onStart }: { onStart: (id: string) => void }) {
  const { data } = useLearning();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("全部"),
    [editor, setEditor] = useState<Book | "new" | null>(null);
  const books = data.items.filter(
    (book) =>
      (filter === "全部" || book.type === filter) &&
      [
        book.title,
        book.author,
        book.description,
        ...book.units.map((unit) => unit.prompt),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        title="你的英语收藏"
        copy="一首歌，一本词书，一段值得记住的对白。"
      >
        <button className="primary-btn" onClick={() => setEditor("new")}>
          <Plus size={18} />
          导入内容
        </button>
      </PageHead>
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={19} aria-hidden="true" />
          <input
            id="library-search"
            aria-label="搜索内容库"
            placeholder="搜索标题、来源或单词"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filter-group" aria-label="内容类型">
          {["全部", ...contentTypes].map((type) => (
            <button
              className={filter === type ? "filter-btn selected" : "filter-btn"}
              key={type}
              onClick={() => setFilter(type)}
              aria-pressed={filter === type}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="library-summary">
        {books.length} 份内容 <span>·</span>{" "}
        {books.reduce((sum, book) => sum + book.units.length, 0)} 个学习单元
      </div>
      {books.length ? (
        <div className="library-grid">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onStart={onStart}
              onEdit={setEditor}
            />
          ))}
        </div>
      ) : (
        <Empty>没有找到匹配内容。换一个关键词，或导入一份新内容。</Empty>
      )}
      {editor && (
        <BookEditor
          book={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
