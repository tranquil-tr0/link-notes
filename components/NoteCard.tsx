import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { NotePreview } from '@/types/Note';
import { Calendar, Clock } from 'lucide-react-native';

interface NoteCardProps {
  note: NotePreview;
  onPress: (note: NotePreview) => void;
  onLongPress: (note: NotePreview) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Account for padding and gap

export default function NoteCard({ note, onPress, onLongPress }: NoteCardProps) {
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

  const getPreviewHeight = (): number => {
    const baseHeight = 120;
    const contentLength = note.preview.length;
    const additionalHeight = Math.min(contentLength / 3, 80);
    return baseHeight + additionalHeight;
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, height: getPreviewHeight() }]}
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress(note)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {formatFilenameAsTitle(note.filename) || 'Untitled'}
        </Text>
        
        {note.preview && (
          <Text style={styles.preview} numberOfLines={4}>
            {note.preview}
          </Text>
        )}
        
        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Clock size={12} color="#6b7280" />
            <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
          </View>
        </View>
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
  footer: {
    marginTop: 12,
    paddingTop: 8,
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