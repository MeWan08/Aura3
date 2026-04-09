'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider, rtdb } from '../lib/firebase';
import { ref, get, set, onValue } from 'firebase/database';

export type UserRole = 'investor' | 'startup';

const LEGACY_STARTUP_ROLE = 'founder';

const normalizeRole = (role: string | null | undefined): UserRole | null => {
  if (!role) return null;
  if (role === LEGACY_STARTUP_ROLE) return 'startup';
  if (role === 'investor' || role === 'startup') return role;
  return null;
};

export const getDashboardPath = (role: UserRole | null) => {
  if (role === 'investor') return '/investor';
  if (role === 'startup') return '/founder';
  return '/';
};

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  loading: boolean;
  loginWithGoogleRole: (role: UserRole) => Promise<void>;
  signupWithRole: (role: UserRole, email: string, password: string) => Promise<void>;
  loginWithRole: (role: UserRole, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true,
  loginWithGoogleRole: async () => {},
  signupWithRole: async () => {},
  loginWithRole: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const syncRoleForUser = async (user: User, requestedRole: UserRole) => {
    const userRef = ref(rtdb, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      await set(userRef, {
        email: user.email,
        role: requestedRole,
        createdAt: new Date().toISOString(),
      });
      setUserRole(requestedRole);
      return;
    }

    const existingRole = normalizeRole(snapshot.val().role);
    if (!existingRole) {
      await set(userRef, {
        ...snapshot.val(),
        role: requestedRole,
      });
      setUserRole(requestedRole);
      return;
    }

    if (existingRole !== requestedRole) {
      throw new Error(`This account is registered as ${existingRole}. Please use the ${existingRole} login page.`);
    }

    // Upgrade legacy founder role to startup for consistency.
    if (snapshot.val().role === LEGACY_STARTUP_ROLE) {
      await set(userRef, {
        ...snapshot.val(),
        role: existingRole,
      });
    }

    setUserRole(existingRole);
  };

  useEffect(() => {
    let unsubscribeSnapshot: () => void;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Synchronize role from RTDB
        const userRef = ref(rtdb, `users/${user.uid}`);
        unsubscribeSnapshot = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserRole(normalizeRole(snapshot.val().role));
          } else {
            setUserRole(null);
          }
          setAuthLoading(false);
        });
      } else {
        setUserRole(null);
        setAuthLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const loading = authLoading || isLoggingIn;

  const loginWithGoogleRole = async (role: UserRole) => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncRoleForUser(result.user, role);
    } catch (error) {
      await signOut(auth);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signupWithRole = async (role: UserRole, email: string, password: string) => {
    setIsLoggingIn(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await syncRoleForUser(result.user, role);
    } catch (error) {
      await signOut(auth);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithRole = async (role: UserRole, email: string, password: string) => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncRoleForUser(result.user, role);
    } catch (error) {
      await signOut(auth);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        loading,
        loginWithGoogleRole,
        signupWithRole,
        loginWithRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
