"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, Trophy, Calendar, ArrowRight, Activity } from "lucide-react"

interface DashboardStats {
  totalUsers: number
  totalHackathons: number
  activeHackathons: number
  totalSubmissions: number
  pendingSubmissions: number
  recentHackathons: any[]
  topSubmissions: any[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalHackathons: 0,
    activeHackathons: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    recentHackathons: [],
    topSubmissions: [],
  })
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchDashboardData = async () => {
      if (!db || !user?.isAdmin) return

      try {
        // Get total users
        const usersCollection = collection(db, "users")
        const usersSnapshot = await getDocs(usersCollection)
        const totalUsers = usersSnapshot.size

        // Get hackathons data
        const hackathonsCollection = collection(db, "hackathons")
        const hackathonsSnapshot = await getDocs(hackathonsCollection)
        const totalHackathons = hackathonsSnapshot.size

        // Get active hackathons
        const activeHackathonsQuery = query(hackathonsCollection, where("status", "==", "open"))
        const activeHackathonsSnapshot = await getDocs(activeHackathonsQuery)
        const activeHackathons = activeHackathonsSnapshot.size

        // Get recent hackathons
        const recentHackathonsQuery = query(hackathonsCollection, orderBy("createdAt", "desc"), limit(3))
        const recentHackathonsSnapshot = await getDocs(recentHackathonsQuery)
        const recentHackathons = recentHackathonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Get submissions data
        const submissionsCollection = collection(db, "submissions")
        const submissionsSnapshot = await getDocs(submissionsCollection)
        const totalSubmissions = submissionsSnapshot.size

        // Get pending submissions
        const pendingSubmissionsQuery = query(submissionsCollection, where("status", "==", "pending"))
        const pendingSubmissionsSnapshot = await getDocs(pendingSubmissionsQuery)
        const pendingSubmissions = pendingSubmissionsSnapshot.size

        // Get top submissions
        const topSubmissionsQuery = query(
          submissionsCollection,
          where("status", "==", "approved"),
          orderBy("score", "desc"),
          limit(3),
        )
        const topSubmissionsSnapshot = await getDocs(topSubmissionsQuery)
        const topSubmissions = topSubmissionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setStats({
          totalUsers,
          totalHackathons,
          activeHackathons,
          totalSubmissions,
          pendingSubmissions,
          recentHackathons,
          topSubmissions,
        })

        setLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [db, user, router])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-[#00FFBF]" />
              {stats.totalUsers}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/admin/users" className="flex items-center">
                View All Users
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Active Hackathons</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-[#00FFBF]" />
              {stats.activeHackathons} / {stats.totalHackathons}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/admin/hackathons" className="flex items-center">
                Manage Hackathons
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              <Activity className="mr-2 h-5 w-5 text-[#00FFBF]" />
              {stats.totalSubmissions}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-xs text-gray-400">{stats.pendingSubmissions} pending review</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/admin/submissions" className="flex items-center">
                Review Submissions
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Leaderboard</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-[#00FFBF]" />
              Top Scores
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/admin/leaderboard" className="flex items-center">
                View Leaderboard
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle>Recent Hackathons</CardTitle>
            <CardDescription>Latest hackathons created on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentHackathons.length > 0 ? (
                stats.recentHackathons.map((hackathon: any) => (
                  <div key={hackathon.id} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <div>
                      <h3 className="font-medium">{hackathon.title}</h3>
                      <p className="text-sm text-gray-400">Created: {formatDate(hackathon.createdAt)}</p>
                    </div>
                    <div className="flex items-center">
                      <div
                        className={`px-2 py-1 rounded text-xs ${
                          hackathon.status === "open" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {hackathon.status === "open" ? "Open" : "Closed"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No hackathons found</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full border-gray-700 hover:bg-gray-800">
              <Link href="/admin/hackathons">View All Hackathons</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle>Top Submissions</CardTitle>
            <CardDescription>Highest scoring submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topSubmissions.length > 0 ? (
                stats.topSubmissions.map((submission: any, index: number) => (
                  <div key={submission.id} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <div>
                      <h3 className="font-medium">{submission.userName}</h3>
                      <p className="text-sm text-gray-400">{submission.projectTitle}</p>
                    </div>
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00FFBF]/10 mr-2">
                        <Trophy className="h-4 w-4 text-[#00FFBF]" />
                      </div>
                      <span className="text-lg font-bold">{submission.score}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No submissions found</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full border-gray-700 hover:bg-gray-800">
              <Link href="/admin/leaderboard">View Full Leaderboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle>Analytics Overview</CardTitle>
            <CardDescription>Platform performance and metrics</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Detailed Analytics</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                View comprehensive analytics and insights for all hackathons on the platform.
              </p>
              <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                <Link href="/admin/analytics">View Analytics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

