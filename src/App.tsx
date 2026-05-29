/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, BookOpen, Flame, Sparkles, CheckSquare, Layers, 
  Settings, CheckCircle2, ChevronRight, X, Play, Volume2, VolumeX,
  Bell, FileCheck, Info, RefreshCw, BarChart2, ShieldCheck, Heart,
  User, Lock, Trash2, Download, Upload
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
  username: 'user_utility',
  avatarColor: 'bg-indigo-600',
  avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Tom_Anderson_2011.jpg',
  email: 'karimohamed09@gmail.com',
  language: 'English',
  timezone: 'UTC - Unknown Region (UTC) Time',
  audioMuted: false,
};

export default function App() {
  // Navigation tabs: 'decks' | 'custom' | 'leaderboard' | 'stats'
  const [activeTab, setActiveTab] = useState<'decks' | 'custom' | 'leaderboard' | 'stats'>('decks');

  // Study states
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [customDecks, setCustomDecks] = useState<Deck[]>([]);
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);
  const [studySessionMode, setStudySessionMode] = useState<'choices' | 'learn' | 'classic' | 'speed'>('choices');

  // Global Audio/Mute state
  const [isMutedState, setIsMutedState] = useState(sfx.getMuted());

  // Profile-editing states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'password' | 'delete'>('profile');
  const [profileResetVerificationText, setProfileResetVerificationText] = useState('');
  const [profileTempUsername, setProfileTempUsername] = useState('user_utility');
  const [profileTempColor, setProfileTempColor] = useState('bg-indigo-600');
  const [profileTempEmail, setProfileTempEmail] = useState('karimohamed09@gmail.com');
  const [profileTempLanguage, setProfileTempLanguage] = useState('English');
  const [profileTempTimezone, setProfileTempTimezone] = useState('UTC - Unknown Region (UTC) Time');
  const [profileTempAvatarUrl, setProfileTempAvatarUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/e/e3/Tom_Anderson_2011.jpg');
  const [profileTempAudioMuted, setProfileTempAudioMuted] = useState(false);

  // Password states
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Delete account safety checkbox
  const [confirmDeleteChecked, setConfirmDeleteChecked] = useState(false);

  // Sync profile details upon modal open
  useEffect(() => {
    if (isProfileOpen) {
      setProfileTempUsername(userProgress.username || 'user_utility');
      setProfileTempColor(userProgress.avatarColor || 'bg-indigo-600');
      setProfileTempEmail(userProgress.email || 'karimohamed09@gmail.com');
      setProfileTempLanguage(userProgress.language || 'English');
      setProfileTempTimezone(userProgress.timezone || 'UTC - Unknown Region (UTC) Time');
      setProfileTempAvatarUrl(userProgress.avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Tom_Anderson_2011.jpg');
      setProfileTempAudioMuted(userProgress.audioMuted ?? false);
      setSettingsActiveTab('profile');
      setProfileResetVerificationText('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setConfirmDeleteChecked(false);
    }
  }, [isProfileOpen, userProgress]);

  const handleSaveProfile = (
    newUsername: string,
    newColor: string,
    newEmail: string,
    newLang: string,
    newTz: string,
    newAvatar: string,
    newAudioMuted: boolean
  ) => {
    const updated = {
      ...userProgress,
      username: newUsername || 'user_utility',
      avatarColor: newColor || 'bg-indigo-600',
      email: newEmail || 'karimohamed09@gmail.com',
      language: newLang || 'English',
      timezone: newTz || 'UTC - Unknown Region (UTC) Time',
      avatarUrl: newAvatar || 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Tom_Anderson_2011.jpg',
      audioMuted: newAudioMuted,
    };
    saveProgress(updated);
    sfx.setMuted(newAudioMuted);
    setIsMutedState(newAudioMuted);
    setIsProfileOpen(false);
    sfx.playSuccess();
  };

  const handleResetEntireAccount = () => {
    localStorage.removeItem('srs_chinese_user_progress');
    localStorage.removeItem('srs_chinese_custom_decks');
    localStorage.removeItem('srs_chinese_leaderboard');
    
    setUserProgress({
      xp: 0,
      streak: 0,
      lastStudyDate: '',
      srs: {},
      history: {},
      remindersEnabled: true,
      reminderGoal: 10,
      username: 'user_utility',
      avatarColor: 'bg-indigo-600',
      avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Tom_Anderson_2011.jpg',
      email: 'karimohamed09@gmail.com',
      language: 'English',
      timezone: 'UTC - Unknown Region (UTC) Time',
    });
    setCustomDecks([]);
    sfx.playSuccess();
  };

  // Configuration speed modes
  const [timeMode, setTimeMode] = useState<'real' | 'fast'>('fast'); // Default fast for live preview evaluations!

  // Social shared imports toast alerts
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
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
        
        const loadedMuted = parsed.audioMuted ?? false;
        sfx.setMuted(loadedMuted);
        setIsMutedState(loadedMuted);
        setUserProgress({ ...parsed, streak: checkedStreak, audioMuted: loadedMuted });
      } catch (e) {
        console.warn('Failed parsing user progress from storage.', e);
      }
    } else {
      setUserProgress(DEFAULT_PROGRESS);
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

  // Reset a deck learning progress to zero
  const handleResetDeckProgress = (deckId: string) => {
    const nextSrs = { ...userProgress.srs };
    
    // Clean by card matching
    const targetDeck = allAvailableDecks.find(d => d.id === deckId);
    if (targetDeck) {
      targetDeck.cards.forEach(c => {
        delete nextSrs[c.id];
      });
    }

    // Clean any direct record tags
    Object.keys(nextSrs).forEach(cardId => {
      if (nextSrs[cardId]?.deckId === deckId) {
        delete nextSrs[cardId];
      }
    });

    saveProgress({
      ...userProgress,
      srs: nextSrs
    });
    sfx.playSuccess();
  };

  // Add cards to user deck
  const handleAddCardsToDeck = (deckId: string, cardsParts: Omit<Flashcard, 'id'>[]) => {
    setCustomDecks(prevCustom => {
      const updatedCustom = prevCustom.map(deck => {
        if (deck.id === deckId) {
          const newCards = cardsParts.map((part, index) => {
            const uniqueSub = 'card-' + Date.now().toString() + '-' + index + '-' + Math.floor(Math.random() * 1000);
            return {
              ...part,
              id: uniqueSub
            };
          });
          return {
            ...deck,
            cards: [...deck.cards, ...newCards]
          };
        }
        return deck;
      });
      localStorage.setItem('srs_chinese_custom_decks', JSON.stringify(updatedCustom));
      return updatedCustom;
    });
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

  // Daily study reminder handler

  const allAvailableDecks = [...DEFAULT_DECKS, ...customDecks];

  return (
    <div className="min-h-screen bg-brand-bg pb-20 md:pb-8 font-sans antialiased text-brand-dark">
      
      {/* Upper Global Navigation topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 py-3 sm:px-8 shadow-sm shadow-blue-900/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => {
              sfx.playClick();
              setActiveTab('decks');
              setActiveStudyDeck(null);
            }}
            className="flex items-center gap-3 select-none text-left cursor-pointer hover:opacity-85 transition-opacity"
            title="Go to Dashboard"
          >
            <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-brand-dark tracking-tight leading-none font-sans">
                Myme
              </h1>
              <p className="text-[10px] text-brand-gray font-bold font-mono tracking-wide uppercase mt-0.5">
                SM2 Spaced Repetition
              </p>
            </div>
          </button>

          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Quick stats items */}
            <div className="flex items-center gap-3.5">
              {/* Streak info */}
              <div
                className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-black shadow-xs border border-red-100"
                title="Your learning streak! Complete card reviews daily to grow it."
              >
                <Flame className="w-3.5 h-3.5 fill-red-500 text-red-600 animate-pulse animate-bounce" />
                <span className="font-mono">{userProgress.streak}d</span>
              </div>
              
              {/* XP indicator */}
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-xs font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono">{userProgress.xp} <span className="text-[10px] font-bold text-amber-400">XP</span></span>
              </div>

              {/* 🔊 Sound/Mute Global toggle */}
              <button
                onClick={() => {
                  const newMuted = !isMutedState;
                  sfx.setMuted(newMuted);
                  setIsMutedState(newMuted);
                  saveProgress({ ...userProgress, audioMuted: newMuted });
                  if (!newMuted) {
                    sfx.playClick();
                  }
                }}
                className={`p-1.5 rounded-full border cursor-pointer transition-all flex items-center justify-center ${
                  isMutedState 
                    ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' 
                    : 'bg-violet-50 border-violet-100 text-brand-purple hover:bg-violet-100'
                }`}
                title={isMutedState ? 'Volume is muted. Click to Unmute.' : 'Volume is active. Click to Mute.'}
              >
                {isMutedState ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Profile button */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setIsProfileOpen(true);
                }}
                id="btn-header-profile-settings"
                className="flex items-center gap-2 px-3 py-1 bg-violet-50 text-brand-purple hover:bg-brand-purple hover:text-white rounded-full text-xs font-black transition-all border border-violet-100 cursor-pointer shadow-xs"
                title="Open Profile & Account Settings"
              >
                <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] text-white font-extrabold shadow-sm shrink-0 ${userProgress.avatarColor || 'bg-indigo-600'}`}>
                  {userProgress.avatarUrl ? (
                    <img 
                      src={userProgress.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (userProgress.username || 'You')[0].toUpperCase()
                  )}
                </div>
                <span className="hidden sm:inline border-l border-violet-200 pl-1.5 py-0.5 text-[11px] font-black tracking-tight max-w-[80px] truncate">
                  {userProgress.username || 'You'}
                </span>
              </button>
            </div>
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
                onSelectDeck={(deck, mode = 'choices') => {
                  sfx.playClick();
                  setActiveStudyDeck(deck);
                  setStudySessionMode(mode);
                }}
                onNavigateToTab={setActiveTab}
                onResetDeckProgress={handleResetDeckProgress}
              />
            )}

            {activeTab === 'custom' && (
              <DeckManager
                customDecks={customDecks}
                onCreateDeck={handleCreateDeck}
                onDeleteDeck={handleDeleteDeck}
                onAddCardsToDeck={handleAddCardsToDeck}
                onDeleteCardFromDeck={handleDeleteCardFromDeck}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard 
                userXp={userProgress.xp} 
                userStreak={userProgress.streak} 
                username={userProgress.username}
                avatarColor={userProgress.avatarColor}
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
          initialSessionMode={studySessionMode}
          onCardReviewed={registerCardStudyReview}
          isMuted={isMutedState}
          onToggleMute={(muted) => {
            sfx.setMuted(muted);
            setIsMutedState(muted);
            saveProgress({ ...userProgress, audioMuted: muted });
          }}
          onClose={() => {
            sfx.playClick();
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
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

            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-brand-gray font-medium leading-relaxed">
                Configure your tailored daily study goal targets. Consistency built daily helps protect your rank and memory!
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

              <div className="pt-2">
                <button
                  onClick={() => setReminderConfigOpen(false)}
                  className="w-full py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-indigo-100 cursor-pointer"
                >
                  Save settings
                </button>
              </div>
            </div>
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

      {/* 👤 PROFILE EDITING & MEMRISE-STYLE SETTINGS MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] rounded-3xl border-2 border-brand-border shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn relative">
            
            {/* Modal Exit cross */}
            <button
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-white border border-brand-border hover:bg-brand-bg text-brand-light-gray hover:text-brand-dark rounded-full cursor-pointer z-10 transition-colors shadow-xs"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header Row: "Settings" Title & the Tabs */}
            <div className="bg-white px-6 py-4 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#2D3748] tracking-tight font-sans flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-purple" />
                <span>Settings</span>
              </h2>

              {/* Tab Selector Buttons row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    sfx.playClick();
                    setSettingsActiveTab('profile');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    settingsActiveTab === 'profile'
                      ? 'bg-[#E3F2FD] text-[#0D47A1] border-[#B3E5FC]'
                      : 'bg-white text-brand-gray border-transparent hover:border-brand-border'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    sfx.playClick();
                    setSettingsActiveTab('password');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    settingsActiveTab === 'password'
                      ? 'bg-[#E3F2FD] text-[#0D47A1] border-[#B3E5FC]'
                      : 'bg-white text-brand-gray border-transparent hover:border-brand-border'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>

                <button
                  onClick={() => {
                    sfx.playClick();
                    setSettingsActiveTab('delete');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    settingsActiveTab === 'delete'
                      ? 'bg-rose-55 hover:bg-rose-100 text-rose-700 border-rose-11'
                      : 'bg-white text-brand-gray border-transparent hover:border-brand-border'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete account</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Active Tab contents wrapper */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">

              {/* Tab 1: PROFILE INTERFACE */}
              {settingsActiveTab === 'profile' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Avatar Display & Action buttons */}
                    <div className="md:col-span-5 flex flex-col items-center text-center space-y-4">
                      <div className="w-40 h-40 bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm p-2 flex items-center justify-center relative group">
                        {profileTempAvatarUrl ? (
                          <img
                            src={profileTempAvatarUrl}
                            alt="avatar mockup"
                            className="w-full h-full object-cover rounded-xl"
                            referrerPolicy="no-referrer"
                            onError={() => {
                              console.warn("Avatar portrait failed to load fallback to standard initials.");
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full rounded-xl flex items-center justify-center text-5xl font-black text-white ${profileTempColor}`}>
                            {profileTempUsername ? profileTempUsername[0].toUpperCase() : 'U'}
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 text-[9px] font-mono font-bold bg-brand-dark/80 text-white px-1.5 py-0.5 rounded-md">
                          Tom style
                        </span>
                      </div>

                      {/* Photo manipulation buttons */}
                      <div className="w-full space-y-2 max-w-[180px]">
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playClick();
                            const val = window.prompt("Enter a custom profile image URL:", profileTempAvatarUrl);
                            if (val !== null) {
                              setProfileTempAvatarUrl(val);
                            }
                          }}
                          className="w-full py-2 bg-[#2D3748] hover:bg-[#1A202C] text-white text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase tracking-wider"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload New Picture</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playClick();
                            setIsProfileOpen(false);
                            setActiveTab('decks');
                            alert(`Showing profile details of "${profileTempUsername || 'user_utility'}" on Dashboard!`);
                          }}
                          className="w-full py-2 bg-[#2D3748] hover:bg-[#1A202C] text-white text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase tracking-wider"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </button>
                      </div>

                      {/* Quick swap avatar portraits presets picker */}
                      <div className="space-y-1 text-left w-full pl-2">
                        <label className="text-[10px] font-bold text-brand-light-gray uppercase font-mono">Preset Characters</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[
                            { name: 'Whiteboard Tom', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Tom_Anderson_2011.jpg' },
                            { name: 'Default Blue', url: '' },
                            { name: 'Friendly developer', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80' },
                            { name: 'Studious woman', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' }
                          ].map((avatarItem, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                sfx.playClick();
                                setProfileTempAvatarUrl(avatarItem.url);
                              }}
                              className={`px-1.5 py-1 text-[9px] font-mono font-bold rounded-md transition-colors ${
                                profileTempAvatarUrl === avatarItem.url
                                  ? 'bg-brand-purple text-white'
                                  : 'bg-white border border-brand-border text-brand-gray hover:bg-brand-bg'
                              }`}
                            >
                              {avatarItem.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right column: Form fields & Gold save block */}
                    <div className="md:col-span-7 space-y-4">
                      
                      {/* Name field */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-brand-gray">Username</label>
                        <input
                          type="text"
                          value={profileTempUsername}
                          onChange={(e) => setProfileTempUsername(e.target.value)}
                          placeholder="user_utility"
                          className="w-full px-3 py-2 bg-white border border-brand-border focus:border-brand-purple rounded-xl text-xs sm:text-xs font-bold outline-none text-brand-dark"
                        />
                      </div>

                      {/* Email field */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-brand-gray">Email</label>
                        <input
                          type="email"
                          value={profileTempEmail}
                          onChange={(e) => setProfileTempEmail(e.target.value)}
                          placeholder="karimohamed09@gmail.com"
                          className="w-full px-3 py-2 bg-white border border-brand-border focus:border-brand-purple rounded-xl text-xs sm:text-xs font-bold outline-none text-brand-dark"
                        />
                      </div>

                      {/* Language selection dropdowns */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-brand-gray">Language</label>
                        <select
                          value={profileTempLanguage}
                          onChange={(e) => setProfileTempLanguage(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-brand-border focus:border-brand-purple rounded-xl text-xs sm:text-xs font-bold outline-none text-brand-dark"
                        >
                          <option value="English">English</option>
                          <option value="Spanish">Spanish 🇪🇸</option>
                          <option value="French">French 🇫🇷</option>
                          <option value="German">German 🇩🇪</option>
                          <option value="Japanese">Japanese 🇯🇵</option>
                          <option value="Chinese">Chinese 🇨🇳</option>
                        </select>
                      </div>

                      {/* Timezone selection dropdown */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-brand-gray">Timezone</label>
                        <select
                          value={profileTempTimezone}
                          onChange={(e) => setProfileTempTimezone(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-brand-border focus:border-brand-purple rounded-xl text-xs sm:text-xs font-bold outline-none text-brand-dark"
                        >
                          <option value="UTC - Unknown Region (UTC) Time">UTC - Unknown Region (UTC) Time</option>
                          <option value="UTC - Eastern Time (US & Canada)">UTC - Eastern Time (US & Canada)</option>
                          <option value="UTC - Pacific Time (US & Canada)">UTC - Pacific Time (US & Canada)</option>
                          <option value="UTC - London/Europe">UTC - London/Europe</option>
                        </select>
                      </div>

                      {/* Sound effects toggle */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-brand-gray">App Sound & Audio Voice</label>
                        <button
                          type="button"
                          onClick={() => {
                            const val = !profileTempAudioMuted;
                            setProfileTempAudioMuted(val);
                            sfx.playClick();
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                            !profileTempAudioMuted
                              ? 'bg-violet-50/50 border-violet-200 text-brand-purple hover:bg-violet-50'
                              : 'bg-red-50/50 border-red-250 text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {profileTempAudioMuted ? (
                              <VolumeX className="w-4 h-4 text-brand-red text-red-500" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-brand-purple" />
                            )}
                            <span>{!profileTempAudioMuted ? 'Mute Audio & Speech' : 'Unmute Audio & Speech'}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono font-black">
                            {!profileTempAudioMuted ? 'ACTIVE (NORMAL)' : 'MUTED (OFF)'}
                          </span>
                        </button>
                      </div>

                      {/* Advisory Notice text */}
                      <div className="p-3 bg-amber-50 border border-amber-200 text-[11px] text-amber-900 rounded-xl leading-normal font-semibold">
                        If you are using Goal Setter and want to keep your streak, make sure to complete the Daily Goal for today before changing the time zone.
                      </div>

                      {/* Golden Save changes button */}
                      <button
                        onClick={() => handleSaveProfile(
                          profileTempUsername,
                          profileTempColor,
                          profileTempEmail,
                          profileTempLanguage,
                          profileTempTimezone,
                          profileTempAvatarUrl,
                          profileTempAudioMuted
                        )}
                        className="w-full py-2.5 bg-[#FFC107] hover:bg-[#FFB300] text-brand-dark font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-brand-dark" />
                        <span>Save Profile Details</span>
                      </button>

                    </div>
                  </div>

                  {/* Full span Bottom button: download data */}
                  <div className="pt-2 border-t border-brand-border">
                    <button
                      onClick={() => {
                        sfx.playClick();
                        // Synthesize SRS learn history file download for safety accountability
                        const backup = {
                          createdAt: new Date().toISOString(),
                          studyDetails: userProgress,
                          customDecksCount: customDecks.length,
                        };
                        const str = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", str);
                        downloadAnchor.setAttribute("download", `myme_study_data_${profileTempUsername}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                      }}
                      className="w-full py-2.5 bg-[#2D3748] hover:bg-[#1A202C] text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Personal Data</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: PASSWORD CONFIG (Replicated Screenshot 2) */}
              {settingsActiveTab === 'password' && (
                <div className="max-w-md mx-auto py-4 space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-brand-border space-y-5 text-center">
                    <h4 className="text-sm font-black text-brand-dark tracking-tight uppercase font-mono">
                      🔒 Set Password
                    </h4>
                    <p className="text-xs text-brand-gray">
                      You don't have a password yet - you'll need to set one up.
                    </p>

                    <div className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-brand-gray block">New password:</label>
                        <p className="text-[10px] text-brand-light-gray font-semibold mb-1">Your password must contain at least 6 characters.</p>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Password (minimum 6 chars)"
                          className="w-full px-3 py-2 bg-white border border-brand-border focus:border-brand-purple rounded-xl text-xs font-medium outline-none text-brand-dark"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-[#2D3748] block">New password confirmation:</label>
                        <p className="text-[10px] text-brand-light-gray font-semibold mb-1">Enter the same password as before, for verification.</p>
                        <input
                          type="password"
                          value={newPasswordConfirm}
                          onChange={(e) => setNewPasswordConfirm(e.target.value)}
                          placeholder="Confirm password"
                          className="w-full px-3 py-2 bg-white border border-brand-border focus:border-brand-purple rounded-xl text-xs font-medium outline-none text-brand-dark"
                        />
                      </div>
                    </div>

                    <button
                      disabled={newPassword.length < 6 || newPassword !== newPasswordConfirm}
                      onClick={() => {
                        sfx.playSuccess();
                        alert("Mock Password initialized successfully!");
                        setNewPassword('');
                        setNewPasswordConfirm('');
                        setSettingsActiveTab('profile');
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        newPassword.length >= 6 && newPassword === newPasswordConfirm
                          ? 'bg-[#00D2FF] hover:bg-sky-400 text-white cursor-pointer shadow-md'
                          : 'bg-sky-50 text-sky-300 border border-sky-100 cursor-not-allowed'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Set Password</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: DELETE ACCOUNT (Replicated Screenshot 3) */}
              {settingsActiveTab === 'delete' && (
                <div className="max-w-md mx-auto py-4 space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-red-100 bg-red-50/20 space-y-5 text-center">
                    
                    <h4 className="text-sm font-black text-brand-red tracking-wide uppercase font-mono">
                      ⚠️ Delete Account
                    </h4>
                    
                    <div className="space-y-3 text-xs text-red-900 text-left font-semibold leading-normal">
                      <p>
                        To assure the highest level of data protection, deleting your account will delete all personal identifiable information linked with the account. It's an irreversible action that can not be undone.
                      </p>
                      <p className="border-l-2 border-red-500 pl-2 bg-red-100/10 italic">
                        If you are a subscriber, please cancel your subscription first to stop future payments.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      {/* Safety checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-left p-2.5 bg-white border border-red-100 rounded-xl">
                        <input
                          type="checkbox"
                          checked={confirmDeleteChecked}
                          onChange={(e) => setConfirmDeleteChecked(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-red-600 focus:ring-red-500 cursor-pointer border-red-300"
                        />
                        <span className="text-[11px] font-bold text-red-900 leading-tight">
                          I'm sure I want to delete my account
                        </span>
                      </label>

                      {/* Verification Input username confirmation */}
                      <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-mono font-bold text-brand-gray uppercase">
                          To confirm deletion, type <span className="text-red-600 font-black font-mono">{userProgress.username || 'user_utility'}</span> below:
                        </label>
                        <input
                          type="text"
                          value={profileResetVerificationText}
                          onChange={(e) => setProfileResetVerificationText(e.target.value)}
                          placeholder="Type username to delete"
                          className="w-full px-3 py-2 border border-red-200 focus:border-red-500 rounded-xl text-xs font-mono outline-none text-brand-dark bg-white"
                        />
                      </div>
                    </div>

                    <button
                      disabled={!confirmDeleteChecked || profileResetVerificationText !== (userProgress.username || 'user_utility')}
                      onClick={() => {
                        handleResetEntireAccount();
                        setIsProfileOpen(false);
                        alert("Your account has been deleted back to exactly zero.");
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        confirmDeleteChecked && profileResetVerificationText === (userProgress.username || 'user_utility')
                          ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                          : 'bg-red-100 text-red-300 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
