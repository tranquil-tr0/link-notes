import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Text,
  TouchableOpacity,
  Dimensions,
  Platform 
} from 'react-native';
import { Eye, EyeOff, Save } from 'lucide-react-native';
import MarkdownDisplay from 'react-native-markdown-display';

interface MarkdownEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  placeholder?: string;
}

const { height } = Dimensions.get('window');

export default function MarkdownEditor({ 
  value, 
  onChangeText, 
  onSave, 
  placeholder = "Start typing your note..." 
}: MarkdownEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode(prev => !prev);
  }, []);

  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  const markdownStyles = {
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: '#1f2937',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    heading1: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: 16,
      marginTop: 24,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 12,
      marginTop: 20,
    },
    heading3: {
      fontSize: 18,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 8,
      marginTop: 16,
    },
    paragraph: {
      fontSize: 16,
      lineHeight: 24,
      color: '#1f2937',
      marginBottom: 12,
    },
    strong: {
      fontWeight: '700',
      color: '#1f2937',
    },
    em: {
      fontStyle: 'italic',
      color: '#374151',
    },
    code_inline: {
      backgroundColor: '#f3f4f6',
      color: '#e11d48',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_block: {
      backgroundColor: '#f8fafc',
      padding: 16,
      borderRadius: 8,
      marginVertical: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
    },
    blockquote: {
      backgroundColor: '#f8fafc',
      borderLeftWidth: 4,
      borderLeftColor: '#d1d5db',
      paddingLeft: 16,
      paddingVertical: 8,
      marginVertical: 8,
      fontStyle: 'italic',
    },
    list_item: {
      fontSize: 16,
      lineHeight: 24,
      color: '#1f2937',
      marginBottom: 4,
    },
    bullet_list: {
      marginBottom: 12,
    },
    ordered_list: {
      marginBottom: 12,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={togglePreviewMode}
          activeOpacity={0.7}
        >
          {isPreviewMode ? (
            <EyeOff size={20} color="#6b7280" />
          ) : (
            <Eye size={20} color="#6b7280" />
          )}
          <Text style={styles.toolbarButtonText}>
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, styles.saveButton]}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Save size={20} color="#ffffff" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {isPreviewMode ? (
        <ScrollView
          style={styles.previewContainer}
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
        >
          <MarkdownDisplay style={markdownStyles}>
            {value || '# Preview\n\nStart typing to see your markdown rendered here.'}
          </MarkdownDisplay>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.editorContainer}
          contentContainerStyle={styles.editorContent}
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            multiline
            autoFocus
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
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
    backgroundColor: '#f3f4f6',
  },
  toolbarButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
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
  editorContainer: {
    flex: 1,
  },
  editorContent: {
    flexGrow: 1,
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: height - 200,
    textAlignVertical: 'top',
  },
  previewContainer: {
    flex: 1,
  },
  previewContent: {
    padding: 16,
    flexGrow: 1,
  },
});