import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { NotePreview } from '@/types/Note';
import { Clock } from 'lucide-react-native';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from './ThemeProvider';

interface NoteCardProps {
  note: NotePreview;
  onPress: (note: NotePreview) => void;
  onLongPress: (note: NotePreview) => void;
  showTimestamp?: boolean;
  onTextBoxLayout?: (size: { width: number; height: number }) => void;
}

export default function NoteCard({ note, onPress, onLongPress, showTimestamp = true }: NoteCardProps) {
  const { colors } = useTheme();
  const truncateText = (text: string, maxLines: number = 10) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;
    
    const truncatedLines = lines.slice(0, maxLines);
    const lastLine = truncatedLines[truncatedLines.length - 1];
    
    // Handle ellipsis placement to avoid spacing issues
    const trimmedLastLine = lastLine.trimEnd();
    if (trimmedLastLine.length === 0) {
      // If the last line is empty, add ellipsis to the previous non-empty line
      // or create a single ellipsis line
      if (truncatedLines.length > 1) {
        const prevLineIndex = truncatedLines.length - 2;
        const prevLine = truncatedLines[prevLineIndex].trimEnd();
        if (prevLine.length > 0) {
          truncatedLines[prevLineIndex] = prevLine + '…';
          truncatedLines.pop(); // Remove the empty last line
        } else {
          truncatedLines[truncatedLines.length - 1] = '…';
        }
      } else {
        truncatedLines[truncatedLines.length - 1] = '…';
      }
    } else {
      // Use single ellipsis character instead of three dots to avoid spacing issues
      truncatedLines[truncatedLines.length - 1] = trimmedLastLine + '…';
    }
    
    return truncatedLines.join('\n');
  };
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress(note)}
      activeOpacity={0.7}
    >
      {/* Frame around text and timestamp */}
      <View style={[styles.frame, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {note.filename.replace(/\.md$/, '')}
        </Text>
        
        {/* Text Display */}
        <Text style={[styles.textDisplay, {
          backgroundColor: colors.surface,
          color: colors.text
        }]} numberOfLines={10}>
          {truncateText(note.preview || '')}
        </Text>
        
        {/* Timestamp */}
        {showTimestamp && (
          <View style={[styles.timestamp, { borderTopColor: colors.border }]}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.timestampText, { color: colors.textMuted }]}>
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
    borderRadius: RADIUS.large,
    borderWidth: 1,
    padding: SPACING.padding,
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: RADIUS.large,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.smallMargin,
    paddingHorizontal: 4,
  },
  textDisplay: {
    borderRadius: RADIUS.small,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
    padding: SPACING.padding,
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 0,
    borderTopWidth: 1,
  },
  timestampText: {
    fontSize: 12,
    marginLeft: 4,
  },
});