"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Don't show navbar on dashboard pages
  if (pathname?.startsWith("/dashboard")|| pathname?.startsWith("/admin")) {
    return null
  }

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Hackathons", href: "/hackathons" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "FAQs", href: "/faqs" },
    { name: "About", href: "/about" },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled ? "bg-black/90 backdrop-blur-sm border-b border-gray-800" : "bg-black"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold text-[#00FFBF]">GeekCode</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-[#00FFBF] relative py-2 ${
                pathname === link.href
                  ? "text-[#00FFBF] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#00FFBF]"
                  : "text-gray-300"
              }`}
            >
              {link.name}
            </Link>
          ))}

          {user && user.isAdmin && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors hover:text-[#00FFBF] relative py-2 ${
                pathname?.startsWith("/admin")
                  ? "text-[#00FFBF] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#00FFBF]"
                  : "text-gray-300"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <>
              {!user.isAdmin && (
                <Button asChild variant="ghost" className="hover:bg-gray-800">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              )}
              <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                <Link href="/profile">Profile</Link>
              </Button>
              <Button variant="outline" className="border-gray-700 hover:bg-gray-800" onClick={() => signOut?.()}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hover:bg-gray-800">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-gray-800">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`block text-sm font-medium py-2 ${
                  pathname === link.href ? "text-[#00FFBF]" : "text-gray-300"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {user && user.isAdmin && (
              <Link
                href="/admin"
                className={`block text-sm font-medium py-2 ${
                  pathname?.startsWith("/admin") ? "text-[#00FFBF]" : "text-gray-300"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}

            <div className="pt-4 border-t border-gray-800 space-y-3">
              {user ? (
                <>
                  {!user.isAdmin && (
                    <Button asChild variant="ghost" className="w-full justify-start hover:bg-gray-800">
                      <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button asChild className="w-full justify-start bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                      Profile
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-700 hover:bg-gray-800"
                    onClick={() => {
                      signOut?.()
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="w-full justify-start hover:bg-gray-800">
                    <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                    <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      Sign Up
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

