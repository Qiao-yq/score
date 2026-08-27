/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0a0a0f',
        deep: '#120c24',
        cyan: '#00f3ff',
        pink: '#ff00aa',
        yellow: '#fcee0a',
        hi: '#f5f7ff',
        base: '#c6cbe8',
        dim: '#6d7399',
        success: '#00ff9f',
        danger: '#ff2d55',
      },
      fontFamily: {
        display: ['Orbitron', 'Rajdhani', 'monospace'],
        body: ['Rajdhani', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 8px rgba(0,243,255,.6), 0 0 24px rgba(0,243,255,.25)',
        'glow-pink': '0 0 8px rgba(255,0,170,.6), 0 0 24px rgba(255,0,170,.25)',
        'glow-yellow': '0 0 8px rgba(252,238,10,.6), 0 0 24px rgba(252,238,10,.25)',
      },
    },
  },
  plugins: [],
};
