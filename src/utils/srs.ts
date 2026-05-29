/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SRSProgress, SRSState } from '../types';

/**
 * SuperMemo-2 (SM2) Algorithm
 * Calculates the next interval and ease factor based on responses (0 to 5)
 * 5: Perfect recall
 * 4: Correct after hesitation
 * 3: Correct with serious difficulty
 * 2: Incorrect; where the correct one seemed easy to recall
 * 1: Incorrect; the correct one remembered
 * 0: Complete blackout
 */
export function calculateSM2(
  quality: number, // 0 to 5
  prevRepetitions: number,
  prevInterval: number, // in virtual "days"
  prevEaseFactor: number
): { repetitions: number; interval: number; easeFactor: number } {
  let repetitions = prevRepetitions;
  let interval = prevInterval;
  let easeFactor = prevEaseFactor;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.ceil(prevInterval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Adjust Ease Factor (minimum setting is 1.3)
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { repetitions, interval, easeFactor };
}

/**
 * Maps User Ratings (Again, Hard, Good, Easy) to the 0-5 SM2 quality scores
 */
export const RATING_TO_QUALITY: Record<'again' | 'hard' | 'good' | 'easy', number> = {
  again: 1, // Reset interval
  hard: 3,  // Strict SM2 pass, decreases EF
  good: 4,  // Standard pass, keeps EF stable
  easy: 5,  // Great pass, increases EF
};

/**
 * Convert Virtual Days interval into Milliseconds based on Speed settings
 * - "real": 1 virtual day = 24 hours (86,400,000 ms)
 * - "fast": 1 virtual day = 30 seconds (30,000 ms) for instant review demonstration
 */
export function intervalToMs(intervalInDays: number, mode: 'real' | 'fast'): number {
  if (mode === 'fast') {
    return intervalInDays * 30 * 1000; // 30 seconds per virtual day
  }
  return intervalInDays * 24 * 60 * 60 * 1000; // 24 hours per virtual day
}

export function updateCardProgress(
  existingProgress: SRSProgress | undefined,
  cardId: string,
  deckId: string,
  userRating: 'again' | 'hard' | 'good' | 'easy',
  timeMode: 'real' | 'fast'
): SRSProgress {
  const quality = RATING_TO_QUALITY[userRating];
  
  const currentRepetitions = existingProgress ? existingProgress.repetitions : 0;
  const currentInterval = existingProgress ? existingProgress.interval : 0;
  const currentEaseFactor = existingProgress ? existingProgress.easeFactor : 2.5;

  const { repetitions, interval, easeFactor } = calculateSM2(
    quality,
    currentRepetitions,
    currentInterval,
    currentEaseFactor
  );

  const now = Date.now();
  const delayMs = intervalToMs(interval, timeMode);
  const nextReviewTime = now + delayMs;

  let state: SRSState = 'new';
  if (quality < 3) {
    state = 'learning'; // Reset to learning
  } else if (repetitions >= 5) {
    state = 'mastered';
  } else if (repetitions >= 2) {
    state = 'review';
  } else {
    state = 'learning';
  }

  return {
    cardId,
    deckId,
    repetitions,
    interval,
    easeFactor,
    nextReviewTime,
    state,
    lastQualityScore: quality
  };
}
