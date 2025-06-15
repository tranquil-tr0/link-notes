export interface FolderItem {
  name: string;
  type: 'folder';
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteItem {
  filename: string;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
  filePath: string;
  type: 'note';
}

export type FileSystemItem = FolderItem | NoteItem;

export interface DirectoryContents {
  folders: FolderItem[];
  notes: NoteItem[];
  currentPath: string;
  parentPath: string | null;
}