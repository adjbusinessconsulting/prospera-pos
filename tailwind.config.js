/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:          '#0B1129',
        'navy-soft':   '#1A2240',
        gold:          '#C9A55F',
        'gold-soft':   'rgba(201,165,95,0.12)',
        'cream-bg':    '#FAFAF7',
        'cream-deep':  '#EDE7DA',
        'cream-pill':  '#F2EDE3',
        'cream-text':  '#F2EDE3',
        'warm-border': '#ECE7DD',
        'warm-dashed': '#D8D2C4',
        'text-mute':   '#7A776F',
        success:       '#5C9E7E',
        warning:       '#C25E3D',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        stepper: '6px',
        thumb:   '8px',
        chip:    '9px',
        button:  '12px',
        card:    '14px',
        method:  '16px',
      },
      boxShadow: {
        tablet:    '0 30px 80px -20px rgba(11,17,41,0.35), 0 4px 16px rgba(11,17,41,0.10)',
        method:    '0 4px 18px rgba(11,17,41,0.06)',
        'nav-pill':'0 10px 30px rgba(11,17,41,0.25)',
        'sync-glow':'0 0 0 4px rgba(92,158,126,0.18)',
        'pin-glow': '0 0 0 4px rgba(201,165,95,0.12)',
      },
      letterSpacing: {
        eyebrow:       '0.22em',
        caps:          '0.18em',
        'mono-tight':  '0.05em',
        'mono-default':'0.1em',
      },
      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        'display-l':  ['38px', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        'display-m':  ['32px', { lineHeight: '1.1',  letterSpacing: '-0.01em' }],
        'display-s':  ['24px', { lineHeight: '1.15', letterSpacing: '-0.005em' }],
        'amount-xl':  ['36px', { lineHeight: '1',    letterSpacing: '-0.01em' }],
        'amount-l':   ['34px', { lineHeight: '1',    letterSpacing: '-0.01em' }],
        eyebrow:      ['10px', { lineHeight: '1',    letterSpacing: '0.22em' }],
      },
      animation: {
        'screen-in': 'screenIn 0.32s cubic-bezier(.2,.7,.2,1)',
      },
      keyframes: {
        screenIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
