// components/ui/TriageMode.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Paragraph, ReferenceCard } from '@/types';
import { motion } from 'framer-motion';

interface TriageModeProps {
  episodeId: string;
  paragraph: Paragraph;
  entryPoint: 'swipe' | 'icon_tap';
  onClose: () => void;
  onParagraphUpdate: (updatedParagraph: Paragraph) => void;
}

const TriageCard = ({ card, onDrop }: { card: ReferenceCard; onDrop: (cardId: string) => void }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={cardRef}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(event, info) => {
        const dropZone = document.getElementById('triage-drop-zone');
        if (!dropZone || !cardRef.current) return;

        const cardRect = cardRef.current.getBoundingClientRect();
        const dropZoneRect = dropZone.getBoundingClientRect();

        const isOverlapping = !(
          cardRect.right < dropZoneRect.left ||
          cardRect.left > dropZoneRect.right ||
          cardRect.bottom < dropZoneRect.top ||
          cardRect.top > dropZoneRect.bottom
        );

        if (isOverlapping) {
          onDrop(card.id);
        }
      }}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-full h-24 cursor-grab active:cursor-grabbing"
    >
      <h3 className="font-bold text-indigo-400 truncate">{card.title}</h3>
      <p className="text-sm text-gray-300 mt-1 truncate">{card.summary}</p>
    </motion.div>
  );
};

const TriageMode = ({ episodeId, paragraph, entryPoint, onClose, onParagraphUpdate }: TriageModeProps) => {
  const [cards, setCards] = useState<ReferenceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentParagraph, setCurrentParagraph] = useState(paragraph);

  useEffect(() => {
    setCurrentParagraph(paragraph);
  }, [paragraph]);

  useEffect(() => {
    const fetchCards = async () => {
      setIsLoading(true);
      try {
        let response;
        if (entryPoint === 'icon_tap') {
          response = await fetch(`/api/episodes/${episodeId}/paragraphs/${currentParagraph.id}/card-history`);
        } else {
          const current_card_id = currentParagraph.applied_card_history?.slice(-1)[0];
          response = await fetch(`/api/episodes/${episodeId}/paragraphs/${currentParagraph.id}/new-related-cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_card_id }),
          });
        }

        if (response.ok) {
          setCards(await response.json());
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [episodeId, currentParagraph, entryPoint]);

  const handleCardDrop = async (cardId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/episodes/${episodeId}/paragraphs/${currentParagraph.id}/apply-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_card_id: cardId }),
      });

      if (response.ok) {
        const updatedParagraph = await response.json();
        onParagraphUpdate(updatedParagraph);
        setCurrentParagraph(updatedParagraph);
      }
    } catch (error) {
      console.error('Error applying card:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = async () => {
    const appliedCardId = currentParagraph.applied_card_history?.slice(-1)[0];
    const cardsToHold = cards.filter(card => card.id !== appliedCardId && !card.id.startsWith('temp-'));
    
    if (cardsToHold.length > 0) {
      await fetch('/api/cards/bulk-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_ids: cardsToHold.map(c => c.id) }),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex flex-col items-center justify-center p-4">
      <button onClick={handleClose} className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2">Close</button>

      <motion.div 
        id="triage-drop-zone"
        className="bg-gray-950 border border-indigo-500 rounded-lg p-4 w-full max-w-2xl mb-8"
      >
        <p className="text-white">{currentParagraph.content}</p>
        {isUpdating && <div className="text-indigo-400 text-sm mt-2">Updating...</div>}
      </motion.div>

      <div className="w-full max-w-2xl space-y-4">
        {isLoading ? (
          <div className="text-center text-white">Loading cards...</div>
        ) : (
          cards.map(card => <TriageCard key={card.id} card={card} onDrop={handleCardDrop} />)
        )}
      </div>
    </div>
  );
};

export default TriageMode;
