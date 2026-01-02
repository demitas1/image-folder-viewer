// ルーティング設定

import { Routes, Route, Navigate } from "react-router-dom";
import { IndexPage } from "./pages/IndexPage";
import { ViewerPage } from "./pages/ViewerPage";
import { StartupPage } from "./pages/StartupPage";

function App() {
  return (
    <Routes>
      <Route path="/startup" element={<StartupPage />} />
      <Route path="/" element={<IndexPage />} />
      <Route path="/viewer/:cardId" element={<ViewerPage />} />
      {/* 未知のパスはStartupPageへリダイレクト */}
      <Route path="*" element={<Navigate to="/startup" replace />} />
    </Routes>
  );
}

export default App;
