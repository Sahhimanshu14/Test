'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { RoleType, AcademyTarget } from '@cdsprep/types';
import type { RegisterInput, LoginInput } from '@cdsprep/validation';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  targetAcademy: AcademyTarget;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  currentStreak: number;
  highestStreak: number;
  roles: RoleType[];
  permissions: string[];
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginInput) => Promise<UserProfile>;
  register: (dto: RegisterInput) => Promise<{ user: UserProfile; verificationToken: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await apiClient.get<UserProfile>('/auth/me');
      setUser(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cdsprep_user', JSON.stringify(profile));
      }
    } catch {
      setUser(null);
      apiClient.clearTokens();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('cdsprep_user');
        const token = localStorage.getItem('cdsprep_access_token');
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
          // Synchronize profile in background
          refreshProfile();
        }
      } catch {
        apiClient.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshProfile]);

  const login = async (dto: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{
        user: UserProfile;
        tokens: { accessToken: string; refreshToken: string };
      }>('/auth/login', dto);

      apiClient.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setUser(response.user);
      localStorage.setItem('cdsprep_user', JSON.stringify(response.user));
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: RegisterInput) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{
        user: UserProfile;
        tokens: { accessToken: string; refreshToken: string };
        verificationToken: string;
      }>('/auth/register', dto);

      apiClient.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setUser(response.user);
      localStorage.setItem('cdsprep_user', JSON.stringify(response.user));
      return {
        user: response.user,
        verificationToken: response.verificationToken,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      apiClient.clearTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
