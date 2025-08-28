"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Home, LogOut, Menu, Plus, Share2, Upload, X, RefreshCw, CheckCircle, Key } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, logout, user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userData, setUserData] = useState({ name: "", role: "" })

  // Use useEffect to check if component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user data when component mounts or user changes
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (user?.email) {
          const response = await fetch(
            `https://script.google.com/macros/s/AKfycbypGlYvVv_nxEZvWqUaUdt-H1Kx3vLhHTySwEoRR18eNCDiAucE1Tg65Tye5LcyhHAuqQ/exec?sheetId=1LFzTIS8qW6nN0zWsRf4ZLtYDB3N-slxHEq7MQLNzH5c&email=${user.email}`
          )
          const data = await response.json()
          if (data && data.length > 0) {
            setUserData({
              name: data[0] || "User",
              role: data[3] || "User"
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [user])

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when screen size increases
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar")
      const menuButton = document.getElementById("menu-button")

      if (
        isMobileMenuOpen &&
        sidebar &&
        menuButton &&
        !sidebar.contains(event.target as Node) &&
        !menuButton.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/documents") return pathname === "/documents" || pathname === "/documents/";
    return pathname === path || pathname === `${path}/`;
  }

  const handleLogout = () => {
    logout()
  }

  const menuItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Add Document", path: "/documents/add", icon: Plus },
    { name: "All Documents", path: "/documents", icon: FileText },
    { name: "Renewal", path: "/documents/renewal", icon: RefreshCw },
    { name: "Shared", path: "/shared", icon: Share2 },
    // { name: "Approval", path: "/documents/approval", icon: CheckCircle },
    { name: "License", path: "/documents/license", icon: Key },
  ];

  if (pathname === "/login") {
    return null
  }

  if (!mounted || !isLoggedIn) {
    return (
      <div className="md:hidden fixed top-4 left-4 z-50" id="menu-button">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/login")}
          className="bg-white text-gray-800 hover:bg-gray-100 p-2 h-10 w-10 rounded-lg shadow-sm"
          aria-label="Login"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Mobile menu button - updated colors */}
      <div className="md:hidden fixed top-4 left-4 z-50" id="menu-button">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white text-[#407FF6] hover:bg-[#407FF6] hover:text-white p-2 h-10 w-10 rounded-lg shadow-sm"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - updated theme */}
      <aside
        id="sidebar"
        className={`fixed md:sticky top-0 left-0 z-40 w-[85%] xs:w-[280px] md:w-64 bg-white text-gray-800 h-[100dvh] flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } shadow-lg border-r border-gray-200`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#407FF6] to-[#A555F7]">
          <h1 className="text-xl font-semibold flex items-center text-white">
            <FileText className="mr-2 flex-shrink-0" />
            <span className="truncate">Document Manager</span>
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-white hover:bg-white/20 p-1 h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-1 p-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center p-3 rounded-md transition-colors ${
                  isActive(item.path) 
                    ? "bg-gradient-to-r from-[#407FF6] to-[#A555F7] text-white font-medium" 
                    : "text-gray-700 hover:bg-gradient-to-r hover:from-[#407FF6]/10 hover:to-[#A555F7]/10 hover:text-[#407FF6]"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive(item.path) ? "text-white" : "text-[#407FF6]"}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full border-[#407FF6] text-[#407FF6] hover:bg-gradient-to-r hover:from-[#407FF6] hover:to-[#A555F7] hover:text-white hover:border-transparent h-10 transition-all"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}