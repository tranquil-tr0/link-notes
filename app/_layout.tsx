
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StyleSheet, useColorScheme } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  const colorScheme = useColorScheme();

  // Choose status bar style and background color based on theme
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';
  const statusBarBackground = colorScheme === 'dark' ? '#18181b' : '#f9fafb';

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="editor" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar
          style={statusBarStyle}
          backgroundColor={statusBarBackground}
          translucent={false}
        />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
