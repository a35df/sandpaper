'use client';

import { useState } from 'react';
import { Episode, Paragraph } from '@/types';
import ParagraphBlock from './ParagraphBlock';
import { Reorder, motion } from 'framer-motion';
import { useCardStore } from '@/lib/store';
import TriageMode from '@/components/ui/TriageMode';
import GestureManager from '@/components/layout/GestureManager';

const createNewEpisode = (): Episode => ({
  id: '',
  title: '새 에피소드 제목',
  paragraphs: Array.from({ length: 5 }).map((_, i) => ({
    id: `temp-${i + 1}-${Date.now()}`,
    content: '',
    order: i + 1,
    content_history: [],
    applied_card_history: [],
  })),
  summary: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

interface EpisodeEditorProps {
  initialEpisode?: Episode;
  isNew?: boolean;
}

const EpisodeEditor = ({ initialEpisode, isNew = false }: EpisodeEditorProps) => {
  // --- 상태 관리 ---
  const [episode, setEpisode] = useState<Episode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autosave-episode');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return initialEpisode || createNewEpisode();
  });

  const { draggedCardFromPanel, setDraggedCardFromPanel } = useCardStore();
  const [triageState, setTriageState] = useState<{
    isActive: boolean;
    targetParagraph: Paragraph | null;
    entryPoint: 'swipe' | 'icon_tap';
  }>({ isActive: false, targetParagraph: null, entryPoint: 'swipe' });
  const [showPushUpHint, setShowPushUpHint] = useState(false);

  // --- 데이터 및 상태 업데이트 핸들러 ---
  const handleParagraphUpdate = (updatedParagraph: Paragraph) => {
    setEpisode(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map(p => p.id === updatedParagraph.id ? updatedParagraph : p),
    }));
  };

  const handleAddParagraph = (afterId?: string) => {
    const newId = `temp-${Date.now()}`;
    setEpisode(prev => {
      const idx = afterId ? prev.paragraphs.findIndex(p => p.id === afterId) : prev.paragraphs.length - 1;
      const newParagraphs = [...prev.paragraphs];
      newParagraphs.splice(idx + 1, 0, { id: newId, content: '', order: idx + 2, content_history: [], applied_card_history: [ });
      return {
        ...prev,
        paragraphs: newParagraphs.map((p, i) => ({ ...p, order: i + 1 })),
      };
    });
  };

  const handleParagraphReorder = (newOrder: Paragraph[) => {
    setEpisode(prev => ({
      ...prev,
      paragraphs: newOrder.map((p, index) => ({ ...p, order: index + 1 })),
    }));
  };

  // --- API 호출 핸들러 ---
  const handleDropOnParagraph = async (paragraphId: string) => {
    if (!draggedCardFromPanel) return;
    const cardToApply = draggedCardFromPanel;
    setDraggedCardFromPanel(null);
    try {
      const response = await fetch(`/api/episodes/${episode.id}/paragraphs/${paragraphId}/apply-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_card_id: cardToApply.id }),
      });
      if (response.ok) handleParagraphUpdate(await response.json());
    } catch (error) { console.error('Error in handleDropOnParagraph:', error); }
  };

  const handleUndo = async (paragraphId: string) => {
    try {
      const response = await fetch(`/api/episodes/${episode.id}/paragraphs/${paragraphId}/undo`, { method: 'POST' });
      if (response.ok) handleParagraphUpdate(await response.json());
    } catch (error) { console.error('Error in handleUndo:', error); }
  };

  const handleAddDescription = async (paragraphId: string) => { /* ... 묘사 확장 API 호출 ... */ };
  // --- 제스처 및 모드 핸들러 ---
  const handleGenerateReference = (paragraph: Paragraph) => setTriageState({ isActive: true, targetParagraph: paragraph, entryPoint: 'swipe' });
  const handleIconTap = (paragraph: Paragraph) => setTriageState({ isActive: true, targetParagraph: paragraph, entryPoint: 'icon_tap' });

  const handlePushUp = (e: any, info: any) => {
    if (info.offset.y < -100 && info.velocity.y < -500) setShowPushUpHint(true);
    else setShowPushUpHint(false);
  };

  const handlePushUpEnd = async (e: any, info: any) => {
    if (triageState.isActive) {
      setTriageState({ isActive: false, targetParagraph: null, entryPoint: 'swipe' });
    setShowPushUpHint(false);
      return;
    }
    if (info.offset.y < -150 && info.velocity.y < -500) {
      // 다음 에피소드로 넘어가는 로직 구현
    }
    setShowPushUpHint(false);
  };
  // --- 렌더링 ---
  const lastParagraphId = episode.paragraphs.length > 0 ? episode.paragraphs[episode.paragraphs.length - 1.id : null;

  return (
    <>
      <GestureManager />
      <motion.div
        onPan={handlePushUp}
        onPanEnd={handlePushUpEnd}
        className="p-8 max-w-4xl mx-auto"
      >
        <input
          type="text"
          value={episode.title}
          onChange={(e) => setEpisode(prev => ({ ...prev, title: e.target.value }))}
          className="text-4xl font-bold mb-6 bg-transparent w-full focus:outline-none"
        />
        {triageState.isActive && triageState.targetParagraph && (
          <TriageMode
            episodeId={episode.id}
            paragraph={triageState.targetParagraph}
            entryPoint={triageState.entryPoint}
            onClose={() => setTriageState({ isActive: false, targetParagraph: null, entryPoint: 'swipe' })}
            onParagraphUpdate={handleParagraphUpdate}
          />
        )}

        <Reorder.Group
          axis="y"
          values={episode.paragraphs}
          onReorder={handleParagraphReorder}
          className="space-y-4"
        >
          {episode.paragraphs
            .sort((a, b) => a.order - b.order)
            .map((p) => (
              <ParagraphBlock
                key={p.id}
                paragraph={p}
                isEditable={p.id === lastParagraphId}
                onGenerateCards={() => handleGenerateReference(p)}
                onDrop={() => handleDropOnParagraph(p.id)}
                isCardDragging={!!draggedCardFromPanel}
                onAddParagraph={() => handleAddParagraph(p.id)}
                onAddDescription={() => handleAddDescription(p.id)}
                onUndo={() => handleUndo(p.id)}
                onIconTap={() => handleIconTap(p)}
                onUpdate={handleParagraphUpdate}
              />
            ))}
        </Reorder.Group>

        {showPushUpHint && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg">
            <p>계속 밀어서 다음 에피소드 생성</p>
          </div>
        )}
      </motion.div>
    </>
  );
};
export default EpisodeEditor;

