import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { NotePreview } from '@/types/Note';
import NoteCard from './NoteCard';

interface MasonryGridProps {
  notes: NotePreview[];
  onNotePress: (note: NotePreview) => void;
  onNoteLongPress: (note: NotePreview) => void;
}

const { width } = Dimensions.get('window');

export default function MasonryGrid({ notes, onNotePress, onNoteLongPress }: MasonryGridProps) {
  const columns = useMemo(() => {
    const leftColumn: NotePreview[] = [];
    const rightColumn: NotePreview[] = [];
    
    notes.forEach((note, index) => {
      if (index % 2 === 0) {
        leftColumn.push(note);
      } else {
        rightColumn.push(note);
      }
    });
    
    return { leftColumn, rightColumn };
  }, [notes]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        <View style={styles.column}>
          {columns.leftColumn.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={onNotePress}
              onLongPress={onNoteLongPress}
            />
          ))}
        </View>
        
        <View style={styles.column}>
          {columns.rightColumn.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={onNotePress}
              onLongPress={onNoteLongPress}
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