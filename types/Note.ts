export interface Note {
  filename: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  filePath: string;
}

export interface NotePreview {
  filename: string;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
  filePath: string;
}