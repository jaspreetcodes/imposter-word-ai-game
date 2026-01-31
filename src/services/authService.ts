/**
 * Authentication Service
 * Handles Firebase Auth operations and user profile management
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: any;
  lastSeen: any;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await updateUserLastSeen(userCredential.user.uid);
  return userCredential.user;
}

/**
 * Sign up with email, password, and display name
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const auth = getAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update display name in auth
  // Note: Firebase Auth doesn't have a direct way to set displayName during creation
  // We'll store it in Firestore instead
  
  // Create user profile in Firestore
  await createUserProfile(userCredential.user.uid, {
    displayName,
    email,
  });
  
  return userCredential.user;
}

/**
 * Sign in with Google
 * Uses popup first, falls back to redirect if popup is blocked
 */
export async function signInWithGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  
  try {
    // Try popup first (better UX)
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Create or update user profile
    const profile = await getUserProfile(user.uid);
    
    if (!profile) {
      // New user, create profile
      await createUserProfile(user.uid, {
        displayName: user.displayName || "User",
        email: user.email || "",
      });
    } else {
      // Existing user, update last seen
      await updateUserLastSeen(user.uid);
    }
    
    return user;
  } catch (error: any) {
    // If popup is blocked or fails, use redirect
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user" || 
        error.message?.includes("sessionStorage") || error.message?.includes("initial state")) {
      // Use redirect instead
      await signInWithRedirect(auth, provider);
      // Note: After redirect, getRedirectResult() should be called on page load
      // This is handled in AuthContext
      throw new Error("REDIRECT_INITIATED");
    }
    throw error;
  }
}

/**
 * Handle Google sign-in redirect result
 * Call this on app initialization to check if user returned from redirect
 */
export async function handleGoogleRedirect(): Promise<FirebaseUser | null> {
  const auth = getAuth();
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const user = result.user;
      
      // Create or update user profile
      const profile = await getUserProfile(user.uid);
      
      if (!profile) {
        // New user, create profile
        await createUserProfile(user.uid, {
          displayName: user.displayName || "User",
          email: user.email || "",
        });
      } else {
        // Existing user, update last seen
        await updateUserLastSeen(user.uid);
      }
      
      return user;
    }
    return null;
  } catch (error: any) {
    console.error("Error handling Google redirect:", error);
    // If error is about permissions, it's likely the user cancelled
    // Don't throw, just return null
    if (error.message?.includes("permissions") || error.code === "auth/popup-closed-by-user") {
      return null;
    }
    return null;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  const auth = getAuth();
  await firebaseSignOut(auth);
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): FirebaseUser | null {
  const auth = getAuth();
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  const auth = getAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Create user profile in Firestore
 */
async function createUserProfile(userId: string, data: { displayName: string; email: string }) {
  try {
    await setDoc(doc(db, "users", userId), {
      displayName: data.displayName,
      email: data.email,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Update user's display name
 */
export async function updateDisplayName(userId: string, displayName: string) {
  try {
    await updateDoc(doc(db, "users", userId), {
      displayName,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating display name:", error);
    throw error;
  }
}

/**
 * Update user's last seen timestamp
 */
async function updateUserLastSeen(userId: string) {
  try {
    await updateDoc(doc(db, "users", userId), {
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating last seen:", error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Email validation regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
