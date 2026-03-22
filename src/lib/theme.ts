/**
 * Centralized theme tokens for use in JavaScript contexts (echarts, recharts,
 * inline style props) where Tailwind utility classes are not applicable.
 *
 * All values reference the same CSS custom properties defined in index.css,
 * so dark-mode theming works automatically.
 */

export const themeColors = {
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  cardForeground: 'hsl(var(--card-foreground))',
  border: 'hsl(var(--border))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  destructive: 'hsl(var(--destructive))',
} as const

/** Palette for multi-series charts (portfolio, analytics, etc.) */
export const chartPalette = [
  'hsl(var(--primary))',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#a855f7',
] as const
