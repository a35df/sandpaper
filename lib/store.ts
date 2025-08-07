import { create } from 'zustand';
import { ReferenceCard } from '@/types';

// DB의 snake_case를 JS의 camelCase로 변환하는 유틸리티
const formatCardFromDb = (dbCard: any): ReferenceCard => ({
  id: dbCard.id,
  title: dbCard.title,
  summary: dbCard.summary,
  isPinned: dbCard.is_pinned,
  group: dbCard.group,
  isInHold: dbCard.is_in_hold,
  createdAt: new Date(dbCard.created_at),
  updatedAt: new Date(dbCard.updated_at),
});

// 스토어의 상태(state) 타입 정의
interface CardStoreState {
  cards: ReferenceCard[];
  draggedCardId: string | null;
  initializeCards: () => Promise<void>;
  setCards: (cards: ReferenceCard[]) => void;
  addCards: (newCards: Omit<ReferenceCard, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  removeCard: (cardId: string) => void;
  updateCard: (updatedCard: ReferenceCard) => Promise<void>;
  setDraggedCardId: (id: string | null) => void;
}

// Zustand 스토어 생성
export const useCardStore = create<CardStoreState>((set, get) => ({
  // 초기 상태
  cards: [],
  draggedCardId: null,

  initializeCards: async () => {
    try {
      const response = await fetch('/api/cards');
      if (!response.ok) throw new Error('Failed to fetch cards');
      const dbCards = await response.json();
      set({ cards: dbCards.map(formatCardFromDb) });
    } catch (error) {
      console.error("Failed to initialize cards:", error);
    }
  },

  // 액션들
  setCards: (cards) => set({ cards }),

  addCards: async (newCards) => {
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCards),
      });
      if (!response.ok) throw new Error('Failed to save new cards');
      const savedDbCards = await response.json();
      set((state) => ({
        cards: [...state.cards, ...savedDbCards.map(formatCardFromDb)],
      }));
    } catch (error) {
      console.error("Failed to add cards:", error);
    }
  },

  removeCard: (cardId) => set((state) => ({
    cards: state.cards.filter((card) => card.id !== cardId),
  })),

  updateCard: async (updatedCard) => {
    const originalCards = get().cards;
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === updatedCard.id ? updatedCard : card
      ),
    }));
    try {
      const response = await fetch(`/api/cards/${updatedCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCard), // API에서 camelCase를 snake_case로 변환
      });
      if (!response.ok) throw new Error('Failed to update card');
    } catch (error) {
      console.error("Failed to update card:", error);
      set({ cards: originalCards }); // 롤백
    }
  },

  setDraggedCardId: (id) => set({ draggedCardId: id }),
}));
