import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StyleSheet, View, Text, Linking } from 'react-native';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FileSystemService } from '@/services/FileSystemService';
import { router } from 'expo-router';

function AppContent() {
  const { isDark, colors } = useTheme();

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="editor" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={isDark ? "light" : "dark"} />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize FileSystemService and load directory preferences on app startup
    const initializeFileSystem = async () => {
      try {
        const fileSystemService = FileSystemService.getInstance();
        
        await fileSystemService.loadDirectoryPreference();
        
        // Check if welcome is completed
        const welcomeCompleted = await fileSystemService.getWelcomeCompleted();
        
        // Don't navigate here - let the router handle initial navigation
        
      } catch (error) {
        // Don't navigate on error - let the router handle initial navigation
      } finally {
        setIsInitialized(true);
      }
    };

    initializeFileSystem();
  }, []);

  // Handle deep linking
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // Parse the URL to extract parameters
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const searchParams = urlObj.searchParams;
      
      // Handle editor deep links
      // Format: linknotes://editor?mode=edit&noteId=filename.md&folderPath=/path/to/folder
      if (path === '/editor' || path === 'editor') {
        const mode = searchParams.get('mode');
        const noteId = searchParams.get('noteId');
        const folderPath = searchParams.get('folderPath');
        
        if (mode && noteId) {
          router.push({
            pathname: '/editor',
            params: { mode, noteId, folderPath: folderPath || '' }
          });
        } else if (mode === 'create') {
          router.push({
            pathname: '/editor',
            params: { mode: 'create', folderPath: folderPath || '' }
          });
        }
      }
    };

    // Get initial URL (if app was opened from deep link)
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL
    getInitialURL();

    return () => {
      subscription?.remove();
    };
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingSubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 8,
  },
});
