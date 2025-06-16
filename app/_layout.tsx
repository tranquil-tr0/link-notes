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
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

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

    initializeFileSystem();  }, []);

  // Handle deep linking
  const processDeepLink = (url: string, usePush: boolean = false) => {
    try {
      // Parse the URL to extract parameters
      const urlObj = new URL(url);
      const path = urlObj.pathname.replace(/^\//, ''); // Normalize path by removing leading slash
      const searchParams = urlObj.searchParams;
      
      // Handle editor deep links
      // Format: linknotes://editor?mode=edit&noteId=filename.md&folderPath=/path/to/folder
      if (path === 'editor') {
        const mode = searchParams.get('mode');
        const noteId = searchParams.get('noteId');
        const folderPath = searchParams.get('folderPath');
        
        if (mode && noteId) {
          const routerMethod = usePush ? router.push : router.replace;
          routerMethod({
            pathname: '/editor',
            params: { mode, noteId, folderPath: folderPath || '' }
          });
        } else if (mode === 'create') {
          const routerMethod = usePush ? router.push : router.replace;
          routerMethod({
            pathname: '/editor',
            params: { mode: 'create', folderPath: folderPath || '' }
          });
        }
      }
      
      // Handle settings deep links
      // Format: linknotes://settings?showToast=true&message=Your%20message
      else if (path === 'settings') {
        const showToast = searchParams.get('showToast');
        const message = searchParams.get('message');
        const section = searchParams.get('section');
        
        const params: Record<string, string> = {};
        if (showToast) params.showToast = showToast;
        if (message) params.message = message;
        if (section) params.section = section;
        
        const routerMethod = usePush ? router.push : router.replace;
        routerMethod({
          pathname: '/settings',
          params
        });
      }
    } catch (error) {
      console.error('Error processing deep link:', error);
    }
  };

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
    }
  }, [isInitialized, pendingDeepLink]);

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
