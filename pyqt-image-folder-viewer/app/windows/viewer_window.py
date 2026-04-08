"""
ViewerWindow — ViewerPage 相当（画像ビューア）
"""

from __future__ import annotations

import random
from pathlib import Path

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QKeyEvent, QPixmap, QTransform
from PyQt6.QtWidgets import (
    QApplication,
    QGraphicsPixmapItem,
    QGraphicsScene,
    QGraphicsView,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSizePolicy,
    QStatusBar,
    QToolBar,
    QWidget,
)

from app.models.profile import Card, CardViewerState, ProfileData, save_profile
from app.utils.image_utils import collect_images


class ImageView(QGraphicsView):
    """画像表示ウィジェット（ズーム・H-Flip 対応）。"""

    clicked = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._scene = QGraphicsScene()
        self.setScene(self._scene)
        self._item = QGraphicsPixmapItem()
        self._scene.addItem(self._item)
        self._h_flip = False
        self._zoom = 1.0
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setFrameShape(QGraphicsView.Shape.NoFrame)
        self.setBackgroundBrush(Qt.GlobalColor.black)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

    def set_image(self, path: str) -> None:
        pixmap = QPixmap(path)
        if pixmap.isNull():
            return
        self._item.setPixmap(pixmap)
        self._scene.setSceneRect(self._item.boundingRect())
        self._fit_zoom()

    def set_h_flip(self, enabled: bool) -> None:
        self._h_flip = enabled
        self._apply_transform()

    def set_zoom(self, zoom: float) -> None:
        self._zoom = zoom
        self._apply_transform()

    def zoom_in(self) -> None:
        self.set_zoom(min(self._zoom * 1.2, 4.0))

    def zoom_out(self) -> None:
        self.set_zoom(max(self._zoom * 0.8, 0.05))

    def reset_zoom(self) -> None:
        self._fit_zoom()

    def _fit_zoom(self) -> None:
        pixmap = self._item.pixmap()
        if pixmap.isNull():
            return
        vw = self.viewport().width()
        vh = self.viewport().height()
        pw = pixmap.width()
        ph = pixmap.height()
        if pw <= 0 or ph <= 0:
            return
        self._zoom = min(vw / pw, vh / ph, 4.0)
        self._apply_transform()

    def _apply_transform(self) -> None:
        sx = -self._zoom if self._h_flip else self._zoom
        self.setTransform(QTransform.fromScale(sx, self._zoom))

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self._fit_zoom()

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit()
        super().mousePressEvent(event)


