'use client';

import { useState, useEffect, useRef } from 'react';
import { Episode, Paragraph, ReferenceCard } from '@/types';
import ParagraphBlock from './ParagraphBlock';
import { Reorder, motion } from 'framer-motion';
import ReferenceCardView from '@/components/ui/ReferenceCardView';
import { useCardStore } from '@/lib/store';
import TriageMode from '@/components/ui/TriageMode'; // TriageMode 임포트
import GestureManager from '@/components/layout/GestureManager'; // GestureManager 임포트

const createNewEpisode = (): Episode => ({
  id: '', // Will be set by the database
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
  const [episode, setEpisode] = useState<Episode>(() => {
    // localStorage에서 임시 저장 불러오기
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
  const { cards: referenceCards, setCards: setReferenceCards, addCards, draggedCardFromPanel, setDraggedCardFromPanel } = useCardStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [rewritingParagraphId, setRewritingParagraphId] = useState<string | null>(null);
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

  // 자동 저장 디바운스용 ref
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // 자동 저장 함수 (DB + localStorage)
  const autoSave = async (data: Episode) => {
    // localStorage 저장
    localStorage.setItem('autosave-episode', JSON.stringify(data));
    // DB 저장
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
          // 새로 생성된 경우 id 동기화
          setEpisode(prev => ({ ...prev, id: savedEpisodeData.id }));
        }
      }
    } catch (e) {
      // 네트워크 오류 등은 무시(임시저장만 보장)
    }
  };

  // episode 변경 시 자동 저장 (debounce)
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      autoSave(episode);
    }, 1000); // 1초 디바운스
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode]);

  // 새로고침/이동/닫기 시 임시저장
  useEffect(() => {
    const handler = () => {
      localStorage.setItem('autosave-episode', JSON.stringify(episode));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [episode]);

  // 뒤로가기/새로고침 시 임시저장 복원
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

      // 새 에피소드인 경우, 요약 생성 후 페이지 이동
      if (isNew) {
        await generateAndSaveSummary(episodeId, episode.title, episode.paragraphs);
        window.location.assign(`/episodes/${episodeId}`);
      } else {
        // 기존 에피소드는 변경사항이 있을 때만 요약 재성성 (선택적)
        // 여기서는 저장 시 항상 요약 생성
        await generateAndSaveSummary(episodeId, episode.title, episode.paragraphs);
      }
      
    } catch (error) {
      console.error(`Failed to save episode:`, error);
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

  const handleParagraphReorder = (newOrder: Paragraph[]) => {
    setEpisode(prev => ({
      ...prev,
      paragraphs: newOrder.map((p, index) => ({ ...p, order: index + 1 })),
    }));
    setIsSaved(false); // 순서가 바뀌면 저장 필요 상태로 변경
  };

  const handleGenerateReference = async (paragraph: Paragraph) => {
    // 이제 이 함수는 트라이아지 모드를 활성화하는 역할만 합니다.
    setTriageState({
      isActive: true,
          targetParagraph: paragraph,
      entryPoint: 'swipe',
      });
  };

  const handleIconTap = (paragraph: Paragraph) => {
    // 아이콘 탭으로 트라이아지 모드 진입
    setTriageState({
      isActive: true,
      targetParagraph: paragraph,
      entryPoint: 'icon_tap',
    });
  };

  const handleDropOnParagraph = async (paragraphId: string) => {
    if (!draggedCardFromPanel) return;

    const cardToApply = draggedCardFromPanel;
    setDraggedCardFromPanel(null); // 즉시 드래그 상태 해제 (중복 실행 방지)
    try {
      const response = await fetch(`/api/episodes/${episode.id}/paragraphs/${paragraphId}/apply-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_card_id: cardToApply.id }),
      });
      if (response.ok) {
        const updatedParagraph = await response.json();
            setEpisode(prev => ({
              ...prev,
              paragraphs: prev.paragraphs.map(p => p.id === updatedParagraph.id ? updatedParagraph : p)
            }));
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
          console.log(errorData.error); // 예: "No history to undo"
          return;
        }
        throw new Error(errorData.error || 'Failed to undo');
      }

      const undoneParagraph = await response.json();
            setEpisode(prev => ({
              ...prev,
        paragraphs: prev.paragraphs.map(p => p.id === undoneParagraph.id ? undoneParagraph : p),
            }));
    } catch (error) {
      console.error('Error in handleUndo:', error);
    }
  };

  // 현재 편집 가능한 문단은 마지막 문단
  const lastParagraphId = episode.paragraphs.length > 0 ? episode.paragraphs[episode.paragraphs.length - 1.id : null;

  // 문단 추가 핸들러 (엔터 등에서 호출)
  const [focusNextId, setFocusNextId] = useState<string | null>(null);
  const handleAddParagraph = (afterId?: string) => {
    const newId = `temp-${Date.now()}`;
    setEpisode(prev => {
      const idx = afterId ? prev.paragraphs.findIndex(p => p.id === afterId) : prev.paragraphs.length - 1;
      const newParagraphs = [...prev.paragraphs];
      newParagraphs.splice(idx + 1, 0, { id: newId, content: '', order: idx + 2, content_history: [], applied_card_history: [] });
      // order 재정렬
      return {
        ...prev,
        paragraphs: newParagraphs.map((p, i) => ({ ...p, order: i + 1 })),
      };
    });
    setFocusNextId(newId);
    setIsSaved(false);
  };

  // 첫 문단 자동 포커스
  const [shouldFocusFirst, setShouldFocusFirst] = useState(true);
  const [showPushUpHint, setShowPushUpHint] = useState(false);

  const handlePushUp = (e: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    // y축으로 위로 드래그하고, 특정 속도 이상일 때 힌트 표시
    if (info.offset.y < -100 && info.velocity.y < -500) {
      setShowPushUpHint(true);
    } else {
      setShowPushUpHint(false);
    }
  };

  const handlePushUpEnd = async (e: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    // 트라이아지 모드가 활성 상태이면, 모드만 닫음
    if (triageState.isActive) {
      setTriageState({ isActive: false, targetParagraph: null, entryPoint: 'swipe' });
    setShowPushUpHint(false);
      return;
    }

    // 드래그가 충분히 길고 빠르면 다음 액션 실행
    if (info.offset.y < -150 && info.velocity.y < -500) {
      // 1. 현재 에피소드 저장 및 요약 (기존 handleSave 로직과 유사)
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

        // 2. 새 에피소드 생성
        const newEpisodeResponse = await fetch('/api/episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '새 에피소드', paragraphs: [] }), // 기본 새 에피소드
        });
        if (!newEpisodeResponse.ok) throw new Error('Failed to create new episode');

        const newEpisode = await newEpisodeResponse.json();

        // 3. 새 에피소드로 이동
        window.location.assign(`/episodes/${newEpisode.id}`);

      } catch (error) {
        console.error("Failed to proceed to next episode:", error);
      }
    }
    setShowPushUpHint(false);
  };

  return (
    <>
      <GestureManager />
    <motion.div
      onPan={handlePushUp}
      onPanEnd={handlePushUpEnd}
      className="p-8 max-w-4xl mx-auto"
      tabIndex={0}
      onKeyDown={async (e) => {
        // macOS: metaKey, Windows: ctrlKey
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          // 모든 ParagraphBlock의 에디터에 selectAll 명령 실행
          // window.__tiptap_editors에 각 블록의 editor 인스턴스를 등록해두고 selectAll 실행
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

      {/* 에피소드 제목 입력란 */}
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
            // 문단이 하나도 없거나 첫 문단이 비어있으면 첫 문단에 포커스, 아니면 첫 문단 추가
            if (episode.paragraphs.length === 0 || episode.paragraphs[0]?.content !== '') {
              handleAddParagraph(undefined);
            }
            setShouldFocusFirst(true);
          }
        }}
        className="text-4xl font-bold mb-6 bg-transparent w-full focus:outline-none focus:border-b-2 border-gray-700"
      />

      {triageState.isActive && triageState.targetParagraph && (
        <TriageMode
          paragraph={triageState.targetParagraph}
          entryPoint={triageState.entryPoint}
          onClose={() => setTriageState({ isActive: false, targetParagraph: null, entryPoint: 'swipe' })}
          onParagraphUpdate={(updatedParagraph) => {
            setEpisode(prev => ({
              ...prev,
              paragraphs: prev.paragraphs.map(p => p.id === updatedParagraph.id ? updatedParagraph : p)
            }));
          }}
        />
      )}

      {/* 저장 후에만 AI 요약 표시 (블록 위) */}
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
                setIsSaved(false); // 요약 수정 시 저장 필요
              }}
              placeholder="AI가 생성한 요약이 여기에 표시됩니다."
              className="mt-2 w-full text-base bg-transparent p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
            />
          )}
        </div>
      )}

      {/* 생성된 참조 카드를 표시하는 영역 */}
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
        {(() => {
          // 묘사 확장(왼쪽 스와이프) 핸들러: 해당 문단을 AI가 확장한 묘사로 교체
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
                  // relatedEpisodes: [ // 추후 확장
                }),
              });
              const data = await res.json();
              if (data.rewritten) {
                setEpisode(prev => ({
                  ...prev,
                  paragraphs: prev.paragraphs.map(p =>
                    p.id === paragraphId ? { ...p, content: data.rewritten } : p
                  ),
                  updatedAt: new Date(),
                }));
                setIsSaved(false);
              }
            } catch (e) {
              // TODO: 에러 토스트 등 UI
              console.error('묘사 확장 실패', e);
            } finally {
              setIsGenerating(false);
            }
          };
          return episode.paragraphs
            .sort((a, b) => a.order - b.order)
            .map((p, idx, arr) => (
              <ParagraphBlock
                key={p.id}
                paragraph={p}
                isEditable={p.id === lastParagraphId}
                autoFocus={shouldFocusFirst && idx === 0}
                autoFocusNext={focusNextId === p.id}
                onGenerateCards={() => handleGenerateReference(p)}
                onDrop={() => handleDropOnParagraph(p.id)}
                isCardDragging={!!draggedCardFromPanel}
                onAddParagraph={() => handleAddParagraph(p.id)}
                onFocused={() => { if (focusNextId === p.id) setFocusNextId(null); }}
                onAddDescription={() => handleAddDescription(p.id)}
                onUndo={() => handleUndo(p.id)}
              />
            ));
        })()}
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

