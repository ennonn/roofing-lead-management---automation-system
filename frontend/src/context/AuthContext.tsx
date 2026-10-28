import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { AuthUser, LoginDto } from "@roofing/shared-types";
import { loginUser, logoutUser, getActiveSession } from "../services/auth.service";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  initialUser?: AuthUser | null;
  skipInitialCheck?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialUser = null,
  skipInitialCheck = false,
}) => {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(initialUser));
  const [isLoading, setIsLoading] = useState<boolean>(!skipInitialCheck && !initialUser);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeUser = await getActiveSession();
      if (activeUser) {
        setUser(activeUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (_err) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!skipInitialCheck && !initialUser) {
      refreshSession();
    }
  }, [skipInitialCheck, initialUser, refreshSession]);

  const login = useCallback(async (credentials: LoginDto): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const authenticatedUser = await loginUser(credentials);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      setError(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
