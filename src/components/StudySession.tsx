/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, X, Check, AlertTriangle, ArrowRight, Lightbulb, Sparkles, Award } from 'lucide-react';
import { Deck, Flashcard, SRSProgress } from '../types';
import { sfx } from '../utils/audio';

interface StudySessionProps {
  deck: Deck;
  srsRecords: Record<string, SRSProgress>;
  timeMode: 'real' | 'fast';
  onCardReviewed: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy', xpEarned: number) => void;
  onClose: () => void;
}

export default function StudySession({
  deck,
  srsRecords,
  timeMode,
  onCardReviewed,
  onClose,
}: StudySessionProps) {
  // Filter appropriate cards for studying:
  // Pre-load all cards of the deck. But prioritize those due or brand new.
  const [cardsToStudy, setCardsToStudy] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [xpEarnedThisSession, setXpEarnedThisSession] = useState(0);
  
  // Interactive test modes: 'intro' (first time see) | 'self-rate' (traditional flip-rate) | 'mc-english' | 'mc-pinyin' | 'spelling'
  const [testMode, setTestMode] = useState<'intro' | 'self-rate' | 'mc-english' | 'mc-pinyin' | 'spelling'>('intro');
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);
  
  // Confetti particles for correct answers
  const [showConfetti, setShowConfetti] = useState(false);

  const activeCard = cardsToStudy[currentIndex];

  // Initialize study queue
  useEffect(() => {
    const list = [...deck.cards];
    // Sort so cards that are brand new or due sooner come first
    list.sort((a, b) => {
      const aRec = srsRecords[a.id];
      const bRec = srsRecords[b.id];
      if (!aRec) return -1; // new first
      if (!bRec) return 1;
      return aRec.nextReviewTime - bRec.nextReviewTime;
    });
    setCardsToStudy(list);
    setCurrentIndex(0);
  }, [deck, srsRecords]);

  // Read Card character using local Text-to-Speech (native browser voice)
  const speakChinese = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85; // slightly slower for language learners
      
      // Attempt to load a Chinese voice if available
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('ZH'));
      if (zhVoice) {
        utterance.voice = zhVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed to execute.', e);
    }
  };

  // Determine appropriate quiz options and mode for the current card
  useEffect(() => {
    if (!activeCard) return;

    setIsFlipped(false);
    setTypedAnswer('');
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizIsCorrect(false);

    // Look at SRS status to determine the dynamic gamified testing mode!
    const rec = srsRecords[activeCard.id];
    let mode: 'intro' | 'self-rate' | 'mc-english' | 'mc-pinyin' | 'spelling' = 'intro';

    if (!rec) {
      // Completely brand new card
      mode = 'intro';
    } else {
      // Existing cards alternate between self-rating and active multi-choice/spelling quizzing
      const rand = Math.random();
      if (rec.repetitions === 1) {
        mode = rand > 0.5 ? 'mc-english' : 'mc-pinyin';
      } else if (rec.repetitions === 2) {
        mode = rand > 0.4 ? 'mc-pinyin' : 'self-rate';
      } else if (rec.repetitions >= 3) {
        mode = rand > 0.5 ? 'spelling' : 'self-rate';
      } else {
        mode = 'self-rate';
      }
    }

    setTestMode(mode);

    // Speak character automatically on load to reinforce audio connection!
    speakChinese(activeCard.character);

    // Prepare Multiple Choice Options if applicable
    if (mode === 'mc-english' || mode === 'mc-pinyin') {
      const correctValue = mode === 'mc-english' ? activeCard.english : activeCard.pinyin;
      
      // Pull random decoys from other cards in the same deck or a default list
      const otherCards = deck.cards.filter(c => c.id !== activeCard.id);
      const decoys = otherCards
        .map(c => (mode === 'mc-english' ? c.english : c.pinyin))
        .filter((v, idx, arr) => arr.indexOf(v) === idx); // unique
      
      // Shuffle decoys and pick 3
      const shuffledDecoys = decoys.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      // Combine correct & decoys, shuffle them
      const allChoices = [correctValue, ...shuffledDecoys].sort(() => 0.5 - Math.random());
      
      // If we don't have enough decoys, fill with emergency ones
      while (allChoices.length < 4) {
        const fallback = mode === 'mc-english' ? 'Rice / noodles' : 'nǐ de';
        allChoices.push(fallback);
      }

      setMultipleChoiceOptions(allChoices);
    }
  }, [currentIndex, activeCard, deck, srsRecords]);

  // Keyboard controls key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to flip or proceed
      if (e.code === 'Space') {
        e.preventDefault();
        if (testMode === 'intro') {
          handleIntroCompleted();
        } else if (testMode === 'self-rate' && !isFlipped) {
          sfx.playClick();
          setIsFlipped(true);
        } else if (quizSubmitted) {
          handleNextCard();
        }
      }

      // Keys 1, 2, 3, 4 for multiple choice or self-rating!
      if (!quizSubmitted) {
        if (testMode === 'mc-pinyin' || testMode === 'mc-english') {
          if (['1', '2', '3', '4'].includes(e.key)) {
            const index = parseInt(e.key) - 1;
            if (index < multipleChoiceOptions.length) {
              handleMultipleChoiceSubmit(multipleChoiceOptions[index]);
            }
          }
        }
        if (testMode === 'self-rate' && isFlipped) {
          if (e.key === '1') handleSelfRateSubmit('again');
          if (e.key === '2') handleSelfRateSubmit('hard');
          if (e.key === '3') handleSelfRateSubmit('good');
          if (e.key === '4') handleSelfRateSubmit('easy');
        }
      } else {
        if (e.key === 'Enter') {
          handleNextCard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testMode, isFlipped, multipleChoiceOptions, quizSubmitted, activeCard]);

  if (cardsToStudy.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-stone-200/80 shadow-sm max-w-lg mx-auto text-center">
        <LoaderWidget />
      </div>
    );
  }

  // Handle click on introductory "Got it" card
  const handleIntroCompleted = () => {
    sfx.playClick();
    // Shift introductory card to "self-rate" mode inside the session so user understands
    setTestMode('self-rate');
    setIsFlipped(true);
  };

  // Submit multiple choice quiz choice
  const handleMultipleChoiceSubmit = (selected: string) => {
    if (quizSubmitted) return;
    sfx.playClick();
    setSelectedOption(selected);
    const correctValue = testMode === 'mc-english' ? activeCard.english : activeCard.pinyin;
    const isCorrect = selected.trim().toLowerCase() === correctValue.trim().toLowerCase();

    setQuizIsCorrect(isCorrect);
    setQuizSubmitted(true);

    if (isCorrect) {
      sfx.playSuccess();
      setXpEarnedThisSession(prev => prev + 10); // 10 XP for correct quiz answer!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      // Auto register SRS as "Good" in background
      onCardReviewed(activeCard.id, 'good', 10);
    } else {
      sfx.playFailure();
      // Auto register SRS as "Again" (since they missed the quiz)
      onCardReviewed(activeCard.id, 'again', 0);
    }
  };

  // Submit spelled Pinyin answer
  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizSubmitted) return;
    if (!typedAnswer.trim()) return;

    // Normalizing input to let users write flat letters without tone accent marks optionally!
    // Example: accept "nihao" or "ni hao" for "nǐ hǎo"
    const parsedInput = typedAnswer.trim().toLowerCase().replace(/\s+/g, '');
    const cleanCorrect = activeCard.pinyin.toLowerCase().replace(/\s+/g, '');
    
    // Convert to flat pin-yin string using basic replace rules (e.g. ǐ -> i, ǎ -> a, etc.)
    const stripTones = (str: string) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Strips tone marks
        .replace(/ü/g, 'v')
        .replace(/ū/g, 'u')
        .replace(/ú/g, 'u')
        .replace(/ǔ/g, 'u')
        .replace(/ù/g, 'u')
        .replace(/ā/g, 'a')
        .replace(/á/g, 'a')
        .replace(/ǎ/g, 'a')
        .replace(/à/g, 'a')
        .replace(/ē/g, 'e')
        .replace(/é/g, 'e')
        .replace(/ě/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ī/g, 'i')
        .replace(/í/g, 'i')
        .replace(/ǐ/g, 'i')
        .replace(/ì/g, 'i')
        .replace(/ō/g, 'o')
        .replace(/ó/g, 'o')
        .replace(/ǒ/g, 'o')
        .replace(/ò/g, 'o');
    };

    const isCorrect = 
      parsedInput === cleanCorrect || 
      stripTones(typedAnswer).trim().toLowerCase().replace(/\s+/g, '') === stripTones(activeCard.pinyin).trim().toLowerCase().replace(/\s+/g, '');

    setQuizIsCorrect(isCorrect);
    setQuizSubmitted(true);

    if (isCorrect) {
      sfx.playSuccess();
      setXpEarnedThisSession(prev => prev + 15); // Bonus 15 XP for Spelling correct!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      onCardReviewed(activeCard.id, 'easy', 15);
    } else {
      sfx.playFailure();
      onCardReviewed(activeCard.id, 'again', 0);
    }
  };

  // Submit standard flip-card self rating
  const handleSelfRateSubmit = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    sfx.playClick();
    let xp = 5;
    if (rating === 'good') xp = 8;
    if (rating === 'easy') xp = 12;
    if (rating === 'again') xp = 0;

    setXpEarnedThisSession(prev => prev + xp);
    onCardReviewed(activeCard.id, rating, xp);

    if (rating !== 'again') {
      sfx.playSuccess();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      sfx.playFailure();
    }

    // Set quiz as submitted with manual flag to advance
    setQuizIsCorrect(rating !== 'again');
    setQuizSubmitted(true);
  };

  // Move to next card in stack
  const handleNextCard = () => {
    sfx.playClick();
    if (currentIndex < cardsToStudy.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished entire deck session!
      setTestMode('intro'); // reset
      setCurrentIndex(cardsToStudy.length); // trigger congrats full screen
      sfx.playStreaks();
    }
  };

  // Skip card
  const handleSkip = () => {
    handleNextCard();
  };

  // Check if we are finished
  const isFinished = currentIndex >= cardsToStudy.length;

  return (
    <div className="fixed inset-0 z-50 bg-brand-bg/98 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto px-4 py-6 md:p-8">
      {/* Confetti Animation Elements */}
      {showConfetti && <ConfettiOverlay />}

      {/* Floating Header Actions */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-brand-purple text-white px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">
            {deck.name}
          </span>
          <span className="text-xs font-mono font-bold text-brand-gray">
            {isFinished ? 'Completed' : `${currentIndex + 1} of ${cardsToStudy.length}`}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-amber-500 text-white border border-transparent px-3 py-1 rounded-full text-xs font-extrabold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>+{xpEarnedThisSession} XP</span>
          </div>

          <button
            onClick={onClose}
            value="Close Study"
            id="btn-close-study-overlay"
            className="p-1 px-2.5 bg-white border border-brand-border hover:border-brand-purple/40 text-brand-gray hover:text-brand-dark transition-all rounded-lg cursor-pointer text-sm font-semibold flex items-center gap-1 shadow-xs"
          >
            <X className="w-4 h-4" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Live Progress Bar indicator */}
      {!isFinished && (
        <div className="w-full max-w-2xl h-1.5 bg-brand-border rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-brand-purple transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / cardsToStudy.length) * 100}%` }}
          />
        </div>
      )}

      {/* Main Study Arena inside nice Card Container */}
      <div className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-center min-h-[480px]">
        <AnimatePresence mode="wait">
          {isFinished ? (
            <motion.div
              key="finished-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl p-8 border-2 border-brand-border shadow-xl text-center flex flex-col items-center justify-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-[#FFF9E6] flex items-center justify-center border border-[#F6E05E] text-[#B7791F] mb-2 animate-bounce">
                <Award className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-brand-dark tracking-tight font-sans">
                  Deck Review Complete!
                </h2>
                <p className="text-brand-gray text-sm mt-2 max-w-md mx-auto">
                  Awesome job studying <span className="font-extrabold text-brand-dark">"{deck.name}"</span>! Your memory is getting sharper. The SM2 Spaced Repetition engine has recalculated next intervals.
                </p>
              </div>

              {/* Session Rewards summary */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs py-4">
                <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border text-center">
                  <div className="text-2xl font-black text-brand-red">+{xpEarnedThisSession}</div>
                  <div className="text-xs text-brand-gray font-mono mt-1 font-bold">XP GAINED</div>
                </div>
                <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border text-center">
                  <div className="text-2xl font-black text-brand-purple">{cardsToStudy.length}</div>
                  <div className="text-xs text-brand-gray font-mono mt-1 font-bold">CARDS REVIEWED</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pt-4">
                <button
                  onClick={() => {
                    // Quick restart session
                    setCurrentIndex(0);
                    setXpEarnedThisSession(0);
                  }}
                  id="btn-restart-study-session"
                  className="w-full py-3 bg-brand-bg hover:bg-brand-border text-brand-dark font-extrabold rounded-xl transition-colors cursor-pointer text-sm"
                >
                  Study Again
                </button>
                <button
                  onClick={onClose}
                  id="btn-finish-study-session"
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-100 transition-all cursor-pointer text-sm"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeCard.id + '-' + testMode + '-' + isFlipped + '-' + quizSubmitted}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex-1 flex flex-col justify-between"
            >
              {/* Question / Card Face Card container */}
              <div className="bg-white rounded-3xl border-2 border-brand-border border-b-8 border-b-brand-purple/40 shadow-md p-6 sm:p-8 flex flex-col justify-between min-h-[380px] relative overflow-hidden">
                
                {/* Mode description header */}
                <div className="flex justify-between items-center w-full mb-4">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-brand-light-gray tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                    <span>
                      {testMode === 'intro' && 'Introduction Mode'}
                      {testMode === 'self-rate' && 'Spaced Repetition Review'}
                      {testMode === 'mc-english' && 'Translate the character'}
                      {testMode === 'mc-pinyin' && 'Pick the correct Pinyin'}
                      {testMode === 'spelling' && 'Type the word Pinyin'}
                    </span>
                  </div>
                  <button
                    onClick={() => speakChinese(activeCard.character)}
                    id="btn-speak-character-audio"
                    className="p-2 hover:bg-brand-bg rounded-xl text-brand-purple hover:text-brand-purple/80 transition-colors cursor-pointer"
                    title="Pronounce Word"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Central main learning view body */}
                <div className="flex flex-col items-center justify-center py-6 flex-1 text-center">
                  {/* Large character display */}
                  <div className="text-6xl sm:text-7xl font-sans text-brand-dark tracking-wide select-none font-black mb-2 animate-pulse">
                    {activeCard.character}
                  </div>

                  {/* SUBTITLE: Shows hints when relevant, or immediately in intro mode */}
                  <AnimatePresence mode="wait">
                    {(testMode === 'intro' || isFlipped || quizSubmitted) ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3 mt-4"
                      >
                        <div>
                          <span className="text-xl sm:text-2xl font-mono text-brand-purple font-black block tracking-wider">
                            {activeCard.pinyin}
                          </span>
                          <span className="text-base sm:text-lg text-brand-dark font-extrabold font-sans mt-0.5 block">
                            {activeCard.english}
                          </span>
                        </div>

                        {activeCard.audioHint && (
                          <div className="max-w-md bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-xs text-brand-gray flex items-start gap-1 justify-center mx-auto leading-relaxed">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span><span className="font-semibold text-brand-dark">Tip:</span> {activeCard.audioHint}</span>
                          </div>
                        )}

                        {activeCard.example && (
                          <div className="max-w-md bg-[#F0EEFF]/50 border border-brand-purple/15 rounded-2xl p-4 mt-3 text-left">
                            <div className="text-xs font-mono font-bold text-brand-purple tracking-wider uppercase mb-1">
                              Example Context
                            </div>
                            <div className="text-base font-sans text-brand-dark font-semibold mb-0.5">
                              {activeCard.example}
                            </div>
                            <div className="text-xs font-mono text-brand-purple font-medium mb-1">
                              {activeCard.examplePinyin}
                            </div>
                            <div className="text-xs font-sans text-brand-gray">
                              {activeCard.exampleEnglish}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 h-6"
                      >
                        {testMode === 'self-rate' && (
                          <button
                            onClick={() => {
                              sfx.playClick();
                              setIsFlipped(true);
                            }}
                            id="btn-reveal-flashcard-back"
                            className="text-xs font-mono font-black text-brand-purple hover:text-brand-purple/80 uppercase tracking-widest cursor-pointer hover:scale-105 transition-transform flex items-center gap-1.5"
                          >
                            <span>Click Card or Space to Reveal</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {testMode === 'spelling' && (
                          <span className="text-xs font-mono text-brand-light-gray">
                            Translate: {activeCard.english}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Lower interaction action items */}
                <div className="mt-6 border-t border-brand-border pt-6">
                  {/* MODE 1: Introductions */}
                  {testMode === 'intro' && (
                    <div className="flex flex-col items-center">
                      <button
                        onClick={handleIntroCompleted}
                        id="btn-intro-continue"
                        className="w-full sm:w-auto px-8 py-3.5 bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold rounded-2xl shadow-md text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Got it, let's learn!</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono text-brand-light-gray mt-2">
                        Press Space to continue
                      </span>
                    </div>
                  )}

                  {/* MODE 2: MCQ (Pinyin or English translation) */}
                  {(testMode === 'mc-english' || testMode === 'mc-pinyin') && !quizSubmitted && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {multipleChoiceOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          id={`mc-btn-option-${idx}`}
                          onClick={() => handleMultipleChoiceSubmit(opt)}
                          className="py-3 px-4 bg-brand-bg hover:bg-white border border-brand-border rounded-xl text-left text-sm font-extrabold text-[#3a4454] hover:text-brand-dark transition-all flex items-center justify-between cursor-pointer focus:outline-none group hover:border-brand-purple hover:scale-x-102"
                        >
                          <span className="truncate pr-2">{opt}</span>
                          <span className="text-[10px] font-mono font-bold bg-[#E2E8F0] text-[#4A5568] px-2 py-0.5 rounded-md shrink-0 group-hover:bg-brand-purple group-hover:text-white transition-colors">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* MODE 3: Spelling Pinyin */}
                  {testMode === 'spelling' && !quizSubmitted && (
                    <form onSubmit={handleSpellingSubmit} className="flex gap-2.5 items-center w-full">
                      <input
                        type="text"
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        placeholder="Type Pinyin letters (eg. ni hao)"
                        className="flex-1 py-1.5 px-4 rounded-xl border-2 border-brand-border focus:border-brand-purple focus:ring-1 focus:ring-indigo-100 font-mono text-xs outline-none transition-all placeholder:text-brand-light-gray bg-white h-11"
                        autoFocus
                      />
                      <button
                        type="submit"
                        id="btn-spelling-submit"
                        className="py-3 px-6 bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-100 shrink-0 cursor-pointer h-11"
                      >
                        Check
                      </button>
                    </form>
                  )}

                  {/* MODE 4: Spaced Repetition Ratings panel */}
                  {testMode === 'self-rate' && isFlipped && !quizSubmitted && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <span className="text-[11px] font-mono font-bold text-brand-gray tracking-wider uppercase block mb-3">
                          Rate your memory recall confidence:
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <button
                          onClick={() => handleSelfRateSubmit('again')}
                          className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100/85 border border-brand-red/30 rounded-xl text-center cursor-pointer transition-all text-brand-red"
                        >
                          <div className="text-sm font-black">Again 🔴</div>
                          <div className="text-[9px] font-bold mt-1 font-mono opacity-80">Forgot (1)</div>
                        </button>
                        <button
                          onClick={() => handleSelfRateSubmit('hard')}
                          className="py-2.5 px-3 bg-[#FFFDF5] hover:bg-[#FFF9E6] border border-[#F6E05E] rounded-xl text-center cursor-pointer transition-all text-[#B7791F]"
                        >
                          <div className="text-sm font-black">Hard 🟡</div>
                          <div className="text-[9px] font-bold mt-1 font-mono opacity-80">Hesitant (2)</div>
                        </button>
                        <button
                          onClick={() => handleSelfRateSubmit('good')}
                          className="py-2.5 px-3 bg-[#F0EEFF] hover:bg-[#EBECFF] border border-brand-purple/30 rounded-xl text-center cursor-pointer transition-all text-brand-purple"
                        >
                          <div className="text-sm font-black">Good 🟢</div>
                          <div className="text-[9px] font-bold mt-1 font-mono opacity-80">Recalled (3)</div>
                        </button>
                        <button
                          onClick={() => handleSelfRateSubmit('easy')}
                          className="py-2.5 px-3 bg-emerald-55 bg-[#EBFDF5] hover:bg-[#D1FAE5] border border-emerald-250 rounded-xl text-center cursor-pointer transition-all text-emerald-600"
                        >
                          <div className="text-sm font-black">Easy 🔵</div>
                          <div className="text-[9px] font-bold mt-1 font-mono opacity-80">Instant (4)</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ANSWER SUBMISSION SUMMARY MODAL BLOCK (When user answered a test) */}
                  {quizSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 ${
                        quizIsCorrect 
                          ? 'bg-[#EBFDF5] border border-emerald-200 text-emerald-800' 
                          : 'bg-[#FFF5F5] border border-brand-red/20 text-brand-red'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          quizIsCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-brand-red'
                        }`}>
                          {quizIsCorrect ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold">
                            {quizIsCorrect ? 'Awesome! Correct Answer' : 'Incorrect recall'}
                          </div>
                          {!quizIsCorrect && (
                            <div className="text-xs font-medium font-sans mt-0.5">
                              Correct spelling/pinyin: <span className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded border border-red-100 select-all">{activeCard.pinyin}</span> - "{activeCard.english}"
                            </div>
                          )}
                          {quizIsCorrect && (
                            <div className="text-xs font-medium text-emerald-600 font-bold mt-0.5">
                              {testMode === 'self-rate' ? 'Memory scheduled correctly!' : 'Earned dynamic XP rewards!'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleNextCard}
                          id="btn-quiz-next-card"
                          className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-sm transition-all focus:ring-2 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                            quizIsCorrect 
                              ? 'bg-emerald-650 bg-emerald-600 text-white hover:bg-emerald-700' 
                              : 'bg-brand-red text-white hover:bg-[#FF8B8B]'
                          }`}
                        >
                          <span>Next Card</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Lower Skip layout controls */}
              {!quizSubmitted && testMode !== 'intro' && (
                <div className="mt-3 flex items-center justify-between px-2 text-brand-gray text-xs font-medium">
                  <span className="font-mono">
                    {testMode === 'self-rate' && !isFlipped 
                      ? '[Space] Reveal' 
                      : (testMode === 'self-rate' 
                        ? '[1-4] Rate' 
                        : '[1-4] Select Option')}
                  </span>
                  
                  <button
                    onClick={handleSkip}
                    id="btn-skip-active-card"
                    className="hover:text-brand-dark tracking-wide font-bold flex items-center gap-1.5 cursor-pointer underline"
                  >
                    <span>Skip card</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Minimal loading status indicator
function LoaderWidget() {
  return (
    <div className="flex flex-col items-center py-6">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple"></div>
      <p className="text-brand-gray font-mono text-xs mt-3">Packing study cards...</p>
    </div>
  );
}

// Particle Overlay decoration
function ConfettiOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
      <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-75 delay-100"></div>
      <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-50 delay-300"></div>
    </div>
  );
}
