'use client';

import { ReferenceCard } from '@/types';
import { motion } from 'framer-motion';

interface ReferenceCardViewProps {
  card: ReferenceCard;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const ReferenceCardView = ({ card, onDragStart, onDragEnd }: ReferenceCardViewProps) => {
  return (
    <motion.div
      layoutId={card.id} // Animate presence when card is used
      drag
      dragSnapToOrigin
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.05, zIndex: 50 }}
      className="bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-grab active:cursor-grabbing shadow-lg"
    >
      <h3 className="font-bold text-indigo-400 pointer-events-none">{card.title}</h3>
      <p className="text-sm text-gray-300 mt-2 pointer-events-none">{card.summary}</p>
    </motion.div>
  );
};

export default ReferenceCardView;
