import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Search, X, Settings } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import MasonryGrid from '@/components/MasonryGrid';
import NoteCard from '@/components/NoteCard';
import { NotePreview } from '@/types/Note';
import { FileSystemService } from '@/services/FileSystemService';

export default function HomeScreen() {
  const [notes, setNotes] = useState<NotePreview[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NotePreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const insets = useSafeAreaInsets();

  const fileSystemService = FileSystemService.getInstance();

  const loadNotes = async () => {
    setLoading(true);
    try {
      // Load user preferences first
      await fileSystemService.loadUserPreferences();
      
      const loadedNotes = await fileSystemService.getAllNotes();
      setNotes(loadedNotes);
      setFilteredNotes(loadedNotes);
      
      // Update timestamp visibility setting
      setShowTimestamp(fileSystemService.getShowTimestamps());
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  // Additional focus effect to update preferences when returning from settings
  useFocusEffect(
    useCallback(() => {
      const updatePreferences = async () => {
        await fileSystemService.loadUserPreferences();
        setShowTimestamp(fileSystemService.getShowTimestamps());
      };
      updatePreferences();
    }, [])
  );

  const formatFilenameAsTitle = (filename: string): string => {
    // Convert filename to display title
    return filename
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const filtered = notes.filter(note => {
        const title = formatFilenameAsTitle(note.filename);
        return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               note.preview.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredNotes(filtered);
    }
  }, [searchQuery, notes]);

  const handleCreateNote = () => {
    router.push({
      pathname: '/editor',
      params: { mode: 'create' }
    });
  };

  const handleNotePress = (note: NotePreview) => {
    router.push({
      pathname: '/editor',
      params: { 
        mode: 'edit',
        noteId: note.filename
      }
    });
  };

  const handleNoteLongPress = (note: NotePreview) => {
    Alert.alert(
      'Note Options',
      `What would you like to do with "${formatFilenameAsTitle(note.filename)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit', 
          onPress: () => handleNotePress(note) 
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => confirmDelete(note) 
        },
      ]
    );
  };

  const confirmDelete = (note: NotePreview) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${formatFilenameAsTitle(note.filename)}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteNote(note.filename)
        },
      ]
    );
  };

  const deleteNote = async (noteId: string) => {
    try {
      await fileSystemService.deleteNote(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  };

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
    }
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Notes</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={toggleSearch}
              activeOpacity={0.7}
            >
              {isSearchVisible ? (
                <X size={24} color="#6b7280" />
              ) : (
                <Search size={24} color="#6b7280" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
            >
              <Settings size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.createButton]}
              onPress={handleCreateNote}
              activeOpacity={0.7}
            >
              <Plus size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {isSearchVisible && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search notes..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Tap the + button to create your first note'
              }
            </Text>
          </View>
        ) : (
          <MasonryGrid
            items={filteredNotes.map(note => (
              <NoteCard
                name={note.filename}
                note={note}
                onPress={handleNotePress}
                onLongPress={handleNoteLongPress}
                showTimestamp={showTimestamp}
              />
            ))}
            numColumns={2}
            spacing={16}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  createButton: {
    backgroundColor: '#3b82f6',
  },
  searchContainer: {
    marginTop: 16,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});