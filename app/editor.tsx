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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import MarkdownEditor from '@/components/MarkdownEditor';
import { Note } from '@/types/Note';
import { FileSystemService } from '@/services/FileSystemService';

export default function EditorScreen() {
  const params = useLocalSearchParams();
  const { mode, noteId } = params;
  
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const insets = useSafeAreaInsets();

  const fileSystemService = FileSystemService.getInstance();

  useEffect(() => {
    if (mode === 'edit' && noteId) {
      loadNote(noteId as string);
    } else if (mode === 'create') {
      // Initialize with empty content for new note
      setContent('');
      setNoteTitle('');
      setHasUnsavedChanges(true);
    }
  }, [mode, noteId]);

  // Handle hardware back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackPress();
        return true; // Prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [hasUnsavedChanges, content])
  );

  const loadNote = async (id: string) => {
    setIsLoading(true);
    try {
      const loadedNote = await fileSystemService.getNote(id);
      if (loadedNote) {
        setNote(loadedNote);
        setContent(loadedNote.content);
        setNoteTitle(formatFilenameAsTitle(loadedNote.filename));
      } else {
        Alert.alert('Error', 'Note not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading note:', error);
      Alert.alert('Error', 'Failed to load note');
      router.back();
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
    if (!content.trim()) {
      Alert.alert('Error', 'Cannot save empty note');
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

      await fileSystemService.saveNote(noteToSave, note?.filename);
      setNote(noteToSave);
      setHasUnsavedChanges(false);
      
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${formatFilenameAsTitle(note.filename)}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: confirmDelete 
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!note) return;
    
    try {
      await fileSystemService.deleteNote(note.filename);
      router.replace('/');
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Save Changes?',
        'You have unsaved changes. Would you like to save before leaving?',
        [
          { 
            text: 'Don\'t Save', 
            style: 'destructive', 
            onPress: () => router.back() 
          },
          { 
            text: 'Save & Exit', 
            onPress: saveAndExit 
          },
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const saveAndExit = async () => {
    const saved = await saveNote();
    if (saved) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>
            {mode === 'create' ? 'New Note' : 'Edit Note'}
          </Text>
          {hasUnsavedChanges && (
            <View style={styles.unsavedIndicator}>
              <View style={styles.unsavedDot} />
              <Text style={styles.unsavedText}>Unsaved</Text>
            </View>
          )}
        </View>
        
        {mode === 'edit' && note && (
          <TouchableOpacity
            style={[styles.headerButton, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={24} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        <TextInput
          style={styles.titleInput}
          value={noteTitle}
          onChangeText={handleTitleChange}
          placeholder="Note title..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      <MarkdownEditor
        value={content}
        onChangeText={handleContentChange}
        onSave={saveNote}
        placeholder="Start typing your note..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  headerButton: {
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
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  unsavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginRight: 6,
  },
  unsavedText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingVertical: 8,
  },
});