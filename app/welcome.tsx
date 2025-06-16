import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, FolderOpen, Smartphone, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FileSystemService } from '@/services/FileSystemService';
import { useTheme } from '@/components/ThemeProvider';

export default function WelcomeScreen() {
  const [selectedOption, setSelectedOption] = useState<'app' | 'custom' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const fileSystemService = FileSystemService.getInstance();

  const handleAppStoragePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption('app');
  };

  const handleCustomStoragePress = () => {
    if (Platform.OS !== 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Not Available',
        'Custom storage location is only available on Android devices.',
        [{ text: 'OK' }]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption('custom');
  };

  const handleContinue = async () => {
    if (!selectedOption) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Please Select', 'Please choose where you want to store your notes.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    try {
      if (selectedOption === 'app') {
        // Use default app storage - no need to set custom directory
        await fileSystemService.setWelcomeCompleted(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } else if (selectedOption === 'custom') {
        // Prompt user to select custom directory
        const result = await fileSystemService.selectCustomDirectory();
        if (result) {
          await fileSystemService.setWelcomeCompleted(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert('No Folder Selected', 'Please select a folder to continue, or choose app storage instead.');
        }
      }
    } catch (error) {
      console.error('Error setting up storage:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to set up storage location. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const StorageOption = ({
    icon,
    title,
    description,
    recommended = false,
    selected = false,
    onPress,
    disabled = false,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    recommended?: boolean;
    selected?: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.optionCard,
        {
          backgroundColor: selected ? colors.highlightMed : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionIcon}>{icon}</View>
        <View style={styles.optionTitleContainer}>
          <View style={styles.optionTitleRow}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
            {recommended && (
              <View style={[styles.recommendedBadge, { backgroundColor: colors.foam }]}>
                <Text style={[styles.recommendedText, { color: colors.background }]}>Recommended</Text>
              </View>
            )}
          </View>
          {selected && (
            <CheckCircle size={20} color={colors.accent} style={styles.selectedIcon} />
          )}
        </View>
      </View>
      <Text style={[styles.optionDescription, { color: colors.textMuted }]}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <FileText size={64} color={colors.accent} style={styles.appIcon} />
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to Link Notes</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textMuted }]}>
            Link Notes into Obsidian or similar apps with a mobile friendly interface.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage Location</Text>
          
          <StorageOption
            icon={<Smartphone size={28} color={colors.pine} />}
            title="App Storage"
            description="Store notes in the app's private folder. Notes will be secure and won't clutter your device storage."
            selected={selectedOption === 'app'}
            onPress={handleAppStoragePress}
          />

          <StorageOption
            icon={<FolderOpen size={28} color={colors.love} />}
            title="Custom Folder"
            description={
              Platform.OS === 'android'
                ? "Choose any folder on your device. We recommend choosing a folder inside your Obsidian Vault."
                : "Custom folder selection is only available on Android devices."
            }
            recommended={true}
            selected={selectedOption === 'custom'}
            onPress={handleCustomStoragePress}
            disabled={Platform.OS !== 'android'}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>About Storage</Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            • Notes are stored as markdown (.md) files{'\n'}
            • You can change this setting later in the app's settings{'\n'}
            • Your notes stay in the folder they are created in, but you can export and import notes if you'd like{'\n'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: selectedOption ? colors.accent : colors.overlay,
              opacity: selectedOption && !isProcessing ? 1 : 0.6,
            },
          ]}
          onPress={handleContinue}
          disabled={!selectedOption || isProcessing}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueButtonText, { color: colors.text }]}>
            {isProcessing ? 'Setting up...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  appIcon: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  optionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  optionIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  optionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedIcon: {
    marginLeft: 8,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 44,
  },
  infoContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});