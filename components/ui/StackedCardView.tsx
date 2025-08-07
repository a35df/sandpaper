'use client';

import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StackedCardViewProps<T> {
  items: T[];
  renderItem: (item: T, hovered: boolean) => ReactNode;
}

const CARD_HEIGHT = 72; // 각 카드의 높이
const CARD_OVERLAP = 52; // 겹치는 높이 (카드의 제목 부분만 보이도록)

const StackedCardView = <T extends { id: any }>({ items, renderItem }: StackedCardViewProps<T>) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className="relative w-full"
      onMouseLeave={() => setHoveredIndex(null)}
      style={{ height: (items.length * (CARD_HEIGHT - CARD_OVERLAP)) + CARD_OVERLAP }}
    >
      {items.map((item, index) => {
        // 호버 시 y 위치 계산
        let y = index * (CARD_HEIGHT - CARD_OVERLAP);
        if (hoveredIndex !== null && index > hoveredIndex) {
          y += CARD_HEIGHT - CARD_OVERLAP; // 호버된 카드 아래의 카드들을 밀어냄
        }
        const isHovered = hoveredIndex === index;
        return (
          <motion.div
            key={item.id}
            animate={{ y }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            onMouseEnter={() => setHoveredIndex(index)}
            className="absolute w-full"
            style={{ zIndex: isHovered ? items.length : items.length - index }}
          >
            {renderItem(item, isHovered)}
          </motion.div>
        );
      })}
    </div>
  );
};

export default StackedCardView;
