import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDocumentTree, listFiles, readFile, writeFile, mkdir, unlink, stat } from 'react-native-saf-x';
import { Note, NotePreview } from '@/types/Note';
import { DirectoryContents, FolderItem, NoteItem, FileSystemItem } from '@/types/FileSystemItem';

// Individual preference keys
const PREFERENCE_KEYS = {
  SHOW_TIMESTAMPS: 'user_preference_showTimestamps',
  WELCOME_COMPLETED: 'user_preference_welcomeCompleted',
  QUICK_NOTE_URI: 'user_preference_quickNoteUri',
  AUTO_SAVE_ON_EXIT: 'user_preference_autoSaveOnExit',
  FAB_POSITION_BOTTOM: 'user_preference_fabPositionBottom',
} as const;

// Default values
const DEFAULT_VALUES = {
  SHOW_TIMESTAMPS: false,
  WELCOME_COMPLETED: false,
  QUICK_NOTE_URI: null,
  AUTO_SAVE_ON_EXIT: true,
  FAB_POSITION_BOTTOM: true,
} as const;

/**
 * Wrapper for AsyncStorage operations with timeout protection
 */
const asyncStorageWithTimeout = {
  async getItem(key: string, timeoutMs: number = 5000): Promise<string | null> {
    return Promise.race([
      AsyncStorage.getItem(key),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AsyncStorage.getItem timeout for key: ${key}`)), timeoutMs)
      )
    ]);
  },
  
  async setItem(key: string, value: string, timeoutMs: number = 5000): Promise<void> {
    return Promise.race([
      AsyncStorage.setItem(key, value),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AsyncStorage.setItem timeout for key: ${key}`)), timeoutMs)
      )
    ]);
  },
  
  async removeItem(key: string, timeoutMs: number = 5000): Promise<void> {
    return Promise.race([
      AsyncStorage.removeItem(key),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AsyncStorage.removeItem timeout for key: ${key}`)), timeoutMs)
      )
    ]);
  }
};

export class FileSystemService {
  private static instance: FileSystemService;
  private notesDirectory: string;
  private customDirectory: string | null = null;
  private currentDirectory: string | null = null;
  
  // Cache implementation
  private notesCache: Map<string, NotePreview[]> = new Map();
  private noteContentCache: Map<string, Note> = new Map();
  private directoryPreferenceCache: string | null | undefined = undefined; // undefined = not loaded, null = no preference
  private lastCacheUpdate: number = 0;
  private cacheValidityDuration: number = 5 * 60 * 1000; // 5 minutes

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
   * Get the current directory path (for navigation)
   */
  getCurrentDirectory(): string {
    return this.currentDirectory || this.getNotesDirectory();
  }

  /**
   * Set the current directory path (for navigation)
   */
  setCurrentDirectory(path: string): void {
    this.currentDirectory = path;
  }

  /**
   * Reset to root directory
   */
  resetToRootDirectory(): void {
    this.currentDirectory = null;
  }

  /**
   * Set a custom directory for notes storage (Android SAF)
   */
  async setCustomDirectory(directory: string): Promise<void> {
    this.customDirectory = directory;
    this.directoryPreferenceCache = directory || null;
    
    // Clear cache since directory changed
    this.clearCache();
    
    // Save the preference for persistence
    try {
      if (directory) {
        await asyncStorageWithTimeout.setItem('notes_directory_preference', directory);
      } else {
        // Remove the preference to use default app storage
        await asyncStorageWithTimeout.removeItem('notes_directory_preference');
      }
    } catch (error) {
      console.error('Failed to save directory preference:', error);
    }
  }

  /**
   * Clear all caches when filesystem changes
   */
  private clearCache(): void {
    this.notesCache.clear();
    this.noteContentCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheValidityDuration;
  }

  /**
   * Get cache key for notes based on directory
   */
  private getCacheKey(directory: string): string {
    return `notes_${directory}`;
  }

  /**
   * Load the saved directory preference (cached)
   */
  async loadDirectoryPreference(): Promise<void> {
    ;
    
    // Return cached result if already loaded
    if (this.directoryPreferenceCache !== undefined) {
      ;
      if (this.directoryPreferenceCache !== null) {
        this.customDirectory = this.directoryPreferenceCache;
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      this.directoryPreferenceCache = null;
      return;
    }
    
    try {
      
      const savedDirectory = await asyncStorageWithTimeout.getItem('notes_directory_preference');
      ;
      
      if (savedDirectory) {
        ;
        this.customDirectory = savedDirectory;
        this.directoryPreferenceCache = savedDirectory;
      } else {
        this.directoryPreferenceCache = null;
      }
    } catch (error) {
      ;
      console.warn('AsyncStorage failed to load directory preference, using defaults');
      this.directoryPreferenceCache = null;
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
   * Parse SAF URI to a user-readable path
   */
  private parseSafUriToReadablePath(safUri: string): string {
    try {
      // SAF URIs typically look like: content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FNotes
      // We want to extract the path part and decode it
      
      if (!safUri.startsWith('content://')) {
        return safUri;
      }

      // Extract the path part after 'tree/'
      const treeMatch = safUri.match(/\/tree\/(.+)$/);
      if (!treeMatch) {
        return 'Custom Folder';
      }

      let pathPart = treeMatch[1];
      
      // Decode URI components
      pathPart = decodeURIComponent(pathPart);
      
      // Handle different storage types
      if (pathPart.startsWith('primary:')) {
        // Internal storage
        const relativePath = pathPart.substring('primary:'.length);
        return relativePath || 'Internal Storage';
      } else if (pathPart.includes(':')) {
        // External storage or other providers
        const parts = pathPart.split(':');
        if (parts.length >= 2) {
          const storageName = parts[0];
          const relativePath = parts.slice(1).join(':');
          
          // Try to make storage names more readable
          if (storageName.toLowerCase().includes('sd') || storageName.toLowerCase().includes('external')) {
            return relativePath ? `SD Card/${relativePath}` : 'SD Card';
          } else if (storageName === 'primary') {
            return relativePath || 'Internal Storage';
          } else {
            return relativePath ? `${storageName}/${relativePath}` : storageName;
          }
        }
      }
      
      // Fallback to the decoded path
      return pathPart || 'Custom Folder';
    } catch (error) {
      console.error('Error parsing SAF URI:', error);
      return 'Custom Folder';
    }
  }

  /**
   * Get storage location info for display
   */
  async getStorageLocationInfo(): Promise<{ location: string; type: 'app' | 'public' | 'custom' }> {
    // Always ensure directory preference is loaded before getting location info
    await this.loadDirectoryPreference();
    
    const currentDir = this.getNotesDirectory();
    
    if (Platform.OS === 'web') {
      return { location: 'Browser Local Storage', type: 'app' };
    }

    if (currentDir === this.notesDirectory) {
      return { location: 'App Documents Folder', type: 'app' };
    }

    if (currentDir.startsWith('content://')) {
      const readablePath = this.parseSafUriToReadablePath(currentDir);
      return { location: readablePath, type: 'custom' };
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
    const cacheKey = this.getCacheKey(directoryUri);
    
    // Check cache first
    if (this.isCacheValid() && this.notesCache.has(cacheKey)) {
      return this.notesCache.get(cacheKey)!;
    }
    
    try {
      const files = await listFiles(directoryUri);
      const markdownFiles = files.filter(file => file.name.endsWith('.md') && file.type === 'file');
      
      // Read files in parallel using Promise.all
      const notePromises = markdownFiles.map(async (file) => {
        try {
          // Read only first 200 characters for preview
          const content = await readFile(file.uri);
          const filename = file.name.replace('.md', '');
          const preview = content.substring(0, 200);
          
          return {
            filename,
            preview,
            createdAt: new Date(file.lastModified),
            updatedAt: new Date(file.lastModified),
            filePath: file.uri,
          };
        } catch (fileError) {
          console.error(`Error reading file ${file.name}:`, fileError);
          return null;
        }
      });
      
      const notesResults = await Promise.all(notePromises);
      const notes = notesResults.filter(note => note !== null) as NotePreview[];
      const sortedNotes = notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      // Update cache
      this.notesCache.set(cacheKey, sortedNotes);
      this.lastCacheUpdate = Date.now();
      
      return sortedNotes;
    } catch (error) {
      console.error('Error reading SAF notes:', error);
      return [];
    }
  }

  private async getFileSystemNotes(currentDir: string): Promise<NotePreview[]> {
    const cacheKey = this.getCacheKey(currentDir);
    
    // Check cache first
    if (this.isCacheValid() && this.notesCache.has(cacheKey)) {
      return this.notesCache.get(cacheKey)!;
    }
    
    try {
      const files = await FileSystem.readDirectoryAsync(currentDir);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      // Read files in parallel using Promise.all
      const notePromises = markdownFiles.map(async (file) => {
        try {
          const filePath = `${currentDir}${file}`;
          
          // Read only first 200 characters for preview
          const content = await FileSystem.readAsStringAsync(filePath);
          const stat = await FileSystem.getInfoAsync(filePath);
          
          const filename = file.replace('.md', '');
          const preview = content.substring(0, 200);
          
          const modTime = stat.exists && 'modificationTime' in stat ? stat.modificationTime : Date.now();
          
          return {
            filename,
            preview,
            createdAt: new Date(modTime),
            updatedAt: new Date(modTime),
            filePath,
          };
        } catch (fileError) {
          console.error(`Error reading file ${file}:`, fileError);
          return null;
        }
      });
      
      const notesResults = await Promise.all(notePromises);
      const notes = notesResults.filter(note => note !== null) as NotePreview[];
      const sortedNotes = notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      // Update cache
      this.notesCache.set(cacheKey, sortedNotes);
      this.lastCacheUpdate = Date.now();
      
      return sortedNotes;
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

  async getNote(filename: string, folderPath?: string): Promise<Note | null> {
    if (Platform.OS === 'web') {
      return this.getWebNote(filename);
    }
    
    // Create cache key for individual note
    const cacheKey = `note_${filename}_${folderPath || 'root'}`;
    
    // Check cache first
    if (this.isCacheValid() && this.noteContentCache.has(cacheKey)) {
      return this.noteContentCache.get(cacheKey)!;
    }
    
    try {
      // Determine the target directory
      let targetDir: string;
      const rootDir = this.getNotesDirectory();
      
      if (folderPath && folderPath.trim() !== '') {
        // Construct path to specific folder
        if (rootDir.startsWith('content://')) {
          // SAF path
          targetDir = `${rootDir}/${folderPath}`;
        } else {
          // Regular filesystem path
          targetDir = `${rootDir}${folderPath}/`;
        }
      } else {
        // Use root directory
        targetDir = rootDir;
      }
      
      let note: Note;
      
      if (targetDir.startsWith('content://')) {
        // SAF path
        const fileUri = `${targetDir}/${filename}.md`;
        
        const content = await readFile(fileUri);
        const fileStat = await stat(fileUri);
        
        note = {
          filename,
          content,
          createdAt: new Date(fileStat.lastModified),
          updatedAt: new Date(fileStat.lastModified),
          filePath: fileUri,
        };
      } else {
        // Regular file system path
        const filePath = `${targetDir}${filename}.md`;
        const content = await FileSystem.readAsStringAsync(filePath);
        const fileStat = await FileSystem.getInfoAsync(filePath);
        
        const modTime = fileStat.exists && 'modificationTime' in fileStat ? fileStat.modificationTime : Date.now();
        
        note = {
          filename,
          content,
          createdAt: new Date(modTime),
          updatedAt: new Date(modTime),
          filePath,
        };
      }
      
      // Cache the note
      this.noteContentCache.set(cacheKey, note);
      
      return note;
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

  async saveNote(note: Note, oldFilename?: string, folderPath?: string): Promise<void> {
    if (Platform.OS === 'web') {
      await this.saveWebNote(note);
      return;
    }
    
    await this.ensureDirectoryExists();
    
    try {
      // Determine the target directory
      let targetDir: string;
      const rootDir = this.getNotesDirectory();
      
      if (folderPath && folderPath.trim() !== '') {
        // Construct path to specific folder
        if (rootDir.startsWith('content://')) {
          // SAF path
          targetDir = `${rootDir}/${folderPath}`;
        } else {
          // Regular filesystem path
          targetDir = `${rootDir}${folderPath}/`;
        }
      } else {
        // Use root directory
        targetDir = rootDir;
      }
      
      // If filename changed, delete the old file first
      if (oldFilename && oldFilename !== note.filename) {
        try {
          await this.deleteNote(oldFilename, folderPath);
        } catch (error) {
          console.log('Old file not found or could not be deleted:', error);
        }
      }
      
      if (targetDir.startsWith('content://')) {
        // SAF path
        const fileUri = `${targetDir}/${note.filename}.md`;
        await writeFile(fileUri, note.content);
      } else {
        // Regular file system path
        const filePath = `${targetDir}${note.filename}.md`;
        await FileSystem.writeAsStringAsync(filePath, note.content);
      }
      
      // Clear cache after saving
      this.clearCache();
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

  async deleteNote(id: string, folderPath?: string): Promise<void> {
    if (Platform.OS === 'web') {
      await this.deleteWebNote(id);
      return;
    }
    
    try {
      // Determine the target directory
      let targetDir: string;
      const rootDir = this.getNotesDirectory();
      
      if (folderPath && folderPath.trim() !== '') {
        // Construct path to specific folder
        if (rootDir.startsWith('content://')) {
          // SAF path
          targetDir = `${rootDir}/${folderPath}`;
        } else {
          // Regular filesystem path
          targetDir = `${rootDir}${folderPath}/`;
        }
      } else {
        // Use root directory
        targetDir = rootDir;
      }
      
      if (targetDir.startsWith('content://')) {
        // SAF path
        const fileUri = `${targetDir}/${id}.md`;
        await unlink(fileUri);
      } else {
        // Regular file system path
        const filePath = `${targetDir}${id}.md`;
        await FileSystem.deleteAsync(filePath);
      }
      
      // Clear cache after deleting
      this.clearCache();
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
   * Delete a folder and all its contents recursively
   */
  async deleteFolder(folderName: string, folderPath?: string): Promise<void> {
    if (Platform.OS === 'web') {
      await this.deleteWebFolder(folderName, folderPath);
      return;
    }
    
    try {
      // Determine the target directory
      let targetDir: string;
      const rootDir = this.getNotesDirectory();
      
      if (folderPath && folderPath.trim() !== '') {
        // Construct path to parent folder
        if (rootDir.startsWith('content://')) {
          // SAF path
          targetDir = `${rootDir}/${folderPath}`;
        } else {
          // Regular filesystem path
          targetDir = `${rootDir}${folderPath}/`;
        }
      } else {
        // Use root directory
        targetDir = rootDir;
      }
      
      // Construct full folder path
      let folderToDelete: string;
      if (targetDir.startsWith('content://')) {
        // SAF path
        folderToDelete = `${targetDir}/${folderName}`;
      } else {
        // Regular filesystem path
        folderToDelete = `${targetDir}${folderName}`;
      }
      
      if (targetDir.startsWith('content://')) {
        // SAF path - recursively delete folder contents
        await this.deleteSAFFolder(folderToDelete);
      } else {
        // Regular file system path
        await FileSystem.deleteAsync(folderToDelete, { idempotent: true });
      }
      
      // Clear cache after deleting
      this.clearCache();
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  /**
   * Recursively delete a folder using SAF
   */
  private async deleteSAFFolder(folderUri: string): Promise<void> {
    try {
      // Get all items in the folder
      const items = await listFiles(folderUri);
      
      // Delete all files and subfolders
      for (const item of items) {
        if (item.type === 'directory') {
          // Recursively delete subfolder
          await this.deleteSAFFolder(item.uri);
        } else {
          // Delete file
          await unlink(item.uri);
        }
      }
      
      // Delete the empty folder itself
      await unlink(folderUri);
    } catch (error) {
      console.error('Error deleting SAF folder:', error);
      throw error;
    }
  }

  private async deleteWebFolder(folderName: string, folderPath?: string): Promise<void> {
    const notesData = localStorage.getItem('notes');
    if (!notesData) return;
    
    try {
      const notes = JSON.parse(notesData);
      
      // Construct the folder path to match
      const pathPrefix = folderPath ? `${folderPath}/${folderName}` : folderName;
      
      // Filter out notes that are in this folder or its subfolders
      const filteredNotes = notes.filter((note: any) => {
        const notePath = note.filePath || '';
        return !notePath.startsWith(pathPrefix);
      });
      
      localStorage.setItem('notes', JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('Error deleting web folder:', error);
    }
  }

  /**
   * Get current user preferences (reconstructed from individual keys)
   */
  async getUserPreferences(): Promise<{
    showTimestamps: boolean;
    welcomeCompleted: boolean;
    quickNoteUri: string | null;
    autoSaveOnExit: boolean;
    fabPositionBottom: boolean;
  }> {
    return {
      showTimestamps: await this.getShowTimestamps(),
      welcomeCompleted: await this.getWelcomeCompleted(),
      quickNoteUri: await this.getQuickNoteUri(),
      autoSaveOnExit: await this.getAutoSaveOnExit(),
      fabPositionBottom: await this.getFabPositionBottom(),
    };
  }

  /**
   * Get timestamp visibility preference
   */
  async getShowTimestamps(): Promise<boolean> {
    try {
      const value = await asyncStorageWithTimeout.getItem(PREFERENCE_KEYS.SHOW_TIMESTAMPS);
      return value !== null ? JSON.parse(value) : DEFAULT_VALUES.SHOW_TIMESTAMPS;
    } catch (error) {
      console.warn('Failed to load showTimestamps preference, using default');
      return DEFAULT_VALUES.SHOW_TIMESTAMPS;
    }
  }

  /**
   * Set timestamp visibility preference
   */
  async setShowTimestamps(show: boolean): Promise<void> {
    try {
      await asyncStorageWithTimeout.setItem(PREFERENCE_KEYS.SHOW_TIMESTAMPS, JSON.stringify(show));
    } catch (error) {
      console.error('Failed to save showTimestamps preference:', error);
    }
  }

  /**
   * Check if welcome screen has been completed
   */
  async getWelcomeCompleted(): Promise<boolean> {
    try {
      const value = await asyncStorageWithTimeout.getItem(PREFERENCE_KEYS.WELCOME_COMPLETED);
      return value !== null ? JSON.parse(value) : DEFAULT_VALUES.WELCOME_COMPLETED;
    } catch (error) {
      console.warn('Failed to load welcomeCompleted preference, using default');
      return DEFAULT_VALUES.WELCOME_COMPLETED;
    }
  }

  /**
   * Set welcome screen completion status
   */
  async setWelcomeCompleted(completed: boolean): Promise<void> {
    try {
      await asyncStorageWithTimeout.setItem(PREFERENCE_KEYS.WELCOME_COMPLETED, JSON.stringify(completed));
    } catch (error) {
      console.error('Failed to save welcomeCompleted preference:', error);
    }
  }

  /**
   * Get quick note URI
   */
  async getQuickNoteUri(): Promise<string | null> {
    try {
      const value = await asyncStorageWithTimeout.getItem(PREFERENCE_KEYS.QUICK_NOTE_URI);
      return value !== null ? JSON.parse(value) : DEFAULT_VALUES.QUICK_NOTE_URI;
    } catch (error) {
      console.warn('Failed to load quickNoteUri preference, using default');
      return DEFAULT_VALUES.QUICK_NOTE_URI;
    }
  }
  /**
   * Set quick note URI
   */
  async setQuickNoteUri(uri: string | null): Promise<void> {
    try {
      await asyncStorageWithTimeout.setItem(PREFERENCE_KEYS.QUICK_NOTE_URI, JSON.stringify(uri));
    } catch (error) {
      console.error('Failed to save quickNoteUri preference:', error);
    }
  }

  /**
   * Get auto-save on exit preference
   */
  async getAutoSaveOnExit(): Promise<boolean> {
    try {
      const value = await asyncStorageWithTimeout.getItem(PREFERENCE_KEYS.AUTO_SAVE_ON_EXIT);
      return value !== null ? JSON.parse(value) : DEFAULT_VALUES.AUTO_SAVE_ON_EXIT;
    } catch (error) {
      console.warn('Failed to load autoSaveOnExit preference, using default');
      return DEFAULT_VALUES.AUTO_SAVE_ON_EXIT;
    }
  }
  /**
   * Set auto-save on exit preference
   */
  async setAutoSaveOnExit(autoSave: boolean): Promise<void> {
    try {
      await asyncStorageWithTimeout.setItem(PREFERENCE_KEYS.AUTO_SAVE_ON_EXIT, JSON.stringify(autoSave));
    } catch (error) {
      console.error('Failed to save autoSaveOnExit preference:', error);
    }
  }

  /**
   * Get FAB position preference (bottom vs top)
   */
  async getFabPositionBottom(): Promise<boolean> {
    try {
      const value = await asyncStorageWithTimeout.getItem(PREFERENCE_KEYS.FAB_POSITION_BOTTOM);
      return value !== null ? JSON.parse(value) : DEFAULT_VALUES.FAB_POSITION_BOTTOM;
    } catch (error) {
      console.warn('Failed to load fabPositionBottom preference, using default');
      return DEFAULT_VALUES.FAB_POSITION_BOTTOM;
    }
  }

  /**
   * Set FAB position preference (bottom vs top)
   */
  async setFabPositionBottom(positionBottom: boolean): Promise<void> {
    try {
      await asyncStorageWithTimeout.setItem(PREFERENCE_KEYS.FAB_POSITION_BOTTOM, JSON.stringify(positionBottom));
    } catch (error) {
      console.error('Failed to save fabPositionBottom preference:', error);
    }
  }

  /**
   * Get quick note filename from URI (for display purposes)
   */
  async getQuickNoteFilename(): Promise<string | null> {
    const uri = await this.getQuickNoteUri();
    if (!uri) return null;
    
    // Extract filename from various URI formats
    if (uri.startsWith('content://')) {
      // SAF URI - extract filename from the end
      const parts = uri.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.replace('.md', '');
    } else {
      // Regular file path
      const parts = uri.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace('.md', '');
    }
  }

  /**
   * Get directory contents (folders and notes) for the current directory
   */
  async getDirectoryContents(directoryPath?: string): Promise<DirectoryContents> {
    const targetPath = directoryPath || this.getCurrentDirectory();
    const rootPath = this.getNotesDirectory();
    
    // Load directory preference first
    await this.loadDirectoryPreference();
    await this.ensureDirectoryExists();
    
    if (Platform.OS === 'web') {
      return this.getWebDirectoryContents(targetPath, rootPath);
    }
    
    try {
      // Check if we're using SAF (URI starts with content://)
      if (targetPath.startsWith('content://')) {
        return await this.getSAFDirectoryContents(targetPath, rootPath);
      } else {
        return await this.getFileSystemDirectoryContents(targetPath, rootPath);
      }
    } catch (error) {
      console.error('Error reading directory contents:', error);
      return {
        folders: [],
        notes: [],
        currentPath: targetPath,
        parentPath: this.getParentPath(targetPath, rootPath),
      };
    }
  }

  /**
   * Get parent path for navigation
   */
  private getParentPath(currentPath: string, rootPath: string): string | null {
    if (currentPath === rootPath) {
      return null; // Already at root
    }
    
    if (currentPath.startsWith('content://')) {
      // SAF path - extract parent
      const pathParts = currentPath.split('/');
      if (pathParts.length > 4) { // content://authority/tree/document/...
        return pathParts.slice(0, -1).join('/');
      }
      return rootPath;
    } else {
      // Regular filesystem path
      const pathParts = currentPath.split('/');
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/') + '/';
        return parentPath.length >= rootPath.length ? parentPath : null;
      }
      return null;
    }
  }

  /**
   * Get directory contents using SAF
   */
  private async getSAFDirectoryContents(directoryUri: string, rootPath: string): Promise<DirectoryContents> {
    try {
      const files = await listFiles(directoryUri);
      const { folders, markdownFiles } = this.separateFoldersAndMarkdownFiles(files);

      const notes = await this.processMarkdownFiles(markdownFiles, async (file) => {
        const content = await readFile(file.uri);
        return {
          filename: file.name.replace('.md', ''),
          preview: content.substring(0, 200),
          createdAt: new Date(file.lastModified),
          updatedAt: new Date(file.lastModified),
          filePath: file.uri,
          type: 'note' as const,
        };
      });

      return this.buildDirectoryContents(folders, notes, directoryUri, rootPath);
    } catch (error) {
      console.error('Error reading SAF directory contents:', error);
      return this.buildEmptyDirectoryContents(directoryUri, rootPath);
    }
  }

  /**
   * Get directory contents using regular filesystem
   */
  private async getFileSystemDirectoryContents(currentDir: string, rootPath: string): Promise<DirectoryContents> {
    try {
      const files = await FileSystem.readDirectoryAsync(currentDir);
      const { folders, markdownFiles } = await this.processRegularFiles(files, currentDir);

      const notes = await this.processMarkdownFiles(markdownFiles, async (file) => {
        const filePath = `${currentDir}${file}`;
        const [content, stat] = await Promise.all([
          FileSystem.readAsStringAsync(filePath),
          FileSystem.getInfoAsync(filePath),
        ]);
        const modTime = stat.exists && 'modificationTime' in stat ? stat.modificationTime : Date.now();
        return {
          filename: file.replace('.md', ''),
          preview: content.substring(0, 200),
          createdAt: new Date(modTime),
          updatedAt: new Date(modTime),
          filePath,
          type: 'note' as const,
        };
      });

      return this.buildDirectoryContents(folders, notes, currentDir, rootPath);
    } catch (error) {
      console.error('Error reading filesystem directory contents:', error);
      return this.buildEmptyDirectoryContents(currentDir, rootPath);
    }
  }

  /**
   * Get directory contents for web platform
   */
  private getWebDirectoryContents(targetPath: string, rootPath: string): DirectoryContents {
    // For web, we'll simulate folder structure using localStorage
    // This is a simplified implementation - in a real app, you might want more sophisticated folder handling
    const notesData = localStorage.getItem('notes');
    const notes: NoteItem[] = [];
    
    if (notesData) {
      try {
        const allNotes = JSON.parse(notesData);
        allNotes.forEach((note: any) => {
          notes.push({
            filename: note.filename,
            preview: note.preview || note.content?.substring(0, 200) || '',
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
            filePath: note.filePath || `${targetPath}/${note.filename}.md`,
            type: 'note',
          });
        });
      } catch {
        // Handle parsing errors
      }
    }
    
    return {
      folders: [], // Web doesn't support real folders in this implementation
      notes: notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      currentPath: targetPath,
      parentPath: null, // Web implementation doesn't support folder navigation
    };
  }
  /**
   * Helper to separate folders and markdown files
   */
  private separateFoldersAndMarkdownFiles(files: any[]): { folders: FolderItem[]; markdownFiles: any[] } {
    const folders: FolderItem[] = [];
    const markdownFiles: any[] = [];
    for (const file of files) {
      if (file.type === 'directory' && !file.name.startsWith('.')) {
        folders.push({
          name: file.name,
          type: 'folder',
          path: file.uri,
          createdAt: new Date(file.lastModified),
          updatedAt: new Date(file.lastModified),
        });
      } else if (file.name.endsWith('.md')) {
        markdownFiles.push(file);
      }
    }
    return { folders, markdownFiles };
  }

  /**
   * Helper to process markdown files
   */
  private async processMarkdownFiles(files: any[], processFile: (file: any) => Promise<NoteItem | null>): Promise<NoteItem[]> {
    const notePromises = files.map(processFile);
    const notesResults = await Promise.all(notePromises);
    return notesResults.filter(note => note !== null) as NoteItem[];
  }

  /**
   * Helper to process regular files and find folders
   */
  private async processRegularFiles(files: string[], currentDir: string): Promise<{ folders: FolderItem[]; markdownFiles: string[] }> {
    const folders: FolderItem[] = [];
    const markdownFiles: string[] = [];
    const regularFiles: string[] = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        markdownFiles.push(file);
      } else {
        regularFiles.push(file);
      }
    }    const folderPromises = regularFiles.map(async (file) => {
      try {
        // Skip hidden folders (those starting with a period)
        if (file.startsWith('.')) {
          return null;
        }
        
        const filePath = `${currentDir}${file}`;
        const stat = await FileSystem.getInfoAsync(filePath);
        if (stat.exists && stat.isDirectory) {
          const modTime = 'modificationTime' in stat ? stat.modificationTime : Date.now();
          return {
            name: file,
            type: 'folder' as const,
            path: filePath + '/',
            createdAt: new Date(modTime),
            updatedAt: new Date(modTime),
          };
        }
        return null;
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
        return null;
      }
    });

    const folderResults = await Promise.all(folderPromises);
    folders.push(...folderResults.filter(folder => folder !== null) as FolderItem[]);
    return { folders, markdownFiles };
  }

  /**
   * Helper to build directory contents
   */
  private buildDirectoryContents(folders: FolderItem[], notes: NoteItem[], currentPath: string, rootPath: string): DirectoryContents {
    folders.sort((a, b) => a.name.localeCompare(b.name));
    notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      folders,
      notes,
      currentPath,
      parentPath: this.getParentPath(currentPath, rootPath),
    };
  }

  /**
   * Helper to build empty directory contents
   */
  private buildEmptyDirectoryContents(currentPath: string, rootPath: string): DirectoryContents {
    return {
      folders: [],
      notes: [],
      currentPath,
      parentPath: this.getParentPath(currentPath, rootPath),
    };
  }

  /**
   * Navigate to a specific directory
   */
  async navigateToDirectory(path: string): Promise<DirectoryContents> {
    this.setCurrentDirectory(path);
    return await this.getDirectoryContents(path);
  }

  /**
   * Navigate to parent directory
   */
  async navigateToParent(): Promise<DirectoryContents | null> {
    const currentContents = await this.getDirectoryContents();
    if (currentContents.parentPath) {
      this.setCurrentDirectory(currentContents.parentPath);
      return await this.getDirectoryContents(currentContents.parentPath);
    }
    return null;
  }

  /**
   * Navigate to root directory
   */
  async navigateToRoot(): Promise<DirectoryContents> {
    this.resetToRootDirectory();
    return await this.getDirectoryContents();
  }

  /**
   * Import notes from a selected folder
   */
  async importNotes(): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
    if (Platform.OS === 'web') {
      return { success: false, importedCount: 0, errors: ['Import not supported on web platform'] };
    }

    const errors: string[] = [];
    let importedCount = 0;

    try {
      let sourceDirectory: string;
      
      if (Platform.OS === 'android') {
        // Use SAF to select a folder on Android
        const result = await openDocumentTree(true);
        if (!result || !result.uri) {
          return { success: false, importedCount: 0, errors: ['No folder selected'] };
        }
        sourceDirectory = result.uri;
      } else {
        // On iOS, use document picker to select multiple files
        const result = await DocumentPicker.getDocumentAsync({
          type: 'text/*',
          multiple: true,
          copyToCacheDirectory: false,
        });
        
        if (result.canceled || !result.assets || result.assets.length === 0) {
          return { success: false, importedCount: 0, errors: ['No files selected'] };
        }

        // Process individual files on iOS
        for (const asset of result.assets) {
          if (asset.name.endsWith('.md')) {
            try {
              const content = await FileSystem.readAsStringAsync(asset.uri);
              const filename = asset.name.replace('.md', '');
              
              // Create a note object
              const note: Note = {
                filename: this.sanitizeFilename(filename),
                content,
                createdAt: new Date(),
                updatedAt: new Date(),
                filePath: '', // Will be set when saved
              };
              
              await this.saveNote(note);
              importedCount++;
            } catch (error) {
              errors.push(`Failed to import ${asset.name}: ${error}`);
            }
          }
        }
        
        return { success: importedCount > 0, importedCount, errors };
      }

      // Android SAF processing
      await this.ensureDirectoryExists();
      
      // Get all files from the selected directory
      const files = await listFiles(sourceDirectory);
      const markdownFiles = files.filter(file => file.name.endsWith('.md') && file.type === 'file');
      
      // Process each markdown file
      for (const file of markdownFiles) {
        try {
          const content = await readFile(file.uri);
          const filename = file.name.replace('.md', '');
          
          // Create a note object
          const note: Note = {
            filename: this.sanitizeFilename(filename),
            content,
            createdAt: new Date(file.lastModified),
            updatedAt: new Date(file.lastModified),
            filePath: '', // Will be set when saved
          };
          
          await this.saveNote(note);
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import ${file.name}: ${error}`);
        }
      }
      
      return { success: importedCount > 0, importedCount, errors };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, importedCount: 0, errors: [`Import failed: ${error}`] };
    }
  }

  /**
   * Export all notes to a selected folder
   */
  async exportNotes(): Promise<{ success: boolean; exportedCount: number; errors: string[] }> {
    if (Platform.OS === 'web') {
      return this.exportNotesWeb();
    }

    const errors: string[] = [];
    let exportedCount = 0;

    try {
      let destinationDirectory: string;
      
      if (Platform.OS === 'android') {
        // Use SAF to select a destination folder on Android
        const result = await openDocumentTree(true);
        if (!result || !result.uri) {
          return { success: false, exportedCount: 0, errors: ['No folder selected'] };
        }
        destinationDirectory = result.uri;
      } else {
        // On iOS, create a temporary directory and use sharing
        const exportDir = `${FileSystem.cacheDirectory}notes_export/`;
        const dirInfo = await FileSystem.getInfoAsync(exportDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
        }
        destinationDirectory = exportDir;
      }

      // Get all notes
      const notes = await this.getAllNotes();
      
      if (notes.length === 0) {
        return { success: false, exportedCount: 0, errors: ['No notes to export'] };
      }

      // Export each note
      for (const notePreview of notes) {
        try {
          // Get full note content
          const note = await this.getNote(notePreview.filename);
          if (!note) {
            errors.push(`Failed to read note: ${notePreview.filename}`);
            continue;
          }

          const exportFilename = `${this.sanitizeFilename(note.filename)}.md`;
          
          if (Platform.OS === 'android') {
            // Write to SAF directory
            const exportUri = `${destinationDirectory}/${exportFilename}`;
            await writeFile(exportUri, note.content);
          } else {
            // Write to temporary directory on iOS
            const exportPath = `${destinationDirectory}${exportFilename}`;
            await FileSystem.writeAsStringAsync(exportPath, note.content);
          }
          
          exportedCount++;
        } catch (error) {
          errors.push(`Failed to export ${notePreview.filename}: ${error}`);
        }
      }

      // On iOS, we could potentially use sharing here, but for now just return success
      return { success: exportedCount > 0, exportedCount, errors };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, exportedCount: 0, errors: [`Export failed: ${error}`] };
    }
  }

  /**
   * Export notes on web platform using download
   */
  private async exportNotesWeb(): Promise<{ success: boolean; exportedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let exportedCount = 0;

    try {
      const notes = await this.getAllNotes();
      
      if (notes.length === 0) {
        return { success: false, exportedCount: 0, errors: ['No notes to export'] };
      }

      // Create a zip-like structure or individual downloads
      for (const notePreview of notes) {
        try {
          const note = await this.getNote(notePreview.filename);
          if (!note) {
            errors.push(`Failed to read note: ${notePreview.filename}`);
            continue;
          }

          // Create a downloadable file
          const blob = new Blob([note.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.sanitizeFilename(note.filename)}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          exportedCount++;
          
          // Add a small delay to prevent browser from blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          errors.push(`Failed to export ${notePreview.filename}: ${error}`);
        }
      }

      return { success: exportedCount > 0, exportedCount, errors };
    } catch (error) {
      console.error('Web export error:', error);
      return { success: false, exportedCount: 0, errors: [`Export failed: ${error}`] };
    }
  }

  /**
   * Get export directory path for display (iOS only)
   */
  async getExportDirectory(): Promise<string | null> {
    if (Platform.OS !== 'ios') {
      return null;
    }
    
    const exportDir = `${FileSystem.cacheDirectory}notes_export/`;
    return exportDir;
  }
}