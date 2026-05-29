/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, X, Check, AlertTriangle, ArrowRight, Lightbulb, Sparkles, Award } from 'lucide-react';
import { Deck, Flashcard, SRSProgress } from '../types';
import { sfx } from '../utils/audio';

interface StudySessionProps {
  deck: Deck;
  srsRecords: Record<string, SRSProgress>;
  timeMode: 'real' | 'fast';
  initialSessionMode?: 'choices' | 'learn' | 'classic' | 'speed';
  onCardReviewed: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy', xpEarned: number) => void;
  onClose: () => void;
  isMuted?: boolean;
  onToggleMute?: (muted: boolean) => void;
}

export default function StudySession({
  deck,
  srsRecords,
  timeMode,
  initialSessionMode,
  onCardReviewed,
  onClose,
  isMuted,
  onToggleMute,
}: StudySessionProps) {
  const [muteTrigger, setMuteTrigger] = useState(isMuted ?? sfx.getMuted());

  useEffect(() => {
    if (isMuted !== undefined) {
      setMuteTrigger(isMuted);
    }
  }, [isMuted]);

  const handleToggleMute = (newMute: boolean) => {
    sfx.setMuted(newMute);
    setMuteTrigger(newMute);
    if (onToggleMute) {
      onToggleMute(newMute);
    }
  };

  // Navigation: choice configurator or actual study
  const [sessionMode, setSessionMode] = useState<'choices' | 'learn' | 'classic' | 'speed'>(
    initialSessionMode || 'choices'
  );
  
  // Filter appropriate cards for studying:
  const [cardsToStudy, setCardsToStudy] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [xpEarnedThisSession, setXpEarnedThisSession] = useState(0);
  
  // Interactive test modes
  const [testMode, setTestMode] = useState<'intro' | 'self-rate' | 'mc-english' | 'mc-pinyin' | 'spelling'>('intro');
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);
  
  // Confetti particles for correct answers
  const [showConfetti, setShowConfetti] = useState(false);

  // Speed Review custom gamified states
  const [lives, setLives] = useState(3);
  const [speedReviewFail, setSpeedReviewFail] = useState(false);
  const [speedSuccessCount, setSpeedSuccessCount] = useState(0);
  const [timerCount, setTimerCount] = useState(10);

  const timerIntervalRef = useRef<any>(null);
  const transitionTimeoutRef = useRef<any>(null);
  const activeCard = cardsToStudy[currentIndex];

  // Initialize study queue based on selected sessionMode
  useEffect(() => {
    const list = [...deck.cards];
    if (sessionMode === 'learn') {
      // Chunk into lessons of 3 cards in original deck order
      const lessons: Flashcard[][] = [];
      for (let i = 0; i < list.length; i += 3) {
        lessons.push(list.slice(i, i + 3));
      }
      // Find first lesson that has at least one card with 0 repetitions (unlearned / new)
      const activeLesson = lessons.find(l =>
        l.some(c => !srsRecords[c.id] || (srsRecords[c.id]?.repetitions ?? 0) === 0)
      ) || lessons[0] || [];
      
      setCardsToStudy(activeLesson);
    } else if (sessionMode === 'classic') {
      // Classic review only for cards the user has already studied
      const seenCards = list.filter(c => {
        const rec = srsRecords[c.id];
        return rec && rec.repetitions > 0;
      });
      seenCards.sort((a, b) => {
        const aRec = srsRecords[a.id]!;
        const bRec = srsRecords[b.id]!;
        return aRec.nextReviewTime - bRec.nextReviewTime;
      });
      setCardsToStudy(seenCards);
    } else if (sessionMode === 'speed') {
      // Speed review only for cards the user has already studied
      const seenCards = list.filter(c => {
        const rec = srsRecords[c.id];
        return rec && rec.repetitions > 0;
      });
      seenCards.sort(() => 0.5 - Math.random());
      setCardsToStudy(seenCards);
    } else {
      list.sort((a, b) => {
        const aRec = srsRecords[a.id];
        const bRec = srsRecords[b.id];
        if (!aRec) return -1; // brand new first
        if (!bRec) return 1;
        return aRec.nextReviewTime - bRec.nextReviewTime;
      });
      setCardsToStudy(list);
    }
    setCurrentIndex(0);
  }, [deck, sessionMode]);

  // Read Card character using local Text-to-Speech (native browser voice)
  const speakText = (text: string) => {
    if (sfx.getMuted()) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const lang = deck.language || 'Chinese';
      if (lang === 'Spanish') {
        utterance.lang = 'es-ES';
      } else if (lang === 'French') {
        utterance.lang = 'fr-FR';
      } else if (lang === 'German') {
        utterance.lang = 'de-DE';
      } else if (lang === 'Japanese') {
        utterance.lang = 'ja-JP';
      } else if (lang === 'Italian') {
        utterance.lang = 'it-IT';
      } else {
        utterance.lang = 'zh-CN';
      }
      
      utterance.rate = 0.85; // slightly slower for learners
      
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => v.lang.toLowerCase().includes(utterance.lang.toLowerCase()));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed to execute.', e);
    }
  };

  // Speed Review Timer Tick interval
  useEffect(() => {
    if (sessionMode !== 'speed' || speedReviewFail || currentIndex >= cardsToStudy.length || quizSubmitted) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    setTimerCount(10);

    timerIntervalRef.current = setInterval(() => {
      setTimerCount(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          sfx.playFailure();
          
          setLives(l => {
            const nextL = l - 1;
            if (nextL <= 0) {
              setSpeedReviewFail(true);
            }
            return nextL;
          });

          setQuizIsCorrect(false);
          setQuizSubmitted(true);

          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
          }
          transitionTimeoutRef.current = setTimeout(() => {
            handleNextCard();
          }, 1200);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [sessionMode, speedReviewFail, currentIndex, cardsToStudy.length, quizSubmitted]);

  // Trigger Study selections
  const startLearnMode = () => {
    sfx.playClick();
    const list = [...deck.cards];
    // Learn new words by default -> prioritize unreviewed cards (reps == 0)
    list.sort((a, b) => {
      const aRec = srsRecords[a.id];
      const bRec = srsRecords[b.id];
      const aReps = aRec?.repetitions ?? 0;
      const bReps = bRec?.repetitions ?? 0;
      return aReps - bReps;
    });
    setCardsToStudy(list.slice(0, 3));
    setCurrentIndex(0);
    setSessionMode('learn');
  };

  const startClassicMode = () => {
    sfx.playClick();
    const list = [...deck.cards];
    list.sort((a, b) => {
      const aRec = srsRecords[a.id];
      const bRec = srsRecords[b.id];
      if (!aRec) return 1;
      if (!bRec) return -1;
      return aRec.nextReviewTime - bRec.nextReviewTime;
    });
    setCardsToStudy(list);
    setCurrentIndex(0);
    setSessionMode('classic');
  };

  const startSpeedMode = () => {
    sfx.playClick();
    const list = [...deck.cards].sort(() => 0.5 - Math.random());
    setCardsToStudy(list);
    setCurrentIndex(0);
    setLives(3);
    setSpeedSuccessCount(0);
    setSpeedReviewFail(false);
    setSessionMode('speed');
  };

  // Determine appropriate quiz options and mode for the current card
  useEffect(() => {
    if (!activeCard) return;
    if (sessionMode === 'choices') return; // Absolute guard: do not play sound or initialize questions during mode select!

    setIsFlipped(false);
    setTypedAnswer('');
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizIsCorrect(false);

    // Look at SRS status or Speed mode constraints to determine test styles
    const rec = srsRecords[activeCard.id];
    let mode: 'intro' | 'self-rate' | 'mc-english' | 'mc-pinyin' | 'spelling' = 'intro';

    if (sessionMode === 'speed') {
      mode = Math.random() > 0.5 ? 'mc-english' : 'mc-pinyin';
    } else if (sessionMode === 'learn') {
      // Learning new words session mode strictly introduces each card first
      mode = 'intro';
    } else if (!rec) {
      mode = 'intro';
    } else {
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

    // Speak character naturally
    speakText(activeCard.character);

    // Prepare Multiple Choice Options if applicable
    if (mode === 'mc-english' || mode === 'mc-pinyin') {
      const correctValue = mode === 'mc-english' ? activeCard.english : activeCard.pinyin;
      
      const otherCards = deck.cards.filter(c => c.id !== activeCard.id);
      const decoys = otherCards
        .map(c => (mode === 'mc-english' ? c.english : c.pinyin))
        .filter((v, idx, arr) => arr.indexOf(v) === idx);
      
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
  }, [currentIndex, activeCard, deck, sessionMode]);

  // Keyboard controls key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore global shortcut triggers if the user is currently typing in an input text field!
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

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
        // Disallow double manual progression triggers in speed review since it auto-advances
        if (sessionMode !== 'speed' && e.key === 'Enter') {
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
    // Register the card as successfully learned/introduced
    onCardReviewed(activeCard.id, 'good', 10);
    // Proceed immediately to the next card
    handleNextCard();
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
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      
      if (sessionMode === 'speed') {
        const xp = 12;
        setSpeedSuccessCount(prev => prev + 1);
        setXpEarnedThisSession(prev => prev + xp);
        onCardReviewed(activeCard.id, 'easy', xp);
        // Automatically go to next card in speed review
        setTimeout(() => {
          handleNextCard();
        }, 1200);
      } else {
        setXpEarnedThisSession(prev => prev + 10); // 10 XP for correct quiz answer!
        onCardReviewed(activeCard.id, 'good', 10);
      }
    } else {
      sfx.playFailure();
      
      if (sessionMode === 'speed') {
        setLives(l => {
          const next = l - 1;
          if (next <= 0) {
            setSpeedReviewFail(true);
          }
          return next;
        });
        onCardReviewed(activeCard.id, 'again', 0);
        // Automatically go to next card in speed review
        setTimeout(() => {
          handleNextCard();
        }, 1200);
      } else {
        // Auto register SRS as "Again" (since they missed the quiz)
        onCardReviewed(activeCard.id, 'again', 0);
      }
    }
  };

  // Submit spelled Pinyin answer
  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizSubmitted) return;

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
      !!typedAnswer.trim() && (
        parsedInput === cleanCorrect || 
        stripTones(typedAnswer).trim().toLowerCase().replace(/\s+/g, '') === stripTones(activeCard.pinyin).trim().toLowerCase().replace(/\s+/g, '')
      );

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

  const deckLessons: Flashcard[][] = [];
  for (let i = 0; i < deck.cards.length; i += 3) {
    deckLessons.push(deck.cards.slice(i, i + 3));
  }

  const hasUnfinishedLesson = deckLessons.some(lesson => {
    const total = lesson.length;
    const studiedCount = lesson.filter(card => {
      const rec = srsRecords[card.id];
      return rec && rec.repetitions > 0;
    }).length;
    return studiedCount > 0 && studiedCount < total;
  });

  const totalSeenWords = deck.cards.filter(c => {
    const rec = srsRecords[c.id];
    return rec && rec.repetitions > 0;
  }).length;

  const hasSeenWords = totalSeenWords > 0;
  const canShowReviewModes = hasSeenWords && !hasUnfinishedLesson;

  if (sessionMode === 'choices') {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg/98 backdrop-blur-md flex flex-col items-center justify-center overflow-y-auto px-4 py-6 md:p-8">
        <div className="w-full max-w-xl bg-white border border-brand-border rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 animate-fadeIn relative">
          
          <div className="absolute top-5 right-5 flex items-center gap-1.5">
            <button
              onClick={() => {
                const newMute = !muteTrigger;
                handleToggleMute(newMute);
                if (!newMute) {
                  sfx.playClick();
                }
              }}
              className="p-1.5 hover:bg-brand-bg rounded-full text-brand-purple hover:text-brand-purple/80 transition-all cursor-pointer flex items-center justify-center"
              title={muteTrigger ? "Unmute Deck Audio" : "Mute Deck Audio"}
            >
              {muteTrigger ? (
                <VolumeX className="w-4.5 h-4.5 text-red-500 animate-pulse" />
              ) : (
                <Volume2 className="w-4.5 h-4.5 text-brand-purple" />
              )}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-brand-bg rounded-full text-brand-gray hover:text-brand-dark transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center space-y-2">
            <span className="text-[10px] font-mono font-black tracking-widest bg-brand-purple/10 text-brand-purple px-3 py-1 rounded-full uppercase">
              STUDY CONFIGURATOR
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-dark tracking-tight font-sans">
              Choose your review mode
            </h2>
            <p className="text-xs text-brand-gray max-w-md mx-auto">
              Select one of the sessions below to match your memory training style for <span className="font-bold text-brand-dark">"{deck.name}"</span>.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* GIANT BLUE BUTTON: Learn new words (as displayed in screenshot) */}
            <button
              onClick={startLearnMode}
              id="btn-learn-new-mode"
              className="w-full text-left p-5 bg-blue-50/70 hover:bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group hover:scale-[1.01] hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center shrink-0">
                  🌱
                </div>
                <div>
                  <h4 className="font-sans font-black text-brand-dark text-sm sm:text-base group-hover:text-blue-800 transition-colors flex items-center gap-1.5">
                    <span>Learn new words</span>
                    <span className="text-[9px] uppercase font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      Default
                    </span>
                  </h4>
                  <p className="text-[11px] text-blue-900/80 leading-relaxed mt-0.5 font-medium">
                    Learn new words or establish baseline SRS levels. Focuses heavy repetitions on lessons of 3 unstudied words.
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-700 group-hover:translate-x-1 transition-transform">➔</span>
            </button>

            {!canShowReviewModes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <span className="text-lg">💡</span>
                <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                  {hasUnfinishedLesson ? (
                    <span>You left your active lesson before finishing learning the 3 words! Please click <strong>"Learn new words"</strong> to finish learning them. <strong>Classic Review</strong> and <strong>Speed Review</strong> will reappear once the active lesson is completed.</span>
                  ) : (
                    <span>You haven't learned any vocabulary words in this deck yet! Click <strong>"Learn new words"</strong> above to learn your first lesson of 3 words and unlock spaced repetition reviews.</span>
                  )}
                </p>
              </div>
            )}

            {canShowReviewModes && (
              <>
                <div className="flex items-center justify-center my-2 text-center text-xs font-mono font-bold text-brand-light-gray uppercase tracking-widest relative">
                  <span className="bg-white px-3 z-10">Or choose your session</span>
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-brand-border" />
                </div>

                {/* CLASSIC REVIEW OPTION */}
                <button
                  onClick={startClassicMode}
                  id="btn-classic-review-mode"
                  className="w-full text-left p-4 hover:bg-brand-bg border border-brand-border hover:border-brand-purple rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[#E8F5E9] text-[#2E7D32] rounded-xl font-bold flex items-center justify-center shrink-0">
                      Shower
                    </div>
                    <div>
                      <h4 className="font-sans font-extrabold text-brand-dark text-sm group-hover:text-brand-purple transition-colors flex items-center gap-2">
                        <span>Classic review</span>
                        {totalSeenWords > 0 && (
                          <span className="text-[9px] font-mono font-bold bg-[#A5D6A7] text-[#1B5E20] px-1.5 py-0.5 rounded-full">
                            {totalSeenWords} learnt cards
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-brand-gray mt-0.5 font-medium leading-relaxed">
                        Spaced repetition smart logic. Strengthen long-term retention using adaptive self-rating levels.
                      </p>
                    </div>
                  </div>
                  <span className="text-lg text-brand-purple group-hover:translate-x-1 transition-transform">➔</span>
                </button>

                {/* SPEED REVIEW OPTION */}
                <button
                  onClick={startSpeedMode}
                  id="btn-speed-review-mode"
                  className="w-full text-left p-4 hover:bg-[#F3E5F5] hover:border-[#BA68C8] border border-brand-border rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[#F3E5F5] text-[#7B1FA2] rounded-xl font-bold flex items-center justify-center shrink-0">
                      ⏱️
                    </div>
                    <div>
                      <h4 className="font-sans font-extrabold text-[#7B1FA2] text-sm flex items-center gap-2">
                        <span>Speed review</span>
                        <span className="text-[9px] font-mono font-bold bg-[#E1BEE7] text-[#7B1FA2] px-1.5 py-0.5 rounded-full">
                          Hectic Match
                        </span>
                      </h4>
                      <p className="text-[11px] text-brand-gray mt-0.5 font-medium leading-relaxed">
                        10-second limit per card with a 3-point loss system if you fail. Answer rapidly, beat the clock!
                      </p>
                    </div>
                  </div>
                  <span className="text-lg text-[#7B1FA2] group-hover:translate-x-1 transition-transform">➔</span>
                </button>
              </>
            )}

          </div>

          <div className="pt-2 text-center">
            <span className="text-[10px] font-mono font-bold text-brand-light-gray">
              Target Language: {deck.language || 'Chinese'} • High contrast interface
            </span>
          </div>

        </div>
      </div>
    );
  }

  if (sessionMode === 'speed' && speedReviewFail) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg/98 backdrop-blur-md flex flex-col items-center justify-center overflow-y-auto px-4 py-8 overflow-x-hidden">
        <div className="w-full max-w-md bg-white border-2 border-brand-red/30 rounded-3xl p-8 shadow-xl text-center flex flex-col items-center justify-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center border border-red-200 text-red-600 animate-bounce">
            💔
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-dark tracking-tight font-sans">
              Game Over!
            </h2>
            <p className="text-brand-gray text-xs sm:text-sm mt-2 max-w-sm mx-auto">
              You ran out of lives! Speed review keeps your reflexes sharp. You reviewed <span className="font-bold text-brand-dark">{speedSuccessCount} cards</span> successfully before running out of hearts. Let's try again!
            </p>
          </div>

          {/* Speed achievements summary */}
          <div className="bg-brand-bg p-4 rounded-xl border border-brand-border text-center w-full">
            <div className="text-lg font-extrabold text-brand-dark">Score: {speedSuccessCount} Cards</div>
            <div className="text-xl font-black text-brand-purple mt-1 flex items-center justify-center gap-1.5">
              <span>+{speedSuccessCount * 8} XP Gained</span>
            </div>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={() => {
                sfx.playClick();
                setSessionMode('choices');
              }}
              className="w-full py-3 bg-brand-bg hover:bg-brand-border text-brand-dark font-extrabold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Other Modes
            </button>
            <button
              onClick={startSpeedMode}
              className="w-full py-3 bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold rounded-xl shadow-lg transition-all cursor-pointer text-xs"
            >
              Retry Speed Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Speed Mode Health & Timer Status */}
      {sessionMode === 'speed' && !isFinished && (
        <div className="w-full max-w-2xl flex items-center justify-between bg-indigo-50/50 border border-brand-purple/20 px-4 py-2.5 rounded-2xl mb-6 text-xs animate-fadeIn">
          <div className="flex items-center gap-1">
            <span className="font-mono font-bold text-brand-purple uppercase">Lives Remaining:</span>
            <div className="flex gap-1 ml-1 text-base">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="transition-transform duration-200">
                  {i < lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-brand-purple uppercase">Time:</span>
            <div className={`px-2.5 py-0.5 rounded-md font-mono font-black text-sm text-white min-w-10 text-center ${timerCount <= 2 ? 'bg-red-500 animate-pulse' : 'bg-brand-purple'}`}>
              {timerCount}s
            </div>
          </div>
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

              <div className="flex flex-col gap-3.5 w-full max-w-sm pt-4">
                {sessionMode === 'learn' ? (
                  <>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setXpEarnedThisSession(0);
                        startClassicMode();
                      }}
                      id="btn-finish-go-classic"
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>🔄 Classic Review for these words</span>
                    </button>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setXpEarnedThisSession(0);
                        startLearnMode();
                      }}
                      id="btn-finish-go-learn-more"
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xs transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>🌱 Learn 3 More New Words</span>
                    </button>
                  </>
                ) : sessionMode === 'classic' ? (
                  <>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setXpEarnedThisSession(0);
                        startLearnMode();
                      }}
                      id="btn-finish-go-learn"
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>🌱 Learn New Words mode</span>
                    </button>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setXpEarnedThisSession(0);
                        startClassicMode();
                      }}
                      id="btn-finish-go-classic-again"
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>🔄 Review Again (Classic)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      sfx.playClick();
                      setXpEarnedThisSession(0);
                      setSessionMode('choices');
                    }}
                    id="btn-finish-choose-mode"
                    className="w-full py-3 px-4 bg-brand-purple hover:bg-brand-purple/95 text-white font-black rounded-xl shadow-md transition-all cursor-pointer text-xs"
                  >
                    Go Choose Another Mode
                  </button>
                )}

                <div className="flex gap-2 w-full pt-1">
                  <button
                    onClick={() => {
                      sfx.playClick();
                      setSessionMode('choices');
                    }}
                    id="btn-study-configurator-secondary"
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold rounded-xl transition-colors cursor-pointer text-[11px]"
                  >
                    All Modes
                  </button>
                  
                  <button
                    onClick={onClose}
                    id="btn-finish-return-dash"
                    className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold rounded-xl transition-colors cursor-pointer text-[11px]"
                  >
                    Return to Home
                  </button>
                </div>
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newMute = !muteTrigger;
                        handleToggleMute(newMute);
                        if (!newMute) {
                          sfx.playClick();
                        }
                      }}
                      className="p-1.5 hover:bg-brand-bg rounded-xl text-brand-purple/80 hover:text-brand-purple transition-all cursor-pointer flex items-center justify-center"
                      title={muteTrigger ? "Unmute Audio" : "Mute Audio"}
                    >
                      {muteTrigger ? (
                        <VolumeX className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                      ) : (
                        <Volume2 className="w-4.5 h-4.5 text-brand-purple/60 hover:text-brand-purple" />
                      )}
                    </button>
                    {!muteTrigger && (
                      <button
                        onClick={() => speakText(activeCard.character)}
                        id="btn-speak-character-audio"
                        className="p-1.5 hover:bg-brand-bg rounded-xl text-brand-purple hover:text-brand-purple/80 transition-colors cursor-pointer flex items-center justify-center animate-pulse"
                        title="Pronounce Word"
                      >
                        <Volume2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                    <button
                      onClick={handleSkip}
                      id="btn-quick-skip-active-card"
                      className="ml-1 px-2.5 py-1 text-[11px] font-bold text-brand-gray hover:text-brand-dark bg-brand-bg hover:bg-stone-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-brand-border"
                      title="Skip / Go to Next Card"
                    >
                      <span>Skip</span>
                      <ArrowRight className="w-3" />
                    </button>
                  </div>
                </div>

                {/* Central main learning view body */}
                <div className="flex flex-col items-center justify-center py-6 flex-1 text-center">
                  {/* Large character display */}
                  <div className="text-6xl sm:text-7xl font-sans text-brand-dark tracking-wide select-none font-black mb-2">
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
                        <span>Got it! Next word</span>
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
              {!quizSubmitted && (
                <div className="mt-3 flex items-center justify-between px-2 text-brand-gray text-xs font-medium">
                  <span className="font-mono">
                    {testMode === 'intro' && '[Space] Continue'}
                    {testMode === 'self-rate' && !isFlipped && '[Space] Reveal'}
                    {testMode === 'self-rate' && isFlipped && '[1-4] Rate'}
                    {(testMode === 'mc-pinyin' || testMode === 'mc-english') && '[1-4] Select'}
                    {testMode === 'spelling' && '[Enter] Check'}
                  </span>
                  
                  <button
                    onClick={handleSkip}
                    id="btn-skip-active-card"
                    className="hover:text-brand-dark tracking-wide font-bold flex items-center gap-1.5 cursor-pointer underline hover:no-underline"
                    title="Skip card"
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
