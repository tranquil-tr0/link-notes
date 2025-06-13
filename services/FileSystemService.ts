import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDocumentTree, listFiles, readFile, writeFile, mkdir, unlink, stat } from 'react-native-saf-x';
import { Note, NotePreview } from '@/types/Note';

interface UserPreferences {
  showTimestamps: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  showTimestamps: true,
};

export class FileSystemService {
  private static instance: FileSystemService;
  private notesDirectory: string;
  private customDirectory: string | null = null;
  private userPreferences: UserPreferences = DEFAULT_PREFERENCES;

  private constructor() {
    if (Platform.OS === 'web') {
      this.notesDirectory = 'Notes';
    } else {
      // Default to app's document directory
      this.notesDirectory = `${FileSystem.documentDirectory}Notes/`;
    }
  }

  static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * Get the current notes directory path
   */
  getNotesDirectory(): string {
    return this.customDirectory || this.notesDirectory;
  }

  /**
   * Set a custom directory for notes storage (Android SAF)
   */
  async setCustomDirectory(directory: string): Promise<void> {
    this.customDirectory = directory;
    // Save the preference for persistence
    try {
      await AsyncStorage.setItem('notes_directory_preference', directory);
    } catch (error) {
      console.error('Failed to save directory preference:', error);
    }
  }

