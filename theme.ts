export const SPACING = {
  padding: 5,
  margin: 10,
  smallMargin: 2.5,
  bottom: 50,
} as const;

export const RADIUS = {
  small: 8,
  large: 16,
} as const;

export const COLORS = {
  primary: '#4f46e5',
  secondary: '#6366f1',
  background: '#f9fafb',
  secondbackground: '#6b7280',
  elementbackground: '#e5e7eb',
  shadow: '#000',
  outline: '#000',
  text: '#1f2937',
} as const;

export type SpacingKey = keyof typeof SPACING;