class ViewerWindow(QMainWindow):
    """画像ビューアウィンドウ（ViewerPage 相当）。"""

    closed = pyqtSignal()

    def __init__(
        self,
        card: Card,
        profile: ProfileData,
        profile_path: str,
        parent=None,
    ):
        super().__init__(parent)
        self._card = card
        self._profile = profile
        self._profile_path = profile_path
        self._images: list[Path] = []
        self._indices: list[int] = []  # シャッフル時の仮想インデックス
        self._current: int = 0  # _indices 上の位置
        self._h_flip = False
        self._shuffle = False
        self._closing_to_index = False  # 「戻る」操作でのクローズフラグ

        self.setWindowTitle(card.title)
        self._build_ui()
        self._load_images()

    # ------------------------------------------------------------------
    # UI 構築
    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        toolbar = QToolBar()
        self.addToolBar(toolbar)

        btn_back = QPushButton("← 戻る")
        btn_back.clicked.connect(self._on_back)
        toolbar.addWidget(btn_back)

        self._lbl_title = QLabel()
        toolbar.addWidget(self._lbl_title)
        toolbar.addSeparator()

        self._lbl_zoom = QLabel("100%")
        toolbar.addWidget(self._lbl_zoom)

        self._btn_hflip = QPushButton("H")
        self._btn_hflip.setCheckable(True)
        self._btn_hflip.setToolTip("水平反転 (H)")
        self._btn_hflip.clicked.connect(self._toggle_hflip)
        toolbar.addWidget(self._btn_hflip)

        self._btn_shuffle = QPushButton("R")
        self._btn_shuffle.setCheckable(True)
        self._btn_shuffle.setToolTip("シャッフル (R)")
        self._btn_shuffle.clicked.connect(self._toggle_shuffle)
        toolbar.addWidget(self._btn_shuffle)

        # 画像表示エリア
        self._image_view = ImageView()
        self._image_view.clicked.connect(self._go_next)
        self.setCentralWidget(self._image_view)

        # ステータスバー（ナビゲーション情報）
        self._status = QStatusBar()
        self.setStatusBar(self._status)

    # ------------------------------------------------------------------
    # 画像ロード
    # ------------------------------------------------------------------

    def _load_images(self) -> None:
        self._images = collect_images(self._card.folder_path, self._card.recursive)
        if not self._images:
            QMessageBox.warning(self, "エラー", "フォルダに画像が見つかりません")
            self._on_back()
            return

        # ビューア状態の復元
        vs = self._card.viewer_state
        start_index = vs.last_image_index if vs else 0
        start_index = min(start_index, len(self._images) - 1)

        # ファイル名の一致確認
        if vs and vs.last_image_filename:
            matched = next(
                (i for i, p in enumerate(self._images)
                 if p.name == vs.last_image_filename),
                None,
            )
            if matched is not None:
                start_index = matched

        self._h_flip = vs.h_flip_enabled if vs else False
        self._shuffle = vs.shuffle_enabled if vs else False
        self._btn_hflip.setChecked(self._h_flip)
        self._btn_shuffle.setChecked(self._shuffle)
        self._image_view.set_h_flip(self._h_flip)

        self._indices = list(range(len(self._images)))
        if self._shuffle:
            random.shuffle(self._indices)
            # 復元インデックスをシャッフル列の先頭に移動
            if start_index in self._indices:
                pos = self._indices.index(start_index)
                self._indices[0], self._indices[pos] = self._indices[pos], self._indices[0]
            self._current = 0
        else:
            self._current = start_index

        self._show_current()

    def _show_current(self) -> None:
        if not self._images:
            return
        real_index = self._indices[self._current]
        path = self._images[real_index]
        self._image_view.set_image(str(path))
        self._lbl_title.setText(f"  {self._card.title} — {path.name}  ")
        self._lbl_zoom.setText(
            f"{int(self._image_view._zoom * 100)}%"
        )
        total = len(self._images)
        self._status.showMessage(
            f"{self._current + 1} / {total}"
            + ("  (シャッフル)" if self._shuffle else "")
            + "    ←→: ナビゲーション | H: 反転 | R: シャッフル | +/-: ズーム | ESC: 戻る"
        )
        self._save_viewer_state()

    # ------------------------------------------------------------------
    # ナビゲーション
    # ------------------------------------------------------------------

    def _go_next(self) -> None:
        if not self._images:
            return
        self._current = (self._current + 1) % len(self._images)
        self._show_current()

    def _go_prev(self) -> None:
        if not self._images:
            return
        self._current = (self._current - 1) % len(self._images)
        self._show_current()

    def _toggle_hflip(self) -> None:
        self._h_flip = not self._h_flip
        self._btn_hflip.setChecked(self._h_flip)
        self._image_view.set_h_flip(self._h_flip)
        self._save_viewer_state()

    def _toggle_shuffle(self) -> None:
        self._shuffle = not self._shuffle
        self._btn_shuffle.setChecked(self._shuffle)
        if self._shuffle:
            real_current = self._indices[self._current]
            self._indices = list(range(len(self._images)))
            random.shuffle(self._indices)
            # 現在表示中の画像を先頭に
            pos = self._indices.index(real_current)
            self._indices[0], self._indices[pos] = self._indices[pos], self._indices[0]
            self._current = 0
        else:
            real_current = self._indices[self._current]
            self._indices = list(range(len(self._images)))
            self._current = real_current
        self._show_current()

    # ------------------------------------------------------------------
    # 状態保存
    # ------------------------------------------------------------------

    def _save_viewer_state(self) -> None:
        if not self._images:
            return
        real_index = self._indices[self._current]
        self._card.viewer_state = CardViewerState(
            last_image_index=real_index,
            last_image_filename=self._images[real_index].name,
            h_flip_enabled=self._h_flip,
            shuffle_enabled=self._shuffle,
        )
        self._profile.app_state.last_page = "viewer"
        self._profile.app_state.last_card_id = self._card.id
        try:
            save_profile(self._profile_path, self._profile)
        except Exception:
            pass

    # ------------------------------------------------------------------
    # 戻る
    # ------------------------------------------------------------------

    def _on_back(self) -> None:
        self._closing_to_index = True
        self._profile.app_state.last_page = "index"
        try:
            save_profile(self._profile_path, self._profile)
        except Exception:
            pass
        self.close()

    # ------------------------------------------------------------------
    # キーボードショートカット
    # ------------------------------------------------------------------

    def keyPressEvent(self, event: QKeyEvent) -> None:
        key = event.key()
        if key in (Qt.Key.Key_Escape, Qt.Key.Key_Q):
            self._on_back()
        elif key == Qt.Key.Key_Left:
            self._go_prev()
        elif key == Qt.Key.Key_Right:
            self._go_next()
        elif key in (Qt.Key.Key_H,):
            self._toggle_hflip()
        elif key in (Qt.Key.Key_R,):
            self._toggle_shuffle()
        elif key in (Qt.Key.Key_Plus, Qt.Key.Key_Equal):
            self._image_view.zoom_in()
            self._lbl_zoom.setText(f"{int(self._image_view._zoom * 100)}%")
        elif key == Qt.Key.Key_Minus:
            self._image_view.zoom_out()
            self._lbl_zoom.setText(f"{int(self._image_view._zoom * 100)}%")
        elif key == Qt.Key.Key_0:
            self._image_view.reset_zoom()
            self._lbl_zoom.setText(f"{int(self._image_view._zoom * 100)}%")
        else:
            super().keyPressEvent(event)

    # ------------------------------------------------------------------
    # ウィンドウイベント
    # ------------------------------------------------------------------

    def closeEvent(self, event) -> None:
        # 「戻る」操作以外（ウィンドウを直接閉じた場合）はビューア状態を保存
        if not self._closing_to_index:
            self._save_viewer_state()
        self.closed.emit()
        event.accept()
