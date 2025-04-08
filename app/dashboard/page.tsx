"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trophy, Upload, Users, ArrowRight, Rocket } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeHackathons: 0,
    completedHackathons: 0,
    teamCount: 0,
    bestScore: 0,
    bestRank: null as number | null,
    submissionCount: 0,
  })
  const [activeEnrollment, setActiveEnrollment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const { db } = useFirebase()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!db || !user) return

      try {
        // Get user's enrollments
        const enrollmentsCollection = collection(db, "enrollments")
        const enrollmentsQuery = query(enrollmentsCollection, where("userId", "==", user.uid))
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery)

        // Get active enrollment
        const activeEnrollmentQuery = query(
          enrollmentsCollection,
          where("userId", "==", user.uid),
          where("status", "==", "active"),
        )
        const activeEnrollmentSnapshot = await getDocs(activeEnrollmentQuery)

        if (!activeEnrollmentSnapshot.empty) {
          const enrollmentData = activeEnrollmentSnapshot.docs[0].data()

          // Get hackathon details
          const hackathonQuery = query(
            collection(db, "hackathons"),
            where("__name__", "==", enrollmentData.hackathonId),
          )
          const hackathonSnapshot = await getDocs(hackathonQuery)

          if (!hackathonSnapshot.empty) {
            setActiveEnrollment({
              ...enrollmentData,
              id: activeEnrollmentSnapshot.docs[0].id,
              hackathon: {
                id: hackathonSnapshot.docs[0].id,
                ...hackathonSnapshot.docs[0].data(),
              },
            })
          }
        }

        // Get active and completed hackathon counts
        const activeCount = enrollmentsSnapshot.docs.filter((doc) => doc.data().status === "active").length
        const completedCount = enrollmentsSnapshot.docs.filter((doc) => doc.data().status === "completed").length

        // Get user's teams
        const teamsCollection = collection(db, "teams")
        const teamsQuery = query(teamsCollection, where("members", "array-contains", user.uid))
        const teamsSnapshot = await getDocs(teamsQuery)

        // Get user's submissions
        const submissionsCollection = collection(db, "submissions")
        const submissionsQuery = query(submissionsCollection, where("userId", "==", user.uid))
        const submissionsSnapshot = await getDocs(submissionsQuery)

        // Find best score and rank
        let bestScore = 0
        let bestRank: number | null = null;


        submissionsSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.score > bestScore) {
            bestScore = data.score
          }
          // If rank is available and is better than current best (lower is better)
          if (data.rank !== undefined && (bestRank === null || data.rank < bestRank)) {
            bestRank = data.rank;
          }
          
          
        })

        setStats({
          activeHackathons: activeCount,
          completedHackathons: completedCount,
          teamCount: teamsSnapshot.size,
          bestScore,
          bestRank,
          submissionCount: submissionsSnapshot.size,
        })

        setLoading(false)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setLoading(false)
      }
    }

    fetchUserData()
  }, [db, user])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00FFBF]"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || "Hacker"}</h1>
      <p className="text-gray-400 mb-8">Your personal hackathon dashboard</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Hackathon Participation</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-[#00FFBF]" />
              {stats.activeHackathons} Active
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-gray-400">{stats.completedHackathons} Completed</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/dashboard/my-hackathons" className="flex items-center">
                View My Hackathons
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Team Membership</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-[#00FFBF]" />
              {stats.teamCount} Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-gray-400">
              {stats.teamCount > 0
                ? "You're a member of " + stats.teamCount + " team(s)"
                : "Join or create a team to collaborate"}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/dashboard/teams" className="flex items-center">
                Manage Teams
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-2">
            <CardDescription>Best Performance</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-[#00FFBF]" />
              {stats.bestScore > 0 ? stats.bestScore + " Points" : "No scores yet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-gray-400">
              {stats.bestRank ? `Highest rank: #${stats.bestRank}` : "Submit your projects to get scored"}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="p-0 h-auto text-[#00FFBF]">
              <Link href="/dashboard/leaderboard" className="flex items-center">
                View Leaderboard
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {activeEnrollment ? (
        <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
          <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <CardTitle className="text-xl mb-1">{activeEnrollment.hackathon.title}</CardTitle>
                <CardDescription>Active Hackathon</CardDescription>
              </div>
              <Badge className="bg-green-600">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Timeline</h3>
                <p>
                  {formatDate(activeEnrollment.hackathon.startDate)} - {formatDate(activeEnrollment.hackathon.endDate)}
                </p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Submission Status</h3>
                <div className="flex items-center">
                  <Badge
                    className={
                      activeEnrollment.submissionUrl || activeEnrollment.submissionFile ? "bg-yellow-600" : "bg-red-600"
                    }
                  >
                    {activeEnrollment.submissionUrl || activeEnrollment.submissionFile ? "Submitted" : "Not Submitted"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
              <Link href="/dashboard/my-hackathons">View Details</Link>
            </Button>
            <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
              <Link href={`/dashboard/submit?hackathon=${activeEnrollment.hackathonId}`}>
                <Upload className="mr-2 h-4 w-4" />
                Submit Project
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>No Active Hackathon</CardTitle>
            <CardDescription>You're not currently enrolled in any hackathon</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Rocket className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Get Started</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Browse available hackathons and apply to participate in one that matches your interests and skills.
            </p>
            <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto py-4 justify-start bg-black/30 hover:bg-black/50">
              <Link href="/dashboard/teams/create" className="flex flex-col items-start text-left">
                <span className="flex items-center text-[#00FFBF]">
                  <Users className="mr-2 h-4 w-4" />
                  Create Team
                </span>
                <span className="text-xs mt-1 text-gray-400">Form a team to collaborate</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4 justify-start bg-black/30 hover:bg-black/50">
              <Link href="/dashboard/submit" className="flex flex-col items-start text-left">
                <span className="flex items-center text-[#00FFBF]">
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Project
                </span>
                <span className="text-xs mt-1 text-gray-400">Upload your work</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4 justify-start bg-black/30 hover:bg-black/50">
              <Link href="/hackathons" className="flex flex-col items-start text-left">
                <span className="flex items-center text-[#00FFBF]">
                  <Rocket className="mr-2 h-4 w-4" />
                  Join Hackathon
                </span>
                <span className="text-xs mt-1 text-gray-400">Find a new challenge</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

