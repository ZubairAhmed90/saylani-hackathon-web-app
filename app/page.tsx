"use client"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import HeroSection from "@/components/hero-section"
import { Code, Users, Trophy, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is logged in and not in loading state, redirect based on role
    if (user && !loading) {
      if (user.isAdmin) {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [user, loading, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <HeroSection />

        {/* Platform Features Section */}
        <section className="w-full py-16 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-3">
                <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl">
                  Platform Features
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 text-lg md:text-2xl">
                  Everything you need to host and participate in hackathons, all in one place.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-14">
                {/* Hackathon Management */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                    <Code className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Hackathon </h3>
                  <p className="text-gray-500 text-center text-lg">
                    Create, manage, and participate in hackathons with ease.
                  </p>
                </div>

                {/* Collaboration */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Collaboration</h3>
                  <p className="text-gray-500 text-center text-lg">
                    Connect with peers, form teams, and collaborate in real-time.
                  </p>
                </div>

                {/* Leaderboards */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Leaderboards</h3>
                  <p className="text-gray-500 text-center text-lg">
                    Track your progress and compete with others on the leaderboard.
                  </p>
                </div>

                {/* Real-time Updates */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Real-time Updates</h3>
                  <p className="text-gray-500 text-center text-lg">
                    Stay updated with real-time notifications and countdown timers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ready to Code Section */}
        <section className="w-full py-16 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-3">
                <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl">
                  Ready to Code?
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 text-lg md:text-2xl">
                  Join GeekCode today and start your hackathon journey.
                </p>
              </div>
              <div className="space-x-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90 transition-all duration-300 rounded-xl"
                >
                  <Link href="/auth/signup">Sign Up Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-6">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                  <Code className="h-6 w-6 text-white" />
                </div><Link href="/" passHref>
                <span className="font-bold text-xl">GeekCode</span> 
                </Link>
              </div>
             
              <p className="text-lg text-gray-500">
                © {new Date().getFullYear()} GeekCode. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
