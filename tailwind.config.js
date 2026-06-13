/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        cellar: {
          950: '#120d0a',
          900: '#1d1510',
          800: '#2b1f18',
          700: '#3d2a20',
        },
        garnet: '#7d1f2f',
        claret: '#9b2f43',
        gold: '#d9b46c',
        linen: '#f3eadb',
        sage: '#748064',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(217, 180, 108, 0.2)',
      },
    },
  },
  plugins: [],
};
