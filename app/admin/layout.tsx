"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  BarChart3,
  Users,
  Trophy,
  LayoutDashboard,
  LogOut,
  UserCircle,
} from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // If not admin, deny access
  if (!user?.isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-xl">Access denied. You must be an admin to view this page.</div>
      </div>
    )
  }

  // Admin navigation links
  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
    { name: "Users", href: "/admin/users", icon: Users },
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-[#1A1A1A] border-r border-gray-800 md:min-h-[calc(100vh-64px)] flex flex-col justify-between">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
          <nav className="space-y-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname?.startsWith(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-0 py-3 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-[#00FFBF]/10 text-[#00FFBF] font-medium"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive ? "text-[#00FFBF]" : ""}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Profile & Logout */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link
            href="/profile"
            className="flex items-center px-0 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <UserCircle className="h-5 w-5 mr-3" />
            Profile
          </Link>

          <button
            onClick={async () => {
              await logout()
              router.push("/") // Redirect to homepage
            }}
            className="flex items-center w-full px-0 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}
