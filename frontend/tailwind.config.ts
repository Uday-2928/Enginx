import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        enginx: {
          blue: '#0066FF',      // Electric Blue (Primary)
          green: '#2ECC71',     // Circuit Green (Secondary)
          purple: '#A901DB',    // Neon Purple (Accent AI/Cyber)
          charcoal: '#2C3E50',  // Deep Charcoal (Neutral)
          dark: '#0B0F17',      // Circuit Board Dark
          surface: '#111827',   // Surface
          card: '#161F2E',      // Card Container
          border: '#223147',    // Circuit Line Border
          lightbg: '#F8FAFC',
          lightcard: '#FFFFFF',
          lightborder: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'trace-draw': 'traceDraw 3s ease-in-out infinite',
        'signal-wave': 'signalWave 1.5s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgba(0, 102, 255, 0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 4px rgba(0, 102, 255, 0.2))' },
        },
        traceDraw: {
          '0%': { strokeDashoffset: '100' },
          '50%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '100' },
        },
        signalWave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1.0)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
