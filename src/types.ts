/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Flashcard {
  id: string;
  character: string;
  pinyin: string;
  english: string;
  example?: string;
  examplePinyin?: string;
  exampleEnglish?: string;
  audioHint?: string; // Guidance on tones or sounds
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Flashcard[];
  isCustom: boolean;
  createdBy: string;
  createdTime: number;
  category?: 'hsk1' | 'conversational' | 'travel' | 'custom';
  language?: string; // Target language e.g. 'Chinese' | 'Spanish' | 'French' etc.
}

export type SRSState = 'new' | 'learning' | 'review' | 'mastered';

export interface SRSProgress {
  cardId: string;
  deckId: string;
  repetitions: number;  // Consecutive correct answers
  interval: number;     // Current review interval in minutes (simulated days as minutes for faster preview testing!)
  easeFactor: number;   // Difficulty coefficient (SuperMemo-2 SM2 starts at 2.5)
  nextReviewTime: number; // Timestamp (ms)
  state: SRSState;
  lastQualityScore?: number;
}

export interface UserProgress {
  xp: number;
  streak: number;
  lastStudyDate: string; // YYYY-MM-DD
  srs: Record<string, SRSProgress>;
  history: Record<string, number>; // date (YYYY-MM-DD) -> XP earned
  remindersEnabled: boolean;
  reminderGoal: number; // minutes per day
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  streak: number;
  avatarColor: string;
  isCurrentUser: boolean;
  rank: number;
}
