"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Search, ArrowUpDown, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Hackathon {
  id: string
  title: string
  description?: string
  status: "open" | "closed" | "completed"
}

interface Submission {
  id: string
  userId: string
  userName: string
  userPhotoURL?: string
  hackathonId: string
  hackathonTitle: string
  submissionUrl?: string
  hostedUrl?: string
  description?: string
  score?: number
  feedback?: string
  submittedAt: any
}

export default function LeaderboardPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest">("highest")
  const [activeTab, setActiveTab] = useState("all")

  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchHackathons = async () => {
      if (!db) return

      try {
        const hackathonsCollection = collection(db, "hackathons")
        const hackathonsSnapshot = await getDocs(hackathonsCollection)

        const hackathonsData = hackathonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Hackathon[]

        setHackathons(hackathonsData)
      } catch (error) {
        console.error("Error fetching hackathons:", error)
      }
    }

    fetchHackathons()
  }, [db, user, router])

  useEffect(() => {
    if (!db) return

    setLoading(true)

    // Create a query for submissions with scores
    const submissionsCollection = collection(db, "submissions")
    const submissionsQuery = query(submissionsCollection, where("score", ">=", 0), orderBy("score", "desc"))

    // Use onSnapshot to listen for real-time updates
    const unsubscribe = onSnapshot(submissionsQuery, async (snapshot) => {
      try {
        const submissionsData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data()

            // Get user details if not already included
            let userName = data.userName
            let userPhotoURL = data.userPhotoURL

            if (!userName && data.userId) {
              try {
                const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", data.userId)))
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data()
                  userName = userData.displayName || "Anonymous"
                  userPhotoURL = userData.photoURL
                }
              } catch (error) {
                console.error("Error fetching user data:", error)
              }
            }

            return {
              id: doc.id,
              ...data,
              userName: userName || "Anonymous",
              userPhotoURL,
            } as Submission
          }),
        )

        setSubmissions(submissionsData)
        setLoading(false)
      } catch (error) {
        console.error("Error processing submissions:", error)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [db])

  // Filter and sort submissions when dependencies change
  useEffect(() => {
    let filtered = [...submissions]

    // Filter by hackathon
    if (selectedHackathon !== "all") {
      filtered = filtered.filter((submission) => submission.hackathonId === selectedHackathon)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (submission) =>
          submission.userName.toLowerCase().includes(query) || submission.hackathonTitle?.toLowerCase().includes(query),
      )
    }

    // Sort by score
    filtered.sort((a, b) => {
      const scoreA = a.score || 0
      const scoreB = b.score || 0
      return sortOrder === "highest" ? scoreB - scoreA : scoreA - scoreB
    })

    setFilteredSubmissions(filtered)
  }, [submissions, selectedHackathon, searchQuery, sortOrder])

  const getInitials = (name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-400" // Gold
      case 1:
        return "text-gray-300" // Silver
      case 2:
        return "text-amber-600" // Bronze
      default:
        return "text-gray-500"
    }
  }

  const renderTopPerformers = () => {
    const topFive = filteredSubmissions.slice(0, 5)

    if (topFive.length === 0) {
      return (
        <div className="text-center py-16">
          <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No leaderboard entries found</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {selectedHackathon === "all"
              ? "There are no scored submissions across any hackathons yet."
              : "There are no scored submissions for this hackathon yet."}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {topFive.map((submission, index) => (
          <div
            key={submission.id}
            className={`flex items-center p-4 rounded-lg ${index === 0 ? "bg-gradient-to-r from-yellow-500/10 to-transparent" : "bg-[#1A1A1A]"}`}
          >
            <div className="flex items-center justify-center w-10 h-10">
              {index < 3 ? (
                <Trophy className={`h-6 w-6 ${getMedalColor(index)}`} />
              ) : (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-sm">
                  {index + 1}
                </div>
              )}
            </div>

            <div className="ml-4 flex-1 flex items-center">
              <Avatar className="h-10 w-10 border">
                {submission.userPhotoURL ? (
                  <AvatarImage src={submission.userPhotoURL} alt={submission.userName} />
                ) : null}
                <AvatarFallback>{getInitials(submission.userName)}</AvatarFallback>
              </Avatar>

              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <h3 className="font-medium">{submission.userName}</h3>
                  {index === 0 && <Badge className="ml-2 bg-yellow-500/20 text-yellow-300">Top Performer</Badge>}
                </div>
                <p className="text-sm text-gray-400">{submission.hackathonTitle}</p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-[#00FFBF]">{submission.score || 0}</div>
                <p className="text-xs text-gray-400">points</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderAllSubmissions = () => {
    if (filteredSubmissions.length === 0) {
      return (
        <div className="text-center py-16">
          <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No submissions found</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {searchQuery ? "No submissions match your search criteria." : "There are no scored submissions yet."}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {filteredSubmissions.map((submission, index) => (
          <Card key={submission.id} className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 mr-3">
                  {index < 3 ? (
                    <Trophy className={`h-5 w-5 ${getMedalColor(index)}`} />
                  ) : (
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-xs">
                      {index + 1}
                    </div>
                  )}
                </div>

                <Avatar className="h-10 w-10 border mr-3">
                  {submission.userPhotoURL ? (
                    <AvatarImage src={submission.userPhotoURL} alt={submission.userName} />
                  ) : null}
                  <AvatarFallback>{getInitials(submission.userName)}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-medium">{submission.userName}</h3>
                    {index === 0 && <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs">Top</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">{submission.hackathonTitle}</p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-[#00FFBF]">{submission.score || 0}</div>
                  <p className="text-xs text-gray-400">points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-[#00FFBF] animate-spin mb-4" />
        <p className="text-xl">Loading leaderboard data...</p>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-gray-400 mt-1">See the top performers across all hackathons</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search participants..."
            className="pl-9 bg-[#1A1A1A] border-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedHackathon} onValueChange={setSelectedHackathon}>
          <SelectTrigger className="w-full md:w-[250px] bg-[#1A1A1A] border-gray-800">
            <SelectValue placeholder="All Hackathons" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-gray-800">
            <SelectItem value="all">All Hackathons</SelectItem>
            {hackathons.map((hackathon) => (
              <SelectItem key={hackathon.id} value={hackathon.id}>
                {hackathon.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto border-gray-800 bg-[#1A1A1A]">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortOrder === "highest" ? "Highest First" : "Lowest First"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1A1A1A] border-gray-800">
            <DropdownMenuItem onClick={() => setSortOrder("highest")}>Highest First</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("lowest")}>Lowest First</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="top" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="top">Top Performers</TabsTrigger>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="mt-0">
          <Card className="bg-[#121212] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                Top Performers
              </CardTitle>
              <CardDescription>
                {selectedHackathon === "all"
                  ? "Showing top 5 performers across all hackathons"
                  : `Showing top 5 performers for ${hackathons.find((h) => h.id === selectedHackathon)?.title || "selected hackathon"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderTopPerformers()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-0">
          <Card className="bg-[#121212] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Medal className="mr-2 h-5 w-5 text-[#00FFBF]" />
                All Submissions
              </CardTitle>
              <CardDescription>
                {selectedHackathon === "all"
                  ? "Showing all scored submissions across hackathons"
                  : `Showing all scored submissions for ${hackathons.find((h) => h.id === selectedHackathon)?.title || "selected hackathon"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderAllSubmissions()}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

