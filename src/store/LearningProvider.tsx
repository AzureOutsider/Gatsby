import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LearningData, View } from "../types";
import { loadData, saveData, resetLearningData, STATE_KEY } from "./learning";
import { diagnoseData, type DataDiagnostic } from "./diagnostics";

// Resolve the browser storage getter inside the guarded call, not during render.
const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};

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
  sessionRevision: number;
  diagnostic?: DataDiagnostic;
  retryLoad: () => void;
  resetData: () => boolean;
  canExport: boolean;
}
const Context = createContext<Store | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => loadData(browserStorage));
  const [canExport, setCanExport] = useState(!loaded.warning);
  const [diagnostic, setDiagnostic] = useState(loaded.diagnostic);
  const [data, setData] = useState(loaded.data);
  const current = useRef(data);
  const [view, setView] = useState<View>("home");
  const [message, setMessage] = useState(loaded.notice || "");
  const [sessionRevision, setSessionRevision] = useState(0);
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
      notify(
        "当前数据尚未成功读取，请查看诊断、恢复备份或清除测试数据重新开始。",
      );
      return false;
    }
    const next = change(current.current);
    if (next === current.current) return true;
    try {
      saveData(browserStorage, next);
    } catch (error) {
      const detail = diagnoseData(
        error,
        "Gatsby 数据",
        STATE_KEY,
        "state",
        "save",
      );
      setDiagnostic(detail);
      notify(
        `保存失败：${detail.message} 当前操作未提交。可在数据管理中查看诊断。`,
      );
      return false;
    }
    current.current = next;
    setData(next);
    setCanExport(true);
    setDiagnostic(undefined);
    if (recovery) {
      setStorageWarning("");
      setSessionRevision((value) => value + 1);
    }
    return true;
  }
  function retryLoad() {
    const result = loadData(browserStorage);
    setDiagnostic(result.diagnostic);
    setStorageWarning(result.warning);
    if (!result.warning) {
      setCanExport(true);
      current.current = result.data;
      setData(result.data);
      setSessionRevision((value) => value + 1);
      notify(result.notice || "学习数据已成功读取");
    }
  }
  function resetData() {
    try {
      const result = resetLearningData(browserStorage);
      current.current = result.data;
      setData(result.data);
      setCanExport(true);
      setStorageWarning("");
      setDiagnostic(undefined);
      setSessionRevision((value) => value + 1);
      setView("home");
      notify(
        result.remainingKeys.length
          ? "已恢复内置词书并清空当前进度，但部分旧存储项未能删除。可在数据管理中再次尝试清理。"
          : "测试数据已清除，已恢复内置词书。现在可以重新开始学习。",
      );
      return true;
    } catch (error) {
      const detail = diagnoseData(
        error,
        "Gatsby 数据",
        STATE_KEY,
        "state",
        "reset",
      );
      setDiagnostic(detail);
      notify(`重置失败：${detail.message} 没有清除旧数据。`);
      return false;
    }
  }
  return (
    <Context.Provider
      value={{
        data,
        view,
        setView,
        update,
        message,
        notify,
        storageWarning,
        sessionRevision,
        diagnostic,
        retryLoad,
        resetData,
        canExport,
      }}
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
