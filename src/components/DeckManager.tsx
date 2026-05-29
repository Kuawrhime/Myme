/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Share2, Clipboard, Layers, Sparkles, BookOpen, Check, FileCheck, Info } from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { sfx } from '../utils/audio';

interface DeckManagerProps {
  customDecks: Deck[];
  onCreateDeck: (name: string, description: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onAddCardToDeck: (deckId: string, card: Omit<Flashcard, 'id'>) => void;
  onDeleteCardFromDeck: (deckId: string, cardId: string) => void;
}

export default function DeckManager({
  customDecks,
  onCreateDeck,
  onDeleteDeck,
  onAddCardToDeck,
  onDeleteCardFromDeck,
}: DeckManagerProps) {
  // Navigation states inside editor
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  
  // Card input states
  const [charVal, setCharVal] = useState('');
  const [pinyinVal, setPinyinVal] = useState('');
  const [englishVal, setEnglishVal] = useState('');
  const [exampleVal, setExampleVal] = useState('');
  const [examplePinyinVal, setExamplePinyinVal] = useState('');
  const [exampleEnglishVal, setExampleEnglishVal] = useState('');
  const [tipVal, setTipVal] = useState('');

  // UI state feedback
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [showAddDeckForm, setShowAddDeckForm] = useState(false);

  const activeDeck = customDecks.find(d => d.id === activeDeckId);

  const handleCreateDeckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    sfx.playClick();
    onCreateDeck(newDeckName, newDeckDesc);
    setNewDeckName('');
    setNewDeckDesc('');
    setShowAddDeckForm(false);
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeckId || !charVal.trim() || !pinyinVal.trim() || !englishVal.trim()) return;
    sfx.playClick();

    onAddCardToDeck(activeDeckId, {
      character: charVal.trim(),
      pinyin: pinyinVal.trim(),
      english: englishVal.trim(),
      example: exampleVal.trim() || undefined,
      examplePinyin: examplePinyinVal.trim() || undefined,
      exampleEnglish: exampleEnglishVal.trim() || undefined,
      audioHint: tipVal.trim() || undefined,
    });

