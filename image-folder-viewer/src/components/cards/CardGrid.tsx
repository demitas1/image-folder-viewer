// カードグリッドコンポーネント

import { CardItem } from "./CardItem";
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
}

export const CardGrid = ({
  cards,
  validations,
  selectedCardId,
  onCardClick,
  onCardEdit,
  onCardDelete,
}: CardGridProps) => {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg">カードがありません</p>
        <p className="text-sm mt-2">Ctrl+N でカードを追加できます</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {cards.map((card) => {
        const validation = validations.get(card.id);
        const isValid = validation?.isValid ?? true;
        const errorMessage = validation?.errorMessage;

        return (
          <CardItem
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
  );
};
