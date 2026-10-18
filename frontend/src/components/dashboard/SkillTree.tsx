import React, { useState } from 'react';
import {
  CheckCircle2, Lock, Zap, ArrowRight, Sparkles,
  Cpu, Code, Terminal, Bot, Shield, ChevronRight
} from 'lucide-react';
import { Challenge, Discipline } from '../../types';

interface SkillTreeProps {
  challenges: Challenge[];
  completedIds: string[];
  onSelectChallenge: (c: Challenge) => void;
  selectedDiscipline: Discipline;
  setSelectedDiscipline: (d: Discipline) => void;
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  challenges,
  completedIds,
  onSelectChallenge,
  selectedDiscipline,
  setSelectedDiscipline
}) => {
  const disciplineTracks = [
    { id: 'cse', name: 'Computer Science (Algorithms)', icon: Code, desc: 'Arrays, Hash Maps, Binary Search & Complexity' },
    { id: 'ece-verilog', name: 'ECE (Verilog HDL)', icon: Cpu, desc: 'Digital Logic, Adders, Flip-Flops & FSMs' },
    { id: 'ece-embedded', name: 'Embedded C (Microcontrollers)', icon: Terminal, desc: 'Register manipulation, GPIO, Timer Interrupts' },
    { id: 'ai-ml', name: 'AI & Machine Learning', icon: Bot, desc: 'Perceptrons, Backpropagation, Activations & Tensors' },
    { id: 'cybersecurity', name: 'Cybersecurity & CTF', icon: Shield, desc: 'Cryptography, Exploits, XOR Cracking & Forensics' },
    { id: 'robotics', name: 'Robotics & Control', icon: Bot, desc: 'Forward Kinematics, PID Controllers & Coordinate Transforms' },
    { id: 'hardware', name: 'Hardware & Logic Gates', icon: Cpu, desc: 'Multiplexers, Decoders, Circuit Simulation' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Skill Tree Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/30 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive Engineering Graph</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Mastery <span className="text-[#0066FF]">Skill Trees</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Complete sequential challenges across hardware and software tracks to unlock advanced nodes, earn circuit badges, and level up your engineering XP.
        </p>
      </div>

      {/* Tracks Container */}
      <div className="space-y-6">
        {disciplineTracks.map((track) => {
          const trackChallenges = challenges.filter(c => c.discipline === track.id);
          if (trackChallenges.length === 0) return null;

          const completedCount = trackChallenges.filter(c => completedIds.includes(c.id)).length;
          const progressPercent = Math.round((completedCount / trackChallenges.length) * 100);
          const Icon = track.icon;

          return (
            <div
              key={track.id}
              className="p-6 rounded-2xl bg-[#111827] border border-[#223147] shadow-xl space-y-6"
            >
              {/* Track Title & Signal Progress Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#161F2E] border border-[#0066FF]/40 flex items-center justify-center text-[#0066FF]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>{track.name}</span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {completedCount}/{trackChallenges.length} Done
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{track.desc}</p>
                  </div>
                </div>

                {/* Waveform Signal Progress bar motif */}
                <div className="flex items-center space-x-3 sm:w-64">
                  <div className="flex-1 h-2 rounded-full bg-[#161F2E] overflow-hidden border border-[#223147]">
                    <div
                      className="h-full bg-gradient-to-r from-[#0066FF] to-[#2ECC71] transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 w-10 text-right">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Node Sequence Diagram (Breadboard Circuit Motif) */}
              <div className="relative flex items-center gap-4 sm:gap-8 overflow-x-auto py-4 px-2">
                {trackChallenges.map((ch, idx) => {
                  const isDone = completedIds.includes(ch.id);
                  const isUnlocked = idx === 0 || completedIds.includes(trackChallenges[idx - 1].id);

                  return (
                    <React.Fragment key={ch.id}>
                      {/* Node Card */}
                      <div
                        onClick={() => onSelectChallenge(ch)}
                        className={`relative shrink-0 w-64 p-4 rounded-xl border transition-all cursor-pointer group ${
                          isDone
                            ? 'bg-[#161F2E] border-[#2ECC71]/50 shadow-[0_0_15px_rgba(46,204,113,0.15)] hover:border-[#2ECC71]'
                            : isUnlocked
                            ? 'bg-[#161F2E] border-[#0066FF]/50 shadow-[0_0_15px_rgba(0,102,255,0.15)] hover:border-[#0066FF]'
                            : 'bg-[#0B0F17] border-[#223147] opacity-60 hover:opacity-80'
                        }`}
                      >
                        {/* Node Pin indicator */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                            <span className="text-[10px] font-mono uppercase text-slate-400">
                              Node {idx + 1}
                            </span>
                          </div>

                          {isDone ? (
                            <span className="flex items-center space-x-1 text-[10px] font-bold text-[#2ECC71]">
                              <CheckCircle2 className="w-3.5 h-3.5 fill-[#2ECC71]/20" />
                              <span>Solved</span>
                            </span>
                          ) : isUnlocked ? (
                            <span className="flex items-center space-x-1 text-[10px] font-bold text-[#0066FF] animate-pulse">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-[10px] text-slate-500">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white group-hover:text-[#0066FF] transition-colors truncate">
                          {ch.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          {ch.topic}
                        </p>

                        <div className="mt-3 pt-2 border-t border-[#223147] flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400 uppercase text-[10px]">
                            {ch.language}
                          </span>
                          <span className="text-[#0066FF] font-semibold flex items-center space-x-0.5">
                            <Zap className="w-3 h-3" />
                            <span>+{ch.xp_reward} XP</span>
                          </span>
                        </div>
                      </div>

                      {/* Signal Trace Connector Link */}
                      {idx < trackChallenges.length - 1 && (
                        <div className="shrink-0 flex items-center justify-center">
                          <div className={`h-0.5 w-6 sm:w-10 rounded ${
                            isDone ? 'bg-[#2ECC71] shadow-[0_0_8px_rgba(46,204,113,0.5)]' : 'bg-[#223147]'
                          }`} />
                          <ChevronRight className={`w-4 h-4 -ml-1 ${
                            isDone ? 'text-[#2ECC71]' : 'text-[#223147]'
                          }`} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
