import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { NotePreview } from '@/types/Note';
import NoteCard from './NoteCard';

interface MasonryGridProps {
  notes: NotePreview[];
  onNotePress: (note: NotePreview) => void;
  onNoteLongPress: (note: NotePreview) => void;
  showTimestamp?: boolean;
}

const { width } = Dimensions.get('window');

export default function MasonryGrid({ notes, onNotePress, onNoteLongPress, showTimestamp = true }: MasonryGridProps) {
  // Margin must match NoteCard's CARD_MARGIN
  const CARD_MARGIN = 0;

  // Deterministically calculate textbox size based on content length
  function calcTextBoxSize(content: string) {
    const maxChars = 400;
    const chars = Math.min(content.length, maxChars);
    const { width: screenWidth } = Dimensions.get('window');
    const maxColumnWidth = Math.floor((screenWidth - 48) / 2); // match column width
    const charsPerLine = Math.floor((maxColumnWidth - 2 * CARD_MARGIN) / 8); // 8px per char
    const lineHeight = 20; // px, matches styles.preview
    const minLines = 2;
    const lines = Math.max(minLines, Math.ceil(chars / charsPerLine));
    const width = maxColumnWidth - 2 * CARD_MARGIN;
    const height = lines * lineHeight + 48; // 48px for title/timestamp padding
    return { width, height };
  }

  // Simple 2-column masonry: assign each card to the column with the least total height
  const columns = React.useMemo(() => {
    const left: { note: NotePreview; size: { width: number; height: number } }[] = [];
    const right: { note: NotePreview; size: { width: number; height: number } }[] = [];
    let leftHeight = 0;
    let rightHeight = 0;
    notes.forEach(note => {
      const size = calcTextBoxSize(note.preview || "");
      if (leftHeight <= rightHeight) {
        left.push({ note, size });
        leftHeight += size.height + 2 * CARD_MARGIN;
      } else {
        right.push({ note, size });
        rightHeight += size.height + 2 * CARD_MARGIN;
      }
    });
    return { left, right };
  }, [notes]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        <View style={styles.column}>
          {columns.left.map(({ note }) => (
            <NoteCard
              key={note.filename}
              note={note}
              onPress={onNotePress}
              onLongPress={onNoteLongPress}
              showTimestamp={showTimestamp}
            />
          ))}
        </View>
        <View style={styles.column}>
          {columns.right.map(({ note }) => (
            <NoteCard
              key={note.filename}
              note={note}
              onPress={onNotePress}
              onLongPress={onNoteLongPress}
              showTimestamp={showTimestamp}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginHorizontal: 6,
  },
});