    // Reset card inputs
    setCharVal('');
    setPinyinVal('');
    setEnglishVal('');
    setExampleVal('');
    setExamplePinyinVal('');
    setExampleEnglishVal('');
    setTipVal('');
  };

  // Generate Base64 import hash link and copy to clipboard
  const handleShareDeck = (deck: Deck) => {
    sfx.playClick();
    try {
      // Pack the core deck data to save space!
      const packData = {
        n: deck.name,
        d: deck.description,
        c: deck.cards.map(c => ({
          c: c.character,
          p: c.pinyin,
          e: c.english,
          ex: c.example,
          ep: c.examplePinyin,
          ee: c.exampleEnglish,
          h: c.audioHint
        }))
      };

      const jsonStr = JSON.stringify(packData);
      // Clean unicode base64 support (btoa doesn't natively handle emoji/chinese chars without encoding)
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      const len = utf8Bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const b64 = btoa(binary);
      
      const originUrl = window.location.origin + window.location.pathname;
      const shareableLink = `${originUrl}?import=${encodeURIComponent(b64)}`;

      navigator.clipboard.writeText(shareableLink);
      sfx.playSuccess();
      setCopiedDeckId(deck.id);
      setTimeout(() => setCopiedDeckId(null), 3500);
    } catch (e) {
      console.error('Failed to craft social shareable Base64 deck link.', e);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Intro banner */}
      <div className="bg-[#FFF5F5]/40 border border-brand-red/15 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm shadow-red-900/5">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-brand-red uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-brand-red animate-pulse" />
            <span>Deck Editor & Sharing Portal</span>
          </div>
          <h2 className="text-2xl font-extrabold text-brand-dark tracking-tight font-sans">
            Design Custom Flashcards
          </h2>
          <p className="text-brand-gray text-xs sm:text-sm font-medium leading-relaxed">
            Create completely personalized vocab packs (like specialized travel, business jargon, or class tests), study them in the Spaced Repetition sandbox, and click the Social Share button to send a working import link directly to friends!
          </p>
        </div>

        <button
          onClick={() => {
            sfx.playClick();
            setShowAddDeckForm(!showAddDeckForm);
            setActiveDeckId(null);
          }}
          id="btn-trigger-add-deck"
          className="px-6 py-3 bg-brand-red hover:bg-brand-red/90 text-white font-extrabold rounded-2xl shadow-lg shadow-red-200/50 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm font-sans shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Deck</span>
        </button>
      </div>

      {/* Grid with Create Forms vs Current Deck lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Management Decks Lists */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-brand-light-gray tracking-wider uppercase">
              Current Custom Courses
            </span>
            <span className="text-xs font-mono font-semibold bg-[#F0EEFF] text-brand-purple px-2 py-0.5 rounded-full">
              {customDecks.length} Decks
            </span>
          </div>

          <div className="space-y-3.5">
            {customDecks.length === 0 ? (
              <div className="py-8 px-4 bg-brand-bg text-center rounded-2xl border border-dashed border-brand-border">
                <Layers className="w-8 h-8 text-brand-light-gray mx-auto mb-2" />
                <p className="text-xs text-brand-gray">No custom lists created. Add one to start building vocabulary decks!</p>
              </div>
            ) : (
              customDecks.map(deck => (
                <div
                  key={deck.id}
                  className={`border border-b-4 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden ${
                    activeDeckId === deck.id
                      ? 'border-brand-purple border-b-brand-purple bg-[#F0EEFF]/40 shadow-sm'
                      : 'border-brand-border border-b-brand-border bg-white hover:border-brand-purple/20 hover:border-b-brand-purple/35 shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-extrabold text-brand-dark tracking-tight text-sm font-sans line-clamp-1 pr-4">
                        {deck.name}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleShareDeck(deck)}
                          id={`deck-share-btn-${deck.id}`}
                          className="p-1 hover:bg-brand-bg rounded-md text-brand-gray hover:text-brand-purple transition-colors cursor-pointer"
                          title="Share Deck Link"
                        >
                          {copiedDeckId === deck.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            sfx.playClick();
                            onDeleteDeck(deck.id);
                            if (activeDeckId === deck.id) setActiveDeckId(null);
                          }}
                          id={`deck-delete-btn-${deck.id}`}
                          className="p-1 hover:bg-red-50 rounded-md text-brand-light-gray hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Deck"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-brand-gray font-medium line-clamp-1">
                      {deck.description || 'No description supplied.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-brand-border">
                    <span className="text-brand-light-gray">
                      {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
                    </span>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setActiveDeckId(deck.id);
                        setShowAddDeckForm(false);
                      }}
                      id={`deck-edit-btn-${deck.id}`}
                      className="text-xs font-bold text-brand-purple hover:text-brand-purple/80 cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Manage Cards</span>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Copped toast badge */}
                  {copiedDeckId === deck.id && (
                    <div className="absolute inset-0 bg-brand-dark/95 flex flex-col items-center justify-center p-3 text-center text-white select-none animate-fadeIn">
                      <FileCheck className="w-6 h-6 text-emerald-400 mb-1" />
                      <div className="text-[11px] font-bold font-sans">Shareable Link Copied!</div>
                      <div className="text-[9px] text-brand-light-gray mt-0.5 leading-snug">
                        UTF-8 packed URL copied. Paste to friends to instantly share this deck!
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Interaction Workspaces (Create Deck form OR Card Editor) */}
        <div className="lg:col-span-8">
          
          {/* Work View 1: New Deck Creation form */}
          {showAddDeckForm && (
            <div className="bg-white border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fadeIn">
              <div>
                <h3 className="text-lg font-extrabold text-brand-dark tracking-tight font-sans">
                  Create a New Vocabulary Course
                </h3>
                <p className="text-xs text-brand-gray">Specify details to begin adding custom Chinese study cards.</p>
              </div>

              <form onSubmit={handleCreateDeckSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-brand-gray uppercase">Deck Name *</label>
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={e => setNewDeckName(e.target.value)}
                    placeholder="e.g., Slang Vocabulary"
                    maxLength={40}
                    className="w-full py-2.5 px-4 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-xl text-sm outline-none transition-all placeholder:text-brand-light-gray"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-brand-gray uppercase">Deck Description</label>
                  <textarea
                    value={newDeckDesc}
                    onChange={e => setNewDeckDesc(e.target.value)}
                    placeholder="e.g., Common colloquial terms and internet slang used by Gen-Z..."
                    maxLength={140}
                    rows={3}
                    className="w-full py-2.5 px-4 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-xl text-sm outline-none transition-all placeholder:text-brand-light-gray resize-none"
                  />
                </div>

                <div className="flex gap-2.5 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDeckForm(false)}
                    className="px-5 py-2.5 border border-brand-border hover:bg-brand-bg text-brand-gray rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-created-deck"
                    className="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Work View 2: Cards Adding and listing area inside selected deck */}
          {activeDeck && (
            <div className="space-y-6 animate-fadeIn">
              {/* Active Deck Header Description */}
              <div className="bg-white border border-brand-border rounded-2xl p-4 flex items-center justify-between gap-4 border-b-4 border-b-brand-border">
                <div>
                  <h3 className="text-lg font-extrabold text-brand-dark tracking-tight font-sans">
                    {activeDeck.name}
                  </h3>
                  <p className="text-xs text-brand-gray mt-0.5">
                    {activeDeck.description || 'Custom created module.'}
                  </p>
                </div>
                <div className="shrink-0 bg-[#FFF5F5] border border-brand-red/10 rounded-xl px-3 py-1.5 text-center shadow-xs text-brand-red">
                  <div className="font-mono text-base font-extrabold leading-none">
                    {activeDeck.cards.length}
                  </div>
                  <span className="text-[9px] uppercase font-mono font-semibold tracking-wide">
                    Cards
                  </span>
                </div>
              </div>

              {/* Form to submit card */}
              <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-6 shadow-xs">
                <div>
                  <h4 className="text-sm font-black text-brand-dark uppercase tracking-wide font-sans flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-brand-purple" />
                    <span>Add Flashcard to {activeDeck.name}</span>
                  </h4>
                  <p className="text-[11px] text-brand-gray mt-0.5">Generate customized prompt questions.</p>
                </div>

                <form onSubmit={handleAddCardSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Chinese Characters info */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-brand-gray uppercase">Chinese Characters *</label>
                      <input
                        type="text"
                        value={charVal}
                        onChange={e => setCharVal(e.target.value)}
                        placeholder="e.g., 朋友"
                        className="w-full py-2 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-xl text-xs outline-none transition-all"
                        required
                      />
                    </div>

                    {/* Standard Pin-Yin */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-brand-gray uppercase">Pinyin *</label>
                      <input
                        type="text"
                        value={pinyinVal}
                        onChange={e => setPinyinVal(e.target.value)}
                        placeholder="e.g., péngyǒu"
                        className="w-full py-2 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-xl text-xs outline-none transition-all"
                        required
                      />
                    </div>

                    {/* English translations */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-brand-gray uppercase">English Translation *</label>
                      <input
                        type="text"
                        value={englishVal}
                        onChange={e => setEnglishVal(e.target.value)}
                        placeholder="e.g., Friend, pal"
                        className="w-full py-2 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-xl text-xs outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Context sentence section (collapsed optional drawer helper) */}
                  <div className="bg-brand-bg border border-brand-border p-4 rounded-2xl space-y-3.5">
                    <span className="text-[10px] font-mono font-extrabold text-brand-gray uppercase tracking-widest flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-brand-purple" />
                      <span>Context Learning (Optional but Highly Recommended)</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-gray uppercase">Example Sentence</label>
                        <input
                          type="text"
                          value={exampleVal}
                          onChange={e => setExampleVal(e.target.value)}
                          placeholder="他是我的好朋友。"
                          className="w-full py-1.5 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-lg text-xs outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-gray uppercase font-medium">Example Pinyin</label>
                        <input
                          type="text"
                          value={examplePinyinVal}
                          onChange={e => setExamplePinyinVal(e.target.value)}
                          placeholder="Tā shì wǒ de hǎo péngyǒu."
                          className="w-full py-1.5 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-lg text-xs outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-gray uppercase">Example English</label>
                        <input
                          type="text"
                          value={exampleEnglishVal}
                          onChange={e => setExampleEnglishVal(e.target.value)}
                          placeholder="He is my good friend."
                          className="w-full py-1.5 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-lg text-xs outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-brand-gray uppercase">Tone Tips / Pronunciation Guide</label>
                      <input
                        type="text"
                        value={tipVal}
                        onChange={e => setTipVal(e.target.value)}
                        placeholder="e.g., Pung - rising scale; Yo - neutral quick tail"
                        className="w-full py-1.5 px-3 border border-brand-border bg-white focus:border-brand-purple focus:ring-2 focus:ring-indigo-50 rounded-lg text-xs outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      id="btn-add-card-to-active"
                      className="px-6 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Card</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Cards table list */}
              <div className="bg-white border border-brand-border rounded-3xl p-6 shadow-sm">
                <span className="text-xs font-mono font-bold text-brand-light-gray tracking-wider uppercase block mb-4">
                  Cards listed inside this course
                </span>

                {activeDeck.cards.length === 0 ? (
                  <div className="py-12 bg-brand-bg border border-brand-border rounded-2xl text-center">
                    <BookOpen className="w-8 h-8 text-brand-light-gray mx-auto mb-2" />
                    <p className="text-xs text-brand-gray">This deck is currently empty. Add your first flashcard above!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-brand-border border border-brand-border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    {activeDeck.cards.map((card, idx) => (
                      <div key={card.id} className="flex items-center justify-between p-4 bg-white hover:bg-brand-bg/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono font-bold text-brand-light-gray pr-2 border-r border-brand-border">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold text-brand-dark font-sans tracking-wide">
                                {card.character}
                              </span>
                              <span className="text-xs font-mono text-emerald-600 font-bold">
                                {card.pinyin}
                              </span>
                            </div>
                            <span className="text-xs text-brand-gray font-sans font-medium line-clamp-1 block mt-0.5">
                              {card.english}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            sfx.playClick();
                            onDeleteCardFromDeck(activeDeck.id, card.id);
                          }}
                          id={`card-delete-btn-${card.id}`}
                          className="p-1.5 hover:bg-red-50 text-brand-light-gray hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Placeholder when nothing is being edited */}
          {!activeDeck && !showAddDeckForm && (
            <div className="bg-white border-2 border-dashed border-brand-border rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <Layers className="w-12 h-12 text-brand-light-gray animate-pulse" />
              <div>
                <h3 className="text-base font-black text-brand-dark font-sans">
                  No Active Deck Selected
                </h3>
                <p className="text-xs text-brand-gray mt-1 max-w-sm mx-auto leading-relaxed">
                  Select an existing deck from the left dashboard list to manage its flashcard items, or click the top banner button to create a brand new study pack directory!
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
