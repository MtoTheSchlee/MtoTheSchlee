/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f14',
        surface: '#121821',
        border: '#1d2835',
        muted: '#6b7a90',
        text: '#e5ecf3',
        accent: '#4ade80',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
