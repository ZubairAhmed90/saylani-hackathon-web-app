"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { BarChart3, Users, Trophy, LayoutDashboard, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  if (!user?.isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-xl">Access denied. You must be an admin to view this page.</div>
      </div>
    )
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Profile", href: "/admin/profile", icon: User },
  ]

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your admin account",
      })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was an error signing you out. Please try again.",
      })
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "A"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-[#1A1A1A] border-r border-gray-800 md:min-h-[calc(100vh-64px)] flex flex-col">
        <div className="p-4 flex-1">
          <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors ${
                    isActive ? "bg-[#00FFBF]/10 text-[#00FFBF] font-medium" : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive ? "text-[#00FFBF]" : ""}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Logout Button in Sidebar */}
        <div className="p-4 border-t border-gray-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}