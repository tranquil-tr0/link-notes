import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { Appearance } from 'react-native';
import { THEMES, ThemeName, ThemeColors, getThemeColors, isThemeDark } from '../theme';

export type Theme = ThemeName | 'system';

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: ThemeName;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('system');

  const colorScheme = Appearance.getColorScheme();
  
  const resolvedTheme: ThemeName = useMemo(() => {
    if (theme === 'system') {
      // Use Rose Pine Dawn for light system preference, Rose Pine for dark
      return colorScheme === 'light' ? 'rosePineDawn' : 'rosePine';
    }
    return theme as ThemeName;
  }, [theme, colorScheme]);

  const colors = getThemeColors(resolvedTheme);
  const isDark = isThemeDark(resolvedTheme);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    colors,
    isDark,
    setTheme,
  }), [theme, resolvedTheme, colors, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
