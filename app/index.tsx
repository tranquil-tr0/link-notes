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
import { HapticsService } from '@/services/HapticsService';
import MasonryGrid from '@/components/MasonryGrid';
import NoteCard from '@/components/NoteCard';
import FolderCard from '@/components/FolderCard';
import { NotePreview } from '@/types/Note';
import { DirectoryContents, FolderItem, NoteItem } from '@/types/FileSystemItem';
import { FileSystemService } from '@/services/FileSystemService';
import { useTheme } from '@/components/ThemeProvider';
import { RADIUS, SPACING } from '@/theme';

export default function HomeScreen() {
  const { path } = useLocalSearchParams<{ path?: string | string[] }>();
  const [directoryContents, setDirectoryContents] = useState<DirectoryContents>({
    folders: [],
    notes: [],
    currentPath: '',
    parentPath: null,
  });
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [filteredContents, setFilteredContents] = useState<DirectoryContents>({
    folders: [],
    notes: [],
    currentPath: '',
    parentPath: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);  const [loading, setLoading] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [fabPositionBottom, setFabPositionBottom] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const fileSystemService = FileSystemService.getInstance();

  // Helper function to convert path parameter to array
  const getPathArray = (): string[] => {
    if (!path) return [];
    if (Array.isArray(path)) {
      return path;
    }
    if (typeof path === 'string') {
      // Handle both slash-separated paths and single path segments
      if (path.includes('/')) {
        return path.split('/').filter((p: string) => p.length > 0);
      } else {
        return [path];
      }
    }
    return [];
  };

  // Construct the full directory path from route params
  const getDirectoryPath = (): string => {
    const pathArray = getPathArray();
    
    if (pathArray.length === 0) {
      return fileSystemService.getNotesDirectory();
    }
    
    const rootPath = fileSystemService.getNotesDirectory();
    if (rootPath.startsWith('content://')) {
      // SAF path
      return `${rootPath}/${pathArray.join('/')}`;
    } else {
      // Regular filesystem path
      return `${rootPath}${pathArray.join('/')}/`;
    }
  };

  // Check if welcome needs to be shown
  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const welcomeCompleted = await fileSystemService.getWelcomeCompleted();
        
        if (!welcomeCompleted) {
          router.replace('/welcome');
          return;
        }
      } catch (error) {
        router.replace('/welcome');
        return;
      }
      setCheckingWelcome(false);
    };

    checkWelcome();
  }, []);

  const loadDirectoryContents = async () => {
    setLoading(true);
    try {
      // Load directory preference first to ensure correct storage path
      await fileSystemService.loadDirectoryPreference();
      
      const targetPath = getDirectoryPath();
      const contents = await fileSystemService.getDirectoryContents(targetPath);
      setDirectoryContents(contents);
      setFilteredContents(contents);
      
      const showTimestamps = await fileSystemService.getShowTimestamps();
      setShowTimestamp(showTimestamps);
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

  // Load FAB position preference
  useFocusEffect(
    useCallback(() => {
      const loadFabPositionPreference = async () => {
        try {
          const fabPosition = await fileSystemService.getFabPositionBottom();
          setFabPositionBottom(fabPosition);
        } catch (error) {
          console.error('Error loading FAB position preference:', error);
        }
      };
      loadFabPositionPreference();
    }, [])
  );

  const formatFilenameAsTitle = (filename: string): string => {
    // Convert filename to display title
    return filename
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
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
    HapticsService.tap();
    // Pass the current folder path so the note is created in the right location
    const currentFolderPath = getPathArray().join('/');
    router.push({
      pathname: '/editor',
      params: {
        mode: 'create',
        folderPath: currentFolderPath
      }
    });
  };

  const handleNotePress = (note: NoteItem) => {
    HapticsService.selection();
    // Pass the current folder path so the note is opened from the correct location
    const currentFolderPath = getPathArray().join('/');
    router.push({
      pathname: '/editor',
      params: {
        mode: 'edit',
        noteId: note.filename,
        folderPath: currentFolderPath
      }
    });
  };

  const handleFolderPress = (folder: FolderItem) => {
    HapticsService.selection();
    // Navigate to the subfolder by extending the current path
    const currentPathArray = getPathArray();
    const newPath = [...currentPathArray, folder.name];
    
    // Build URL query string manually to ensure proper array handling
    const pathParams = newPath.map(p => `path=${encodeURIComponent(p)}`).join('&');
    const url = `/?${pathParams}` as const;
    
    router.push(url as any);
  };

  const handleNoteLongPress = (note: NoteItem) => {
    HapticsService.longPress();
    Alert.alert(
      'Note Options',
      `What would you like to do with "${formatFilenameAsTitle(note.filename)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            HapticsService.tap();
            handleNotePress(note);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            HapticsService.warning();
            confirmDelete(note);
          }
        },
      ]
    );
  };

  const handleFolderLongPress = (folder: FolderItem) => {
    HapticsService.longPress();
    Alert.alert(
      'Folder Options',
      `What would you like to do with "${folder.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            HapticsService.tap();
            handleFolderPress(folder);
          }
        },
      ]
    );
  };

  const confirmDelete = (note: NoteItem) => {
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
            deleteNote(note.filename);
          }
        },
      ]
    );
  };

  const deleteNote = async (noteId: string) => {
    try {
      const currentFolderPath = getPathArray().join('/');
      await fileSystemService.deleteNote(noteId, currentFolderPath);
      await loadDirectoryContents();
      HapticsService.success();
    } catch (error) {
      console.error('Error deleting note:', error);
      HapticsService.error();
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  };


  const toggleSearch = () => {
    HapticsService.tap();
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
    }
  };

  const handleSettingsPress = () => {
    HapticsService.tap();
    router.push('/settings');
  };

  // Get the current folder name for display
  const getCurrentFolderName = (): string => {
    const pathArray = getPathArray();
    if (pathArray.length === 0) {
      return 'Notes';
    }
    return pathArray[pathArray.length - 1];
  };

  // Show loading while checking welcome status
  if (checkingWelcome) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
        paddingTop: insets.top,
        paddingBottom: 16,
        paddingHorizontal: 20
      }]}>
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
            </TouchableOpacity>            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.overlay }]}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
            >
              <Settings size={24} color={colors.textMuted} />
            </TouchableOpacity>
            {!fabPositionBottom && (
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.accent }]}
                onPress={handleCreateNote}
                activeOpacity={0.7}
              >
                <Plus size={24} color={colors.textMuted} />
              </TouchableOpacity>
            )}
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
            spacing={SPACING.margin}          />
        )}
      </View>

      {fabPositionBottom && (
        <TouchableOpacity
          style={[styles.floatingActionButton, { 
            backgroundColor: colors.accent,
            bottom: insets.bottom + 20,
            right: insets.bottom + 15,
          }]}
          onPress={handleCreateNote}
          activeOpacity={0.7}
        >
          <Plus size={32} color={colors.background} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
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
    borderRadius: RADIUS.large,
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
  },  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  floatingActionButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});