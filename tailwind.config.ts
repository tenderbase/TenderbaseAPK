import type { Config } from 'tailwindcss';

/** TenderBase visual system — one restrained language across web + Capacitor. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1F33', 900: '#071522', 800: '#0A1A2B', 700: '#123654', 600: '#1B4B73' },
        blue: { DEFAULT: '#2F6BFF', soft: '#EEF3FF', line: '#D7E2FF', deep: '#2457D6' },
        ink: { DEFAULT: '#142033', 2: '#536176', 3: '#8793A5', 4: '#AAB4C2' },
        line: '#E5EAF0', canvas: '#F6F8FB', surface: '#FFFFFF',
        open: { DEFAULT: '#118A63', bg: '#E8F7F1' },
        soon: { DEFAULT: '#B66A00', bg: '#FFF4E3' },
        urgent: { DEFAULT: '#C93636', bg: '#FDECEC' },
        signal: { DEFAULT: '#10A875', bg: '#E5F8F1', line: '#C1EBDD' },
        pro: { DEFAULT: '#C8A13A', soft: '#FBF5E4', line: '#E9DDAE' },
        ai: { DEFAULT: '#5966D8', bg: '#F0F1FF', line: '#DADDF7' },
      },
      borderRadius: { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px', '3xl': '28px' },
      fontSize: {
        micro: ['11px', { lineHeight: '15px' }], caption: ['12px', { lineHeight: '17px' }],
        meta: ['13px', { lineHeight: '19px' }], body: ['14px', { lineHeight: '21px' }],
        'body-lg': ['15px', { lineHeight: '23px' }], 'card-title': ['16px', { lineHeight: '21px' }],
        section: ['17px', { lineHeight: '23px' }], h2: ['23px', { lineHeight: '29px', letterSpacing: '-0.02em' }],
        h1: ['29px', { lineHeight: '35px', letterSpacing: '-0.03em' }], display: ['36px', { lineHeight: '41px', letterSpacing: '-0.045em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,31,52,.04), 0 8px 24px rgba(15,31,52,.055)',
        'card-sm': '0 1px 3px rgba(15,31,52,.055)', nav: '0 -8px 28px rgba(15,31,52,.07)',
        primary: '0 8px 20px rgba(47,107,255,.22)', 'primary-sm': '0 3px 10px rgba(47,107,255,.16)',
        sheet: '0 -12px 36px rgba(15,31,52,.14)', floating: '0 12px 32px rgba(15,31,52,.13)',
        'gold-glow': '0 5px 18px rgba(200,161,58,.24)',
      },
      fontFamily: { sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'] },
      keyframes: {
        'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'soft-scale': { '0%': { opacity: '0', transform: 'scale(.985)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-in-up': 'fade-in-up .28s ease-out both', 'soft-scale': 'soft-scale .22s ease-out both', shimmer: 'shimmer 1.4s infinite' },
    },
  },
  plugins: [],
};

export default config;
