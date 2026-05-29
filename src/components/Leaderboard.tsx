/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Award, Flame, User, Trophy, ShieldAlert, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  userXp: number;
  userStreak: number;
}

const DEFAULT_COMPETITORS: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  { id: 'comp-1', username: 'Chloe_Chinese 🇨🇦', xp: 480, streak: 12, avatarColor: 'bg-emerald-500' },
  { id: 'comp-2', username: 'Yuki_Yong 🇯🇵', xp: 350, streak: 8, avatarColor: 'bg-indigo-500' },
  { id: 'comp-3', username: 'Aiden_Luvs_Hanyu 🇬🇧', xp: 220, streak: 5, avatarColor: 'bg-amber-500' },
  { id: 'comp-4', username: 'MeiLing_Master 🇹🇼', xp: 620, streak: 18, avatarColor: 'bg-rose-500' },
  { id: 'comp-5', username: 'Gerardo_DE 🇩🇪', xp: 140, streak: 3, avatarColor: 'bg-teal-500' },
  { id: 'comp-6', username: 'Sarah_Nihao 🇺🇸', xp: 90, streak: 2, avatarColor: 'bg-cyan-500' }
];

export default function Leaderboard({
  userXp,
  userStreak,
}: LeaderboardProps) {
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  // Construct combined leaderboard
  useEffect(() => {
    // 1. Load active list from localStorage or load default competitors
    const cached = localStorage.getItem('srs_chinese_leaderboard');
    let competitors = DEFAULT_COMPETITORS;
    if (cached) {
      try {
        competitors = JSON.parse(cached);
      } catch (e) {
        console.warn(e);
      }
    }

    // 2. Synthesize user progress entry
    const userEntry: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'> = {
      id: 'current-user-id',
      username: 'You (Learning Hero) 🌟',
      xp: userXp,
      streak: userStreak,
      avatarColor: 'bg-indigo-600'
    };

    const combinedList = [...competitors.filter(c => c.id !== 'current-user-id'), userEntry];

    // 3. Sort by XP decsending
    combinedList.sort((a, b) => b.xp - a.xp);

    // 4. Map ranks
    const rankedList: LeaderboardEntry[] = combinedList.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      isCurrentUser: entry.id === 'current-user-id'
    }));

    setBoard(rankedList);

    // Save competitor updates back so the user can see progress persist
    const saveCompetitorsOnly = combinedList.filter(c => c.id !== 'current-user-id');
    localStorage.setItem('srs_chinese_leaderboard', JSON.stringify(saveCompetitorsOnly));

  }, [userXp, userStreak]);

  // Periodic passive updates of other competitors (they gain a small amount of XP over time!)
  // This simulates active users on the app and keeps the user highly motivated to play!
  useEffect(() => {
    const handlePassiveCompetition = setInterval(() => {
      const cached = localStorage.getItem('srs_chinese_leaderboard');
      let competitors = DEFAULT_COMPETITORS;
      if (cached) {
        try {
          competitors = JSON.parse(cached);
        } catch (e) {
          competitors = DEFAULT_COMPETITORS;
        }
      }

      // Roll chance for a random competitor to get some points
      const updated = competitors.map(comp => {
        const roll = Math.random();
        if (roll > 0.70) { // 30% chance each period
          const bonusXp = Math.floor(Math.random() * 20) + 5;
          const streakRoll = Math.random() > 0.9;
          return {
            ...comp,
            xp: comp.xp + bonusXp,
            streak: streakRoll ? comp.streak + 1 : comp.streak
          };
        }
        return comp;
      });

      localStorage.setItem('srs_chinese_leaderboard', JSON.stringify(updated));
      
      // Force trigger state rebuild by re-triggering user variables
      setBoard(prev => {
        const userE = prev.find(p => p.isCurrentUser);
        if (!userE) return prev;
        const combined = [...updated, { id: 'current-user-id', username: userE.username, xp: userE.xp, streak: userE.streak, avatarColor: userE.avatarColor }];
        combined.sort((a, b) => b.xp - a.xp);
        return combined.map((entry, idx) => ({
          ...entry,
          rank: idx + 1,
          isCurrentUser: entry.id === 'current-user-id'
        }));
      });

    }, 35000); // Check every 35 seconds

    return () => clearInterval(handlePassiveCompetition);
  }, []);

  const currentUser = board.find(x => x.isCurrentUser);
  const userRank = currentUser?.rank || 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dynamic motivate banner */}
      <div className="bg-brand-dark text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-lg">
        
        {/* Abstract vector backgrounds */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-radial-gradient from-brand-purple pointer-events-none" />

        <div className="space-y-2.5 max-w-lg z-10">
          <span className="text-[10px] bg-brand-red text-white font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            🏆 Interactive Leaderboard
          </span>
          <h2 className="text-2xl font-black tracking-tight font-sans">
            Chinese Language Arena
          </h2>
          <p className="text-brand-light-gray text-xs sm:text-xs">
            Standings are calculated in real-time. Other players around the globe are reviewing their custom and standard HSK decks too—study daily to protect your rank!
          </p>
        </div>

        {/* Current Standing badge summary */}
        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 sm:px-6 flex items-center gap-4 shrink-0 z-10">
          <div className="p-2.5 bg-yellow-500/20 text-yellow-400 rounded-xl">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-brand-light-gray uppercase leading-none font-bold">Your Standing</div>
            <div className="text-xl font-black mt-1 font-sans text-brand-red">
              Rank #{userRank || '...'}
            </div>
          </div>
        </div>
      </div>

      {/* Podium Cards for the Top 3 Learners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {board.slice(0, 3).map((player, idx) => {
          const medalColors = [
            'bg-[#FFFDF5] border-[#F6E05E] text-[#B7791F] shadow-yellow-100',
            'bg-[#F8FAFC] border-slate-200 text-slate-700 shadow-slate-100',
            'bg-[#FFF5F5] border-red-200 text-brand-red shadow-red-50'
          ];
          const medalNames = ['Gold Medal', 'Silver Medal', 'Bronze Medal'];
          
          return (
            <div
              key={player.id}
              className={`${medalColors[idx]} border-2 rounded-2xl p-5 text-center flex flex-col items-center justify-between space-y-3 relative overflow-hidden shadow-sm`}
            >
              <div className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center bg-white rounded-full font-black text-xs shadow-xs border border-brand-border text-brand-dark">
                {player.rank}
              </div>

              <div className="space-y-2 pt-2">
                <div className={`w-12 h-12 rounded-full ${player.avatarColor} mx-auto flex items-center justify-center text-white font-extrabold text-sm border-2 border-white`}>
                  {player.username[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-brand-dark tracking-tight text-sm truncate font-sans max-w-[140px] mx-auto">
                    {player.isCurrentUser ? 'You 🌟' : player.username}
                  </h4>
                  <p className="text-[10px] font-mono font-semibold tracking-wide uppercase opacity-75">
                    {medalNames[idx]}
                  </p>
                </div>
              </div>

              <div className="bg-white/90 border border-brand-border px-4 py-1.5 rounded-full flex gap-3 text-xs font-mono font-semibold shadow-xs">
                <span className="text-brand-dark">🔥 {player.streak}d</span>
                <span className="text-brand-border">|</span>
                <span className="text-brand-purple font-extrabold">{player.xp} XP</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main standings table */}
      <div className="bg-white border border-brand-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-brand-border bg-brand-bg/50">
          <h3 className="text-sm font-black text-brand-dark font-sans uppercase tracking-wide">
            Detailed Standings List
          </h3>
        </div>

        <div className="divide-y divide-brand-border">
          {board.map(player => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 px-5 transition-colors ${
                player.isCurrentUser ? 'bg-[#FFF5F5]/60 hover:bg-[#FFF5F5]/80' : 'bg-white hover:bg-brand-bg/50'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Position placement index indicator */}
                <div className="font-mono text-center w-7 text-xs font-black text-brand-light-gray">
                  {player.rank}
                </div>

                {/* Avatar circle */}
                <div className={`w-8 h-8 rounded-full ${player.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {player.username[0].toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-sans tracking-tight ${player.isCurrentUser ? 'text-brand-red' : 'text-brand-dark'}`}>
                      {player.isCurrentUser ? 'You (Learning Hero)' : player.username}
                    </span>
                    {player.isCurrentUser && (
                      <span className="text-[9px] bg-brand-red text-white font-mono font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-brand-gray font-medium">Mandarin Learner</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Active streak */}
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-brand-gray">
                  <Flame className="w-3.5 h-3.5 text-brand-red fill-current" />
                  <span>{player.streak}d</span>
                </div>

                {/* Total points */}
                <div className="font-mono font-extrabold text-sm text-brand-dark w-20 text-right">
                  {player.xp} <span className="text-[10px] text-brand-gray">XP</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
