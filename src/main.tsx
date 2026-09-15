import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/nunito";
import "./styles.css";
import App from "./App";
import { LearningProvider } from "./store/LearningProvider";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-page">
          <h1>页面暂时无法显示</h1>
          <p>
            已保存的学习数据不会被清除。请重新打开页面；如果问题持续，请保留本地数据并反馈。
          </p>
          <button className="primary-btn" onClick={() => location.reload()}>
            重新打开
          </button>
        </main>
      );
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <LearningProvider>
      <App />
    </LearningProvider>
  </ErrorBoundary>,
);
