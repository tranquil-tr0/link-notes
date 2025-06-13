import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { NotePreview } from '@/types/Note';
import { Clock } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../theme';

interface NoteCardProps {
  note: NotePreview;
  onPress: (note: NotePreview) => void;
  onLongPress: (note: NotePreview) => void;
  showTimestamp?: boolean;
  onTextBoxLayout?: (size: { width: number; height: number }) => void;
}

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

  // Calculate textbox dimensions - half screen width minus 3*margin
  const { width: screenWidth } = Dimensions.get('window');
  const textboxWidth = Math.floor((screenWidth / 2) - ((1.5 * SPACING.margin) + (2 * SPACING.padding)));

  return (
    <TouchableOpacity
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress(note)}
      activeOpacity={0.7}
    >
      {/* Frame around text and timestamp */}
      <View style={[styles.frame, { width: textboxWidth + 32 }]}>
        {/* TextInput */}
        <TextInput
          style={[styles.textInput, { width: textboxWidth }]}
          value={note.preview || ''}
          multiline={true}
          numberOfLines={10}
          editable={false}
          scrollEnabled={false}
        />
        
        {/* Timestamp */}
        {showTimestamp && (
          <View style={styles.timestamp}>
            <Clock size={12} color="#6b7280" />
            <Text style={styles.timestampText}>
              {formatDate(note.updatedAt)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: COLORS.elementbackground,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.outline,
    padding: SPACING.padding,
    // shadowColor: COLORS.shadow,
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.1,
    // shadowRadius: RADIUS.large,
    // elevation: 3,
  },
  textInput: {
    backgroundColor: COLORS.secondbackground,
    borderRadius: RADIUS.small,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontFamily: 'monospace',

    textAlignVertical: 'top',
    maxHeight: 200, // 10 lines * 20 line height
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  timestampText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
});