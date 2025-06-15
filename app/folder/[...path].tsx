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
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import MasonryGrid from '@/components/MasonryGrid';
import NoteCard from '@/components/NoteCard';
import FolderCard from '@/components/FolderCard';
import { DirectoryContents, FolderItem, NoteItem } from '@/types/FileSystemItem';
import { FileSystemService } from '@/services/FileSystemService';
import { useTheme } from '@/components/ThemeProvider';

export default function FolderScreen() {
  const { path } = useLocalSearchParams<{ path: string[] }>();
  const [directoryContents, setDirectoryContents] = useState<DirectoryContents>({
    folders: [],
    notes: [],
    currentPath: '',
    parentPath: null,
  });
  const [filteredContents, setFilteredContents] = useState<DirectoryContents>({
    folders: [],
    notes: [],
    currentPath: '',
    parentPath: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const fileSystemService = FileSystemService.getInstance();

  // Construct the full directory path from route params
  const getDirectoryPath = (): string => {
    if (!path || path.length === 0) {
      return fileSystemService.getNotesDirectory();
    }
    
    const rootPath = fileSystemService.getNotesDirectory();
    if (rootPath.startsWith('content://')) {
      // SAF path
      return `${rootPath}/${path.join('/')}`;
    } else {
      // Regular filesystem path
      return `${rootPath}${path.join('/')}/`;
    }
  };

  const loadDirectoryContents = async () => {
    setLoading(true);
    try {
      await fileSystemService.loadUserPreferences();
      
      const targetPath = getDirectoryPath();
      const contents = await fileSystemService.getDirectoryContents(targetPath);
      setDirectoryContents(contents);
      setFilteredContents(contents);
      
      setShowTimestamp(fileSystemService.getShowTimestamps());
    } catch (error) {
      console.error('Error loading directory contents:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDirectoryContents();
    }, [path])
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
    return filename.replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContents(directoryContents);
    } else {
      const filteredFolders = directoryContents.folders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const filteredNotes = directoryContents.notes.filter(note => {
        const title = formatFilenameAsTitle(note.filename);
        return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               note.preview.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredContents({
        ...directoryContents,
        folders: filteredFolders,
        notes: filteredNotes,
      });
    }
  }, [searchQuery, directoryContents]);

  const handleCreateNote = () => {
    // Pass the current folder path so the note is created in the right location
    const currentFolderPath = path ? path.join('/') : '';
    router.push({
      pathname: '/editor',
      params: { 
        mode: 'create',
        folderPath: currentFolderPath
      }
    });
  };

  const handleNotePress = (note: NoteItem) => {
    router.push({
      pathname: '/editor',
      params: { 
        mode: 'edit',
        noteId: note.filename
      }
    });
  };

  const handleFolderPress = (folder: FolderItem) => {
    // Navigate to the subfolder by extending the current path
    const newPath = path ? [...path, folder.name] : [folder.name];
    router.push({
      pathname: '/folder/[...path]',
      params: { path: newPath }
    });
  };

  const handleNoteLongPress = (note: NoteItem) => {
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

  const handleFolderLongPress = (folder: FolderItem) => {
    Alert.alert(
      'Folder Options',
      `What would you like to do with "${folder.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open', 
          onPress: () => handleFolderPress(folder) 
        },
      ]
    );
  };

  const confirmDelete = (note: NoteItem) => {
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
      await loadDirectoryContents();
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

  // Get the current folder name for display
  const getCurrentFolderName = (): string => {
    if (!path || path.length === 0) {
      return 'Notes';
    }
    return path[path.length - 1];
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, { paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>{getCurrentFolderName()}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.overlay }]}
              onPress={toggleSearch}
              activeOpacity={0.7}
            >
              {isSearchVisible ? (
                <X size={24} color={colors.textMuted} />
              ) : (
                <Search size={24} color={colors.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.overlay }]}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
            >
              <Settings size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.accent }]}
              onPress={handleCreateNote}
              activeOpacity={0.7}
            >
              <Plus size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        
        {isSearchVisible && (
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, {
                backgroundColor: colors.overlay,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Search items..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        {filteredContents.folders.length === 0 && filteredContents.notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              {searchQuery ? 'No items found' : 'No items yet'}
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Tap the + button to create your first note'
              }
            </Text>
          </View>
        ) : (
          <MasonryGrid
            items={[
              // Render folders first
              ...filteredContents.folders.map((folder, index) => (
                <FolderCard
                  folder={folder}
                  onPress={handleFolderPress}
                  onLongPress={handleFolderLongPress}
                  showTimestamp={showTimestamp}
                />
              )),
              // Then render notes
              ...filteredContents.notes.map((note, index) => (
                <NoteCard
                  name={note.filename}
                  note={{
                    filename: note.filename,
                    preview: note.preview,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt,
                    filePath: note.filePath,
                  }}
                  onPress={(notePreview) => handleNotePress({
                    ...notePreview,
                    type: 'note' as const,
                  })}
                  onLongPress={(notePreview) => handleNoteLongPress({
                    ...notePreview,
                    type: 'note' as const,
                  })}
                  showTimestamp={showTimestamp}
                />
              ))
            ]}
            numColumns={2}
            spacing={16}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchContainer: {
    marginTop: 16,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});