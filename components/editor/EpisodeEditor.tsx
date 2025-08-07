'use client';

import { useState, useEffect, useRef } from 'react';
import { Episode, Paragraph, ReferenceCard } from '@/types';
import ParagraphBlock from './ParagraphBlock';
import { Reorder, motion } from 'framer-motion';
import ReferenceCardView from '@/components/ui/ReferenceCardView';
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
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialEpisode || createNewEpisode();
  });

  const [isSaved, setIsSaved] = useState(!isNew);
  const { cards: referenceCards, draggedCardFromPanel, setDraggedCardFromPanel } = useCardStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [triageState, setTriageState] = useState<{
    isActive: boolean;
    targetParagraph: Paragraph | null;
    entryPoint: 'swipe' | 'icon_tap';
  }>({
    isActive: false,
    targetParagraph: null,
    entryPoint: 'swipe',
  });
  const [focusNextId, setFocusNextId] = useState<string | null>(null);
  const [shouldFocusFirst, setShouldFocusFirst] = useState(true);
  const [showPushUpHint, setShowPushUpHint] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- 데이터 핸들러 및 API 호출 ---

  const autoSave = async (data: Episode) => {
    localStorage.setItem('autosave-episode', JSON.stringify(data));
    const url = isNew ? '/api/episodes' : `/api/episodes/${data.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
          title: data.title,
          paragraphs: data.paragraphs,
          summary: data.summary,
                }),
              });
      if (response.ok) {
        const savedEpisodeData = await response.json();
        if (isNew && savedEpisodeData.id && data.id !== savedEpisodeData.id) {
          setEpisode(prev => ({ ...prev, id: savedEpisodeData.id }));
        }
      }
            } catch (e) {
      // ignore network errors
            }
          };

  const generateAndSaveSummary = async (episodeId: string, title: string, paragraphs: Paragraph[]) => {
    setIsSummarizing(true);
    try {
      const summaryResponse = await fetch('/api/ai/summarize-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, paragraphs }),
      });

      if (summaryResponse.ok) {
        const { summary } = await summaryResponse.json();
        setEpisode(prev => ({ ...prev, summary }));

        await fetch(`/api/episodes/${episodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary }),
        });
      }
    } catch (error) {
      console.error("Failed to generate and save summary:", error);
    } finally {
      setIsSummarizing(false);
    }
};

  const handleSave = async () => {
    const url = isNew ? '/api/episodes' : `/api/episodes/${episode.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: episode.title,
          paragraphs: episode.paragraphs,
          summary: episode.summary,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const savedEpisodeData = await response.json();
      const episodeId = savedEpisodeData.id;

      setIsSaved(true);

      if (isNew) {
        await generateAndSaveSummary(episodeId, episode.title, episode.paragraphs);
        window.location.assign(`/episodes/${episodeId}`);
      } else {
        await generateAndSaveSummary(episodeId, episode.title, episode.paragraphs);
      }
      
    } catch (error) {
      console.error(`Failed to save episode:`, error);
    }
  };

  const handleParagraphUpdate = (updatedParagraph: Paragraph) => {
    setEpisode(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map(p => p.id === updatedParagraph.id ? updatedParagraph : p)
    }));
    setIsSaved(false);
  };

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
      if (response.ok) {
        const updatedParagraph = await response.json();
        handleParagraphUpdate(updatedParagraph);
      } else {
        console.error('Failed to apply card from panel');
      }
    } catch (error) {
      console.error('Error in handleDropOnParagraph:', error);
    }
          };

  const handleUndo = async (paragraphId: string) => {
    try {
      const response = await fetch(`/api/episodes/${episode.id}/paragraphs/${paragraphId}/undo`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          console.log(errorData.error);
          return;
        }
        throw new Error(errorData.error || 'Failed to undo');
      }
      const undoneParagraph = await response.json();
      handleParagraphUpdate(undoneParagraph);
    } catch (error) {
      console.error('Error in handleUndo:', error);
    }
  };

  const handleAddParagraph = (afterId?: string) => {
    const newId = `temp-${Date.now()}`;
    setEpisode(prev => {
      const idx = afterId ? prev.paragraphs.findIndex(p => p.id === afterId) : prev.paragraphs.length - 1;
      const newParagraphs = [...prev.paragraphs];
      newParagraphs.splice(idx + 1, 0, { id: newId, content: '', order: idx + 2, content_history: [], applied_card_history: [] });
      return {
        ...prev,
        paragraphs: newParagraphs.map((p, i) => ({ ...p, order: i + 1 })),
      };
    });
    setFocusNextId(newId);
    setIsSaved(false);
  };

  const handleParagraphReorder = (newOrder: Paragraph[]) => {
    setEpisode(prev => ({
      ...prev,
      paragraphs: newOrder.map((p, index) => ({ ...p, order: index + 1 })),
    }));
    setIsSaved(false);
  };

  const handleAddDescription = async (paragraphId: string) => {
    const target = episode.paragraphs.find(p => p.id === paragraphId);
    if (!target) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/describe-and-rewrite-paragraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraph: target,
          episode: { title: episode.title, paragraphs: episode.paragraphs },
          episodeSummary: episode.summary,
        }),
      });
      const data = await res.json();
      if (data.rewritten) {
        const updatedParagraph = { ...target, content: data.rewritten };
        handleParagraphUpdate(updatedParagraph);
        setIsSaved(false);
      }
    } catch (e) {
      console.error('묘사 확장 실패', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 제스처 및 모드 핸들러 ---

  const handleGenerateReference = (paragraph: Paragraph) => {
    setTriageState({ isActive: true, targetParagraph: paragraph, entryPoint: 'swipe' });
  };

  const handleIconTap = (paragraph: Paragraph) => {
    setTriageState({ isActive: true, targetParagraph: paragraph, entryPoint: 'icon_tap' });
  };

  const handlePushUp = (e: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    if (info.offset.y < -100 && info.velocity.y < -500) {
      setShowPushUpHint(true);
    } else {
      setShowPushUpHint(false);
    }
  };

  const handlePushUpEnd = async (e: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    if (triageState.isActive) {
      setTriageState({ isActive: false, targetParagraph: null, entryPoint: 'swipe' });
    setShowPushUpHint(false);
      return;
    }

    if (info.offset.y < -150 && info.velocity.y < -500) {
      const url = isNew ? '/api/episodes' : `/api/episodes/${episode.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: episode.title, paragraphs: episode.paragraphs }),
        });
        if (!response.ok) throw new Error('Failed to save episode');
        const savedEpisode = await response.json();
        await generateAndSaveSummary(savedEpisode.id, savedEpisode.title, savedEpisode.paragraphs);

        const newEpisodeResponse = await fetch('/api/episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '새 에피소드', paragraphs: [] }),
        });
        if (!newEpisodeResponse.ok) throw new Error('Failed to create new episode');

        const newEpisode = await newEpisodeResponse.json();
        window.location.assign(`/episodes/${newEpisode.id}`);

      } catch (error) {
        console.error("Failed to proceed to next episode:", error);
      }
    }
    setShowPushUpHint(false);
  };

  // --- useEffect 훅 ---
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      autoSave(episode);
    }, 1000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode]);

  useEffect(() => {
    const handler = () => {
      localStorage.setItem('autosave-episode', JSON.stringify(episode));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [episode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autosave-episode');
      if (saved) {
        try {
          setEpisode(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // --- 렌더링 ---
  const lastParagraphId = episode.paragraphs.length > 0 ? episode.paragraphs[episode.paragraphs.length - 1].id : null;

  return (
    <>
      <GestureManager />
      <motion.div
        onPan={handlePushUp}
        onPanEnd={handlePushUpEnd}
        className="p-8 max-w-4xl mx-auto"
        tabIndex={0}
        onKeyDown={async (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (window.__tiptap_editors && Array.isArray(window.__tiptap_editors)) {
              for (const ed of window.__tiptap_editors) {
                if (ed && ed.commands) {
                  ed.commands.focus('start');
                  ed.commands.selectAll();
                }
              }
            }
          }
        }}
      >
        {isGenerating && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900 border border-indigo-500 text-white p-3 rounded-lg shadow-lg z-50">
            AI가 참조 카드를 생성 중입니다...
          </div>
        )}

        <input
          type="text"
          value={episode.title}
          onChange={(e) => {
            setEpisode(prev => ({ ...prev, title: e.target.value }));
            setIsSaved(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (episode.paragraphs.length === 0 || episode.paragraphs[0?.content !== '') {
                handleAddParagraph(undefined);
              }
              setShouldFocusFirst(true);
            }
          }}
          className="text-4xl font-bold mb-6 bg-transparent w-full focus:outline-none focus:border-b-2 border-gray-700"
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

        {isSaved && (
          <div className="my-6 p-4 bg-gray-800/50 rounded-lg">
            <label htmlFor="summary" className="text-lg font-semibold text-indigo-400">AI 생성 요약</label>
            {isSummarizing ? (
              <p className="text-gray-400 mt-2">요약을 생성 중입니다...</p>
            ) : (
              <textarea
                id="summary"
                value={episode.summary || ''}
                onChange={(e) => {
                  setEpisode(prev => ({ ...prev, summary: e.target.value }));
                  setIsSaved(false);
                }}
                placeholder="AI가 생성한 요약 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px"
              />
            )}
          </div>
      )}

        {referenceCards.length > 0 && (
          <div className="my-8">
            <h2 className="text-2xl font-bold mb-4 text-center">AI 추천 카드</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {referenceCards.map(card => (
                <ReferenceCardView
                  key={card.id}
                  card={card}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                />
              ))}
            </div>
          </div>
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
                autoFocus={shouldFocusFirst && p.order === 1}
                autoFocusNext={focusNextId === p.id}
                onGenerateCards={() => handleGenerateReference(p)}
                onDrop={() => handleDropOnParagraph(p.id)}
                isCardDragging={!!draggedCardFromPanel}
                onAddParagraph={() => handleAddParagraph(p.id)}
                onFocused={() => { if (focusNextId === p.id) setFocusNextId(null); }}
                onAddDescription={() => handleAddDescription(p.id)}
                onUndo={() => handleUndo(p.id)}
                onIconTap={() => handleIconTap(p)}
                onUpdate={handleParagraphUpdate}
              />
            ))}
        </Reorder.Group>

        {!isSaved && (
          <div className="fixed bottom-8 right-8 z-50">
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-500 text-lg font-semibold transition-all"
              disabled={isSummarizing}
            >
              저장
            </button>
          </div>
        )}

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

