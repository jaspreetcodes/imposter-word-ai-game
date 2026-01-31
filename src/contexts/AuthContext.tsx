/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  onAuthStateChange,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  handleGoogleRedirect,
  signOut,
  getUserProfile,
  updateDisplayName,
  type UserProfile,
} from "../services/authService";

export interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for Google redirect result on mount
  useEffect(() => {
    let mounted = true;
    
    // Check for Google redirect
    handleGoogleRedirect().then((redirectUser) => {
      if (redirectUser && mounted) {
        // User returned from redirect, profile already created in handleGoogleRedirect
        // Auth state change will update user/profile, and pages will handle navigation
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userProfile = await getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
    // Auth state change will update user/profile
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    await signUpWithEmail(email, password, displayName);
    // Auth state change will update user/profile
  };

  const signInGoogle = async () => {
    await signInWithGoogle();
    // Auth state change will update user/profile
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
  };

  const updateUserDisplayName = async (displayName: string) => {
    if (!user) throw new Error("No user logged in");
    await updateDisplayName(user.uid, displayName);
    // Refresh profile
    const updatedProfile = await getUserProfile(user.uid);
    setProfile(updatedProfile);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInGoogle,
      signOut: handleSignOut,
      updateUserDisplayName,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
