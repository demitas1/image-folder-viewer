// カードグリッドコンポーネント（ドラッグ&ドロップ対応）

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCardItem } from "./SortableCardItem";
import type { Card } from "../../types";

// カードの有効性情報
export interface CardValidation {
  cardId: string;
  isValid: boolean;
  errorMessage?: string;
}

interface CardGridProps {
  cards: Card[];
  validations: Map<string, CardValidation>;
  selectedCardId: string | null;
  onCardClick: (card: Card) => void;
  onCardEdit: (card: Card) => void;
  onCardDelete: (card: Card) => void;
  onReorder: (cardIds: string[]) => void;
}

export const CardGrid = ({
  cards,
  validations,
  selectedCardId,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onReorder,
}: CardGridProps) => {
  // ドラッグセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // ドラッグ開始の閾値（少し動かさないと開始しない）
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ終了時の処理
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = cards.findIndex((c) => c.id === active.id);
        const newIndex = cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // 新しい順序を計算
          const newCards = [...cards];
          const [movedCard] = newCards.splice(oldIndex, 1);
          newCards.splice(newIndex, 0, movedCard);

          // IDの配列で並び替えを通知
          onReorder(newCards.map((c) => c.id));
        }
      }
    },
    [cards, onReorder]
  );

  // カードIDの配列
  const cardIds = cards.map((c) => c.id);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg">カードがありません</p>
        <p className="text-sm mt-2">Ctrl+N でカードを追加できます</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
          {cards.map((card) => {
            const validation = validations.get(card.id);
            const isValid = validation?.isValid ?? true;
            const errorMessage = validation?.errorMessage;

            return (
              <SortableCardItem
                key={card.id}
                card={card}
                isValid={isValid}
                errorMessage={errorMessage}
                isSelected={card.id === selectedCardId}
                onClick={() => onCardClick(card)}
                onEdit={() => onCardEdit(card)}
                onDelete={() => onCardDelete(card)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};
