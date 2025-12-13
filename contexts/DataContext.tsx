import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lesson, Student } from '../types';
import { dbService } from '../services/db';

interface DataContextType {
  lessons: Lesson[];
  students: Student[];
  isLoading: boolean;
  addLesson: (lesson: Lesson) => Promise<void>;
  updateLesson: (lesson: Lesson) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  addStudent: (name: string) => Promise<void>;
  assignLesson: (studentId: string, lessonId: string) => Promise<void>;
  getStudentById: (id: string) => Student | undefined;
  getLessonById: (id: string) => Lesson | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const OLD_LOCAL_STORAGE_KEY = 'yuetyu_tutor_data_v1';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB and load data
  useEffect(() => {
    const initData = async () => {
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
        alert("Database error: Your browser might be in private mode or blocking storage.");
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const addLesson = async (lesson: Lesson) => {
    try {
      await dbService.saveLesson(lesson);
      setLessons(prev => [lesson, ...prev]);
    } catch (e) {
      console.error("Failed to save lesson", e);
      alert("Error saving lesson. Storage might be full.");
    }
  };

  const updateLesson = async (updatedLesson: Lesson) => {
    try {
      await dbService.saveLesson(updatedLesson);
      setLessons(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
    } catch (e) {
      console.error("Failed to update lesson", e);
      alert("Error updating lesson.");
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      await dbService.deleteLesson(id);
      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      console.error("Failed to delete lesson", e);
    }
  };

  const addStudent = async (name: string) => {
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

  const assignLesson = async (studentId: string, lessonId: string) => {
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
      addLesson,
      updateLesson,
      deleteLesson,
      addStudent,
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
