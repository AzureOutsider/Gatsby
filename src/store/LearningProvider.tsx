import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LearningData, View } from "../types";
import { loadData, saveData } from "./learning";

interface Store {
  data: LearningData;
  view: View;
  setView: (view: View) => void;
  update: (
    change: (data: LearningData) => LearningData,
    recovery?: boolean,
  ) => boolean;
  message: string;
  notify: (message: string) => void;
  storageWarning: string;
}
const Context = createContext<Store | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => loadData(localStorage));
  const [data, setData] = useState(loaded.data);
  const current = useRef(data);
  const [view, setView] = useState<View>("home");
  const [message, setMessage] = useState("");
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function notify(text: string) {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), 4000);
  }
  function update(
    change: (data: LearningData) => LearningData,
    recovery = false,
  ): boolean {
    if (storageWarning && !recovery) {
      notify("为保护原始数据，请先通过数据管理恢复备份。");
      return false;
    }
    const next = change(current.current);
    if (next === current.current) return true;
    try {
      saveData(localStorage, next);
    } catch {
      notify(
        "保存失败：浏览器存储不可用或空间不足。当前操作未提交，请先导出备份。",
      );
      return false;
    }
    current.current = next;
    setData(next);
    if (recovery) setStorageWarning("");
    return true;
  }
  return (
    <Context.Provider
      value={{ data, view, setView, update, message, notify, storageWarning }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLearning() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing learning provider");
  return value;
}
