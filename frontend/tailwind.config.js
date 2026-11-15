import animate from 'tailwindcss-animate'

const token = (name) => `hsl(var(--${name}) / <alpha-value>)`
const pair = (name) => ({ DEFAULT: token(name), foreground: token(`${name}-foreground`) })

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', sm: '1.5rem' }, screens: { '2xl': '1200px' } },
    extend: {
      fontFamily: {
        sans: ['"DM Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        h3: ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        h2: ['1.5rem', { lineHeight: '1.9rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        h1: ['2rem', { lineHeight: '2.4rem', letterSpacing: '-0.025em', fontWeight: '600' }],
        stat: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '500' }],
        display: ['clamp(2.5rem, 1.6rem + 3.6vw, 4.25rem)', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '500' }],
      },
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        scrim: token('scrim'),
        primary: pair('primary'),
        secondary: pair('secondary'),
        muted: pair('muted'),
        accent: pair('accent'),
        destructive: pair('destructive'),
        success: pair('success'),
        warning: pair('warning'),
        info: pair('info'),
        card: pair('card'),
        popover: pair('popover'),
        chart: { 1: token('chart-1'), 2: token('chart-2'), 3: token('chart-3'), 4: token('chart-4'), 5: token('chart-5') },
      },
      borderRadius: { control: 'var(--radius-control)', card: 'var(--radius-card)', inner: 'calc(var(--radius-control) - 2px)' },
      boxShadow: { pop: '0 8px 24px -8px hsl(var(--scrim) / 0.28), 0 0 0 1px hsl(var(--border))' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.2s ease-out both',
      },
    },
  },
  plugins: [animate],
}
