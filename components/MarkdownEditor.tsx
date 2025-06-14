import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { MarkdownTextInput, type MarkdownRange } from '@expensify/react-native-live-markdown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  
  // Code blocks ```
  const codeBlockRegex = /```[\s\S]*?```/g;
  while ((match = codeBlockRegex.exec(input)) !== null) {
    ranges.push({
      start: match.index,
      length: match[0].length,
      type: 'pre'
    });
  }
  
  // Inline code `code`
  const inlineCodeRegex = /`([^`]+)`/g;
  while ((match = inlineCodeRegex.exec(input)) !== null) {
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

const markdownStyle = {
  syntax: {
    color: '#6b7280', // Gray for syntax elements
    opacity: 0.7,
  },
  link: {
    color: '#3b82f6', // Blue for links and internal links
    textDecorationLine: 'underline',
  },
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  emoji: {
    fontSize: 20,
  },
  blockquote: {
    borderColor: '#d1d5db',
    borderWidth: 4,
    marginLeft: 8,
    paddingLeft: 12,
    fontStyle: 'italic',
    color: '#6b7280',
  },
  code: {
    fontFamily: FONT_FAMILY_MONOSPACE,
    fontSize: 14,
    color: '#dc2626',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  pre: {
    fontFamily: FONT_FAMILY_MONOSPACE,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bold: {
    fontWeight: 'bold',
    color: '#fbbf24', // Yellow-orange for highlights (==text==)
    backgroundColor: '#fef3c7',
  },
  italic: {
    fontStyle: 'italic',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  mentionHere: {
    color: 'green',
    backgroundColor: 'lime',
  },
  mentionUser: {
    color: 'blue',
    backgroundColor: 'cyan',
  },
};

export default function MarkdownEditor({
  value,
  onChangeText,
  onSave,
  placeholder = 'Start typing your note...',
}: MarkdownEditorProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarButton, styles.saveButton]}
          onPress={onSave}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
      <MarkdownTextInput
        value={value}
        onChangeText={onChangeText}
        parser={parseObsidianMarkdown}
        placeholder={placeholder}
        style={[styles.textInput, { paddingBottom: insets.bottom + 50}]}
        markdownStyle={markdownStyle}
        multiline={true}
        autoFocus
        textAlignVertical="top"
        scrollEnabled={true}
        onFocus={() => {
          console.log('DEBUG: MarkdownTextInput focused');
        }}
        onScroll={(event) => {
          console.log('DEBUG: MarkdownTextInput scroll - contentOffset:', event.nativeEvent.contentOffset);
        }}
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