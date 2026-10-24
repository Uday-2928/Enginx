import { Badge } from '../types';

export const INITIAL_BADGES: Badge[] = [
  {
    id: "badge-first-blood",
    name: "First Pulse",
    description: "Successfully submitted and passed your first engineering challenge.",
    icon: "Zap",
    discipline: "all",
    xp_bonus: 100,
    earned: true
  },
  {
    id: "badge-verilog-virtuoso",
    name: "Verilog Virtuoso",
    description: "Synthesized digital logic circuits in Verilog HDL.",
    icon: "Cpu",
    discipline: "ece-verilog",
    xp_bonus: 150,
    earned: false
  },
  {
    id: "badge-embedded-master",
    name: "Silicon Hacker",
    description: "Mastered bare-metal microcontroller bitwise register operations.",
    icon: "CircuitBoard",
    discipline: "ece-embedded",
    xp_bonus: 150,
    earned: false
  },
  {
    id: "badge-neural-architect",
    name: "Neural Architect",
    description: "Engineered forward pass and activation layers in AI/ML.",
    icon: "Brain",
    discipline: "ai-ml",
    xp_bonus: 150,
    earned: false
  },
  {
    id: "badge-ctf-hunter",
    name: "CTF Hunter",
    description: "Cracked cryptographic keys and extracted security flags.",
    icon: "ShieldCheck",
    discipline: "cybersecurity",
    xp_bonus: 200,
    earned: false
  },
  {
    id: "badge-kinematics-commander",
    name: "Kinematics Commander",
    description: "Solved robotic arm joint kinematics in 2D coordinate space.",
    icon: "Bot",
    discipline: "robotics",
    xp_bonus: 150,
    earned: false
  }
];
