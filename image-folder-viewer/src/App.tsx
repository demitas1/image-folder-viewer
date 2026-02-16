// ルーティング設定

import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IndexPage } from "./pages/IndexPage";
import { ViewerPage } from "./pages/ViewerPage";
import { StartupPage } from "./pages/StartupPage";
import { useProfileStore } from "./store/profileStore";
import { saveProfile } from "./api/tauri";

function App() {
  // ウィンドウ終了時にウィンドウ状態を保存
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    getCurrentWindow()
      .onCloseRequested(async () => {
        const { currentProfile, currentProfilePath } =
          useProfileStore.getState();
        if (!currentProfile || !currentProfilePath) return;

        const win = getCurrentWindow();
        const pos = await win.outerPosition();
        const size = await win.outerSize();
        const scale = await win.scaleFactor();

        // 論理座標に変換して保存
        useProfileStore.getState().updateAppState({
          window: {
            x: Math.round(pos.x / scale),
            y: Math.round(pos.y / scale),
            width: Math.round(size.width / scale),
            height: Math.round(size.height / scale),
          },
        });

        const { currentProfile: updated, currentProfilePath: path } =
          useProfileStore.getState();
        if (updated && path) {
          await saveProfile(path, updated);
        }
      })
      .then((fn) => {
        unlistenFn = fn;
      });

    return () => {
      unlistenFn?.();
    };
  }, []);

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