  /**
   * Load the saved directory preference
   */
  async loadDirectoryPreference(): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      const savedDirectory = await AsyncStorage.getItem('notes_directory_preference');
      if (savedDirectory) {
        this.customDirectory = savedDirectory;
      }
    } catch (error) {
      console.log('No saved directory preference');
    }
  }

  /**
   * Let user select a custom directory for notes storage using SAF
   */
  async selectCustomDirectory(): Promise<string | null> {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      // Use react-native-saf-x to open the document tree picker
      // This will prompt the user to select a directory and grant persistent permissions
      const result = await openDocumentTree(true); // true for persistent permissions
      
      if (result && result.uri) {
        // Store the directory URI for SAF access
        await this.setCustomDirectory(result.uri);
        
        // No need to create a Notes subdirectory - use the selected directory directly
        
        return result.uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error selecting directory with SAF:', error);
      return null;
    }
  }

  /**
   * Get storage location info for display
   */
  getStorageLocationInfo(): { location: string; type: 'app' | 'public' | 'custom' } {
    const currentDir = this.getNotesDirectory();
    
    if (Platform.OS === 'web') {
      return { location: 'Browser Local Storage', type: 'app' };
    }

    if (currentDir === this.notesDirectory) {
      return { location: 'App Documents Folder', type: 'app' };
    }

    if (currentDir.startsWith('content://')) {
      return { location: 'User-Selected Folder (SAF)', type: 'custom' };
    }

    if (currentDir.includes('Documents/Notes')) {
      return { location: 'Device Documents/Notes', type: 'public' };
    }

    return { location: currentDir, type: 'custom' };
  }

  /**
   * Sanitize a title to be used as a filename
   */
  private sanitizeFilename(title: string): string {
    // Remove invalid characters for filesystem but keep spaces
    return title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .replace(/\.+$/, '') // Remove trailing dots
      .substring(0, 100) // Limit length
      .trim() || 'Untitled'; // Fallback if empty
  }

  /**
   * Extract title from note content
   */
  private extractTitle(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0] || '';
    return firstLine.replace(/^#\s*/, '') || 'Untitled';
  }

  async ensureDirectoryExists(): Promise<void> {
    if (Platform.OS === 'web') {
      // Web doesn't need directory creation
      return;
    }
    
    const currentDir = this.getNotesDirectory();
    
    if (currentDir.startsWith('content://')) {
      // SAF path - directory should already exist (user selected it)
      // No need to create subdirectory
    } else {
      // Regular file system path
      const dirInfo = await FileSystem.getInfoAsync(currentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(currentDir, { intermediates: true });
      }
    }
  }

  async getAllNotes(): Promise<NotePreview[]> {
    // Load directory preference first
    await this.loadDirectoryPreference();
    await this.ensureDirectoryExists();
    
    if (Platform.OS === 'web') {
      return this.getWebNotes();
    }
    
    const currentDir = this.getNotesDirectory();
    
    try {
      // Check if we're using SAF (URI starts with content://)
      if (currentDir.startsWith('content://')) {
        return await this.getSAFNotes(currentDir);
      } else {
        return await this.getFileSystemNotes(currentDir);
      }
    } catch (error) {
      console.error('Error reading notes:', error);
      return [];
    }
  }

  private async getSAFNotes(directoryUri: string): Promise<NotePreview[]> {
    try {
      const files = await listFiles(directoryUri);
      const markdownFiles = files.filter(file => file.name.endsWith('.md') && file.type === 'file');
      
      const notes: NotePreview[] = [];
      
      for (const file of markdownFiles) {
        try {
          const content = await readFile(file.uri);
          const filename = file.name.replace('.md', '');
          const preview = content.substring(0, 200);
          
          notes.push({
            filename,
            preview,
            createdAt: new Date(file.lastModified),
            updatedAt: new Date(file.lastModified),
            filePath: file.uri,
          });
        } catch (fileError) {
          console.error(`Error reading file ${file.name}:`, fileError);
        }
      }
      
      return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error reading SAF notes:', error);
      return [];
    }
  }

  private async getFileSystemNotes(currentDir: string): Promise<NotePreview[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(currentDir);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      const notes: NotePreview[] = [];
      
      for (const file of markdownFiles) {
        const filePath = `${currentDir}${file}`;
        const content = await FileSystem.readAsStringAsync(filePath);
        const stat = await FileSystem.getInfoAsync(filePath);
        
        const filename = file.replace('.md', '');
        const preview = content.substring(0, 200);
        
        const modTime = stat.exists && 'modificationTime' in stat ? stat.modificationTime : Date.now();
        
        notes.push({
          filename,
          preview,
          createdAt: new Date(modTime),
          updatedAt: new Date(modTime),
          filePath,
        });
      }
      
      return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error reading file system notes:', error);
      return [];
    }
  }

  private getWebNotes(): NotePreview[] {
    const notesData = localStorage.getItem('notes');
    if (!notesData) return [];
    
    try {
      const notes = JSON.parse(notesData);
      return notes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      }));
    } catch {
      return [];
    }
  }

  async getNote(filename: string): Promise<Note | null> {
    if (Platform.OS === 'web') {
      return this.getWebNote(filename);
    }
    
    try {
      const currentDir = this.getNotesDirectory();
      
      if (currentDir.startsWith('content://')) {
        // SAF path
        const fileUri = `${currentDir}/${filename}.md`;
        
        const content = await readFile(fileUri);
        const fileStat = await stat(fileUri);
        
        return {
          filename,
          content,
          createdAt: new Date(fileStat.lastModified),
          updatedAt: new Date(fileStat.lastModified),
          filePath: fileUri,
        };
      } else {
        // Regular file system path
        const filePath = `${currentDir}${filename}.md`;
        const content = await FileSystem.readAsStringAsync(filePath);
        const fileStat = await FileSystem.getInfoAsync(filePath);
        
        const modTime = fileStat.exists && 'modificationTime' in fileStat ? fileStat.modificationTime : Date.now();
        
        return {
          filename,
          content,
          createdAt: new Date(modTime),
          updatedAt: new Date(modTime),
          filePath,
        };
      }
    } catch (error) {
      console.error('Error reading note:', error);
      return null;
    }
  }

  private getWebNote(id: string): Note | null {
    const notesData = localStorage.getItem('notes');
    if (!notesData) return null;
    
    try {
      const notes = JSON.parse(notesData);
      const note = notes.find((n: any) => n.id === id);
      if (!note) return null;
      
      return {
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      };
    } catch {
      return null;
    }
  }

  async saveNote(note: Note, oldFilename?: string): Promise<void> {
    if (Platform.OS === 'web') {
      await this.saveWebNote(note);
      return;
    }
    
    await this.ensureDirectoryExists();
    
    try {
      const currentDir = this.getNotesDirectory();
      
      // If filename changed, delete the old file first
      if (oldFilename && oldFilename !== note.filename) {
        try {
          await this.deleteNote(oldFilename);
        } catch (error) {
          console.log('Old file not found or could not be deleted:', error);
        }
      }
      
      if (currentDir.startsWith('content://')) {
        // SAF path
        const fileUri = `${currentDir}/${note.filename}.md`;
        await writeFile(fileUri, note.content);
      } else {
        // Regular file system path
        const filePath = `${currentDir}${note.filename}.md`;
        await FileSystem.writeAsStringAsync(filePath, note.content);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  private async saveWebNote(note: Note): Promise<void> {
    const notesData = localStorage.getItem('notes');
    let notes: any[] = [];
    
    if (notesData) {
      try {
        notes = JSON.parse(notesData);
      } catch {
        notes = [];
      }
    }
    
    const existingIndex = notes.findIndex(n => n.filename === note.filename);
    const noteData = {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      notes[existingIndex] = noteData;
    } else {
      notes.push(noteData);
    }
    
    localStorage.setItem('notes', JSON.stringify(notes));
  }

  async deleteNote(id: string): Promise<void> {
    if (Platform.OS === 'web') {
      await this.deleteWebNote(id);
      return;
    }
    
    try {
      const currentDir = this.getNotesDirectory();
      
      if (currentDir.startsWith('content://')) {
        // SAF path
        const fileUri = `${currentDir}/${id}.md`;
        await unlink(fileUri);
      } else {
        // Regular file system path
        const filePath = `${currentDir}${id}.md`;
        await FileSystem.deleteAsync(filePath);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  private async deleteWebNote(id: string): Promise<void> {
    const notesData = localStorage.getItem('notes');
    if (!notesData) return;
    
    try {
      const notes = JSON.parse(notesData);
      const filteredNotes = notes.filter((n: any) => n.id !== id);
      localStorage.setItem('notes', JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('Error deleting web note:', error);
    }
  }

  /**
   * Load user preferences from storage
   */
  async loadUserPreferences(): Promise<void> {
    try {
      const preferencesData = await AsyncStorage.getItem('user_preferences');
      if (preferencesData) {
        this.userPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(preferencesData) };
      }
    } catch (error) {
      console.log('No saved preferences, using defaults');
      this.userPreferences = DEFAULT_PREFERENCES;
    }
  }

  /**
   * Save user preferences to storage
   */
  async saveUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      this.userPreferences = { ...this.userPreferences, ...preferences };
      await AsyncStorage.setItem('user_preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Get current user preferences
   */
  getUserPreferences(): UserPreferences {
    return this.userPreferences;
  }

  /**
   * Get specific preference value
   */
  getShowTimestamps(): boolean {
    return this.userPreferences.showTimestamps;
  }

  /**
   * Set timestamp visibility preference
   */
  async setShowTimestamps(show: boolean): Promise<void> {
    await this.saveUserPreferences({ showTimestamps: show });
  }
}