'use client';

import { useState, useEffect, useRef } from 'react';
import { Episode, Paragraph, ReferenceCard } from '@/types';
import ParagraphBlock from './ParagraphBlock';
import { Reorder } from 'framer-motion';
import ReferenceCardView from '@/components/ui/ReferenceCardView';
import { useCardStore } from '@/lib/store';

const createNewEpisode = (): Episode => ({
  id: '', // Will be set by the database
  title: '새 에피소드 제목',
  paragraphs: Array.from({ length: 5 }).map((_, i) => ({
    id: `temp-${i + 1}-${Date.now()}`,
    content: '',
    order: i + 1,
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
  const { cards: referenceCards, setCards: setReferenceCards, addCards } = useCardStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedCard, setDraggedCard] = useState<ReferenceCard | null>(null);
  const [rewritingParagraphId, setRewritingParagraphId] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

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
    if (isGenerating) return;
    setIsGenerating(true);
    setReferenceCards([]); // 기존 카드 초기화

    try {
      // 1. 모든 에피소드/요약
      const episodesRes = await fetch('/api/episodes');
      const allEpisodes = episodesRes.ok ? await episodesRes.json() : [];

      // 2. 문서 검색 (문단 내용 기반)
      const docSearchRes = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: paragraph.content })
      });
      const docSearch = docSearchRes.ok ? await docSearchRes.json() : { results: [] };

      // 3. 웹 검색 (문단 내용 기반)
      const webSearchRes = await fetch('/api/ai/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: paragraph.content })
      });
      const webSearch = webSearchRes.ok ? await webSearchRes.json() : { results: [] };

      // 4. 카드 생성 요청
      const response = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeContext: episode,
          targetParagraph: paragraph,
          allEpisodes,
          documentSnippets: docSearch.results,
          webResults: webSearch.results,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const newCards: Omit<ReferenceCard, 'id' | 'isPinned' | 'group' | 'isInHold'>[] = await response.json();
      
      const formattedCards: ReferenceCard[] = newCards.map((card, index) => ({
        ...card,
        id: `ref-${Date.now()}-${index}`,
        isPinned: false,
        group: null,
        isInHold: false,
        rawContext: {
          documentSnippets: docSearch.results,
          webResults: webSearch.results,
          allEpisodes,
        },
      }));

      setReferenceCards(formattedCards);

    } catch (error) {
      console.error("Failed to generate reference cards:", error);
      // TODO: 사용자에게 에러를 알리는 UI (e.g., a toast notification)
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRewriteParagraph = async (targetParagraph: Paragraph) => {
    if (!draggedCard || rewritingParagraphId) return;

    setRewritingParagraphId(targetParagraph.id);
    const originalContent = targetParagraph.content;

    try {
      // Optimistic update
      const optimisticParagraphs = episode.paragraphs.map(p =>
        p.id === targetParagraph.id ? { ...p, content: 'AI가 문장을 다듬고 있습니다...' } : p
      );
      setEpisode(prev => ({ ...prev, paragraphs: optimisticParagraphs }));

      const response = await fetch('/api/ai/rewrite-paragraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetParagraph,
          referenceCard: draggedCard,
          rawContext: draggedCard.rawContext || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const { rewrittenText } = await response.json();

      // Final update
      const finalParagraphs = episode.paragraphs.map(p =>
        p.id === targetParagraph.id ? { ...p, content: rewrittenText } : p
      );
      setEpisode(prev => ({ ...prev, paragraphs: finalParagraphs, updatedAt: new Date() }));
      setIsSaved(false); // 변경되었으므로 저장 필요

    } catch (error) {
      console.error("Failed to rewrite paragraph:", error);
      // Rollback on error
      const revertedParagraphs = episode.paragraphs.map(p =>
        p.id === targetParagraph.id ? { ...p, content: originalContent } : p
      );
      setEpisode(prev => ({ ...prev, paragraphs: revertedParagraphs }));
      // TODO: Show error toast
    } finally {
      setRewritingParagraphId(null);
      setDraggedCard(null);
    }
  };

  // 현재 편집 가능한 문단은 마지막 문단
  const lastParagraphId = episode.paragraphs.length > 0 ? episode.paragraphs[episode.paragraphs.length - 1].id : null;

  // 문단 추가 핸들러 (엔터 등에서 호출)
  const [focusNextId, setFocusNextId] = useState<string | null>(null);
  const handleAddParagraph = (afterId?: string) => {
    const newId = `temp-${Date.now()}`;
    setEpisode(prev => {
      const idx = afterId ? prev.paragraphs.findIndex(p => p.id === afterId) : prev.paragraphs.length - 1;
      const newParagraphs = [...prev.paragraphs];
      newParagraphs.splice(idx + 1, 0, { id: newId, content: '', order: idx + 2 });
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

  return (
    <div
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
            if (episode.paragraphs.length === 0 || episode.paragraphs[0].content !== '') {
              handleAddParagraph(undefined);
            }
            setShouldFocusFirst(true);
          }
        }}
        className="text-4xl font-bold mb-6 bg-transparent w-full focus:outline-none focus:border-b-2 border-gray-700"
      />

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
                onDragStart={() => setDraggedCard(card)}
                onDragEnd={() => setDraggedCard(null)}
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
                  // relatedEpisodes: [] // 추후 확장
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
                onDrop={() => handleRewriteParagraph(p)}
                isCardDragging={!!draggedCard}
                onAddParagraph={() => handleAddParagraph(p.id)}
                onFocused={() => { if (focusNextId === p.id) setFocusNextId(null); }}
                onAddDescription={() => handleAddDescription(p.id)}
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
    </div>
  );
};

export default EpisodeEditor;
