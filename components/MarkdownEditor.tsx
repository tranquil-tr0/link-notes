import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { MarkdownTextInput, parseExpensiMark } from '@expensify/react-native-live-markdown';

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

const markdownStyle = {
  syntax: {
    color: 'gray',
  },
  link: {
    color: 'blue',
  },
  h1: {
    fontSize: 25,
  },
  emoji: {
    fontSize: 20,
  },
  blockquote: {
    borderColor: 'gray',
    borderWidth: 6,
    marginLeft: 6,
    paddingLeft: 6,
  },
  code: {
    fontFamily: FONT_FAMILY_MONOSPACE,
    fontSize: 20,
    color: 'black',
    backgroundColor: 'lightgray',
  },
  pre: {
    fontFamily: FONT_FAMILY_MONOSPACE,
    fontSize: 20,
    color: 'black',
    backgroundColor: 'lightgray',
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
        parser={parseExpensiMark}
        placeholder={placeholder}
        style={styles.textInput}
        markdownStyle={markdownStyle}
        multiline
        autoFocus
        textAlignVertical="top"
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
    minHeight: height - 200,
    textAlignVertical: 'top',
    padding: 16,
    flex: 1,
  },
});