import type { Config } from 'tailwindcss';

/**
 * TenderBase design tokens.
 * Colour is used to communicate STATUS, not decoration.
 *   navy   → brand / primary actions
 *   green  → open / positive
 *   amber  → approaching deadline
 *   red    → urgent / expired
 *   ai     → AI-generated content ONLY (never a status)
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
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
        ai: { DEFAULT: '#4A55B8', bg: '#EEEFFA', line: '#D3D7F0' },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      fontSize: {
        // mobile-first type scale
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
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
