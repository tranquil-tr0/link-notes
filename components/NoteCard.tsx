import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { NotePreview } from '@/types/Note';
import { Calendar, Clock } from 'lucide-react-native';

interface NoteCardProps {
  note: NotePreview;
  onPress: (note: NotePreview) => void;
  onLongPress: (note: NotePreview) => void;
  showTimestamp?: boolean;
  onTextBoxLayout?: (size: { width: number; height: number }) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Account for padding and gap

export default function NoteCard({ note, onPress, onLongPress, showTimestamp = true }: NoteCardProps) {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const formatFilenameAsTitle = (filename: string): string => {
    // Convert filename to display title
    return filename
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
  };

  // Margin to add around the text box inside the card
  const CARD_MARGIN = 0;

  // Deterministically calculate textbox size based on content length and bounded width
  function calcTextBoxSize(content: string) {
    const maxChars = 400;
    const chars = Math.min(content.length, maxChars);
    const { width: screenWidth } = Dimensions.get('window');
    const maxColumnWidth = Math.floor((screenWidth - 48) / 2); // match MasonryGrid column
    const charsPerLine = Math.floor((maxColumnWidth - 2 * CARD_MARGIN) / 8); // 8px per char
    const lineHeight = 20; // px, matches styles.preview
    const minLines = 2;
    const lines = Math.max(minLines, Math.ceil(chars / charsPerLine));
    const width = maxColumnWidth - 2 * CARD_MARGIN;
    const height = lines * lineHeight + 48; // 48px for title/timestamp padding
    return { width, height };
  }

  const textBoxSize = calcTextBoxSize(note.preview || "");
  const cardWidth = textBoxSize.width + 2 * CARD_MARGIN;
  const cardHeight = textBoxSize.height + 2 * CARD_MARGIN;

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, height: cardHeight, padding: CARD_MARGIN }]}
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress(note)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {formatFilenameAsTitle(note.filename) || 'Untitled'}
        </Text>
        
        {note.preview && (
          <>
            <Text
              style={[styles.preview, !showTimestamp && styles.previewExpanded]}
              numberOfLines={showTimestamp ? 4 : 8}
            >
              {showTimestamp
                ? note.preview.slice(0, 200)
                : note.preview.slice(0, 350)}
            </Text>
            {showTimestamp && (
              <View style={styles.footer}>
                <View style={styles.dateContainer}>
                  <Clock size={12} color="#6b7280" />
                  <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  content: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  preview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    flex: 1,
  },
  previewExpanded: {
    marginBottom: 0,
  },
  footer: {
    marginTop: 0,
    paddingTop: 4,
    marginBottom: -8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
});