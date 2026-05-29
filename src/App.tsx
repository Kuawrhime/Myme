/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, BookOpen, Flame, Sparkles, CheckSquare, Layers, 
  Settings, CheckCircle2, ChevronRight, X, Play, Volume2, 
  Bell, FileCheck, Info, RefreshCw, BarChart2, ShieldCheck, Heart 
} from 'lucide-react';

import { Deck, UserProgress, Flashcard, SRSProgress } from './types';
import { updateCardProgress } from './utils/srs';
import { sfx } from './utils/audio';
import { DEFAULT_DECKS } from './data/defaultDecks';

// Subcomponents
import Dashboard from './components/Dashboard';
import StudySession from './components/StudySession';
import DeckManager from './components/DeckManager';
import Leaderboard from './components/Leaderboard';
import ProgressStats from './components/ProgressStats';

const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  streak: 0,
  lastStudyDate: '',
  srs: {},
  history: {},
  remindersEnabled: true,
  reminderGoal: 10,
};

export default function App() {
  // Navigation tabs: 'decks' | 'custom' | 'leaderboard' | 'stats'
  const [activeTab, setActiveTab] = useState<'decks' | 'custom' | 'leaderboard' | 'stats'>('decks');

  // Study states
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [customDecks, setCustomDecks] = useState<Deck[]>([]);
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);

  // Configuration speed modes
  const [timeMode, setTimeMode] = useState<'real' | 'fast'>('fast'); // Default fast for live preview evaluations!

  // Social shared imports toast alerts
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [reminderConfigOpen, setReminderConfigOpen] = useState(false);

  // Initialize and load persistent user states
  useEffect(() => {
    // 1. Read User progress statistics
    const localProgress = localStorage.getItem('srs_chinese_user_progress');
    if (localProgress) {
      try {
        const parsed = JSON.parse(localProgress);
        
        // Safety check: calculate if streak was lost (skipped studying yesterday)
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        let checkedStreak = parsed.streak;
        if (parsed.lastStudyDate && parsed.lastStudyDate !== todayStr && parsed.lastStudyDate !== yesterdayStr) {
          checkedStreak = 0; // Reset streak if user missed yesterday and today
        }
        
        setUserProgress({ ...parsed, streak: checkedStreak });
      } catch (e) {
        console.warn('Failed parsing user progress from storage.', e);
      }
    } else {
      // Set a cute initial mock streak for first time users so they feel immediately motivated!
      setUserProgress({
        ...DEFAULT_PROGRESS,
        streak: 3, // Initial starter streak
        lastStudyDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // studied yesterday
      });
    }

    // 2. Read user created/imported custom Decks
    const localCustomDecks = localStorage.getItem('srs_chinese_custom_decks');
    if (localCustomDecks) {
      try {
        setCustomDecks(JSON.parse(localCustomDecks));
      } catch (e) {
        console.warn(e);
      }
    }

    // 3. SOCIAL CHANNEL DECODER: Parse shared Base64 custom decks from query params
    const queryParams = new URLSearchParams(window.location.search);
    const importDataB64 = queryParams.get('import');
    if (importDataB64) {
      try {
        // Decode correctly supporting non-ASCII / Unicode UTF-8 symbols
        const binary = atob(decodeURIComponent(importDataB64));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const jsonStr = new TextDecoder().decode(bytes);
        const parsed = JSON.parse(jsonStr);

        const newSharedDeckId = 'shared-' + Date.now();
        const importedDeck: Deck = {
          id: newSharedDeckId,
          name: parsed.n + ' (Social Shared)',
          description: parsed.d || 'Imported via base64 encoded URL parameters.',
          category: 'custom',
          isCustom: true,
          createdBy: 'Chinese Friend',
          createdTime: Date.now(),
          cards: (parsed.c || []).map((card: any, idx: number) => ({
            id: `card-${newSharedDeckId}-${idx}`,
            character: card.c,
            pinyin: card.p,
            english: card.e,
            example: card.ex,
            examplePinyin: card.ep,
            exampleEnglish: card.ee,
            audioHint: card.h
          }))
        };

        setCustomDecks(prev => {
          // Prevent multiple duplicates
          if (prev.some(d => d.name === importedDeck.name)) return prev;
          const next = [importedDeck, ...prev];
          localStorage.setItem('srs_chinese_custom_decks', JSON.stringify(next));
          return next;
        });

        sfx.playStreaks();
        setImportSuccessMessage(`Social Import Success! Unboxed shared course "${importedDeck.name}" with ${importedDeck.cards.length} custom cards. Study it now!`);
        setActiveTab('decks'); // Jump to main directory
        
        // Cleanse query parametres from Browser location address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failure unboxing custom deck values from URL', e);
      }
    }
  }, []);

  // Save progress changes
  const saveProgress = (newProg: UserProgress) => {
    setUserProgress(newProg);
    localStorage.setItem('srs_chinese_user_progress', JSON.stringify(newProg));
  };

  // Register card ratings in Spaced Repetition (SRS)
  const registerCardStudyReview = (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy', xpGained: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Compute updated spaced repetition variables
    const activeDeckIDForCard = activeStudyDeck?.id || 'unknown';
    const cellProgress = userProgress.srs[cardId];
    
    // Update individual memory intervals
    const updatedSrsProgress = updateCardProgress(
      cellProgress,
      cardId,
      activeDeckIDForCard,
      rating,
      timeMode
    );

    // Calculate dynamic streak increments
    let nextStreak = userProgress.streak;
    if (userProgress.lastStudyDate === yesterdayStr) {
      nextStreak = nextStreak + 1;
      sfx.playStreaks();
    } else if (userProgress.lastStudyDate === '' || userProgress.lastStudyDate !== todayStr) {
      nextStreak = Math.max(nextStreak, 1);
    }

    // Add study history charts info
    const updatedHistory = { ...userProgress.history };
    updatedHistory[todayStr] = (updatedHistory[todayStr] || 0) + xpGained;

    const nextOverallProgress: UserProgress = {
      ...userProgress,
      xp: userProgress.xp + xpGained,
      streak: nextStreak,
      lastStudyDate: todayStr,
      srs: {
        ...userProgress.srs,
        [cardId]: updatedSrsProgress
      },
      history: updatedHistory
    };

    saveProgress(nextOverallProgress);
  };

  // Create customized folder deck
  const handleCreateDeck = (name: string, description: string, language?: string) => {
    const fresh: Deck = {
      id: 'custom-' + Date.now().toString(),
      name,
      description,
      isCustom: true,
      createdBy: 'You (Creator)',
      createdTime: Date.now(),
      cards: [],
      category: 'custom',
      language: language || 'Chinese'
    };

    const nextCustom = [fresh, ...customDecks];
    setCustomDecks(nextCustom);
    localStorage.setItem('srs_chinese_custom_decks', JSON.stringify(nextCustom));
    sfx.playSuccess();
  };

  // Delete course deck completely
  const handleDeleteDeck = (deckId: string) => {
    const list = customDecks.filter(d => d.id !== deckId);
    setCustomDecks(list);
    localStorage.setItem('srs_chinese_custom_decks', JSON.stringify(list));
    
    // Also scrub any corresponding SRS cards from that deleted deck to save storage Space
    const nextSrs = { ...userProgress.srs };
    Object.keys(nextSrs).forEach(cardId => {
      if (nextSrs[cardId].deckId === deckId) {
        delete nextSrs[cardId];
      }
    });

    saveProgress({
      ...userProgress,
      srs: nextSrs
    });
  };

  // Add card to user deck
  const handleAddCardToDeck = (deckId: string, cardData: Omit<Flashcard, 'id'>) => {
    const updatedCustom = customDecks.map(deck => {
      if (deck.id === deckId) {
        const newCard: Flashcard = {
          ...cardData,
          id: 'card-' + Date.now().toString() + '-' + Math.floor(Math.random() * 1000)
        };
        return {
          ...deck,
          cards: [...deck.cards, newCard]
        };
      }
      return deck;
    });

    setCustomDecks(updatedCustom);
    localStorage.setItem('srs_chinese_custom_decks', JSON.stringify(updatedCustom));
  };

  // Delete card from custom course
  const handleDeleteCardFromDeck = (deckId: string, cardId: string) => {
    const updatedCustom = customDecks.map(deck => {
      if (deck.id === deckId) {
        return {
          ...deck,
          cards: deck.cards.filter(c => c.id !== cardId)
        };
      }
      return deck;
    });

    setCustomDecks(updatedCustom);
    localStorage.setItem('srs_chinese_custom_decks', JSON.stringify(updatedCustom));

    // Remove corresponding SRS data
    if (userProgress.srs[cardId]) {
      const nextSrs = { ...userProgress.srs };
      delete nextSrs[cardId];
      saveProgress({
        ...userProgress,
        srs: nextSrs
      });
    }
  };

  // Trigger simulated daily study reminder toast with chime sound
  const handleSimulateReminder = () => {
    sfx.playClick();
    setShowNotificationToast(true);
    setTimeout(() => {
      // Simulates notification alert buzzer double click sound
      sfx.playClick();
    }, 200);
  };

  const allAvailableDecks = [...DEFAULT_DECKS, ...customDecks];

  return (
    <div className="min-h-screen bg-brand-bg pb-20 md:pb-8 font-sans antialiased text-brand-dark">
      
      {/* Upper Global Navigation topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 py-3 sm:px-8 shadow-sm shadow-blue-900/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-red-200/50">
              中
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-brand-dark tracking-tight leading-none font-sans">
                Lingua<span className="text-brand-red">Flow</span>
              </h1>
              <p className="text-[10px] text-brand-gray font-bold font-mono tracking-wide uppercase mt-0.5">
                SM2 Spaced Repetition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Quick stats items */}
            <div className="flex items-center gap-3.5">
              {/* Streak info */}
              <div
                className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-black shadow-xs cursor-pointer border border-red-100"
                title="Your learning streak! Complete card reviews daily to grow it."
                onClick={handleSimulateReminder}
              >
                <Flame className="w-3.5 h-3.5 fill-red-500 text-red-600 animate-pulse animate-bounce" />
                <span className="font-mono">{userProgress.streak}d</span>
              </div>
              
              {/* XP indicator */}
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-xs font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono">{userProgress.xp} <span className="text-[10px] font-bold text-amber-400">XP</span></span>
              </div>
            </div>

            {/* Notification reminder Bell panel */}
            <button
              onClick={() => setReminderConfigOpen(true)}
              id="header-btn-open-reminders"
              className="p-2.5 hover:bg-white text-brand-gray hover:text-brand-purple border border-brand-border rounded-xl transition-colors relative cursor-pointer"
              title="Daily Study Reminders"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-brand-purple rounded-full animate-ping" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout frame */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
        
        {/* URL Decoded Import success banners */}
        {importSuccessMessage && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4 animate-slideIn">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900 font-sans">Custom Deck Social Import</h4>
                <p className="text-xs text-emerald-700/90 font-medium leading-relaxed mt-0.5">
                  {importSuccessMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => setImportSuccessMessage(null)}
              className="p-1 hover:bg-emerald-100 rounded text-emerald-600 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic Desktop Sideway or Top Layout: Bento tabs selector */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Navigation controller menu (Hidden on mobile context bottoms) */}
          <aside className="w-full md:w-64 shrink-0 bg-white border border-brand-border rounded-3xl p-6 space-y-2 hidden md:block shadow-sm">
            <span className="text-[10px] font-mono font-extrabold text-brand-light-gray tracking-wider uppercase block px-3 mb-2">
              Main Navigation
            </span>
            {[
              { id: 'decks', label: 'Dashboard', icon: BookOpen },
              { id: 'custom', label: 'My Decks', icon: Layers },
              { id: 'leaderboard', label: 'Community', icon: Award },
              { id: 'stats', label: 'Analytics', icon: BarChart2 },
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sfx.playClick();
                    setActiveTab(tab.id as any);
                  }}
                  id={`nav-tab-sidebar-${tab.id}`}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#FFF5F5] text-brand-red shadow-sm'
                      : 'text-brand-gray hover:text-brand-dark hover:bg-brand-bg/50'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-brand-border px-3">
              <span className="text-[10px] font-mono font-bold text-brand-light-gray uppercase tracking-wide block mb-1">
                Reminders Dashboard
              </span>
              <button
                onClick={handleSimulateReminder}
                id="btn-trigger-test-reminder"
                className="w-full text-left font-sans text-[11px] font-bold text-brand-purple hover:text-brand-purple/80 cursor-pointer hover:underline flex items-center gap-1.5 mt-2"
              >
                <Bell className="w-3.5 h-3.5 text-brand-purple" />
                <span>Simulate Daily Push</span>
              </button>
            </div>
          </aside>

          {/* Core Interactive tab contents display viewport */}
          <div className="flex-1 w-full min-h-[500px]">
            {activeTab === 'decks' && (
              <Dashboard
                decks={allAvailableDecks}
                userProgress={userProgress}
                timeMode={timeMode}
                onTimeModeToggle={() => {
                  sfx.playClick();
                  setTimeMode(prev => prev === 'fast' ? 'real' : 'fast');
                }}
                onSelectDeck={deck => {
                  sfx.playClick();
                  setActiveStudyDeck(deck);
                }}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'custom' && (
              <DeckManager
                customDecks={customDecks}
                onCreateDeck={handleCreateDeck}
                onDeleteDeck={handleDeleteDeck}
                onAddCardToDeck={handleAddCardToDeck}
                onDeleteCardFromDeck={handleDeleteCardFromDeck}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard 
                userXp={userProgress.xp} 
                userStreak={userProgress.streak} 
              />
            )}

            {activeTab === 'stats' && (
              <ProgressStats 
                userProgress={userProgress} 
                decks={allAvailableDecks} 
              />
            )}
          </div>

        </div>

      </main>

      {/* Embedded Study Session Arena popup overlay */}
      {activeStudyDeck && (
        <StudySession
          deck={activeStudyDeck}
          srsRecords={userProgress.srs}
          timeMode={timeMode}
          onCardReviewed={registerCardStudyReview}
          onClose={() => {
            sfx.playClick();
            setActiveStudyDeck(null);
          }}
        />
      )}

      {/* Daily Reminders configurations Modal */}
      {reminderConfigOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-brand-border max-w-sm w-full space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#FFF5F5] text-brand-red rounded-lg shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-brand-dark font-sans text-sm tracking-tight">Daily Study Reminders</h3>
              </div>
              <button
                onClick={() => setReminderConfigOpen(false)}
                className="p-1 hover:bg-brand-bg rounded text-brand-light-gray cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-brand-gray font-medium leading-relaxed">
                Configure your tailored daily study goal targets. Daily notifications encourage consistency!
              </p>

              {/* Goal configurations */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-brand-light-gray uppercase">Daily Time Goal Target</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 5, label: '5 Mins' },
                    { val: 10, label: '10 Mins' },
                    { val: 15, label: '15 Mins' },
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => {
                        sfx.playClick();
                        saveProgress({ ...userProgress, reminderGoal: item.val });
                      }}
                      className={`py-2 border text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                        userProgress.reminderGoal === item.val
                          ? 'border-brand-purple bg-[#F0EEFF] text-brand-purple'
                          : 'border-brand-border hover:border-brand-gray bg-white text-brand-gray'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* simulated notification checkbox */}
              <div className="flex items-center justify-between p-3.5 bg-brand-bg border border-brand-border rounded-xl">
                <div>
                  <span className="text-xs font-bold text-brand-dark font-sans block">Allow Browser Reminders</span>
                  <span className="text-[10px] text-brand-gray mt-0.5 block font-medium">Sends simulated push popups of card due states.</span>
                </div>
                <button
                  onClick={() => {
                    sfx.playClick();
                    saveProgress({ ...userProgress, remindersEnabled: !userProgress.remindersEnabled });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                    userProgress.remindersEnabled ? 'bg-brand-purple' : 'bg-brand-light-gray'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform absolute top-1 ${
                    userProgress.remindersEnabled ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Simulation triggers */}
              <div>
                <button
                  onClick={() => {
                    setReminderConfigOpen(false);
                    handleSimulateReminder();
                  }}
                  id="reminder-modal-btn-simulate"
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-indigo-100 cursor-pointer"
                >
                  Simulate Study Push Notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Push Notification Toast Element */}
      {showNotificationToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slideIn">
          <div className="bg-brand-dark text-white shadow-2xl rounded-2xl p-4 border border-brand-dark/50 flex items-start justify-between gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red" />
            <div className="flex gap-3">
              <div className="p-2 bg-brand-purple/25 text-brand-red rounded-xl mt-0.5 shrink-0 border border-brand-purple/10">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="space-y-0.5 select-none">
                <span className="text-[9px] font-mono font-bold text-brand-red tracking-wider uppercase">Mandarin Study Alert 🔔</span>
                <h4 className="text-xs font-bold font-sans">Active Repetition Queue Waiting!</h4>
                <p className="text-[10px] text-brand-light-gray leading-relaxed font-sans font-medium">
                  Hi Language Hero! You have <span className="font-bold text-white uppercase underline">SRS reviews waiting</span>. Spend 10 minutes studying HSK Vocabulary words to protect your <span className="font-black text-amber-405">Streak!</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sfx.playClick();
                setShowNotificationToast(false);
              }}
              className="p-1 hover:bg-white/10 rounded-lg text-brand-light-gray hover:text-white transition-colors cursor-pointer shrink-0"
              title="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE LOWER TABS BAR (Hidden on large desktops) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-border p-2 py-3 flex justify-evenly items-center md:hidden shadow-lg shadow-black/5">
        {[
          { id: 'decks', label: 'Dashboard', icon: BookOpen },
          { id: 'custom', label: 'My Decks', icon: Layers },
          { id: 'leaderboard', label: 'Community', icon: Award },
          { id: 'stats', label: 'Analytics', icon: BarChart2 },
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sfx.playClick();
                setActiveTab(tab.id as any);
              }}
              id={`nav-tab-mobile-footer-${tab.id}`}
              className={`flex flex-col items-center gap-1 cursor-pointer select-none transition-colors ${
                isActive ? 'text-brand-red font-bold' : 'text-brand-gray hover:text-brand-dark'
              }`}
            >
              <IconComp className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-sans font-semibold tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </footer>

    </div>
  );
}
