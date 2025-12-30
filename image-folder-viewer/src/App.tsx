// ルーティング設定

import { Routes, Route } from "react-router-dom";
import { IndexPage } from "./pages/IndexPage";
import { ViewerPage } from "./pages/ViewerPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/viewer/:cardId" element={<ViewerPage />} />
    </Routes>
  );
}

export default App;
