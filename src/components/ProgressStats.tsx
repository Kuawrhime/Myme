/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, CheckCircle2, BookOpen, Clock, Heart, Zap, Sparkles, Sliders } from 'lucide-react';
import { UserProgress, SRSProgress, Deck } from '../types';

interface ProgressStatsProps {
  userProgress: UserProgress;
  decks: Deck[];
}

export default function ProgressStats({
  userProgress,
  decks,
}: ProgressStatsProps) {
  const now = Date.now();

  // 1. Calculate general counts
  const totalCardsInExistence = decks.reduce((acc, deck) => acc + deck.cards.length, 0);
  const studiedRecords = Object.values(userProgress.srs);
  const totalStudied = studiedRecords.length;
  
  // SRS status mapping
  const srsStateCounts = {
    new: totalCardsInExistence - totalStudied,
    learning: studiedRecords.filter((r: SRSProgress) => r.state === 'learning').length,
    review: studiedRecords.filter((r: SRSProgress) => r.state === 'review').length,
    mastered: studiedRecords.filter((r: SRSProgress) => r.state === 'mastered').length,
  };

  // 2. Draft calendar tracker for last 7 days
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];
    const xp = userProgress.history[dateStr] || 0;
    return {
      dateStr,
      dayName,
      dayNum: d.getDate(),
      xp,
      completed: xp > 0,
    };
  });

  // Calculate highest xp in the last week for graph normalization
  const maxWeeklyXp = Math.max(...last7Days.map(d => d.xp), 40); // clamp min 40 for aesthetics

  // 3. Spaced repetition time calculations:
  // How many cards are due in next 1 hour, next 24 hours, or already due?
  const alreadyDue = studiedRecords.filter((r: SRSProgress) => now >= r.nextReviewTime).length;
  const dueWithinOneHour = studiedRecords.filter((r: SRSProgress) => {
    const diff = r.nextReviewTime - now;
    return diff > 0 && diff <= 60 * 60 * 1000;
  }).length;
  const dueWithinOneDay = studiedRecords.filter((r: SRSProgress) => {
    const diff = r.nextReviewTime - now;
    return diff > 60 * 60 * 1000 && diff <= 24 * 60 * 60 * 1050;
  }).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Upper Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Memory Health card summary */}
        <div className="bg-white border-2 border-brand-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-brand-light-gray uppercase tracking-wider block">
              Knowledge Retention
            </span>
            <h3 className="text-xl font-black text-brand-dark tracking-tight font-sans">
              Memory Mastery
            </h3>
            <p className="text-xs text-brand-gray font-medium leading-relaxed pt-1">
              Based on spaced repetition calculations, these cards are logged as thoroughly memorized.
            </p>
          </div>

          <div className="py-6 flex items-baseline justify-center gap-1.5 border-t border-b border-brand-border my-4 bg-brand-bg rounded-2xl">
            <span className="text-4xl font-black text-brand-dark font-sans tracking-tight animate-pulse">
              {srsStateCounts.mastered}
            </span>
            <span className="text-xs font-bold text-brand-light-gray">
              / {totalCardsInExistence} cards
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-brand-dark">
            <span>Overall Retention Rate:</span>
            <span className="font-mono text-brand-purple font-extrabold text-sm">
              {totalCardsInExistence > 0 ? Math.round((srsStateCounts.mastered / totalCardsInExistence) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Weekly Streaks checkboxes calendar */}
        <div className="bg-white border-2 border-brand-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-brand-light-gray uppercase tracking-wider block">
              Daily Consistency check
            </span>
            <h3 className="text-xl font-black text-brand-dark tracking-tight font-sans">
              Weekly Routine
            </h3>
            <p className="text-xs text-brand-gray font-medium leading-relaxed pt-1">
              Secure a streak by earning XP daily. Reminders encourage 10 minutes of study.
            </p>
          </div>

          {/* 7 Days calendar grid cards */}
          <div className="grid grid-cols-7 gap-2.5 my-5">
            {last7Days.map(day => (
              <div
                key={day.dateStr}
                className={`py-3.5 rounded-xl border-2 text-center flex flex-col items-center justify-between transition-colors ${
                  day.completed
                    ? 'bg-[#FFF5F5] border-brand-red text-brand-red shadow-sm animate-pulse'
                    : 'bg-brand-bg border-brand-border text-brand-light-gray'
                }`}
              >
                <span className="text-[9px] font-mono font-bold uppercase tracking-wide">
                  {day.dayName.substring(0, 2)}
                </span>
                <span className={`text-xs font-bold font-mono mt-1 ${day.completed ? 'text-brand-red' : 'text-brand-gray'}`}>
                  {day.dayNum}
                </span>

                {/* Filled or empty circle status */}
                <div className={`w-1.5 h-1.5 rounded-full mt-2.5 ${day.completed ? 'bg-brand-red' : 'bg-brand-border'}`} />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-brand-gray pt-2 border-t border-brand-border">
            <span>Study Goal Complete:</span>
            <span className="font-bold text-brand-purple">
              {last7Days.filter(x => x.completed).length} / 7 days
            </span>
          </div>
        </div>

        {/* Dynamic Study Forecast timers */}
        <div className="bg-white border-2 border-brand-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-brand-light-gray uppercase tracking-wider block">
              SRS Scheduling forecast
            </span>
            <h3 className="text-xl font-black text-brand-dark tracking-tight font-sans">
              SRS Review Queues
            </h3>
            <p className="text-xs text-brand-gray font-medium leading-relaxed pt-1">
              Spaced repetition cycles queue words the moment memory starts decaying. Keep reviews empty!
            </p>
          </div>

          <div className="space-y-3.5 my-5">
            {/* Row 1: Overdue cards */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-gray flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-red" />
                Due for Review now
              </span>
              <span className="font-mono bg-[#FFF5F5] text-brand-red font-bold px-2 py-0.5 rounded-lg border border-brand-red/10">
                {alreadyDue} cards
              </span>
            </div>
            
            {/* Row 2: Due in next hour */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-gray flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-purple" />
                Due within 1 hour
              </span>
              <span className="font-mono bg-[#F0EEFF] text-brand-purple font-bold px-2 py-0.5 rounded-lg border border-brand-purple/10">
                {dueWithinOneHour} cards
              </span>
            </div>

            {/* Row 3: Due tomorrow */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-gray flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-light-gray" />
                Due in next 24 Hours
              </span>
              <span className="font-mono bg-brand-bg text-brand-gray font-bold px-2 py-0.5 rounded-lg border border-brand-border">
                {dueWithinOneDay} cards
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-brand-gray pt-2 border-t border-brand-border">
            <span>Total Logged Cards:</span>
            <span className="font-extrabold text-brand-dark">{studiedRecords.length} configured</span>
          </div>
        </div>

      </div>

      {/* Graphical Weekly Trend (High compatibility SVG rendering) */}
      <div className="bg-white border-2 border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h3 className="text-base font-black text-brand-dark tracking-tight font-sans">
            Weekly XP Output
          </h3>
          <p className="text-xs text-brand-gray mt-0.5">Your study activity metrics over the past seven days.</p>
        </div>

        {/* Custom robust SVG Bar Chart */}
        <div className="border border-brand-border rounded-2xl p-4 sm:p-6 bg-brand-bg">
          <div className="h-44 w-full flex items-end justify-between gap-4 select-none">
            {last7Days.map(day => {
              // Calculate percentage height
              const heightPct = Math.round((day.xp / maxWeeklyXp) * 100);
              
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center group space-y-2 h-full justify-end relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-brand-dark text-white text-[9px] font-bold px-2 py-1 rounded-md mb-2 bottom-full absolute z-10 font-mono shadow-md text-center pointer-events-none">
                    {day.xp} XP
                  </div>

                  {/* Graph Bar */}
                  <div className="w-full relative h-[140px] flex items-end justify-center">
                    <div
                      style={{ height: `${Math.max(heightPct, 3)}%` }} // minimum height of 3% for viz
                      className={`w-full rounded-t-lg transition-all duration-500 hover:scale-x-105 hover:brightness-105 ${
                        day.completed
                          ? 'bg-gradient-to-t from-brand-purple to-brand-red shadow-sm'
                          : 'bg-brand-border'
                      }`}
                    />
                  </div>

                  {/* Custom labeling ticks */}
                  <div className="text-center font-sans">
                    <div className="text-xs font-extrabold text-brand-dark leading-none">{day.dayName}</div>
                    <div className="text-[10px] text-brand-gray leading-none font-mono mt-1">{day.dayNum}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leitner Box Spaced Repetition breakdown */}
      <div className="bg-white border-2 border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h3 className="text-base font-black text-brand-dark tracking-tight font-sans">
            Spaced Repetition Stages (SM-2 Buckets)
          </h3>
          <p className="text-xs text-brand-gray mt-0.5">Where your vocabulary lives in the Leitner-SM2 interval cycle.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          
          {/* Phase 1: Unseen */}
          <div className="bg-brand-bg border border-brand-border rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold text-brand-gray uppercase">1. Unseen Pool</span>
            <div className="text-2xl font-black text-brand-dark font-mono mt-2">{srsStateCounts.new}</div>
            <p className="text-[10px] text-brand-gray font-medium leading-relaxed mt-1">Cards you haven't studied yet.</p>
          </div>

          {/* Phase 2: Learning */}
          <div className="bg-[#FFF5F5] border border-brand-red/20 rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold text-brand-red uppercase">2. Learning</span>
            <div className="text-2xl font-black text-brand-red font-mono mt-2">{srsStateCounts.learning}</div>
            <p className="text-[10px] text-brand-red/90 font-medium leading-relaxed mt-1">Newly introduced card drills.</p>
          </div>

          {/* Phase 3: Review */}
          <div className="bg-[#F0EEFF] border border-brand-purple/20 rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold text-brand-purple uppercase">3. Review (Fluid)</span>
            <div className="text-2xl font-black text-brand-purple font-mono mt-2">{srsStateCounts.review}</div>
            <p className="text-[10px] text-brand-purple/90 font-medium leading-relaxed mt-1">Interval cycles extending (Hard/Good).</p>
          </div>

          {/* Phase 4: Mastered */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase">4. Mastered</span>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-2">{srsStateCounts.mastered}</div>
            <p className="text-[10px] text-emerald-600/90 font-medium leading-relaxed mt-1">Sufficient ease coefficients logged.</p>
          </div>

        </div>
      </div>

    </div>
  );
}
