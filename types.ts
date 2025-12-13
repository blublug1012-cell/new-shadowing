
export interface Word {
  char: string;
  jyutping: string[]; // Array for polyphones
  selectedJyutping: string;
}

export interface Sentence {
  id: string;
  words: Word[];
  english: string;
  audioBase64?: string; // Teacher's recording
}

export interface Lesson {
  id: string;
  title: string;
  createdAt: number;
  mediaUrl?: string; // Optional image/video URL
  mediaType?: 'image' | 'video';
  sentences: Sentence[];
}

export interface Student {
  id: string;
  name: string;
  assignedLessonIds: string[];
}

export interface StudentPackage {
  studentName: string;
  generatedAt: number;
  lessons: Lesson[];
}

// New Interface for the master file
export interface ClassroomData {
  generatedAt: number;
  students: Student[];
  lessons: Lesson[]; // Contains all lessons referenced by students
}

export enum AppMode {
  ROLE_SELECT = 'ROLE_SELECT',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  TEACHER_EDITOR = 'TEACHER_EDITOR',
  STUDENT_PORTAL = 'STUDENT_PORTAL',
  STUDENT_PRACTICE = 'STUDENT_PRACTICE'
}
