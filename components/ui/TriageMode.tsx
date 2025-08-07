// components/ui/TriageMode.tsx
'use client';

import { useState, useEffect } from 'react';
import { Paragraph, ReferenceCard } from '@/types';
import { motion, useAnimation } from 'framer-motion';

interface TriageModeProps {
  paragraph: Paragraph;
  entryPoint: 'swipe' | 'icon_tap';
  onClose: () => void;
  onParagraphUpdate: (updatedParagraph: Paragraph) => void;
}

const TriageCard = ({ card, onDrop }: { card: ReferenceCard; onDrop: (cardId: string) => void }) => {
  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.5}
      onDragEnd={(event, info) => {
        // 이 로직은 드롭 영역과 겹치는지 확인해야 더 정확해집니다.
        // 우선은 y 좌표가 특정 지점 위로 올라가면 드롭된 것으로 간주합니다.
        if (info.point.y < 200) {
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

const TriageMode = ({ paragraph, entryPoint, onClose, onParagraphUpdate }: TriageModeProps) => {
  const [cards, setCards] = useState<ReferenceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentParagraph, setCurrentParagraph] = useState(paragraph);

  useEffect(() => {
    // 부모로부터 받은 paragraph가 변경되면 내부 상태도 업데이트
    setCurrentParagraph(paragraph);
  }, [paragraph]);

  useEffect(() => {
    const fetchCards = async () => {
      setIsLoading(true);
      try {
        let response;
        // API 호출 시 episode ID가 필요하지만, 지금은 DUMMY로 처리
        const episodeId = 'DUMMY_EPISODE_ID';
        if (entryPoint === 'icon_tap') {
          // 경로 A: 적용된 카드 히스토리 조회
          response = await fetch(`/api/episodes/${episodeId}/paragraphs/${paragraph.id}/card-history`);
        } else {
          // 경로 B: 새로운 관련 카드 조회
          // 현재 적용된 카드 ID가 필요하지만, 우선 paragraph의 history에서 마지막 ID를 가져온다고 가정
          const current_card_id = paragraph.applied_card_history?.slice(-1)[0];
          response = await fetch(`/api/episodes/${episodeId}/paragraphs/${paragraph.id}/new-related-cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_card_id }),
          });
        }

        if (response.ok) {
          const data = await response.json();
          setCards(data);
        } else {
          console.error('Failed to fetch cards for triage mode');
        }
      } catch (error) {
        console.error('Error in fetchCards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [paragraph, entryPoint]);

  const handleClose = async () => {
    // 현재 적용된 카드를 제외한 나머지 카드들을 보관 처리
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

  const handleCardDrop = async (cardId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const episodeId = 'DUMMY_EPISODE_ID';
      const response = await fetch(`/api/episodes/${episodeId}/paragraphs/${paragraph.id}/apply-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_card_id: cardId }),
      });

      if (response.ok) {
        const updatedParagraph = await response.json();
        onParagraphUpdate(updatedParagraph); // 부모 상태 업데이트
        setCurrentParagraph(updatedParagraph); // 내부 상태도 업데이트

        // 카드를 적용했으므로, 트라이아지 모드를 닫지 않고 유지
        // onClose();

      } else {
        console.error('Failed to apply card');
      }
    } catch (error) {
      console.error('Error in handleCardDrop:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex flex-col items-center justify-center p-4">
      {/* 닫기 버튼(임시) - 나중에는 제스처로 대체 */}
      <button onClick={handleClose} className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2">
        Close
      </button>

      {/* 상단 고정 문단 (드롭 영역) */}
      <motion.div className="bg-gray-950 border border-indigo-500 rounded-lg p-4 w-full max-w-2xl mb-8">
        <p className="text-white">{currentParagraph.content}</p>
        {isUpdating && <div className="text-indigo-400 text-sm mt-2">Updating...</div>}
      </motion.div>

      {/* 카드 목록 */}
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

