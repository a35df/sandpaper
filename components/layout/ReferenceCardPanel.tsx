'use client';

import SidePanel from './SidePanel';
import { useUIStore } from '@/lib/uiStore';
import { useCardStore } from '@/lib/store';
import StackedCardView from '../ui/StackedCardView';
import { Pin, Archive, Undo2 } from 'lucide-react';
import { ReferenceCard } from '@/types';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const HoldZone = ({ onDrop, isHovered }: { onDrop: () => void; isHovered: boolean }) => {
  return (
    <motion.div
      onMouseUp={onDrop}
      className={`fixed right-0 bottom-16 w-72 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-center transition-colors z-50
        ${isHovered ? 'border-red-500 bg-red-900/20' : 'border-gray-600 bg-gray-900/80'}
      `}
      style={{ pointerEvents: 'auto' }}
    >
      <Archive className="mx-auto h-8 w-8 text-gray-500" />
      <p className="text-sm text-gray-500 mt-2">카드를 여기로 드래그하여 AI 컨텍스트에서 제외</p>
    </motion.div>
  );
};

const ReferenceCardPanel = () => {
  const { cards, updateCard, draggedCardId, setDraggedCardId, initializeCards, setDraggedCardFromPanel } = useCardStore();
  const [isHoldZoneHovered, setIsHoldZoneHovered] = useState(false);

  useEffect(() => {
    initializeCards();
  }, [initializeCards);

  const handlePinToggle = (card: ReferenceCard) => {
    updateCard({ ...card, isPinned: !card.isPinned });
  };

  const handleDropInHold = () => {
    if (draggedCardId) {
      const cardToUpdate = cards.find(c => c.id === draggedCardId);
      if (cardToUpdate) {
        updateCard({ ...cardToUpdate, isInHold: true, isPinned: false }); // Hold되면 Pin 해제
      }
    }
  };

  const handleRestoreFromHold = (card: ReferenceCard) => {
    updateCard({ ...card, isInHold: false });
  };

  const handleGroupChange = (card: ReferenceCard, newGroup: string) => {
    updateCard({ ...card, group: newGroup.trim() || null });
  };

  const activeCards = cards.filter(c => !c.isInHold);
  const heldCards = cards.filter(c => c.isInHold);

  const sortedActiveCards = [...activeCards].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    // 최신순으로 정렬
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const [showHold, setShowHold] = useState(false);
  const { activePanel, openReferencePanel, closePanel } = useUIStore();
  const isOpen = activePanel === 'reference';
  return (
    <SidePanel
      position="left" // 오른쪽에서 왼쪽으로 변경
      isOpen={isOpen}
      onOpen={openReferencePanel}
      onClose={closePanel}
    >
      <h2 className="text-2xl font-bold text-white mb-6">참조 카드 보관함</h2>
      <div 
        className="space-y-3 pb-20"
        onMouseEnter={() => setIsHoldZoneHovered(!!draggedCardId)}
        onMouseLeave={() => setIsHoldZoneHovered(false)}
      >
        <StackedCardView
          items={sortedActiveCards}
          renderItem={(card, hovered) => {
            return (
              <motion.div
                drag
                dragSnapToOrigin
                dragElastic={0.2}
                dragMomentum={false}
                onDragStart={() => {
                  setDraggedCardId(card.id);
                  setDraggedCardFromPanel(card); // 드래그 시작 시 카드 정보 저장
                }}
                onDragEnd={() => {
                  setDraggedCardId(null);
                  setDraggedCardFromPanel(null); // 드래그 종료 시 초기화
                }}
                className={`p-4 rounded-lg border h-[163px flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all duration-200 select-none
                  ${hovered ? 'bg-indigo-900/80 border-blue-400 shadow-2xl scale-105 z-50' : 'bg-gray-800 border-gray-700 shadow-md'}
                `}
                style={{ touchAction: 'none' }}
                whileDrag={{ scale: 1.05, zIndex: 50, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)' }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-indigo-400 truncate pr-2 pointer-events-none">{card.title}</h3>
                  <button onClick={() => handlePinToggle(card)} className="p-1 -mr-1 -mt-1 text-gray-500 hover:text-yellow-400">
                    <Pin className={`h-4 w-4 transition-colors ${card.isPinned ? 'text-yellow-400 fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-sm text-gray-300 mt-1 truncate pointer-events-none">{card.summary}</p>
                <input
                  type="text"
                  placeholder="그룹 지정..."
                  defaultValue={card.group || ''}
                  onBlur={(e) => handleGroupChange(card, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  onClick={(e) => e.stopPropagation()} // 카드 드래그 방지
                  className="mt-2 w-full text-xs bg-gray-700/50 rounded-sm px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 pointer-events-auto"
                />
              </motion.div>
            );
          }}
        />
        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-400 text-lg">보관된 카드가 없습니다.</p>
          </div>
        )}
        <HoldZone
          onDrop={() => {
            handleDropInHold();
            setIsHoldZoneHovered(false);
          }}
          isHovered={isHoldZoneHovered}
        />
        {heldCards.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">보류 중인 카드</h3>
            <div className="space-y-2">
              {heldCards.map(card => (
                <div key={card.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-400 truncate">{card.title}</span>
                  <button onClick={() => handleRestoreFromHold(card)} className="p-1 text-gray-500 hover:text-green-400">
                    <Undo2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* 제외 영역 하단 고정 */}
      <div className="absolute right-0 bottom-0 w-full bg-gray-900/80 border-t border-gray-800 p-3 flex items-center justify-between cursor-pointer z-50" onClick={() => setShowHold(true)}>
        <span className="text-gray-400">제외 영역</span>
        <span className="text-xs text-gray-500">{heldCards.length}개 제외됨</span>
      </div>
      {/* 제외된 참조 카드 목록 오버레이 */}
      {showHold && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center" onClick={() => setShowHold(false)}>
          <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">제외된 참조 카드 목록</h3>
            {heldCards.length === 0 ? (
              <p className="text-gray-400">제외된 참조 카드가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {heldCards.map(card => (
                  <li key={card.id} className="p-2 bg-gray-800 rounded">
                    <div className="font-semibold text-white">{card.title}</div>
                    <div className="text-xs text-gray-400">{card.summary}</div>
                  </li>
                ))}
              </ul>
            )}
            <button className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => setShowHold(false)}>닫기</button>
          </div>
        </div>
      )}
    </SidePanel>
  );
};

export default ReferenceCardPanel;

