"use client";

const HoldZone = ({ onDrop, isHovered }: { onDrop: () => void; isHovered: boolean }) => {
  return (
    <motion.div
      onMouseUp={onDrop}
      className={`fixed left-0 bottom-16 w-72 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-center transition-colors z-50
        ${isHovered ? 'border-red-500 bg-red-900/20' : 'border-gray-600 bg-gray-900/80'}
      `}
      style={{ pointerEvents: 'auto' }}
    >
      <Archive className="mx-auto h-8 w-8 text-gray-500" />
      <p className="text-sm text-gray-500 mt-2">카드를 여기로 드래그하여 AI 컨텍스트에서 제외</p>
    </motion.div>
  );
};

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive } from 'lucide-react';
import SidePanel from './SidePanel';
import { useUIStore } from '@/lib/uiStore';
import { Episode } from '@/types';
import Link from 'next/link';
import StackedCardView from '../ui/StackedCardView';

type EpisodeListItem = Pick<Episode, 'id' | 'title' | 'summary'>;

const EpisodeListPanel = () => {
  const [episodes, setEpisodes] = useState<EpisodeListItem[>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEpisodes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/episodes');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data: EpisodeListItem[] = await response.json();
        setEpisodes(data.filter(ep => ep.id));
      } catch (error) {
        console.error("Failed to fetch episodes:", error);
        // Optionally set an error state here to show in the UI
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpisodes();
  }, []);

  console.log('Rendering EpisodeListPanel:', { isLoading, episodes });

  const [showHold, setShowHold] = useState(false);
  // TODO: 실제 제외된 에피소드 목록은 별도 상태/필터 필요
  const heldEpisodes: EpisodeListItem[] = [];

  // ...existing code...

  const [isHoldZoneHovered, setIsHoldZoneHovered] = useState(false);
  const { activePanel, openEpisodePanel, closePanel } = useUIStore();
  const isOpen = activePanel === 'episode';
  return (
    <SidePanel
      position="left"
      isOpen={isOpen}
      onOpen={openEpisodePanel}
      onClose={closePanel}
    >
      <h2 className="text-2xl font-bold text-white mb-6">에피소드 목록</h2>
      <div className="space-y-3 pb-20">
        {isLoading ? (
          <p className="text-gray-400">목록을 불러오는 중...</p>
        ) : episodes.length > 0 ? (
          <StackedCardView
            items={episodes}
            renderItem={(ep) => {
              // 드래그 중 클릭 방지
              let dragStarted = false;
              return (
                <motion.div
                  key={ep.id}
                  drag
                  dragSnapToOrigin
                  dragElastic={0.2}
                  dragMomentum={false}
                  className="p-4 bg-gray-800 rounded-lg hover:bg-indigo-600 transition-colors h-[122px] border border-gray-700 shadow-md cursor-grab active:cursor-grabbing select-none"
                  onPointerDown={() => { dragStarted = false; }}
                  onDragStart={() => { dragStarted = true; }}
                  onClick={(e) => {
                    if (!dragStarted) window.location.assign(`/episodes/${ep.id}`);
                  }}
                  whileDrag={{ scale: 1.05, zIndex: 50, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)' }}
                  style={{ touchAction: 'none' }}
                >
                  <h3 className="font-semibold text-white truncate">{ep.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{ep.summary || '요약 없음'}</p>
                </motion.div>
              );
            }}
          />
        ) : (
          <p className="text-gray-400">생성된 에피소드가 없습니다.</p>
        )}
      </div>
      <HoldZone onDrop={() => {}} isHovered={isHoldZoneHovered} />
      {/* 제외 영역 하단 고정 */}
      <div className="absolute left-0 bottom-0 w-full bg-gray-900/80 border-t border-gray-800 p-3 flex items-center justify-between cursor-pointer z-50" onClick={() => setShowHold(true)}>
        <span className="text-gray-400">제외 영역</span>
        <span className="text-xs text-gray-500">{heldEpisodes.length}개 제외됨</span>
      </div>
      {/* 제외된 에피소드 목록 오버레이 */}
      {showHold && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center" onClick={() => setShowHold(false)}>
          <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">제외된 에피소드 목록</h3>
            {heldEpisodes.length === 0 ? (
              <p className="text-gray-400">제외된 에피소드가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {heldEpisodes.map(ep => (
                  <li key={ep.id} className="p-2 bg-gray-800 rounded">
                    <div className="font-semibold text-white">{ep.title}</div>
                    <div className="text-xs text-gray-400">{ep.summary}</div>
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

export default EpisodeListPanel;

