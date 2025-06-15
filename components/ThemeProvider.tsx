import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme_preference');
        if (savedTheme && (savedTheme === 'system' || savedTheme === 'rosePine' || savedTheme === 'rosePineMoon' || savedTheme === 'rosePineDawn')) {
          setTheme(savedTheme as Theme);
        }
      } catch (error) {
        console.log('No saved theme preference, using default');
      }
    };

    loadThemePreference();
  }, []);

  // Enhanced setTheme to persist the selection
  const setAndSaveTheme = async (newTheme: Theme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('app_theme_preference', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Still set the theme even if saving fails
      setTheme(newTheme);
    }
  };
  
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
    setTheme: setAndSaveTheme,
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
