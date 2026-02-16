// インデックスページ - フォルダカードのグリッド表示

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ProfileSelector } from "../components/profile/ProfileSelector";
import { CardGrid, type CardValidation } from "../components/cards/CardGrid";
import { CardAddModal } from "../components/cards/CardAddModal";
import { CardEditModal } from "../components/cards/CardEditModal";
import {
  useProfileStore,
  useCards,
  useCardActions,
  type AddCardInput,
  type UpdateCardInput,
} from "../store/profileStore";
import { validateFolderPath } from "../api/tauri";
import { getCurrentWindow, LogicalPosition, LogicalSize, currentMonitor } from "@tauri-apps/api/window";
import type { Card } from "../types";

export function IndexPage() {
  const navigate = useNavigate();
  const { currentProfile, saveCurrentProfile, error, clearError } =
    useProfileStore();
  const cards = useCards();
  const { addCard, updateCard, deleteCard, reorderCards } = useCardActions();
  const updateAppState = useProfileStore((state) => state.updateAppState);

  // 状態復元フラグ（一度だけ実行）
  const restoredRef = useRef(false);

  // モーダル状態
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // 選択状態
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // カード検証結果
  const [validations, setValidations] = useState<Map<string, CardValidation>>(
    new Map()
  );

  // プロファイルが読み込まれていない場合はStartupPageへ
  useEffect(() => {
    if (!currentProfile) {
      navigate("/startup");
    }
  }, [currentProfile, navigate]);

  // 状態復元: 前回ViewerPageだった場合は復元遷移
  useEffect(() => {
    if (!currentProfile || restoredRef.current) return;
    restoredRef.current = true;

    const { appState } = currentProfile;

    // ウィンドウサイズ・位置の復元
    const restoreWindow = async () => {
      const { window: winState } = appState;
      const win = getCurrentWindow();

      // サイズ復元
      await win.setSize(new LogicalSize(winState.width, winState.height));

      // 位置復元（保存されている場合のみ）
      if (winState.x !== null && winState.y !== null) {
        const monitor = await currentMonitor();
        if (monitor) {
          const scale = monitor.scaleFactor ?? 1;
          const monW = monitor.size.width / scale;
          const monH = monitor.size.height / scale;
          const monX = monitor.position.x / scale;
          const monY = monitor.position.y / scale;

          // ウィンドウの一部（100px以上）がモニター内に収まるか
          const visible =
            winState.x + 100 > monX &&
            winState.x < monX + monW &&
            winState.y + 100 > monY &&
            winState.y < monY + monH;

          if (visible) {
            await win.setPosition(
              new LogicalPosition(winState.x, winState.y)
            );
          }
        }
      }
    };
    restoreWindow();

    if (
      appState.lastPage === "viewer" &&
      appState.lastCardId &&
      currentProfile.cards.some((c) => c.id === appState.lastCardId)
    ) {
      navigate(`/viewer/${appState.lastCardId}`, { replace: true });
    } else {
      // IndexPageにいるのでlastPageをindexに更新
      updateAppState({ lastPage: "index" });
    }
  }, [currentProfile, navigate, updateAppState]);

  // カードのフォルダパス検証
  useEffect(() => {
    const validateCards = async () => {
      const newValidations = new Map<string, CardValidation>();

      for (const card of cards) {
        try {
          const isValid = await validateFolderPath(card.folderPath);
          newValidations.set(card.id, {
            cardId: card.id,
            isValid,
            errorMessage: isValid ? undefined : "フォルダが見つかりません",
          });
        } catch {
          newValidations.set(card.id, {
            cardId: card.id,
            isValid: false,
            errorMessage: "検証エラー",
          });
        }
      }

      setValidations(newValidations);
    };

    if (cards.length > 0) {
      validateCards();
    } else {
      setValidations(new Map());
    }
  }, [cards]);

  // 選択カードが削除された場合はリセット
  useEffect(() => {
    if (selectedCardId && !cards.find((c) => c.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [cards, selectedCardId]);

  // カードクリック（ビューアを開く）
  const handleCardClick = useCallback(
    (card: Card) => {
      const validation = validations.get(card.id);
      if (validation?.isValid !== false) {
        navigate(`/viewer/${card.id}`);
      }
    },
    [navigate, validations]
  );

  // カード編集
  const handleCardEdit = useCallback((card: Card) => {
    setEditingCard(card);
  }, []);

  // カード削除
  const handleCardDelete = useCallback(
    (card: Card) => {
      if (window.confirm(`「${card.title}」を削除しますか？`)) {
        deleteCard(card.id);
        // 自動保存
        saveCurrentProfile();
      }
    },
    [deleteCard, saveCurrentProfile]
  );

  // カード追加
  const handleAddCard = useCallback(
    (input: AddCardInput) => {
      const newCard = addCard(input);
      if (newCard) {
        setSelectedCardId(newCard.id);
        // 自動保存
        saveCurrentProfile();
      }
    },
    [addCard, saveCurrentProfile]
  );

  // カード更新
  const handleUpdateCard = useCallback(
    (cardId: string, input: UpdateCardInput) => {
      updateCard(cardId, input);
      // 自動保存
      saveCurrentProfile();
    },
    [updateCard, saveCurrentProfile]
  );

  // カード並び替え
  const handleReorder = useCallback(
    (cardIds: string[]) => {
      reorderCards(cardIds);
      // 自動保存
      saveCurrentProfile();
    },
    [reorderCards, saveCurrentProfile]
  );

  // 編集モーダルの検証情報
  const editingCardValidation = useMemo(() => {
    if (!editingCard) return true;
    return validations.get(editingCard.id)?.isValid ?? true;
  }, [editingCard, validations]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // モーダルが開いている場合は無視
      if (isAddModalOpen || editingCard) return;

      // Ctrl+S: 保存
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveCurrentProfile();
        return;
      }

      // Ctrl+N: カード追加
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        setIsAddModalOpen(true);
        return;
      }

      // Delete: 選択カード削除
      if (e.key === "Delete" && selectedCardId) {
        e.preventDefault();
        const card = cards.find((c) => c.id === selectedCardId);
        if (card) {
          handleCardDelete(card);
        }
        return;
      }

      // Enter: 選択カードを開く
      if (e.key === "Enter" && selectedCardId) {
        e.preventDefault();
        const card = cards.find((c) => c.id === selectedCardId);
        if (card) {
          handleCardClick(card);
        }
        return;
      }

      // 矢印キー: カード選択移動
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        if (cards.length === 0) return;

        // 現在の選択インデックス
        const currentIndex = selectedCardId
          ? cards.findIndex((c) => c.id === selectedCardId)
          : -1;

        // グリッドの列数を推定（ウィンドウ幅に基づく）
        const cols = getGridColumns();

        let newIndex = currentIndex;

        switch (e.key) {
          case "ArrowLeft":
            newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
            break;
          case "ArrowRight":
            newIndex =
              currentIndex < cards.length - 1 ? currentIndex + 1 : currentIndex;
            break;
          case "ArrowUp":
            newIndex = currentIndex >= cols ? currentIndex - cols : currentIndex;
            break;
          case "ArrowDown":
            newIndex =
              currentIndex + cols < cards.length
                ? currentIndex + cols
                : currentIndex;
            break;
        }

        // 選択がなかった場合は最初のカードを選択
        if (currentIndex === -1) {
          newIndex = 0;
        }

        setSelectedCardId(cards[newIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isAddModalOpen,
    editingCard,
    saveCurrentProfile,
    selectedCardId,
    cards,
    handleCardDelete,
    handleCardClick,
  ]);

  // プロファイルが未読み込みの場合は何も表示しない
  if (!currentProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ProfileSelector />
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={18} />
              追加
            </button>
          </div>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カードグリッド */}
      <main className="max-w-7xl mx-auto">
        <CardGrid
          cards={cards}
          validations={validations}
          selectedCardId={selectedCardId}
          onCardClick={handleCardClick}
          onCardEdit={handleCardEdit}
          onCardDelete={handleCardDelete}
          onReorder={handleReorder}
        />
      </main>

      {/* カード追加モーダル */}
      <CardAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCard}
      />

      {/* カード編集モーダル */}
      <CardEditModal
        isOpen={editingCard !== null}
        onClose={() => setEditingCard(null)}
        card={editingCard}
        isValid={editingCardValidation}
        onSave={handleUpdateCard}
      />
    </div>
  );
}

// グリッドの列数を推定（レスポンシブ対応）
function getGridColumns(): number {
  const width = window.innerWidth;
  if (width >= 1280) return 6; // xl
  if (width >= 1024) return 5; // lg
  if (width >= 768) return 4; // md
  if (width >= 640) return 3; // sm
  return 2;
}
