import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lesson, Student, ClassroomData } from '../types';
import { dbService } from '../services/db';

interface DataContextType {
  lessons: Lesson[];
  students: Student[];
  isLoading: boolean;
  isReadOnly: boolean; // True if loaded from static JSON
  loadStaticData: (data: ClassroomData) => void; // For Student Mode
  addLesson: (lesson: Lesson) => Promise<void>;
  updateLesson: (lesson: Lesson) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  addStudent: (name: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  assignLesson: (studentId: string, lessonId: string) => Promise<void>;
  getStudentById: (id: string) => Student | undefined;
  getLessonById: (id: string) => Lesson | undefined;
  exportSystemData: () => Promise<ClassroomData>; // For Teacher Export (All Data)
  exportStudentData: (studentId: string) => Promise<ClassroomData>; // For Teacher Export (Single Student)
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const OLD_LOCAL_STORAGE_KEY = 'yuetyu_tutor_data_v1';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Initialize DB and load data normally (Teacher Mode default)
  useEffect(() => {
    const initData = async () => {
      // If we are already in read-only mode (set by App.tsx detecting student link), don't load DB
      if (isReadOnly) return;

      try {
        await dbService.init();
        
        // Attempt migration if user has old data
        await dbService.migrateFromLocalStorage(OLD_LOCAL_STORAGE_KEY);

        const loadedLessons = await dbService.getAllLessons();
        const loadedStudents = await dbService.getAllStudents();
        
        // Sort lessons by date desc
        setLessons(loadedLessons.sort((a, b) => b.createdAt - a.createdAt));
        setStudents(loadedStudents);
      } catch (err) {
        console.error("Failed to initialize database:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [isReadOnly]);

  // Called by App.tsx if it successfully fetches student_data.json
  const loadStaticData = (data: ClassroomData) => {
    setIsReadOnly(true);
    setLessons(data.lessons || []);
    setStudents(data.students || []);
    setIsLoading(false);
  };

  const exportSystemData = async (): Promise<ClassroomData> => {
    // CRITICAL FIX: Fetch directly from IndexedDB to ensure we export exactly what is saved.
    const dbLessons = await dbService.getAllLessons();
    const dbStudents = await dbService.getAllStudents();

    return {
        generatedAt: Date.now(),
        students: dbStudents,
        lessons: dbLessons
    };
  };

  // NEW: Export only one student and their assigned lessons
  const exportStudentData = async (studentId: string): Promise<ClassroomData> => {
    const dbLessons = await dbService.getAllLessons();
    const dbStudents = await dbService.getAllStudents();

    const student = dbStudents.find(s => s.id === studentId);
    if (!student) throw new Error(`Student with ID ${studentId} not found`);

    // Filter lessons to only those assigned to this student
    const relevantLessons = dbLessons.filter(l => student.assignedLessonIds.includes(l.id));

    return {
        generatedAt: Date.now(),
        students: [student],
        lessons: relevantLessons
    };
  };

  const addLesson = async (lesson: Lesson) => {
    if (isReadOnly) return;
    try {
      await dbService.saveLesson(lesson);
      setLessons(prev => [lesson, ...prev]);
    } catch (e) {
      console.error("Failed to save lesson", e);
      alert("Error saving lesson. Storage might be full.");
    }
  };

  const updateLesson = async (updatedLesson: Lesson) => {
    if (isReadOnly) return;
    try {
      await dbService.saveLesson(updatedLesson);
      setLessons(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
    } catch (e) {
      console.error("Failed to update lesson", e);
      alert("Error updating lesson.");
    }
  };

  const deleteLesson = async (id: string) => {
    if (isReadOnly) return;
    try {
      await dbService.deleteLesson(id);
      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      console.error("Failed to delete lesson", e);
    }
  };

  const addStudent = async (name: string) => {
    if (isReadOnly) return;
    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name,
      assignedLessonIds: []
    };
    try {
      await dbService.saveStudent(newStudent);
      setStudents(prev => [...prev, newStudent]);
    } catch (e) {
      console.error("Failed to save student", e);
    }
  };

  const deleteStudent = async (id: string) => {
    if (isReadOnly) return;
    try {
      await dbService.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error("Failed to delete student", e);
    }
  };

  const assignLesson = async (studentId: string, lessonId: string) => {
    if (isReadOnly) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    // Avoid duplicates
    if (student.assignedLessonIds.includes(lessonId)) return;

    const updatedStudent = { 
      ...student, 
      assignedLessonIds: [lessonId, ...student.assignedLessonIds] 
    };

    try {
      await dbService.saveStudent(updatedStudent);
      setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));
    } catch (e) {
      console.error("Failed to assign lesson", e);
    }
  };

  const getStudentById = (id: string) => students.find(s => s.id === id);
  const getLessonById = (id: string) => lessons.find(l => l.id === id);

  return (
    <DataContext.Provider value={{
      lessons,
      students,
      isLoading,
      isReadOnly,
      loadStaticData,
      exportSystemData,
      exportStudentData,
      addLesson,
      updateLesson,
      deleteLesson,
      addStudent,
      deleteStudent,
      assignLesson,
      getStudentById,
      getLessonById
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};