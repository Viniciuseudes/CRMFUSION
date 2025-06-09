"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { authAPI, usersAPI, type User } from "@/lib/api-client"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (token) {
        const userData = await usersAPI.getProfile()
        setUser(userData)
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error)
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      localStorage.setItem("auth_token", response.token)
      localStorage.setItem("current_user", JSON.stringify(response.user))
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("current_user")
    setUser(null)
  }

  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await usersAPI.updateProfile(userData)
      setUser(updatedUser)
      localStorage.setItem("current_user", JSON.stringify(updatedUser))
    } catch (error) {
      throw error
    }
  }

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
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
