// ソート可能なカードアイテム（ドラッグ&ドロップ対応）

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardItem } from "./CardItem";
import type { Card } from "../../types";

interface SortableCardItemProps {
  card: Card;
  isValid: boolean;
  errorMessage?: string;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const SortableCardItem = ({
  card,
  isValid,
  errorMessage,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: SortableCardItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardItem
        card={card}
        isValid={isValid}
        errorMessage={errorMessage}
        isSelected={isSelected}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
};
