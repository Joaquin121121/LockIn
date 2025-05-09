import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// Collection names
const SETTINGS_COLLECTION = "settings";
const SESSIONS_COLLECTION = "sessions";

// Document IDs
const TIMER_SETTINGS_DOC = "timer_settings";

// =================================================================
// Timer Settings
// =================================================================

// Get timer settings from Firestore
export const getTimerSettings = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, TIMER_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return null if no settings document exists
      return null;
    }
  } catch (error) {
    console.error("Error getting timer settings:", error);
    return null;
  }
};

// Save timer settings to Firestore
export const saveTimerSettings = async (settings: any) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, TIMER_SETTINGS_DOC);
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving timer settings:", error);
    return false;
  }
};

// =================================================================
// Sessions
// =================================================================

// Save a completed session to Firestore
export const saveSession = async (sessionData: {
  date: string;
  type: string;
  duration: number;
  completed: boolean;
}) => {
  try {
    // Create a new document with auto-generated ID
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const docRef = doc(sessionsRef);

    // Add timestamp for better querying
    const session = {
      ...sessionData,
      timestamp: Timestamp.now(),
      id: docRef.id,
    };

    await setDoc(docRef, session);
    return session.id;
  } catch (error) {
    console.error("Error saving session:", error);
    return null;
  }
};

// Get all sessions for a specific date
export const getSessionsByDate = async (date: string) => {
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const q = query(
      sessionsRef,
      where("date", "==", date),
      orderBy("timestamp", "asc")
    );

    const querySnapshot = await getDocs(q);
    const sessions: any[] = [];

    querySnapshot.forEach((doc) => {
      sessions.push({ ...doc.data(), id: doc.id });
    });

    return sessions;
  } catch (error) {
    console.error("Error getting sessions by date:", error);
    return [];
  }
};

// Get sessions within a date range
export const getSessionsInRange = async (
  startDate: string,
  endDate: string
) => {
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const q = query(
      sessionsRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const sessions: any[] = [];

    querySnapshot.forEach((doc) => {
      sessions.push({ ...doc.data(), id: doc.id });
    });

    return sessions;
  } catch (error) {
    console.error("Error getting sessions in range:", error);
    return [];
  }
};

// Get all sessions
export const getAllSessions = async () => {
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const q = query(sessionsRef, orderBy("date", "desc"));

    const querySnapshot = await getDocs(q);
    const sessions: any[] = [];

    querySnapshot.forEach((doc) => {
      sessions.push({ ...doc.data(), id: doc.id });
    });

    return sessions;
  } catch (error) {
    console.error("Error getting all sessions:", error);
    return [];
  }
};

// Delete a session
export const deleteSession = async (sessionId: string) => {
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await deleteDoc(sessionRef);
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
};
