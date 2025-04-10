"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileCode,
  Trophy,
  LogOut,
  Menu,
  PlusCircle,
  UserPlus,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  variant: "default" | "ghost"
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const isMobile = useMobile()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!user)
  }, [user])

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  // Close mobile menu when navigating
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Update the isActive function to better handle exact matches and parent routes
  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") {
      return true
    }
    return pathname === path || (pathname.startsWith(`${path}/`) && path !== "/dashboard")
  }

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      variant: "default",
    },
    {
      title: "My Hackathons",
      href: "/dashboard/my-hackathons",
      icon: <Calendar className="h-5 w-5" />,
      variant: "ghost",
    },
    {
      title: "Teams",
      href: "/dashboard/teams",
      icon: <Users className="h-5 w-5" />,
      variant: "ghost",
    },
    {
      title: "Submit Project",
      href: "/dashboard/submit",
      icon: <FileCode className="h-5 w-5" />,
      variant: "default",
    },
    // {
    //   // title: "Leaderboard",
    //   // href: "/dashboard/leaderboard",
    //   // icon: <Trophy className="h-5 w-5" />,
    //   // variant: "ghost",
    // },
    {
      title: "Profile",
      href: "/profile",
      icon: <User className="h-5 w-5" />,
      variant: "ghost",
    },
  ]

  const teamManagementItems: NavItem[] = [
    {
      title: "Create Team",
      href: "/dashboard/teams/create",
      icon: <PlusCircle className="h-5 w-5" />,
      variant: "ghost",
    },
    {
      title: "Join Team",
      href: "/dashboard/teams/join",
      icon: <UserPlus className="h-5 w-5" />,
      variant: "ghost",
    },
  ]

  const activeHackathonsItems: NavItem[] = [
    {
      title: "Browse Hackathons",
      href: "/hackathons",
      icon: <Calendar className="h-5 w-5" />,
      variant: "ghost",
    },
  ]

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }


  return (
    <>
      {!isLoggedIn ? (
        // Loading state or null
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="animate-pulse text-xl">Loading...</div>
        </div>
      ) : (
        // Main dashboard layout
        <div className="flex min-h-screen bg-black">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-[#0A0A0A]">
            <div className="p-6">
              <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-[#00FFBF]">
                GeekCode
              </Link>
            </div>
            <ScrollArea className="flex-1 py-2">
              {/* Update the navItems styling to match the screenshot */}
              <nav className="grid gap-1 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-[#00FFBF] text-black font-medium"
                        : "text-gray-400 hover:text-white hover:bg-[#00FFBF]/10",
                    )}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                ))}
              </nav>
              <div className="px-3 py-4">
                <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">TEAM MANAGEMENT</div>
                {/* Also update the same styling in the mobile menu and other navigation sections */}
                <nav className="grid gap-1">
                  {teamManagementItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-[#00FFBF] text-black font-medium"
                          : "text-gray-400 hover:text-white hover:bg-[#00FFBF]/10",
                      )}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="px-3 py-4">
                <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
                  ACTIVE HACKATHONS
                </div>
                {/* And for the active hackathons section */}
                <nav className="grid gap-1">
                  {activeHackathonsItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-[#00FFBF] text-black font-medium"
                          : "text-gray-400 hover:text-white hover:bg-[#00FFBF]/10",
                      )}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-8 w-8 border border-gray-700">
                  {user?.photoURL ? <AvatarImage src={user.photoURL} alt={user.displayName || "User"} /> : null}
                  <AvatarFallback>{getInitials(user?.displayName || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-900"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>
          </aside>

          {/* Mobile sidebar */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-40">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-[#0A0A0A] border-r border-gray-800">
              <div className="p-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-[#00FFBF]">
                  GeekCode
                </Link>
              </div>
              <ScrollArea className="h-[calc(100vh-8rem)]">
                {/* Update the mobile menu with the same hover styles */}
                <nav className="grid gap-1 px-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-[#00FFBF] text-black font-medium"
                          : "text-gray-400 hover:text-white hover:bg-[#00FFBF]/10",
                      )}
                      onClick={() => setOpen(false)}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  ))}
                </nav>
                <div className="px-3 py-4">
                  <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
                    TEAM MANAGEMENT
                  </div>
                  <nav className="grid gap-1">
                    {teamManagementItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive(item.href)
                            ? "bg-[#00FFBF] text-black font-medium"
                            : "text-gray-400 hover:text-white hover:bg-[#00FFBF]/10",
                        )}
                        onClick={() => setOpen(false)}
                      >
                        {item.icon}
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                </div>
                <div className="px-3 py-4">
                  <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
                    ACTIVE HACKATHONS
                  </div>
                  <nav className="grid gap-1">
                    {activeHackathonsItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive(item.href)
                            ? "bg-[#00FFBF] text-black font-medium"
                            : "text-gray-400 hover:text-white hover:bg-[#00FFBF]/10",
                        )}
                        onClick={() => setOpen(false)}
                      >
                        {item.icon}
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-8 w-8 border border-gray-700">
                    {user?.photoURL ? <AvatarImage src={user.photoURL} alt={user.displayName || "User"} /> : null}
                    <AvatarFallback>{getInitials(user?.displayName || "")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-900"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">{children}</div>
          </main>
        </div>
      )}
    </>
  )
}

