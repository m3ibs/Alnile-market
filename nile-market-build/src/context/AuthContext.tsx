import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, PRIMARY_ADMIN_EMAIL } from '../firebase';
import { syncUserOnSignIn } from '../services/marketplaceService';
import { UserPrivate, UserPublic } from '../types/marketplace';

interface AuthContextValue {
  user: User | null;
  userProfile: UserPublic | null;
  userPrivate: UserPrivate | null;
  isAdmin: boolean;
  authReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserPublic | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUserSync = useCallback(async (firebaseUser: User) => {
    try {
      const synced = await syncUserOnSignIn(firebaseUser);
      setUserProfile(synced.publicProfile);
      setUserPrivate(synced.privateProfile);
      setIsAdmin(synced.isAdmin);
      if (synced.publicProfile.isBanned) {
        setAuthError('تم تقييد هذا الحساب من قبل إدارة المنصة.');
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err);
      const isPrimary =
        firebaseUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() &&
        firebaseUser.emailVerified;
      setIsAdmin(isPrimary);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadUserSync(firebaseUser);
      } else {
        setUserProfile(null);
        setUserPrivate(null);
        setIsAdmin(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [loadUserSync]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await loadUserSync(result.user);
      return result.user;
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('قام المتصفح بحظر نافذة Google المنبثقة. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.');
      } else {
        setAuthError('تعذر تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, [loadUserSync]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setUserPrivate(null);
    setIsAdmin(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await loadUserSync(auth.currentUser);
    }
  }, [loadUserSync]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        userPrivate,
        isAdmin,
        authReady,
        isSigningIn,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        signOutUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
