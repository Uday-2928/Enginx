import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // EnginX is intentionally light-first. No dark-mode utilities are needed.
  theme: {
    extend: {
      colors: {
        enginx: {
          primary: '#0D9488',   // Teal 600
          secondary: '#2DD4BF', // Teal 400
          cta: '#D97706',       // Amber 600
          canvas: '#F0FDFA',     // Teal 50
          surface: '#FFFFFF',
          ink: '#0F172A',
          muted: '#475569',
          line: '#99F6E4',
          success: '#15803D',
          danger: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 180ms ease-out both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
};

export default config;
