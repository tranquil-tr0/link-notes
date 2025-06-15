import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { FileSystemService } from '@/services/FileSystemService';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <KeyboardProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="editor" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={isDark ? "light" : "dark"} />
        </SafeAreaProvider>
      </KeyboardProvider>
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Initialize FileSystemService and load directory preferences on app startup
    const initializeFileSystem = async () => {
      try {
        const fileSystemService = FileSystemService.getInstance();
        await fileSystemService.loadDirectoryPreference();
        await fileSystemService.loadUserPreferences();
      } catch (error) {
        console.error('Failed to initialize FileSystemService:', error);
      }
    };

    initializeFileSystem();
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
