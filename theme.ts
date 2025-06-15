export const SPACING = {
  padding: 5,
  largePadding: 10,
  margin: 10,
  smallMargin: 2.5,
  bottom: 50,
} as const;

export const RADIUS = {
  small: 8,
  large: 16,
} as const;

// Rose Pine Color Palette
const ROSE_PINE_COLORS = {
  // Rose Pine (Main)
  main: {
    base: '#191724',
    surface: '#1f1d2e',
    overlay: '#26233a',
    muted: '#6e6a86',
    subtle: '#908caa',
    text: '#e0def4',
    contrast: '#59527d',
    love: '#eb6f92',
    gold: '#f6c177',
    rose: '#ebbcba',
    pine: '#31748f',
    foam: '#9ccfd8',
    iris: '#c4a7e7',
    highlightLow: '#21202e',
    highlightMed: '#403d52',
    highlightHigh: '#524f67',
  },
  // Rose Pine Moon
  moon: {
    base: '#232136',
    surface: '#2a273f',
    overlay: '#393552',
    muted: '#6e6a86',
    subtle: '#908caa',
    text: '#e0def4',
    contrast: '#59527d',
    love: '#eb6f92',
    gold: '#f6c177',
    rose: '#ea9a97',
    pine: '#3e8fb0',
    foam: '#9ccfd8',
    iris: '#c4a7e7',
    highlightLow: '#2a283e',
    highlightMed: '#44415a',
    highlightHigh: '#56526e',
  },
  // Rose Pine Dawn
  dawn: {
    base: '#faf4ed',
    surface: '#fffaf3',
    overlay: '#f2e9e1',
    muted: '#9893a5',
    subtle: '#797593',
    text: '#575279',
    contrast: '#d4c7bc',
    love: '#b4637a',
    gold: '#ea9d34',
    rose: '#d7827e',
    accentRose: '#e8a3a0',
    pine: '#286983',
    foam: '#56949f',
    iris: '#907aa9',
    highlightLow: '#f4ede8',
    highlightMed: '#dfdad9',
    highlightHigh: '#cecacd',
  },
} as const;

// Theme definitions using Rose Pine color roles
export const THEMES = {
  rosePine: {
    name: 'Rose Pine',
    colors: {
      // Backgrounds
      primary: ROSE_PINE_COLORS.main.pine,
      secondary: ROSE_PINE_COLORS.main.foam,
      background: ROSE_PINE_COLORS.main.base,
      surface: ROSE_PINE_COLORS.main.surface,
      overlay: ROSE_PINE_COLORS.main.overlay,
      
      // Text colors
      text: ROSE_PINE_COLORS.main.text,
      textSecondary: ROSE_PINE_COLORS.main.subtle,
      textMuted: ROSE_PINE_COLORS.main.muted,
      
      // Interactive elements
      accent: ROSE_PINE_COLORS.main.rose,
      accentSecondary: ROSE_PINE_COLORS.main.iris,
      
      // Status colors
      love: ROSE_PINE_COLORS.main.love,
      gold: ROSE_PINE_COLORS.main.gold,
      rose: ROSE_PINE_COLORS.main.rose,
      pine: ROSE_PINE_COLORS.main.pine,
      foam: ROSE_PINE_COLORS.main.foam,
      iris: ROSE_PINE_COLORS.main.iris,
      
      // Highlights and borders
      highlightLow: ROSE_PINE_COLORS.main.highlightLow,
      highlightMed: ROSE_PINE_COLORS.main.highlightMed,
      highlightHigh: ROSE_PINE_COLORS.main.highlightHigh,
      border: ROSE_PINE_COLORS.main.contrast,
    },
    dark: true,
  },
  rosePineMoon: {
    name: 'Rose Pine Moon',
    colors: {
      // Backgrounds
      primary: ROSE_PINE_COLORS.moon.pine,
      secondary: ROSE_PINE_COLORS.moon.foam,
      background: ROSE_PINE_COLORS.moon.base,
      surface: ROSE_PINE_COLORS.moon.surface,
      overlay: ROSE_PINE_COLORS.moon.overlay,
      
      // Text colors
      text: ROSE_PINE_COLORS.moon.text,
      textSecondary: ROSE_PINE_COLORS.moon.subtle,
      textMuted: ROSE_PINE_COLORS.moon.muted,
      
      // Interactive elements
      accent: ROSE_PINE_COLORS.moon.rose,
      accentSecondary: ROSE_PINE_COLORS.moon.iris,
      
      // Status colors
      love: ROSE_PINE_COLORS.moon.love,
      gold: ROSE_PINE_COLORS.moon.gold,
      rose: ROSE_PINE_COLORS.moon.rose,
      pine: ROSE_PINE_COLORS.moon.pine,
      foam: ROSE_PINE_COLORS.moon.foam,
      iris: ROSE_PINE_COLORS.moon.iris,
      
      // Highlights and borders
      highlightLow: ROSE_PINE_COLORS.moon.highlightLow,
      highlightMed: ROSE_PINE_COLORS.moon.highlightMed,
      highlightHigh: ROSE_PINE_COLORS.moon.highlightHigh,
      border: ROSE_PINE_COLORS.moon.contrast,
    },
    dark: true,
  },
  rosePineDawn: {
    name: 'Rose Pine Dawn',
    colors: {
      // Backgrounds
      primary: ROSE_PINE_COLORS.dawn.pine,
      secondary: ROSE_PINE_COLORS.dawn.foam,
      background: ROSE_PINE_COLORS.dawn.base,
      surface: ROSE_PINE_COLORS.dawn.surface,
      overlay: ROSE_PINE_COLORS.dawn.overlay,
      
      // Text colors
      text: ROSE_PINE_COLORS.dawn.text,
      textSecondary: ROSE_PINE_COLORS.dawn.subtle,
      textMuted: ROSE_PINE_COLORS.dawn.muted,
      
      // Interactive elements
      accent: ROSE_PINE_COLORS.dawn.accentRose,
      accentSecondary: ROSE_PINE_COLORS.dawn.iris,
      
      // Status colors
      love: ROSE_PINE_COLORS.dawn.love,
      gold: ROSE_PINE_COLORS.dawn.gold,
      rose: ROSE_PINE_COLORS.dawn.rose,
      pine: ROSE_PINE_COLORS.dawn.pine,
      foam: ROSE_PINE_COLORS.dawn.foam,
      iris: ROSE_PINE_COLORS.dawn.iris,
      
      // Highlights and borders
      highlightLow: ROSE_PINE_COLORS.dawn.highlightLow,
      highlightMed: ROSE_PINE_COLORS.dawn.highlightMed,
      highlightHigh: ROSE_PINE_COLORS.dawn.highlightHigh,
      border: ROSE_PINE_COLORS.dawn.contrast,
    },
    dark: false,
  },
} as const;

// Types
export type ThemeName = keyof typeof THEMES;
export type Theme = typeof THEMES[ThemeName];
export type ThemeColors = Theme['colors'];
export type SpacingKey = keyof typeof SPACING;
export type ColorKey = keyof ThemeColors;

// Helper function to get theme colors
export const getThemeColors = (themeName: ThemeName): ThemeColors => {
  return THEMES[themeName].colors;
};

// Helper function to check if theme is dark
export const isThemeDark = (themeName: ThemeName): boolean => {
  return THEMES[themeName].dark;
};
