import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lesson, Student } from '../types';

interface DataContextType {
  lessons: Lesson[];
  students: Student[];
  addLesson: (lesson: Lesson) => void;
  updateLesson: (lesson: Lesson) => void;
  deleteLesson: (id: string) => void;
  addStudent: (name: string) => void;
  assignLesson: (studentId: string, lessonId: string) => void;
  getStudentById: (id: string) => Student | undefined;
  getLessonById: (id: string) => Lesson | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'yuetyu_tutor_data_v1';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLessons(parsed.lessons || []);
        setStudents(parsed.students || []);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ lessons, students }));
  }, [lessons, students]);

  const addLesson = (lesson: Lesson) => {
    setLessons(prev => [lesson, ...prev]);
  };

  const updateLesson = (updatedLesson: Lesson) => {
    setLessons(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
  };

  const deleteLesson = (id: string) => {
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  const addStudent = (name: string) => {
    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name,
      assignedLessonIds: []
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const assignLesson = (studentId: string, lessonId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        // Avoid duplicates
        if (s.assignedLessonIds.includes(lessonId)) return s;
        return { ...s, assignedLessonIds: [lessonId, ...s.assignedLessonIds] };
      }
      return s;
    }));
  };

  const getStudentById = (id: string) => students.find(s => s.id === id);
  const getLessonById = (id: string) => lessons.find(l => l.id === id);

  return (
    <DataContext.Provider value={{
      lessons,
      students,
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