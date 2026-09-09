import type { Config } from 'tailwindcss';

/**
 * TenderBase design tokens — premium v2.
 *
 * Colour communicates STATUS and TIER, never decoration:
 *   navy   → brand / primary actions
 *   blue   → links, info, AI accents
 *   signal → live / opportunity / positive (emerald)
 *   amber  → approaching deadline (soon)
 *   red    → urgent / expired (urgent)
 *   pro    → PRO tier & money moments ONLY (gold) — nothing else uses gold
 * Dark mode ships on the same semantic tokens (CSS variables map in globals).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2A47',
          900: '#0A1F36',
          700: '#173C63',
        },
        blue: {
          DEFAULT: '#2E6BA8',
          soft: '#EAF1F9',
          line: '#C3D7EC',
        },
        ink: {
          DEFAULT: '#1B2430',
          2: '#4A5568',
          3: '#7C8798',
        },
        line: '#E6EAF0',
        canvas: '#F5F7FA',
        open: { DEFAULT: '#12805C', bg: '#E6F4EF' },
        soon: { DEFAULT: '#B36A00', bg: '#FDF1E0' },
        urgent: { DEFAULT: '#C02B2B', bg: '#FCEBEB' },
        signal: { DEFAULT: '#0E9F6E', bg: '#E3F6EF', line: '#BFEBDC' },
        pro: { DEFAULT: '#C9A227', soft: '#FAF3DC', line: '#EDE1AE' },
        ai: { DEFAULT: '#4A55B8', bg: '#EEEFFA', line: '#D3D7F0' },
      },
      borderRadius: {
        // 4-step premium scale: 8 → 12 → 16 → 20
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
      fontSize: {
        micro: ['11px', { lineHeight: '15px' }],
        caption: ['12px', { lineHeight: '17px' }],
        meta: ['13px', { lineHeight: '19px' }],
        body: ['14px', { lineHeight: '21px' }],
        'body-lg': ['15px', { lineHeight: '22px' }],
        'card-title': ['16px', { lineHeight: '21px' }],
        section: ['17px', { lineHeight: '23px' }],
        h2: ['23px', { lineHeight: '29px' }],
        h1: ['29px', { lineHeight: '35px' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,32,54,.05), 0 6px 16px rgba(16,32,54,.06)',
        'card-sm': '0 1px 2px rgba(16,32,54,.06)',
        nav: '0 -4px 20px rgba(16,32,54,.05)',
        primary: '0 6px 16px rgba(15,42,71,.22)',
        'primary-sm': '0 2px 6px rgba(15,42,71,.18)',
        sheet: '0 -8px 32px rgba(16,32,54,.14)',
        'gold-glow': '0 4px 14px rgba(201,162,39,.32)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up .28s ease-out both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
