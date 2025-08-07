// /types/index.ts

/**
 * Represents a single paragraph block in the editor.
 */
export interface Paragraph {
  id: string;
  content: string;
  order: number;
  content_history: string[];
  applied_card_history: string[];
}

/**
 * Represents a single episode, which contains a title and multiple paragraphs.
 */
export interface Episode {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents an AI-generated reference card.
 */
export interface ReferenceCard {
  id: string;
  title: string;
  summary: string;
  isPinned: boolean;
  group: string | null;
  isInHold: boolean;
  createdAt: Date;
  updatedAt: Date;
  rawContext?: {
    documentSnippets?: { filename: string; snippet: string }[];
    webResults?: { title: string; url: string; snippet: string }[];
    allEpisodes?: { title: string; summary: string }[];
  };
}

