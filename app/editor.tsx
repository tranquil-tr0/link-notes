import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Text,
  TextInput,
  BackHandler,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trash2, Save, Eye, EyeOff } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { HapticsService } from '@/services/HapticsService';
import { useTheme } from '@/components/ThemeProvider';
import {
  KeyboardAwareScrollView,
  useKeyboardAnimation,
  KeyboardController,
  AndroidSoftInputModes
} from 'react-native-keyboard-controller';
import MarkdownEditor from '@/components/MarkdownEditor';
import { Note } from '@/types/Note';
import { FileSystemService } from '@/services/FileSystemService';
import { SPACING } from '@/theme';
import Markdown from 'react-native-markdown-display';

export default function EditorScreen() {
  const params = useLocalSearchParams();
  const { mode, noteId, folderPath } = params;
  
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveOnExit, setAutoSaveOnExit] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const fileSystemService = FileSystemService.getInstance();
  useEffect(() => {
    if (mode === 'edit' && noteId) {
      // Validate noteId exists before attempting to load
      loadNote(noteId as string);
    } else if (mode === 'create') {
      // Initialize with empty content for new note
      setContent('');
      setNoteTitle('');
      setHasUnsavedChanges(true);
    }
    
    // Load auto-save preference
    loadAutoSavePreference();
  }, [mode, noteId, folderPath]);

  const loadAutoSavePreference = async () => {
    try {
      const autoSave = await fileSystemService.getAutoSaveOnExit();
      setAutoSaveOnExit(autoSave);
    } catch (error) {
      console.error('Error loading auto-save preference:', error);
    }
  };

  // Handle hardware back button on Android and keyboard settings
  useFocusEffect(
    useCallback(() => {
      // Set proper keyboard mode for this screen
      if (Platform.OS === 'android') {
        KeyboardController.setInputMode(
          AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE
        );
      }

      const onBackPress = () => {
        handleBackPressInternal();
        return true; // Prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
        // Restore default keyboard mode when leaving
        if (Platform.OS === 'android') {
          KeyboardController.setDefaultMode();
        }
      };
    }, [hasUnsavedChanges, content])
  );

  const loadNote = async (id: string) => {
    setIsLoading(true);
    try {
      const loadedNote = await fileSystemService.getNote(id, folderPath as string);
      if (loadedNote) {
        setNote(loadedNote);
        setContent(loadedNote.content);
        setNoteTitle(formatFilenameAsTitle(loadedNote.filename));      } else {
        // Enhanced error message for better user experience from Quick Settings Tile
        Alert.alert(
          'Note Not Found',
          'The selected note could not be found. It may have been moved or deleted.',
          [
            { text: 'Go Back', onPress: () => safeNavigateBack() },
            { text: 'Browse Notes', onPress: () => router.replace('/') }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading note:', error);
      Alert.alert(
        'Error',
        'Failed to load note. Please try again.',
        [
          { text: 'Go Back', onPress: () => safeNavigateBack() },
          { text: 'Browse Notes', onPress: () => router.replace('/') }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setNoteTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const sanitizeFilename = (title: string): string => {
    // Remove invalid characters for filesystem but keep spaces
    return title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .replace(/\.+$/, '') // Remove trailing dots
      .substring(0, 100) // Limit length
      .trim() || 'Untitled'; // Fallback if empty
  };

  const extractTitleFromContent = (content: string): string => {
    const lines = content.split('\n');
    const firstLine = lines[0] || '';
    return firstLine.replace(/^#\s*/, '') || 'Untitled';
  };

  const generateFilename = (content: string): string => {
    const title = extractTitleFromContent(content);
    const sanitizedTitle = sanitizeFilename(title);
    
    // If still untitled, add timestamp to make it unique
    if (sanitizedTitle === 'untitled') {
      return `untitled_${Date.now()}`;
    }
    
    return sanitizedTitle;
  };

  const generateUniqueFilename = async (baseTitle: string, currentFilename?: string): Promise<string> => {
    const sanitizedTitle = sanitizeFilename(baseTitle || 'Untitled');
    
    // If we're editing and the title hasn't changed significantly, keep the same filename
    if (currentFilename && sanitizeFilename(formatFilenameAsTitle(currentFilename)) === sanitizedTitle) {
      return currentFilename;
    }
    
    let filename = sanitizedTitle;
    let counter = 1;
    
    // Get all existing notes to check for conflicts
    try {
      const allNotes = await fileSystemService.getAllNotes();
      const existingFilenames = allNotes.map(note => note.filename);
      
      // Check if filename already exists and increment if needed
      while (existingFilenames.includes(filename) && filename !== currentFilename) {
        filename = `${sanitizedTitle} ${counter}`;
        counter++;
      }
    } catch (error) {
      console.log('Could not check existing notes:', error);
      // If we can't check existing notes, just use the original filename
    }
    
    return filename;
  };

  const formatFilenameAsTitle = (filename: string): string => {
    // Convert filename to display title
    return filename
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
  };

  const saveNote = async (): Promise<boolean> => {
    // Allow saving empty notes if they have a title
    if (!content.trim() && !noteTitle.trim()) {
      HapticsService.error();
      Alert.alert(
        'Cannot Save Note',
        'Cannot save note without title or content',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Exit without saving',
            style: 'destructive',
            onPress: () => {
              HapticsService.tap();
              safeNavigateBack();
            }
          }
        ]
      );
      return false;
    }

    setIsLoading(true);
    try {
      const filename = await generateUniqueFilename(noteTitle, note?.filename);
      const now = new Date();
      
      const noteToSave: Note = {
        filename,
        content,
        createdAt: note?.createdAt || now,
        updatedAt: now,
        filePath: note?.filePath || '',
      };

      await fileSystemService.saveNote(noteToSave, note?.filename, folderPath as string);
      setNote(noteToSave);
      setHasUnsavedChanges(false);
        HapticsService.success();
      
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      HapticsService.error();
      Alert.alert('Error', 'Failed to save note. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    
    HapticsService.warning();
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${formatFilenameAsTitle(note.filename)}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            HapticsService.success();
            confirmDelete();
          }
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!note) return;
    
    try {
      await fileSystemService.deleteNote(note.filename, folderPath as string);
      HapticsService.success();
      router.replace('/');
    } catch (error) {
      console.error('Error deleting note:', error);
      HapticsService.error();
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  };

  /**
   * Safely navigate back with fallback to home screen.
   * This handles cases where the app was opened via deep link and has no navigation history.
   */
  const safeNavigateBack = () => {
    // Check if we can go back in navigation history
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no navigation history (e.g., opened via deep link), go to home screen
      console.log('No navigation history available, navigating to home.');
      router.replace('/');
    }
  };

  // Internal back press logic without haptic feedback (used by hardware back button)
  const handleBackPressInternal = () => {
    if (hasUnsavedChanges) {
      // Special case: if in create mode with no content and no title, exit without prompting
      if (mode === 'create' && !content.trim() && !noteTitle.trim()) {
        safeNavigateBack();
        return;
      }
      
      if (autoSaveOnExit) {
        // Auto-save is enabled, save and exit without prompting
        saveAndExit();
      } else {
        // Auto-save is disabled, show the prompt
        HapticsService.warning();
        Alert.alert(
          'Save Changes?',
          'You have unsaved changes. Would you like to save before leaving?',
          [
            {
              text: 'Don\'t Save',
              style: 'destructive',
              onPress: () => {
                HapticsService.tap();
                safeNavigateBack();
              }
            },
            {
              text: 'Save & Exit',
              onPress: () => {
                HapticsService.tap();
                saveAndExit();
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            },
          ]
        );
      }
    } else {
      safeNavigateBack();
    }
  };

  // UI back button handler with haptic feedback
  const handleBackPress = () => {
    HapticsService.tap();
    handleBackPressInternal();
  };
  const saveAndExit = async () => {
    const saved = await saveNote();
    if (saved) {
      safeNavigateBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
        paddingTop: insets.top,
      }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.iconButton, { backgroundColor: colors.overlay }]}
        >
          <ArrowLeft size={24} color={colors.iris} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              HapticsService.tap();
              setIsPreviewMode(!isPreviewMode);
            }}
            style={[styles.iconButton, { backgroundColor: colors.overlay }]}
          >
            {isPreviewMode ? (
              <EyeOff size={24} color={colors.gold} />
            ) : (
              <Eye size={24} color={colors.gold} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              HapticsService.tap();
              saveNote();
            }}
            style={[styles.iconButton, { backgroundColor: colors.overlay }]}
            disabled={isLoading}
          >
            <Save size={24} color={colors.pine} />
          </TouchableOpacity>
          {mode === 'edit' && note && (
            <TouchableOpacity
              onPress={() => {
                HapticsService.tap();
                handleDelete();
              }}
              style={[styles.iconButton, styles.deleteButtonHeader, { backgroundColor: colors.overlay }]}
            >
              <Trash2 size={24} color={colors.love} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        bottomOffset={50}
        keyboardShouldPersistTaps="handled"
      >
        {isPreviewMode ? (
          <View style={styles.previewContainer}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {noteTitle || 'Untitled'}
            </Text>
            <Markdown
              style={{
                body: { color: colors.text, backgroundColor: colors.background },
                heading1: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
                heading2: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
                heading3: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
                heading4: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
                heading5: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
                heading6: { color: colors.text, fontSize: 14, fontWeight: 'bold' },
                paragraph: { color: colors.text, fontSize: 16, lineHeight: 24 },
                strong: { color: colors.text, fontWeight: 'bold' },
                em: { color: colors.text, fontStyle: 'italic' },
                code_inline: {
                  color: colors.love,
                  backgroundColor: colors.overlay,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 4,
                },
                code_block: {
                  color: colors.text,
                  backgroundColor: colors.overlay,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  padding: 12,
                  borderRadius: 8,
                  marginVertical: 8,
                },
                fence: {
                  color: colors.text,
                  backgroundColor: colors.overlay,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  padding: 12,
                  borderRadius: 8,
                  marginVertical: 8,
                },
                blockquote: {
                  color: colors.textMuted,
                  backgroundColor: colors.surface,
                  borderLeftColor: colors.iris,
                  borderLeftWidth: 4,
                  paddingLeft: 12,
                  marginVertical: 8,
                  fontStyle: 'italic',
                },
                list_item: { color: colors.text, fontSize: 16, marginVertical: 2 },
                bullet_list: { marginVertical: 8 },
                ordered_list: { marginVertical: 8 },
                link: { color: colors.foam, textDecorationLine: 'underline' },
              }}
            >
              {content || 'No content to preview'}
            </Markdown>
          </View>
        ) : (
          <>
            <TextInput
              style={[styles.titleInput, { backgroundColor: colors.background, color: colors.text, borderBottomColor: colors.border }]}
              placeholder="Untitled"
              value={noteTitle}
              onChangeText={handleTitleChange}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.editorContainer}>
              <MarkdownEditor
                value={content}
                onChangeText={handleContentChange}
                onSave={saveNote}
                placeholder="Start typing your note..."
              />
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  iconButton: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonHeader: {
    marginLeft: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    fontSize: 35,
    fontWeight: 'bold',
    paddingHorizontal: 25,
    paddingVertical: SPACING.padding,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: '#333',
    marginBottom: SPACING.margin,
  },
  editorContainer: {
    flex: 1, // Ensure MarkdownEditor can expand
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: SPACING.padding,
  },
  previewTitle: {
    fontSize: 35,
    fontWeight: 'bold',
    marginBottom: SPACING.margin,
    paddingBottom: SPACING.padding,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});