import { Lesson, Student } from '../types';

const DB_NAME = 'YuetYuTutorDB';
const DB_VERSION = 1;
const STORE_LESSONS = 'lessons';
const STORE_STUDENTS = 'students';

class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", request.error);
        reject("Could not open database");
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_LESSONS)) {
          db.createObjectStore(STORE_LESSONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
          db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async getAllLessons(): Promise<Lesson[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_LESSONS, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLesson(lesson: Lesson): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_LESSONS, 'readwrite');
      const request = store.put(lesson);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLesson(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_LESSONS, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllStudents(): Promise<Student[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_STUDENTS, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveStudent(student: Student): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_STUDENTS, 'readwrite');
      const request = store.put(student);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Migration utility to move data from localStorage to IndexedDB if it exists
  async migrateFromLocalStorage(key: string): Promise<boolean> {
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      if (data.lessons && Array.isArray(data.lessons)) {
        for (const l of data.lessons) await this.saveLesson(l);
      }
      if (data.students && Array.isArray(data.students)) {
        for (const s of data.students) await this.saveStudent(s);
      }
      // Clear localStorage to free up space and prevent confusion
      localStorage.removeItem(key);
      console.log("Migration from localStorage successful");
      return true;
    } catch (e) {
      console.error("Migration failed", e);
      return false;
    }
  }
}

export const dbService = new DBService();
