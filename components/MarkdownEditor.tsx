import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { MarkdownTextInput, type MarkdownRange, type MarkdownStyle } from '@expensify/react-native-live-markdown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeProvider';

interface MarkdownEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  placeholder?: string;
}

const { height } = Dimensions.get('window');

const FONT_FAMILY_MONOSPACE = Platform.select({
  ios: 'Courier',
  default: 'monospace',
});

// Custom parser for Obsidian-flavored markdown
function parseObsidianMarkdown(input: string): MarkdownRange[] {
  'worklet';
  
  const ranges: MarkdownRange[] = [];
  
  // Internal links [[Link]] and embeds ![[Link]]
  const internalLinkRegex = /(!?)\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = internalLinkRegex.exec(input)) !== null) {
    const isEmbed = match[1] === '!';
    ranges.push({
      start: match.index,
      length: match[0].length,
      type: 'link'
    });
  }
  
  // Block references ^id
  const blockRefRegex = /\^([a-zA-Z0-9-_]+)/g;
  while ((match = blockRefRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: match[0].length,
      type: 'syntax'
    });
  }
  
  // Footnotes [^id]
  const footnoteRegex = /\[\^([^\]]+)\]/g;
  while ((match = footnoteRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: match[0].length,
      type: 'link'
    });
  }
  
  // Comments %%Text%%
  const commentRegex = /%%([^%]+)%%/g;
  while ((match = commentRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: match[0].length,
      type: 'syntax'
    });
  }
  
  // Highlights ==Text==
  const highlightRegex = /==([^=]+)==/g;
  while ((match = highlightRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: 2,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + 2,
      length: match[1].length,
      type: 'bold' // Using bold style for highlights
    });
    ranges.push({
      start: match.index + 2 + match[1].length,
      length: 2,
      type: 'syntax'
    });
  }
  
  // Strikethrough ~~Text~~
  const strikethroughRegex = /~~([^~]+)~~/g;
  while ((match = strikethroughRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: 2,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + 2,
      length: match[1].length,
      type: 'strikethrough'
    });
    ranges.push({
      start: match.index + 2 + match[1].length,
      length: 2,
      type: 'syntax'
    });
  }
  
  // Bold **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  while ((match = boldRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: 2,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + 2,
      length: match[1].length,
      type: 'bold'
    });
    ranges.push({
      start: match.index + 2 + match[1].length,
      length: 2,
      type: 'syntax'
    });
  }
  
  // Italic *text*
  const italicRegex = /(?<!\*)\*([^*\s][^*]*[^*\s]|\S)\*(?!\*)/g;
  while ((match = italicRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: 1,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + 1,
      length: match[1].length,
      type: 'italic'
    });
    ranges.push({
      start: match.index + 1 + match[1].length,
      length: 1,
      type: 'syntax'
    });
  }
  
  // Headers # ## ###
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  while ((match = headerRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: match[1].length + 1,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + match[1].length + 1,
      length: match[2].length,
      type: 'h1'
    });
  }
  
  // Track code block ranges to prevent inline code conflicts
  const codeBlockRanges: Array<{start: number, end: number}> = [];
  
  // Code blocks ``` (parse first to establish boundaries)
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(input)) !== null) {
    const fullMatch = match[0];
    const language = match[1] || '';
    const codeContent = match[2] || '';
    
    // Track this code block range
    codeBlockRanges.push({
      start: match.index,
      end: match.index + fullMatch.length
    });
    
    // Find the actual positions
    const openingLength = 3 + language.length;
    const hasNewlineAfterOpening = fullMatch.charAt(openingLength) === '\n';
    const contentStart = match.index + openingLength + (hasNewlineAfterOpening ? 1 : 0);
    
    // Opening ``` + language
    ranges.push({
      start: match.index,
      length: openingLength + (hasNewlineAfterOpening ? 1 : 0),
      type: 'syntax'
    });
    
    // Code content (only the actual code, not the markers)
    if (codeContent.length > 0) {
      ranges.push({
        start: contentStart,
        length: codeContent.length,
        type: 'code'
      });
    }
    
    // Closing ```
    const closingStart = contentStart + codeContent.length;
    ranges.push({
      start: closingStart,
      length: 3,
      type: 'syntax'
    });
  }
  
  // Helper function to check if position is inside a code block
  const isInsideCodeBlock = (position: number): boolean => {
    return codeBlockRanges.some(range => position >= range.start && position < range.end);
  };
  
  // Inline code `code` (parse after code blocks to avoid conflicts)
  const inlineCodeRegex = /`([^`\n]+)`/g;
  while ((match = inlineCodeRegex.exec(input)) !== null) {
    // Skip if this inline code is inside a code block
    if (isInsideCodeBlock(match.index)) {
      continue;
    }
    
    ranges.push({
      start: match.index,
      length: 1,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + 1,
      length: match[1].length,
      type: 'code'
    });
    ranges.push({
      start: match.index + 1 + match[1].length,
      length: 1,
      type: 'syntax'
    });
  }
  
  // Task lists - [ ] and - [x]
  const taskRegex = /^(\s*-\s+)\[([ x])\]/gm;
  while ((match = taskRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index + match[1].length,
      length: 3,
      type: 'syntax'
    });
  }
  
  // Blockquotes >
  const blockquoteRegex = /^>\s+(.+)$/gm;
  while ((match = blockquoteRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: 2,
      type: 'syntax'
    });
    ranges.push({
      start: match.index + 2,
      length: match[1].length,
      type: 'blockquote'
    });
  }
  
  // Callouts > [!note]
  const calloutRegex = /^>\s+\[!([^\]]+)\]/gm;
  while ((match = calloutRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: match[0].length,
      type: 'syntax'
    });
  }
  
  return ranges;
}

export default function MarkdownEditor({
  value,
  onChangeText,
  onSave,
  placeholder = 'Start typing your note...',
}: MarkdownEditorProps) {  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Dynamic markdown style based on theme - memoized to prevent unnecessary re-renders
  const dynamicMarkdownStyle: MarkdownStyle = useMemo(() => ({
    syntax: {
      color: colors.textMuted,
    },
    link: {
      color: colors.foam,
    },
    h1: {
      fontSize: 24,
    },
    emoji: {
      fontSize: 20,
    },
    blockquote: {
      borderColor: colors.border,
      borderWidth: 4,
      marginLeft: 8,
      paddingLeft: 12,
    },
    code: {
      fontFamily: FONT_FAMILY_MONOSPACE,
      fontSize: 14,
      color: colors.love,
      backgroundColor: colors.overlay,
    },
    pre: {
      fontFamily: FONT_FAMILY_MONOSPACE,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.overlay,
    },
    mentionHere: {
      color: colors.pine,
      backgroundColor: colors.highlightLow,
    },
    mentionUser: {
      color: colors.iris,
      backgroundColor: colors.highlightLow,
    },
  }), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MarkdownTextInput
        value={value}
        onChangeText={onChangeText}
        parser={parseObsidianMarkdown}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.textInput, { paddingBottom: insets.bottom + 20, color: colors.text }]}
        markdownStyle={dynamicMarkdownStyle}
        multiline
        autoFocus
        textAlignVertical="top"
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
    paddingHorizontal: 16,
    paddingVertical: 0,
    flex: 1,
    marginBottom: 0,
  },
});