/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Dark infrastructure console palette
        canvas: {
          DEFAULT: '#080c14',
          50: '#0d1220',
          100: '#111827',
          200: '#1a2236',
        },
        surface: {
          DEFAULT: '#111827',
          50: '#161e2e',
          100: '#1e2a3f',
          200: '#243050',
        },
        border: {
          DEFAULT: '#1e2a3f',
          strong: '#2d3f5c',
          subtle: '#162030',
        },
        text: {
          primary: '#e4eaf4',
          secondary: '#8898b3',
          muted: '#4a6080',
        },
        // State colors
        locked: {
          DEFAULT: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.08)',
          border: 'rgba(245, 158, 11, 0.2)',
        },
        certified: {
          DEFAULT: '#10b981',
          bg: 'rgba(16, 185, 129, 0.08)',
          border: 'rgba(16, 185, 129, 0.2)',
        },
        trial: {
          DEFAULT: '#6366f1',
          bg: 'rgba(99, 102, 241, 0.08)',
          border: 'rgba(99, 102, 241, 0.2)',
        },
        blocked: {
          DEFAULT: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.08)',
          border: 'rgba(239, 68, 68, 0.2)',
        },
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#10b981',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'blink': 'blink 1.2s step-end infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateY(-4px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [],
};
