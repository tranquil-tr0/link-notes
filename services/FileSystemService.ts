import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDocumentTree, listFiles, readFile, writeFile, mkdir, unlink, stat } from 'react-native-saf-x';
import { Note, NotePreview } from '@/types/Note';

export class FileSystemService {
  private static instance: FileSystemService;
  private notesDirectory: string;
  private customDirectory: string | null = null;

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
        
        // Ensure the Notes subdirectory exists in the selected folder
        try {
          const notesDirectoryUri = `${result.uri}/Notes`;
          await mkdir(notesDirectoryUri);
        } catch (error) {
          // Directory might already exist, which is fine
          console.log('Notes directory already exists or could not be created:', error);
        }
        
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

  async ensureDirectoryExists(): Promise<void> {
    if (Platform.OS === 'web') {
      // Web doesn't need directory creation
      return;
    }
    
    const currentDir = this.getNotesDirectory();
    
    if (currentDir.startsWith('content://')) {
      // SAF path - ensure Notes subdirectory exists
      try {
        const notesDirectoryUri = `${currentDir}/Notes`;
        await mkdir(notesDirectoryUri);
      } catch (error) {
        // Directory might already exist, which is fine
        console.log('SAF Notes directory already exists or could not be created:', error);
      }
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
      const notesDirectoryUri = `${directoryUri}/Notes`;
      const files = await listFiles(notesDirectoryUri);
      const markdownFiles = files.filter(file => file.name.endsWith('.md') && file.type === 'file');
      
      const notes: NotePreview[] = [];
      
      for (const file of markdownFiles) {
        try {
          const content = await readFile(file.uri);
          const lines = content.split('\n');
          const title = lines[0]?.replace(/^#\s*/, '') || file.name.replace('.md', '');
          const preview = lines.slice(1).join('\n').substring(0, 200);
          
          notes.push({
            id: file.name.replace('.md', ''),
            title,
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
        
        const lines = content.split('\n');
        const title = lines[0]?.replace(/^#\s*/, '') || file.replace('.md', '');
        const preview = lines.slice(1).join('\n').substring(0, 200);
        
        const modTime = stat.exists && 'modificationTime' in stat ? stat.modificationTime : Date.now();
        
        notes.push({
          id: file.replace('.md', ''),
          title,
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

  async getNote(id: string): Promise<Note | null> {
    if (Platform.OS === 'web') {
      return this.getWebNote(id);
    }
    
    try {
      const currentDir = this.getNotesDirectory();
      
      if (currentDir.startsWith('content://')) {
        // SAF path
        const notesDirectoryUri = `${currentDir}/Notes`;
        const fileUri = `${notesDirectoryUri}/${id}.md`;
        
        const content = await readFile(fileUri);
        const fileStat = await stat(fileUri);
        
        const lines = content.split('\n');
        const title = lines[0]?.replace(/^#\s*/, '') || id;
        
        return {
          id,
          title,
          content,
          createdAt: new Date(fileStat.lastModified),
          updatedAt: new Date(fileStat.lastModified),
          filePath: fileUri,
        };
      } else {
        // Regular file system path
        const filePath = `${currentDir}${id}.md`;
        const content = await FileSystem.readAsStringAsync(filePath);
        const fileStat = await FileSystem.getInfoAsync(filePath);
        
        const lines = content.split('\n');
        const title = lines[0]?.replace(/^#\s*/, '') || id;
        
        const modTime = fileStat.exists && 'modificationTime' in fileStat ? fileStat.modificationTime : Date.now();
        
        return {
          id,
          title,
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

  async saveNote(note: Note): Promise<void> {
    if (Platform.OS === 'web') {
      await this.saveWebNote(note);
      return;
    }
    
    await this.ensureDirectoryExists();
    
    try {
      const currentDir = this.getNotesDirectory();
      
      if (currentDir.startsWith('content://')) {
        // SAF path
        const notesDirectoryUri = `${currentDir}/Notes`;
        const fileUri = `${notesDirectoryUri}/${note.id}.md`;
        await writeFile(fileUri, note.content);
      } else {
        // Regular file system path
        const filePath = `${currentDir}${note.id}.md`;
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
    
    const existingIndex = notes.findIndex(n => n.id === note.id);
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
        const notesDirectoryUri = `${currentDir}/Notes`;
        const fileUri = `${notesDirectoryUri}/${id}.md`;
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
}