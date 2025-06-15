import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FolderItem } from '@/types/FileSystemItem';
import { Folder, Clock } from 'lucide-react-native';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from './ThemeProvider';

interface FolderCardProps {
  folder: FolderItem;
  onPress: (folder: FolderItem) => void;
  onLongPress: (folder: FolderItem) => void;
  showTimestamp?: boolean;
}

export default function FolderCard({ folder, onPress, onLongPress, showTimestamp = true }: FolderCardProps) {
  const { colors } = useTheme();

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
      onPress={() => onPress(folder)}
      onLongPress={() => onLongPress(folder)}
      activeOpacity={0.7}
    >
      <View style={[styles.frame, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        {/* Folder Icon and Name */}
        <View style={styles.folderHeader}>
          <Folder size={24} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {folder.name}
          </Text>
        </View>
        
        {/* Folder indicator text */}
        <View style={[styles.folderIndicator, { backgroundColor: colors.overlay }]}>
          <Text style={[styles.folderIndicatorText, { color: colors.textMuted }]}>
            Folder
          </Text>
        </View>
        
        {/* Timestamp */}
        {showTimestamp && (
          <View style={[styles.timestamp, { borderTopColor: colors.border }]}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.timestampText, { color: colors.textMuted }]}>
              {formatDate(folder.updatedAt)}
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
    minHeight: 120,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.smallMargin,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  folderIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.small,
    marginBottom: SPACING.smallMargin,
  },
  folderIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: SPACING.smallMargin,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  timestampText: {
    fontSize: 12,
    marginLeft: 4,
  },
});