/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fdf9ec',
          100: '#f9f0ce',
          200: '#f2de99',
          300: '#e8c55d',
          400: '#dfc06a',  /* main gold light */
          500: '#c9a84c',  /* main gold */
          600: '#a8893a',  /* dark gold */
          700: '#866d2d',
          800: '#6b5524',
          900: '#59461e',
          950: '#32270e',
        },
        surface: {
          DEFAULT: '#060e1c',
          50:  '#f0f4fb',
          100: '#dce6f5',
          200: '#b8ceeb',
          300: '#8aadd9',
          400: '#5a89c2',
          500: '#3a6aaa',
          600: '#2a528e',
          700: '#1e3d6e',
          800: '#162b52',  /* surface-3 */
          900: '#0a1628',  /* surface */
          950: '#060e1c',  /* bg */
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
