import { useEffect, useState } from "react";
import { ArrowRight, Layers3, PencilLine, Check } from "lucide-react";
import { roundSizes } from "../../data/design";
import { useLearning } from "../../store/LearningProvider";
import { createRound, units } from "../../store/learning";
export function RoundSetup({
  source,
  onFree,
}: {
  source: string;
  onFree: (source: string) => void;
}) {
  const { data, update, notify } = useLearning();
  const [selected, setSelected] = useState(source),
    [size, setSize] = useState(data.roundSize);
  useEffect(() => {
    setSelected(source);
  }, [source]);
  const available = units(data, selected).length;
  return (
    <section className="round-setup glass-panel">
      <div className="setup-copy">
        <span className="badge">一轮，一小步</span>
        <h2>
          让每一次学习，
          <br />
          都有一个小小的终点。
        </h2>
        <p>
          先回忆，再落笔。到期内容优先进入这一轮，
          <br />
          中途离开，也能从原来的地方继续。
        </p>
        <div className="learning-steps">
          <span>
            <Layers3 size={19} />
            翻卡回忆
          </span>
          <ArrowRight size={15} />
          <span>
            <PencilLine size={19} />
            可选拼写
          </span>
          <ArrowRight size={15} />
          <span>
            <Check size={19} />
            完成一轮
          </span>
        </div>
      </div>
      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (available && update((data) => createRound(data, selected, size)))
            notify("本轮已开始，进度会自动保存");
        }}
      >
        <label>
          学习来源
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="all">全部内容 · 到期优先</option>
            {data.items.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} · {book.units.length} 个单元
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>本轮数量</legend>
          <div className="size-options">
            {roundSizes.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={size === value}
                className={size === value ? "selected" : ""}
                onClick={() => setSize(value)}
              >
                {value}
                <small>个</small>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="form-help">
          本次将学习 {Math.min(size, available)} 个单元
          {available < size
            ? "（当前来源数量不足，使用全部可用内容）"
            : "，包含单词、词组或句子"}
          。
        </p>
        <button
          className="primary-btn"
          data-action="start"
          disabled={!available}
        >
          开始这一轮 <kbd>Enter</kbd>
        </button>
        <button
          type="button"
          className="quiet-btn"
          disabled={!available}
          onClick={() => onFree(selected)}
        >
          进入自由练习
        </button>
      </form>
    </section>
  );
}
