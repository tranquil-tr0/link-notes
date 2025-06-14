import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { Appearance } from 'react-native';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('system');

  const colorScheme = Appearance.getColorScheme();
  const resolvedTheme = theme === 'system' ? (colorScheme || 'light') : theme;

  const value = useMemo(() => ({
    theme,
    resolvedTheme: resolvedTheme as 'light' | 'dark',
    setTheme,
  }), [theme, resolvedTheme]);

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
