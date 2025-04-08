"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Download, Search, Trophy, ArrowUpDown, Edit, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Hackathon {
  id: string
  title: string
  status: "open" | "closed"
}

interface Submission {
  id: string
  userId: string
  userName: string
  hackathonId: string
  hackathonTitle: string
  projectTitle: string
  submissionUrl?: string
  hostedUrl?: string
  score: number
  status: "pending" | "approved" | "rejected"
  updatedAt?: any
  teamId?: string
  teamName?: string
  rank?: number
  userAvatar?: string // Added userAvatar field
}

export default function AdminLeaderboardPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null)
  const [newScore, setNewScore] = useState<number>(0)
  const [updating, setUpdating] = useState(false)

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const checkAdmin = async () => {
      if (!db || !user) return

      try {
        const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
        if (!userDoc.empty && userDoc.docs[0].data().isAdmin) {
          setIsAdmin(true)
          fetchData()
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to access the admin leaderboard",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        router.push("/")
      }
    }

    const fetchData = async () => {
      if (!db) return

      try {
        // Fetch hackathons
        const hackathonsCollection = collection(db, "hackathons")
        const hackathonsSnapshot = await getDocs(hackathonsCollection)
        const hackathonsData = hackathonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          status: doc.data().status,
        })) as Hackathon[]
        setHackathons(hackathonsData)

        // Fetch approved submissions
        const submissionsCollection = collection(db, "submissions")
        const submissionsQuery = query(
          submissionsCollection,
          where("status", "==", "approved"),
          orderBy("score", "desc"),
        )
        const submissionsSnapshot = await getDocs(submissionsQuery)

        const submissionsData = submissionsSnapshot.docs.map((doc, index) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            hackathonId: data.hackathonId,
            hackathonTitle: hackathonsData.find((h) => h.id === data.hackathonId)?.title || "Unknown Hackathon",
            projectTitle: data.projectTitle,
            submissionUrl: data.submissionUrl,
            hostedUrl: data.hostedUrl,
            score: data.score || 0,
            status: data.status,
            updatedAt: data.updatedAt,
            teamId: data.teamId,
            teamName: data.teamName,
            userAvatar: data.userAvatar, // Include userAvatar
            rank: index + 1,
          } as Submission
        })

        setSubmissions(submissionsData)
        setFilteredSubmissions(submissionsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load leaderboard data",
        })
        setLoading(false)
      }
    }

    checkAdmin()
  }, [db, user, router, toast])

  useEffect(() => {
    let filtered = [...submissions]

    if (selectedHackathon !== "all") {
      filtered = filtered.filter((submission) => submission.hackathonId === selectedHackathon)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (submission) =>
          submission.userName.toLowerCase().includes(query) ||
          submission.projectTitle.toLowerCase().includes(query) ||
          (submission.teamName && submission.teamName.toLowerCase().includes(query)),
      )
    }

    filtered.sort((a, b) => (sortOrder === "desc" ? b.score - a.score : a.score - b.score))
    filtered = filtered.map((submission, index) => ({
      ...submission,
      rank: index + 1,
    }))

    setFilteredSubmissions(filtered)
  }, [selectedHackathon, searchQuery, sortOrder, submissions])

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db || !editingSubmission) return

    if (newScore < 0 || newScore > 100) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Score must be between 0 and 100",
      })
      return
    }

    setUpdating(true)

    try {
      // First update the submission directly
      await updateDoc(doc(db, "submissions", editingSubmission.id), {
        score: newScore,
        updatedAt: new Date(),
      })

      // Find and update the corresponding enrollment
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", editingSubmission.userId),
        where("hackathonId", "==", editingSubmission.hackathonId),
      )

      const enrollmentsSnap = await getDocs(enrollmentsQuery)

      if (!enrollmentsSnap.empty) {
        const enrollmentDoc = enrollmentsSnap.docs[0]
        await updateDoc(doc(db, "enrollments", enrollmentDoc.id), {
          score: newScore,
          updatedAt: new Date(),
        })
      }

      toast({
        title: "Success",
        description: "Score updated successfully",
      })

      // Force refresh the data
      const submissionsCollection = collection(db, "submissions")
      const submissionsQuery = query(submissionsCollection, where("status", "==", "approved"), orderBy("score", "desc"))
      const submissionsSnapshot = await getDocs(submissionsQuery)

      const submissionsData = submissionsSnapshot.docs.map((doc, index) => {
        const data = doc.data()
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          hackathonId: data.hackathonId,
          hackathonTitle: hackathons.find((h) => h.id === data.hackathonId)?.title || "Unknown Hackathon",
          projectTitle: data.projectTitle,
          submissionUrl: data.submissionUrl,
          hostedUrl: data.hostedUrl,
          score: data.score || 0,
          status: data.status,
          updatedAt: data.updatedAt,
          teamId: data.teamId,
          teamName: data.teamName,
          userAvatar: data.userAvatar,
          rank: index + 1,
        } as Submission
      })

      setSubmissions(submissionsData)
      setEditingSubmission(null)
    } catch (error: any) {
      console.error("Error updating score:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update score",
      })
    } finally {
      setUpdating(false)
    }
  }

  const exportLeaderboard = (format: "csv" | "json") => {
    if (filteredSubmissions.length === 0) return

    let content: string
    let filename: string
    let type: string

    if (format === "csv") {
      const headers = ["Rank", "Name", "Project", "Team", "Hackathon", "Score"]
      const rows = filteredSubmissions.map((submission) => [
        submission.rank,
        submission.userName,
        submission.projectTitle,
        submission.teamName || "Individual",
        submission.hackathonTitle,
        submission.score,
      ])
      content = [headers, ...rows].map((row) => row.join(",")).join("\n")
      filename = `leaderboard_${selectedHackathon === "all" ? "all_hackathons" : hackathons.find((h) => h.id === selectedHackathon)?.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      type = "text/csv"
    } else {
      const data = {
        hackathon:
          selectedHackathon === "all" ? "All Hackathons" : hackathons.find((h) => h.id === selectedHackathon)?.title,
        exportDate: new Date().toISOString(),
        entries: filteredSubmissions.map((submission) => ({
          rank: submission.rank,
          user: submission.userName,
          project: submission.projectTitle,
          team: submission.teamName || "Individual",
          hackathon: submission.hackathonTitle,
          score: submission.score,
        })),
      }
      content = JSON.stringify(data, null, 2)
      filename = `leaderboard_${selectedHackathon === "all" ? "all_hackathons" : hackathons.find((h) => h.id === selectedHackathon)?.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`
      type = "application/json"
    }

    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
  }

  const getInitials = (name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading leaderboard...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-xl">Access denied. You must be an admin to view this page.</div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Leaderboard</h1>
          <p className="text-gray-400 mt-1">Manage and view participant rankings across all hackathons</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs defaultValue="csv" className="w-[180px]">
            <TabsList className="bg-[#1A1A1A] border-gray-800">
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="p-0">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 w-full"
                onClick={() => exportLeaderboard("csv")}
                disabled={filteredSubmissions.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </TabsContent>
            <TabsContent value="json" className="p-0">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 w-full"
                onClick={() => exportLeaderboard("json")}
                disabled={filteredSubmissions.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name, project, or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1A1A1A] border-gray-800"
          />
        </div>

        <Select value={selectedHackathon} onValueChange={setSelectedHackathon}>
          <SelectTrigger className="w-[220px] bg-[#1A1A1A] border-gray-800">
            <SelectValue placeholder="Filter by hackathon" />
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

        <Button variant="outline" className="border-gray-700 hover:bg-gray-800" onClick={toggleSortOrder}>
          <ArrowUpDown className="mr-2 h-4 w-4" />
          {sortOrder === "desc" ? "Highest First" : "Lowest First"}
        </Button>
      </div>

      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle>Participant Rankings</CardTitle>
          <CardDescription>
            {selectedHackathon === "all"
              ? "Showing results from all hackathons"
              : `Showing results from ${hackathons.find((h) => h.id === selectedHackathon)?.title}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`flex items-center p-4 rounded-lg ${
                    submission.rank && submission.rank <= 3 ? "border border-yellow-500/30" : "bg-black/30"
                  } ${submission.rank === 1 ? "bg-yellow-500/10" : submission.rank === 2 ? "bg-gray-400/10" : submission.rank === 3 ? "bg-amber-600/10" : ""}`}
                >
                  <div className="flex items-center justify-center w-10 h-10 mr-4">
                    {submission.rank && submission.rank <= 3 ? (
                      <Trophy
                        className={`h-6 w-6 ${
                          submission.rank === 1
                            ? "text-yellow-400"
                            : submission.rank === 2
                              ? "text-gray-400"
                              : "text-amber-600"
                        }`}
                      />
                    ) : (
                      <span className="text-lg font-bold text-gray-400">{submission.rank}</span>
                    )}
                  </div>

                  <Avatar className="h-10 w-10 mr-4 border">
                    {submission.userAvatar ? (
                      <AvatarImage src={submission.userAvatar} alt={submission.userName} />
                    ) : null}
                    <AvatarFallback>{getInitials(submission.userName)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-medium">{submission.userName}</h3>
                        <p className="text-sm text-gray-400">{submission.projectTitle}</p>
                      </div>
                      <div className="flex items-center mt-2 sm:mt-0">
                        {submission.teamName && <Badge className="mr-2 bg-black/50">{submission.teamName}</Badge>}
                        <Badge className="mr-2 bg-[#1A1A1A] border-gray-700">{submission.hackathonTitle}</Badge>
                        <span className="text-lg font-bold text-[#00FFBF] mr-2">{submission.score}</span>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingSubmission(submission)
                                setNewScore(submission.score)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Update Score</DialogTitle>
                              <DialogDescription>
                                Update the score for {submission.userName}'s submission
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdateScore} className="space-y-4 py-4">
                              <div className="space-y-2">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="score" className="text-right">
                                    Score
                                  </label>
                                  <Input
                                    id="score"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={newScore}
                                    onChange={(e) => setNewScore(Number(e.target.value))}
                                    className="col-span-3 bg-black border-gray-800"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  type="submit"
                                  className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                                  disabled={updating}
                                >
                                  {updating ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    "Update Score"
                                  )}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <Trophy className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-xl font-medium mb-2">No Submissions Found</h3>
                <p className="text-gray-400">
                  {searchQuery
                    ? "No submissions match your search criteria."
                    : selectedHackathon !== "all"
                      ? "No submissions found for this hackathon."
                      : "No approved submissions found in the system."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

