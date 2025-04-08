"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export default function PublicLeaderboardPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest">("highest")

  const { db } = useFirebase()

  useEffect(() => {
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
  }, [db])

  useEffect(() => {
    if (!db) return

    setLoading(true)

    const fetchSubmissions = async () => {
      try {
        // Create a query for submissions with scores
        const submissionsCollection = collection(db, "submissions")
        const submissionsQuery = query(submissionsCollection, where("score", ">=", 0), orderBy("score", "desc"))

        const submissionsSnapshot = await getDocs(submissionsQuery)

        const submissionsData = await Promise.all(
          submissionsSnapshot.docs.map(async (doc) => {
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
        console.error("Error fetching submissions:", error)
        setLoading(false)
      }
    }

    fetchSubmissions()
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

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-[#00FFBF] animate-spin mb-4" />
          <p className="text-xl">Loading leaderboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold">Leaderboard</h1>
          <p className="text-gray-400 mt-1">See the top performers across all hackathons</p>
        </div>

        <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
          <Link href="/hackathons">View Hackathons</Link>
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-[#121212] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Trophy className="h-6 w-6 text-yellow-400 mr-3" />
              <h2 className="text-2xl font-bold">Top Performers</h2>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No leaderboard entries found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {selectedHackathon === "all"
                    ? "There are no scored submissions across any hackathons yet."
                    : "There are no scored submissions for this hackathon yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredSubmissions.slice(0, 10).map((submission, index) => (
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
                          {index === 0 && (
                            <Badge className="ml-2 bg-yellow-500/20 text-yellow-300">Top Performer</Badge>
                          )}
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
            )}
          </div>
        </div>

        <div>
          <div className="bg-[#121212] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Medal className="h-6 w-6 text-[#00FFBF] mr-3" />
              <h2 className="text-2xl font-bold">Hackathon Stats</h2>
            </div>

            {hackathons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No hackathons available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {hackathons.map((hackathon) => {
                  // Count submissions for this hackathon
                  const hackathonSubmissions = submissions.filter((s) => s.hackathonId === hackathon.id)
                  const participantCount = hackathonSubmissions.length

                  // Find top scorer
                  let topScorer = "None"
                  let topScore = 0

                  if (participantCount > 0) {
                    const sorted = [...hackathonSubmissions].sort((a, b) => (b.score || 0) - (a.score || 0))
                    topScorer = sorted[0].userName
                    topScore = sorted[0].score || 0
                  }

                  return (
                    <div key={hackathon.id} className="bg-[#1A1A1A] p-4 rounded-lg">
                      <h3 className="font-medium mb-2">{hackathon.title}</h3>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Participants:</span>
                        <span>{participantCount}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Status:</span>
                        <Badge className={hackathon.status === "open" ? "bg-green-600" : "bg-gray-600"}>
                          {hackathon.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Top Scorer:</span>
                        <span className="font-medium">
                          {topScorer} ({topScore})
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-lg p-6 mt-6">
            <div className="flex items-center mb-6">
              <Trophy className="h-6 w-6 text-amber-600 mr-3" />
              <h2 className="text-2xl font-bold">Hall of Fame</h2>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No entries yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Top 3 all-time performers */}
                {submissions
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 3)
                  .map((submission, index) => (
                    <div key={submission.id} className="flex items-center">
                      <Trophy className={`h-5 w-5 mr-3 ${getMedalColor(index)}`} />
                      <Avatar className="h-8 w-8 border mr-2">
                        {submission.userPhotoURL ? (
                          <AvatarImage src={submission.userPhotoURL} alt={submission.userName} />
                        ) : null}
                        <AvatarFallback>{getInitials(submission.userName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{submission.userName}</p>
                        <p className="text-xs text-gray-400">{submission.score} points</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

