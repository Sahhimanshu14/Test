/**
 * CDSPrep Premium Design System Tokens
 * Original, disciplined, academic, and defence-oriented tokens.
 * Built for high-stakes UPSC Combined Defence Services examination preparation.
 */

export const colors = {
  // Background & Core Surfaces (Tactical Dark Slate)
  background: {
    DEFAULT: '#080c14',
    subtle: '#0c121e',
    card: '#0f1728',
    cardElevated: '#141e33',
    overlay: 'rgba(8, 12, 20, 0.85)',
  },
  // Foreground / Typography
  foreground: {
    DEFAULT: '#f8fafc',
    muted: '#94a3b8',
    subtle: '#64748b',
    inverse: '#090d16',
  },
  // Disciplined Borders & Dividers
  border: {
    DEFAULT: '#1e293b',
    subtle: '#141d2d',
    focus: '#10b981',
    accent: '#334155',
  },
  // Regimental Emerald (Primary - IMA / Victory / Verification)
  brand: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  // Service Brass & Gold (AFA / Distinction / Milestones / Streaks)
  gold: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Cadet Blue & Naval Sky (INA / Maritime / Sectional / Information)
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // Coral Alert & Negative Marking (Negative marks, timer expiry, anti-cheat audit)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  // Academy Badges Specific Tones
  academy: {
    ima: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      text: '#34d399',
      badge: '#065f46',
    },
    ina: {
      bg: 'rgba(14, 165, 233, 0.12)',
      border: 'rgba(14, 165, 233, 0.35)',
      text: '#38bdf8',
      badge: '#075985',
    },
    afa: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      text: '#fbbf24',
      badge: '#92400e',
    },
    ota: {
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.35)',
      text: '#c084fc',
      badge: '#6b21a8',
    },
  },
  // UPSC 6-State Exam Palette Tones
  examPalette: {
    unvisited: {
      bg: '#1e293b',
      border: '#334155',
      text: '#94a3b8',
      label: 'Not Visited',
    },
    notAnswered: {
      bg: '#ef4444',
      border: '#dc2626',
      text: '#ffffff',
      label: 'Not Answered',
    },
    answered: {
      bg: '#10b981',
      border: '#059669',
      text: '#090d16',
      label: 'Answered',
    },
    markedForReview: {
      bg: '#8b5cf6',
      border: '#7c3aed',
      text: '#ffffff',
      label: 'Marked for Review',
    },
    answeredAndMarkedForReview: {
      bg: '#6366f1',
      border: '#4f46e5',
      text: '#ffffff',
      label: 'Ans & Marked for Review',
    },
  },
} as const;

export const typography = {
  fonts: {
    sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  sizes: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem' }, // 12px
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem' }, // 14px
    base: { fontSize: '1rem', lineHeight: '1.5rem' }, // 16px
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem' }, // 18px
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem' }, // 20px
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem' }, // 24px
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' }, // 30px
    '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' }, // 36px
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export const spacing = {
  0: '0px',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
} as const;

export const radius = {
  none: '0px',
  sm: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
  focus: '0 0 0 2px #080c14, 0 0 0 4px #10b981',
  focusDanger: '0 0 0 2px #080c14, 0 0 0 4px #ef4444',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 40,
  sticky: 45,
  overlay: 48,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

export const animation = {
  fast: '100ms ease-out',
  normal: '150ms ease-out',
  slow: '250ms ease-out',
} as const;

export const designSystem = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  breakpoints,
  zIndex,
  animation,
};

export default designSystem;
