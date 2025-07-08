"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

import apiClient, { authAPI, usersAPI, type User } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    delete apiClient.defaults.headers.Authorization;
    setUser(null);
    if (window.location.pathname !== "/") {
      router.push("/");
    }
  }, [router]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      apiClient.defaults.headers.Authorization = `Bearer ${token}`;
      try {
        const userData = await usersAPI.getProfile();
        setUser(userData);
        // Redirecionamento na verificação
        if (
          userData.role === "colaborador" &&
          window.location.pathname === "/"
        ) {
          router.push("/leads");
        }
      } catch (error) {
        console.error("Falha na verificação do token, limpando sessão:", error);
        logout();
      }
    }
    setIsLoading(false);
  }, [router, logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem("auth_token", response.token);
      apiClient.defaults.headers.Authorization = `Bearer ${response.token}`;
      setUser(response.user);

      // Redirecionamento após o login
      if (response.user.role === "colaborador") {
        router.push("/leads");
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      throw error; // Propaga o erro para o componente de login poder tratá-lo
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await usersAPI.updateProfile(userData);
      setUser(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
