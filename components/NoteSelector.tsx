import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, FileText, Search } from 'lucide-react-native';
import { useTheme } from './ThemeProvider';
import { FileSystemService } from '../services/FileSystemService';
import { NotePreview } from '../types/Note';

interface NoteSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectNote: (note: NotePreview | null) => void;
  currentQuickNoteUri: string | null;
}

export function NoteSelector({ visible, onClose, onSelectNote, currentQuickNoteUri }: NoteSelectorProps) {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<NotePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const fileSystemService = FileSystemService.getInstance();

  useEffect(() => {
    if (visible) {
      loadNotes();
    }
  }, [visible]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const allNotes = await fileSystemService.getAllNotes();
      setNotes(allNotes.sort((a, b) => a.filename.localeCompare(b.filename)));
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = (note: NotePreview) => {
    onSelectNote(note);
    onClose();
  };

  const handleClearSelection = () => {
    onSelectNote(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Select Quick Note</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.overlay }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            Choose a note to set as your Quick Note. This will be used for quick access in future features.
          </Text>

          {/* Clear Selection Button */}
          {currentQuickNoteUri && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.overlay, borderColor: colors.border }]}
              onPress={handleClearSelection}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearButtonText, { color: colors.textMuted }]}>
                Clear Quick Note Selection
              </Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading notes...</Text>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No notes available</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Create some notes first to set a Quick Note
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.notesList} showsVerticalScrollIndicator={false}>
              {notes.map((note, index) => {
                const isSelected = currentQuickNoteUri === note.filePath;
                const title = note.filename || 'Untitled';
                const preview = note.preview.replace(/^#\s*/, '').trim().split('\n')[0] || 'No content';

                return (
                  // @ts-ignore: Allow key on View for list items
                  <View key={`${note.filename}-${index}`}>
                    <TouchableOpacity
                      style={[
                        styles.noteItem,
                        {
                          backgroundColor: isSelected ? colors.highlightMed : colors.surface,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => handleSelectNote(note)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.noteHeader}>
                        <FileText size={18} color={isSelected ? colors.accent : colors.textMuted} />
                        <Text
                          style={[
                            styles.noteTitle,
                            {
                              color: isSelected ? colors.text : colors.text,
                              fontWeight: isSelected ? '600' : '500',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                      </View>
                      <Text
                        style={[styles.notePreview, { color: colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {preview}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  clearButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  notesList: {
    flex: 1,
  },
  noteItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
});