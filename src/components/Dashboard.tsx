/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Award, Flame, Calendar, Sparkles, CheckCircle2, ChevronRight, Play, Eye, Layers, Sliders, RefreshCw } from 'lucide-react';
import { Deck, UserProgress, SRSProgress } from '../types';

interface DashboardProps {
  decks: Deck[];
  userProgress: UserProgress;
  timeMode: 'real' | 'fast';
  onTimeModeToggle: () => void;
  onSelectDeck: (deck: Deck, initialMode?: 'choices' | 'learn' | 'classic' | 'speed') => void;
  onNavigateToTab: (tab: 'decks' | 'custom' | 'leaderboard' | 'stats') => void;
  onResetDeckProgress: (deckId: string) => void;
}

export default function Dashboard({
  decks,
  userProgress,
  timeMode,
  onTimeModeToggle,
  onSelectDeck,
  onNavigateToTab,
  onResetDeckProgress,
}: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'hsk1' | 'conversational' | 'travel' | 'custom'>('all');
  const [settingsDeckId, setSettingsDeckId] = useState<string | null>(null);
  const [deckResetConfirmText, setDeckResetConfirmText] = useState('');

  const now = Date.now();

  // Calculate high level stats across all decks
  const allCardsStudiedCount = Object.keys(userProgress.srs).length;
  
  const masteredCardsCount = Object.values(userProgress.srs).filter(
    (record: SRSProgress) => record.state === 'mastered'
  ).length;

  const dueCardsCount = Object.values(userProgress.srs).filter(
    (record: SRSProgress) => now >= record.nextReviewTime
  ).length;

  // Filter decks
  const filteredDecks = decks.filter(deck => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return deck.isCustom;
    return deck.category === selectedCategory;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Grid of core metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Streak card */}
        <div className="bg-white rounded-3xl border border-brand-border p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-[#FFF5F5] text-brand-red rounded-2xl shadow-sm shadow-red-100">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-brand-dark">
              {userProgress.streak}
            </div>
            <div className="text-xs text-brand-gray font-semibold font-sans">
              Daily Streak
            </div>
          </div>
        </div>

        {/* XP stats card */}
        <div className="bg-white rounded-3xl border border-brand-border p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl shadow-sm shadow-amber-100">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-brand-dark">
              {userProgress.xp}
            </div>
            <div className="text-xs text-brand-gray font-semibold font-sans">
              Total XP
            </div>
          </div>
        </div>

        {/* Studied stats card */}
        <div className="bg-white rounded-3xl border border-brand-border p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-[#F0EEFF] text-brand-purple rounded-2xl shadow-sm shadow-indigo-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-brand-dark">
              {allCardsStudiedCount}
            </div>
            <div className="text-xs text-brand-gray font-semibold font-sans">
              Cards Studied
            </div>
          </div>
        </div>

        {/* Due cards card */}
        <div className="bg-white rounded-3xl border border-brand-border p-4 sm:p-5 flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl shadow-sm shadow-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-black font-mono ${dueCardsCount > 0 ? 'text-emerald-600' : 'text-brand-dark'}`}>
              {dueCardsCount}
            </div>
            <div className="text-xs text-brand-gray font-semibold font-sans">
              Due for Review
            </div>
          </div>
          {dueCardsCount > 0 && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          )}
        </div>
      </div>

      {/* Categories Selector list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-brand-dark font-sans tracking-tight">
            Language Learning Sandboxes
          </h2>
          <span className="text-xs font-mono font-medium text-brand-light-gray">
            Browse and start flashcard review
          </span>
        </div>

        {/* Filters pills row */}
        <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Courses' },
            { id: 'hsk1', label: 'HSK 1 Basics' },
            { id: 'conversational', label: 'Conversational' },
            { id: 'travel', label: 'Survival Travel' },
            { id: 'custom', label: 'My Custom Decks' },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setSelectedCategory(pill.id as any)}
              id={`filter-pill-${pill.id}`}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer shrink-0 transition-all ${
                selectedCategory === pill.id
                  ? 'bg-brand-purple text-white shadow-md shadow-indigo-100'
                  : 'bg-white border border-brand-border text-brand-gray hover:text-brand-dark hover:border-brand-gray/80'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Decks Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.length === 0 ? (
          <div className="col-span-full py-12 px-6 bg-white border border-dashed border-brand-light-gray/40 text-center rounded-3xl flex flex-col items-center justify-center space-y-4">
            <Layers className="w-10 h-10 text-brand-light-gray" />
            <div>
              <p className="text-brand-gray text-sm font-medium">No courses or decks created yet in this section.</p>
              {selectedCategory === 'custom' && (
                <button
                  onClick={() => onNavigateToTab('custom')}
                  id="dash-btn-create-custom-deck"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-purple hover:text-brand-purple/80 cursor-pointer"
                >
                  Create Custom Deck now
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredDecks.map(deck => {
            // Count cards stats of this individual deck
            const totalCards = deck.cards.length;
            const studiedCardsOfDeck = deck.cards.filter(c => !!userProgress.srs[c.id]);
            const studiedCount = studiedCardsOfDeck.length;
            
            const dueCount = deck.cards.filter(c => {
              const rec = userProgress.srs[c.id];
              return rec && now >= rec.nextReviewTime;
            }).length;

            const progressPct = totalCards > 0 ? Math.round((studiedCount / totalCards) * 100) : 0;

            const categoryColors: Record<string, string> = {
              hsk1: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
              conversational: 'bg-[#FFF5F5] text-brand-red border-red-100/50',
              travel: 'bg-amber-50 text-amber-700 border-amber-100/50',
              custom: 'bg-[#F0EEFF] text-brand-purple border-brand-purple/20'
            };

            const activeColor = deck.isCustom 
              ? categoryColors['custom'] 
              : categoryColors[deck.category || 'hsk1'] || categoryColors['hsk1'];

            if (settingsDeckId === deck.id) {
              return (
                <div
                  key={deck.id}
                  className="bg-white border-2 border-brand-purple rounded-2xl p-5 shadow-lg flex flex-col justify-between min-h-[310px] animate-fadeIn"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-border pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-brand-purple">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Deck Settings</span>
                      </div>
                      <button
                        onClick={() => setSettingsDeckId(null)}
                        className="text-xs text-brand-light-gray hover:text-brand-dark font-sans font-bold cursor-pointer hover:bg-brand-bg px-2 py-1 rounded"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-brand-dark tracking-tight font-sans">
                        {deck.name}
                      </h3>
                      <p className="text-[11px] text-brand-gray leading-relaxed font-semibold">
                        Configure study properties or reset custom space repetition records.
                      </p>
                    </div>

                    <div className="p-3 bg-[#FFF5F5] border border-brand-red/10 rounded-xl space-y-3">
                      <div className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-wider">
                        ⚠️ Danger Zone
                      </div>
                      <p className="text-[10px] text-red-900 leading-normal font-semibold">
                        This deletes all your Spaced Repetition learning progress, intervals, and streak records for matching cards in this deck.
                      </p>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-bold text-brand-gray uppercase">
                          To confirm, type <span className="text-red-600 font-extrabold">RESET</span> below:
                        </label>
                        <input
                          type="text"
                          value={deckResetConfirmText}
                          onChange={(e) => setDeckResetConfirmText(e.target.value)}
                          placeholder="Type RESET"
                          className="w-full px-2.5 py-1.5 border border-red-200 focus:border-red-500 rounded-lg text-xs font-mono bg-white outline-none"
                        />
                      </div>
                      
                      <button
                        onClick={() => {
                          onResetDeckProgress(deck.id);
                          setSettingsDeckId(null);
                          setDeckResetConfirmText('');
                        }}
                        disabled={deckResetConfirmText.toUpperCase() !== 'RESET'}
                        className={`w-full py-2.5 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                          deckResetConfirmText.toUpperCase() === 'RESET'
                            ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                            : 'bg-red-200 text-red-400 cursor-not-allowed opacity-60'
                        }`}
                        title="Reset deck progress parameters to zero"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Confirm and Reset Learning Progress</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setSettingsDeckId(null)}
                      className="text-xs font-bold text-brand-gray hover:text-brand-dark cursor-pointer underline decoration-dotted"
                    >
                      ← Back to Deck Card
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={deck.id}
                className="bg-white border border-brand-border border-b-4 border-b-brand-border rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-900/5 hover:border-brand-purple/20 hover:border-b-brand-purple/40 transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${activeColor}`}>
                      {(deck.language || 'Chinese')} • {deck.isCustom ? 'Custom' : (deck.category === 'hsk1' ? 'HSK 1' : deck.category)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeckResetConfirmText('');
                        setSettingsDeckId(deck.id);
                      }}
                      className="p-1 px-1.5 border border-brand-border hover:border-brand-purple hover:text-brand-purple rounded-lg font-mono text-[10px] font-bold text-brand-light-gray flex items-center gap-1 transition-colors cursor-pointer"
                      title="Open Deck Settings"
                    >
                      <Sliders className="w-2.5 h-2.5" />
                      <span>Settings</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-brand-dark tracking-tight leading-snug group-hover:text-brand-purple transition-colors font-sans">
                      {deck.name}
                    </h3>
                    <p className="text-brand-gray line-clamp-2 text-xs font-medium leading-relaxed mt-1">
                      {deck.description}
                    </p>
                  </div>
                </div>

                {/* Status indicator bar of studied progress */}
                <div className="mt-5 pt-4 border-t border-brand-border space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-xs text-brand-light-gray mb-1">
                      <span className="font-semibold font-sans">Learning Progress</span>
                      <span className="font-mono font-black text-brand-dark">{progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-purple rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-brand-light-gray leading-none">
                    <div className="flex items-center gap-1.5">
                      <span>{studiedCount} learnt</span>
                    </div>
                    {dueCount > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 text-[10px] flex items-center gap-1 animate-pulse">
                        <span className="h-1 w-1 bg-emerald-500 rounded-full"></span>
                        {dueCount} due review
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1 w-full">
                    {studiedCount === 0 ? (
                      /* Default: Learn new words */
                      <button
                        onClick={() => onSelectDeck(deck, 'learn')}
                        id={`deck-btn-learn-${deck.id}`}
                        className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5 animate-fadeIn"
                        title="Learn new words in this deck (baseline)"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Learn new words</span>
                      </button>
                    ) : (
                      /* Default: Classic review (we have already studied some cards) */
                      <button
                        onClick={() => onSelectDeck(deck, 'classic')}
                        id={`deck-btn-review-${deck.id}`}
                        className="flex-1 py-2.5 px-3 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5 animate-fadeIn"
                        title="Strengthen retention with classic spaced repetition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Classic review</span>
                      </button>
                    )}

                    {/* Choose Mode Button right next to it */}
                    <button
                      onClick={() => onSelectDeck(deck, 'choices')}
                      id={`deck-btn-choices-${deck.id}`}
                      className="p-2.5 bg-[#1E3A8A]/90 hover:bg-[#1E3A8A] text-[#FBBF24] hover:text-[#FAA200] rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                      title="Choose custom study function (Learn / Classic / Speed Review)"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
