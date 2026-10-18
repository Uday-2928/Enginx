import React, { useState } from 'react';
import {
  Cpu, Code, Terminal, Bot, Shield, ArrowRight,
  Sparkles, CheckCircle2
} from 'lucide-react';
import { Discipline } from '../../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: string, name: string) => void;
  currentRole: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  currentRole
}) => {
  const [selected, setSelected] = useState(currentRole);
  const [userName, setUserName] = useState('Engineer Alex');

  if (!isOpen) return null;

  const roles = [
    {
      id: 'CSE',
      title: 'Computer Science & Engineering',
      desc: 'Algorithms, Data Structures, Complexity Analysis & LeetCode style problems',
      icon: Code,
      color: '#0066FF'
    },
    {
      id: 'ECE',
      title: 'Electrical & Computer Engineering',
      desc: 'Verilog HDL synthesis, digital logic, and bare-metal embedded C firmware',
      icon: Cpu,
      color: '#2ECC71'
    },
    {
      id: 'AI',
      title: 'Artificial Intelligence & ML',
      desc: 'Neural network forward pass, loss calculations, matrix math & activations',
      icon: Bot,
      color: '#A901DB'
    },
    {
      id: 'CYBER',
      title: 'Cybersecurity & CTF',
      desc: 'XOR ciphers, reverse engineering, exploit payloads & flag extraction',
      icon: Shield,
      color: '#A901DB'
    },
    {
      id: 'ROBOTICS',
      title: 'Robotics & Control Systems',
      desc: 'Forward kinematics, 2D planar transforms, actuators & sensor simulation',
      icon: Bot,
      color: '#0066FF'
    },
    {
      id: 'HARDWARE',
      title: 'General Hardware & Gates',
      desc: 'Truth tables, logic synthesis, multiplexers, decoders & gate design',
      icon: Cpu,
      color: '#2ECC71'
    }
  ];

  const handleConfirm = () => {
    onSelectRole(selected, userName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#111827] border border-[#223147] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#161F2E] border-b border-[#223147] text-center space-y-2">
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to EnginX</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Choose Your Primary Discipline Track
          </h2>
          <p className="text-xs text-slate-400">
            Pick your starting engineering track. You can explore and solve across all tracks at any time.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* User Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Display Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B0F17] border border-[#223147] rounded-lg text-sm text-white focus:outline-none focus:border-[#0066FF]"
              placeholder="Your name or handle"
            />
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = selected === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
                    isSelected
                      ? 'bg-[#161F2E] border-[#0066FF] shadow-[0_0_15px_rgba(0,102,255,0.2)]'
                      : 'bg-[#0B0F17] border-[#223147] hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 border ${
                    isSelected ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#0066FF]' : 'bg-[#161F2E] border-[#223147] text-slate-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate">{r.title}</h4>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                      {r.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161F2E] border-t border-[#223147] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn-charge px-5 py-2 rounded-lg bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(0,102,255,0.4)] flex items-center space-x-1.5"
          >
            <span>Start Learning</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
