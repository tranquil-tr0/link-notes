import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react-native';
import { useTheme, Theme } from '../components/ThemeProvider';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Folder,
  Download,
  Upload,
  Trash2,
  Info,
  FileText,
  HardDrive,
  Clock,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FileSystemService } from '@/services/FileSystemService';
import { NoteSelector } from '@/components/NoteSelector';
import { NotePreview } from '@/types/Note';

export default function SettingsScreen() {
  const params = useLocalSearchParams();
  const { showToast, message } = params;
  const { theme, setTheme, colors } = useTheme();
  const themeOptions: { label: string; value: Theme; icon: React.ReactNode }[] = [
    { label: 'Rose Pine', value: 'rosePine', icon: <Moon size={20} color="#c4a7e7" /> },
    { label: 'Moon', value: 'rosePineMoon', icon: <Moon size={20} color="#ea9a97" /> },
    { label: 'Dawn', value: 'rosePineDawn', icon: <Sun size={20} color="#ea9d34" /> },
    { label: 'System', value: 'system', icon: <Monitor size={20} color={colors.textMuted} /> },
  ];

  const ThemeSelector = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 8 }}>
      {themeOptions.map((opt, index) => (
        // @ts-ignore: Allow key on View for list items
        <View key={`${opt.value}-${index}`} style={{ flex: 1, marginHorizontal: 4 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme === opt.value ? colors.highlightMed : colors.surface,
              borderColor: theme === opt.value ? colors.accent : colors.border,
              borderWidth: 2,
              borderRadius: 12,
              paddingVertical: 12,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setTheme(opt.value);
            }}
            activeOpacity={0.8}
          >
            {opt.icon}
            <Text style={{ marginLeft: 8, color: colors.text, fontWeight: theme === opt.value ? '700' : '500' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
  const [notesCount, setNotesCount] = useState<number>(0);
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);
  const [quickNoteUri, setQuickNoteUri] = useState<string | null>(null);
  const [quickNoteFilename, setQuickNoteFilename] = useState<string | null>(null);
  const [showNoteSelector, setShowNoteSelector] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const fileSystemService = FileSystemService.getInstance();

  React.useEffect(() => {
    loadNotesCount();
    loadStorageLocation();
    loadTimestampPreference();
    loadQuickNotePreference();
  }, []);

  // Handle toast message from Quick Settings Tile
  React.useEffect(() => {
    if (showToast === 'true' && message) {
      // Decode the message and show the toast
      const decodedMessage = decodeURIComponent(message as string);
      Alert.alert('Quick Settings Tile', decodedMessage, [{ text: 'OK' }]);
    }
  }, [showToast, message]);

  const loadNotesCount = async () => {
    try {
      const notes = await fileSystemService.getAllNotes();
      setNotesCount(notes.length);
    } catch (error) {
      console.error('Error loading notes count:', error);
    }
  };

  const loadStorageLocation = async () => {
    try {
      const locationInfo = await fileSystemService.getStorageLocationInfo();
      setStorageLocation(locationInfo.location);
    } catch (error) {
      console.error('Error loading storage location:', error);
    }
  };

  const loadTimestampPreference = async () => {
    try {
      const showTimestamps = await fileSystemService.getShowTimestamps();
      setShowTimestamps(showTimestamps);
    } catch (error) {
      console.error('Error loading timestamp preference:', error);
    }
  };

  const handleTimestampToggle = async (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await fileSystemService.setShowTimestamps(value);
      setShowTimestamps(value);
    } catch (error) {
      console.error('Error saving timestamp preference:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const loadQuickNotePreference = async () => {
    try {
      const uri = await fileSystemService.getQuickNoteUri();
      const filename = await fileSystemService.getQuickNoteFilename();
      setQuickNoteUri(uri);
      setQuickNoteFilename(filename);
    } catch (error) {
      console.error('Error loading quick note preference:', error);
    }
  };

  const handleQuickNoteSelect = async (note: NotePreview | null) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const uri = note ? note.filePath : null;
      await fileSystemService.setQuickNoteUri(uri);
      setQuickNoteUri(uri);
      setQuickNoteFilename(note ? note.filename : null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving quick note preference:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save quick note selection');
    }
  };

  const getQuickNoteDisplayText = () => {
    if (!quickNoteFilename) {
      return 'No quick note selected';
    }
    return quickNoteFilename;
  };

  const getStorageLocationText = () => {
    if (Platform.OS === 'web') {
      return 'Browser local storage';
    }
    return storageLocation || 'App Documents Folder';
  };

  const handleStorageLocationPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'android') {
      Alert.alert(
        'Storage Location',
        'Choose where to save your notes:\n\n• App Folder: Private app storage (default)\n• Custom Folder: Select any folder on your device using Android Storage Access Framework',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'App Folder',
            onPress: async () => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await fileSystemService.setCustomDirectory('');
                await loadStorageLocation();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Notes will be saved to the app\'s private folder');
              } catch (error) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            }
          },
          {
            text: 'Custom Folder',
            onPress: async () => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const result = await fileSystemService.selectCustomDirectory();
                if (result) {
                  await loadStorageLocation();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Success', 'Storage location updated. The app now has persistent permission to access your selected folder.');
                } else {
                  Alert.alert('Cancelled', 'No folder was selected');
                }
              } catch (error) {
                console.error('Directory selection error:', error);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', 'Failed to select storage location. Please try again.');
              }
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'Storage Location',
        Platform.OS === 'web'
          ? 'Notes are stored in your browser\'s local storage. They will persist between sessions but may be cleared if you clear browser data.'
          : 'Notes are stored as markdown files. On iOS, they are stored in the app\'s Documents folder.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleClearAllNotes = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear All Notes',
      'Are you sure you want to delete all notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            confirmClearAll();
          }
        },
      ]
    );
  };

  const confirmClearAll = async () => {
    try {
      const notes = await fileSystemService.getAllNotes();
      for (const note of notes) {
        await fileSystemService.deleteNote(note.filename);
      }
      setNotesCount(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'All notes have been deleted');
    } catch (error) {
      console.error('Error clearing notes:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to delete all notes');
    }
  };

  const handleExportNotes = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Export Notes',
      Platform.OS === 'web'
        ? 'This will download all your notes as individual markdown files to your Downloads folder.'
        : Platform.OS === 'android'
        ? 'Select a folder where you want to save all your notes as markdown files.'
        : 'All notes will be exported as markdown files to a temporary folder that you can then access through the Files app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const result = await fileSystemService.exportNotes();
              
              if (result.success) {
                const message = `Successfully exported ${result.exportedCount} notes.${
                  result.errors.length > 0 ? `\n\nWarnings:\n${result.errors.join('\n')}` : ''
                }${
                  Platform.OS === 'ios' ? '\n\nNotes are saved in the app\'s temporary folder. You can access them through the Files app.' : ''
                }`;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Export Complete', message);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Export Failed',
                  result.errors.length > 0 ? result.errors.join('\n') : 'Unknown error occurred'
                );
              }
            } catch (error) {
              console.error('Export error:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Export Failed', 'An unexpected error occurred during export.');
            }
          }
        },
      ]
    );
  };

  const handleImportNotes = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Import Notes',
      Platform.OS === 'web'
        ? 'Web import is not supported. You can create new notes by copying and pasting markdown content.'
        : Platform.OS === 'android'
        ? 'Select a folder containing markdown (.md) files to import them into your notes.'
        : 'Select markdown (.md) files to import them into your notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            if (Platform.OS === 'web') {
              Alert.alert('Not Supported', 'Import is not supported on web. Please create notes manually.');
              return;
            }
            
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const result = await fileSystemService.importNotes();
              
              if (result.success) {
                const message = `Successfully imported ${result.importedCount} notes.${
                  result.errors.length > 0 ? `\n\nWarnings:\n${result.errors.join('\n')}` : ''
                }`;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Import Complete', message);
                // Refresh the notes count
                await loadNotesCount();
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Import Failed',
                  result.errors.length > 0 ? result.errors.join('\n') : 'No notes were imported'
                );
              }
            } catch (error) {
              console.error('Import error:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Import Failed', 'An unexpected error occurred during import.');
            }
          }
        },
      ]
    );
  };

  const showRosePineLicense = () => {
    Alert.alert(
      'Rose Pine Dawn Colorscheme License',
      `MIT License

  Copyright (c) 2023 Rosé Pine

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    color = colors.textMuted,
    dangerous = false,
    showSwitch = false,
    switchValue = false,
    onSwitchChange
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    color?: string;
    dangerous?: boolean;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.surface }]}
      onPress={showSwitch ? undefined : () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={showSwitch ? 1 : 0.7}
    >
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: dangerous ? colors.love : colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      {showSwitch && (
        <Switch
          value={switchValue}
          onValueChange={(value) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSwitchChange?.(value);
          }}
          trackColor={{ false: colors.border, true: colors.foam }}
          thumbColor={switchValue ? colors.surface : colors.overlay}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingVertical: 16
      }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.overlay }]}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage</Text>
          
          <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statItem}>
              <FileText size={28} color={colors.foam} />
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>{notesCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Notes</Text>
              </View>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            
            <View style={styles.statItem}>
              <HardDrive size={28} color={colors.pine} />
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {getStorageLocationText()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Storage Location</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Display</Text>
          <Text style={{ marginHorizontal: 20, marginBottom: 8, color: colors.textMuted, fontSize: 15 }}>App Theme</Text>
          <ThemeSelector />
          <SettingItem
            icon={<Clock size={22} color={colors.textMuted} />}
            title="Show Timestamps"
            subtitle="Display timestamps at the bottom of notes"
            showSwitch={true}
            switchValue={showTimestamps}
            onSwitchChange={handleTimestampToggle}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
          
          <SettingItem
            icon={<FileText size={22} color={colors.textMuted} />}
            title="Quick Note"
            subtitle={getQuickNoteDisplayText()}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNoteSelector(true);
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          
          <SettingItem
            icon={<Folder size={22} color={colors.textMuted} />}
            title="Storage Location"
            subtitle={getStorageLocationText()}
            onPress={handleStorageLocationPress}
          />
          
          <SettingItem
            icon={<Upload size={22} color={colors.textMuted} />}
            title="Export Notes"
            subtitle="Export your notes to a folder"
            onPress={handleExportNotes}
          />
          
          <SettingItem
            icon={<Download size={22} color={colors.textMuted} />}
            title="Import Notes"
            subtitle="Import markdown files from a folder"
            onPress={handleImportNotes}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Danger Zone</Text>
          
          <SettingItem
            icon={<Trash2 size={22} color={colors.love} />}
            title="Clear All Notes"
            subtitle="Delete all notes permanently"
            onPress={handleClearAllNotes}
            dangerous
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <SettingItem
            icon={<Info size={22} color={colors.textMuted} />}
            title="Rose Pine License"
            subtitle="A modified version of the Rose Pine series of themes are used in the app"
            onPress={showRosePineLicense}
          />
        </View>
      </ScrollView>

      <NoteSelector
        visible={showNoteSelector}
        currentQuickNoteUri={quickNoteUri}
        onClose={() => setShowNoteSelector(false)}
        onSelectNote={handleQuickNoteSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    marginHorizontal: 20,
    letterSpacing: -0.3,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  statContent: {
    marginLeft: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  dangerousText: {
    color: '#ef4444',
  },
});