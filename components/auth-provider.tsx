"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { DocumentProvider } from "./document-context"

type AuthContextType = {
  isLoggedIn: boolean
  userRole: string | null
  userName: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is logged in from localStorage
    const loadAuthData = () => {
      try {
        const loggedIn = localStorage.getItem("isLoggedIn") === "true"
        const role = localStorage.getItem("userRole")
        const name = localStorage.getItem("userName")
        
        if (loggedIn) {
          setIsLoggedIn(true)
          setUserRole(role)
          setUserName(name)
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuthData()
  }, [])

  // Listen for storage events (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "isLoggedIn") {
        setIsLoggedIn(event.newValue === "true")
      }
      if (event.key === "userRole") {
        setUserRole(event.newValue)
      }
      if (event.key === "userName") {
        setUserName(event.newValue)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn && pathname !== "/login") {
        router.push("/login")
      } else if (isLoggedIn && pathname === "/login") {
        router.push("/")
      }
    }
  }, [isLoggedIn, pathname, router, isLoading])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://script.google.com/macros/s/AKfycbypGlYvVv_nxEZvWqUaUdt-H1Kx3vLhHTySwEoRR18eNCDiAucE1Tg65Tye5LcyhHAuqQ/exec?sheet=Pass&action=fetch`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error("Invalid data format from server");
      }
      
      const users = data.data.slice(1);
      const matchedUser = users.find((user: any[]) => 
        user[1]?.toString().toLowerCase() === username.toLowerCase() && 
        user[2]?.toString() === password
      );
      
      if (matchedUser) {
        // Store all user data in localStorage
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", matchedUser[3] || "user");
        localStorage.setItem("userName", matchedUser[0] || "");
        
        // Update state
        setIsLoggedIn(true);
        setUserRole(matchedUser[3] || "user");
        setUserName(matchedUser[0] || "");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }

  const logout = () => {
    // Clear all auth-related data from localStorage
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userName")
    
    // Update state
    setIsLoggedIn(false)
    setUserRole(null)
    setUserName(null)
    
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, userName, login, logout }}>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <DocumentProvider>{children}</DocumentProvider>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}