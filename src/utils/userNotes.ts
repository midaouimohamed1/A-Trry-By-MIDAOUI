/**
 * User Model Notes & Personal Rating Utility
 * Allows users to write personal research notes and assign custom star ratings
 * to any of the 1,000 models, saved securely in browser localStorage.
 */

export interface UserModelNote {
  modelRank: number;
  personalRating?: number; // 1 to 5 stars
  noteText: string;
  tags?: string[];
  updatedAt: string;
}

const USER_NOTES_STORAGE_KEY = 'ai_directory_user_notes_v1';
let inMemoryNotes: Record<number, UserModelNote> = {};

export function getAllUserNotes(): Record<number, UserModelNote> {
  try {
    if (typeof localStorage === 'undefined') return { ...inMemoryNotes };
    const raw = localStorage.getItem(USER_NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...inMemoryNotes };
  } catch {
    return { ...inMemoryNotes };
  }
}

export function getUserNoteForModel(rank: number): UserModelNote | null {
  const notes = getAllUserNotes();
  return notes[rank] || null;
}

export function saveUserNoteForModel(rank: number, noteText: string, personalRating?: number): void {
  try {
    const notes = getAllUserNotes();
    if (!noteText.trim() && !personalRating) {
      delete notes[rank];
      delete inMemoryNotes[rank];
    } else {
      const note: UserModelNote = {
        modelRank: rank,
        noteText: noteText.trim(),
        personalRating,
        updatedAt: new Date().toISOString()
      };
      notes[rank] = note;
      inMemoryNotes[rank] = note;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  } catch (e) {
    console.warn('Failed to save user note to localStorage:', e);
  }
}

export function deleteUserNoteForModel(rank: number): void {
  try {
    delete inMemoryNotes[rank];
    if (typeof localStorage !== 'undefined') {
      const notes = getAllUserNotes();
      delete notes[rank];
      localStorage.setItem(USER_NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  } catch (e) {
    console.warn('Failed to delete note:', e);
  }
}
