"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Download, Users, Trophy, BarChart3, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ChartTooltip } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Hackathon {
  id: string
  title: string
  startDate: any
  endDate: any
  status: "open" | "closed"
  category: string
  participants: number
  maxParticipants: number
  hostedBy: string
}

interface Submission {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  hackathonId: string
  hackathonTitle: string
  projectTitle: string
  score: number
  status: "pending" | "approved" | "rejected"
  teamId?: string
  teamName?: string
}

interface Team {
  id: string
  name: string
  hackathonId: string
  members: string[]
}

interface AnalyticsData {
  hackathonId: string
  hackathonTitle: string
  totalParticipants: number
  totalTeams: number
  averageScore: number
  topParticipants: Submission[]
  participationRate: number
  submissionRate: number
  categoryDistribution: { name: string; value: number }[]
  scoreDistribution: { name: string; value: number }[]
  participantsByDay: { name: string; value: number }[]
}

export default function AdminAnalyticsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [selectedHackathon, setSelectedHackathon] = useState<string>("")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  const COLORS = ["#00FFBF", "#0088FE", "#FFBB28", "#FF8042", "#A28DFF"]

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
          fetchHackathons()
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to access the admin analytics",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        router.push("/")
      }
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

        if (hackathonsData.length > 0) {
          setSelectedHackathon(hackathonsData[0].id)
          await fetchAnalyticsData(hackathonsData[0].id, hackathonsData[0].title)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching hackathons:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load hackathons data",
        })
        setLoading(false)
      }
    }

    checkAdmin()
  }, [db, user, router, toast])

  const fetchAnalyticsData = async (hackathonId: string, hackathonTitle: string) => {
    if (!db) return

    setLoading(true)

    try {
      // Fetch submissions for this hackathon
      const submissionsCollection = collection(db, "submissions")
      const submissionsQuery = query(submissionsCollection, where("hackathonId", "==", hackathonId))
      const submissionsSnapshot = await getDocs(submissionsQuery)

      const submissions = submissionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[]

      // Fetch teams for this hackathon
      const teamsCollection = collection(db, "teams")
      const teamsQuery = query(teamsCollection, where("hackathonId", "==", hackathonId))
      const teamsSnapshot = await getDocs(teamsQuery)

      const teams = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Team[]

      // Fetch enrollments for this hackathon
      const enrollmentsCollection = collection(db, "enrollments")
      const enrollmentsQuery = query(enrollmentsCollection, where("hackathonId", "==", hackathonId))
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery)

      const enrollments = enrollmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Calculate analytics
      const totalParticipants = enrollments.length
      const totalTeams = teams.length

      // Calculate average score
      const scores = submissions.map((s) => s.score).filter((score) => score !== undefined)
      const averageScore =
        scores.length > 0 ? Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length) : 0

      // Get top participants
      const topParticipants = [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)

      // Calculate participation rate
      const hackathon = hackathons.find((h) => h.id === hackathonId)
      const participationRate = hackathon ? Math.round((totalParticipants / hackathon.maxParticipants) * 100) : 0

      // Calculate submission rate
      const submissionRate = totalParticipants > 0 ? Math.round((submissions.length / totalParticipants) * 100) : 0

      // Create category distribution data
      const categoryMap = new Map<string, number>()
      submissions.forEach((submission) => {
        const category = submission.teamId ? "Team" : "Individual"
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
      })

      const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))

      // Create score distribution data
      const scoreRanges = [
        { min: 0, max: 20, name: "0-20" },
        { min: 21, max: 40, name: "21-40" },
        { min: 41, max: 60, name: "41-60" },
        { min: 61, max: 80, name: "61-80" },
        { min: 81, max: 100, name: "81-100" },
      ]

      const scoreDistribution = scoreRanges.map((range) => {
        const count = submissions.filter((s) => {
          const score = s.score || 0
          return score >= range.min && score <= range.max
        }).length
        return { name: range.name, value: count }
      })

      // Create participants by day data (simplified for demo)
      const participantsByDay = [
        { name: "Day 1", value: Math.floor(totalParticipants * 0.4) },
        { name: "Day 2", value: Math.floor(totalParticipants * 0.2) },
        { name: "Day 3", value: Math.floor(totalParticipants * 0.15) },
        { name: "Day 4", value: Math.floor(totalParticipants * 0.1) },
        { name: "Day 5", value: Math.floor(totalParticipants * 0.15) },
      ]

      setAnalyticsData({
        hackathonId,
        hackathonTitle,
        totalParticipants,
        totalTeams,
        averageScore,
        topParticipants,
        participationRate,
        submissionRate,
        categoryDistribution,
        scoreDistribution,
        participantsByDay,
      })

      setLoading(false)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data",
      })
      setLoading(false)
    }
  }

  const handleHackathonChange = async (hackathonId: string) => {
    setSelectedHackathon(hackathonId)
    const hackathon = hackathons.find((h) => h.id === hackathonId)
    if (hackathon) {
      await fetchAnalyticsData(hackathonId, hackathon.title)
    }
  }

  const exportData = (format: "csv" | "json") => {
    if (!analyticsData) return

    let content: string
    let filename: string
    let type: string

    if (format === "csv") {
      // Create CSV content
      const csvContent = [
        // Headers
        ["Hackathon Analytics:", analyticsData.hackathonTitle],
        ["Generated on:", new Date().toLocaleString()],
        [""],
        ["Key Metrics"],
        ["Total Participants", analyticsData.totalParticipants],
        ["Total Teams", analyticsData.totalTeams],
        ["Average Score", analyticsData.averageScore],
        ["Participation Rate", `${analyticsData.participationRate}%`],
        ["Submission Rate", `${analyticsData.submissionRate}%`],
        [""],
        ["Top Participants"],
        ["Name", "Project", "Score"],
        ...analyticsData.topParticipants.map((p) => [p.userName, p.projectTitle, p.score]),
        [""],
        ["Score Distribution"],
        ["Range", "Count"],
        ...analyticsData.scoreDistribution.map((d) => [d.name, d.value]),
        [""],
        ["Category Distribution"],
        ["Category", "Count"],
        ...analyticsData.categoryDistribution.map((d) => [d.name, d.value]),
        [""],
        ["Daily Participation"],
        ["Day", "Participants"],
        ...analyticsData.participantsByDay.map((d) => [d.name, d.value]),
      ]
        .map((row) => row.join(","))
        .join("\n")

      content = csvContent
      filename = `${analyticsData.hackathonTitle.replace(/\s+/g, "_")}_analytics.csv`
      type = "text/csv;charset=utf-8;"
    } else {
      // Create JSON content
      const jsonData = {
        hackathon: analyticsData.hackathonTitle,
        generatedAt: new Date().toISOString(),
        metrics: {
          totalParticipants: analyticsData.totalParticipants,
          totalTeams: analyticsData.totalTeams,
          averageScore: analyticsData.averageScore,
          participationRate: analyticsData.participationRate,
          submissionRate: analyticsData.submissionRate,
        },
        topParticipants: analyticsData.topParticipants.map((p) => ({
          name: p.userName,
          project: p.projectTitle,
          score: p.score,
          team: p.teamName,
        })),
        scoreDistribution: analyticsData.scoreDistribution,
        categoryDistribution: analyticsData.categoryDistribution,
        participantsByDay: analyticsData.participantsByDay,
      }

      content = JSON.stringify(jsonData, null, 2)
      filename = `${analyticsData.hackathonTitle.replace(/\s+/g, "_")}_analytics.json`
      type = "application/json"
    }

    // Create and download the file
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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

  if (loading && !analyticsData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading analytics...</div>
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
          <h1 className="text-3xl font-bold">Hackathon Analytics</h1>
          <p className="text-gray-400 mt-1">Detailed insights and performance metrics</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedHackathon} onValueChange={handleHackathonChange}>
            <SelectTrigger className="w-[220px] bg-[#1A1A1A] border-gray-800">
              <SelectValue placeholder="Select hackathon" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-800">
              {hackathons.map((hackathon) => (
                <SelectItem key={hackathon.id} value={hackathon.id}>
                  {hackathon.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs defaultValue="csv" className="w-[180px]">
            <TabsList className="bg-[#1A1A1A] border-gray-800">
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="p-0">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 w-full"
                onClick={() => exportData("csv")}
                disabled={!analyticsData}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </TabsContent>
            <TabsContent value="json" className="p-0">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 w-full"
                onClick={() => exportData("json")}
                disabled={!analyticsData}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {analyticsData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader className="pb-2">
                <CardDescription>Total Participants</CardDescription>
                <CardTitle className="text-3xl flex items-center">
                  <Users className="mr-2 h-5 w-5 text-[#00FFBF]" />
                  {analyticsData.totalParticipants}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-400">Participation Rate: {analyticsData.participationRate}%</div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader className="pb-2">
                <CardDescription>Total Teams</CardDescription>
                <CardTitle className="text-3xl flex items-center">
                  <Users className="mr-2 h-5 w-5 text-[#00FFBF]" />
                  {analyticsData.totalTeams}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-400">
                  Avg. Team Size:{" "}
                  {analyticsData.totalParticipants > 0 && analyticsData.totalTeams > 0
                    ? (analyticsData.totalParticipants / analyticsData.totalTeams).toFixed(1)
                    : "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader className="pb-2">
                <CardDescription>Average Score</CardDescription>
                <CardTitle className="text-3xl flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-[#00FFBF]" />
                  {analyticsData.averageScore}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-400">Submission Rate: {analyticsData.submissionRate}%</div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader className="pb-2">
                <CardDescription>Hackathon Status</CardDescription>
                <CardTitle className="text-xl flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-[#00FFBF]" />
                  {hackathons.find((h) => h.id === selectedHackathon)?.status === "open" ? (
                    <Badge className="bg-green-600">Open</Badge>
                  ) : (
                    <Badge className="bg-gray-600">Closed</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-400">
                  {hackathons.find((h) => h.id === selectedHackathon)?.startDate && (
                    <>
                      {formatDate(hackathons.find((h) => h.id === selectedHackathon)?.startDate)} -{" "}
                      {formatDate(hackathons.find((h) => h.id === selectedHackathon)?.endDate)}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-[#1A1A1A] border-gray-800 lg:col-span-2">
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Breakdown of participant scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#888" />
                      <YAxis stroke="#888" />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">Score Range</span>
                                    <span className="font-bold text-muted-foreground">{payload[0].payload.name}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">Count</span>
                                    <span className="font-bold">{payload[0].value}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" fill="#00FFBF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-gray-800">
               <CardHeader>
    <CardTitle>Submission Types</CardTitle>
    <CardDescription>Team vs individual submissions</CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col items-center">
                 <div className="h-[250px] w-full relative">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={analyticsData.categoryDistribution}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                         label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                         labelLine={false}
                       >
                         {analyticsData.categoryDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Type</span>
                        <span className="font-bold text-muted-foreground">{payload[0].name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Count</span>
                        <span className="font-bold">{payload[0].value}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="flex justify-center gap-4 mt-4">
      {analyticsData.categoryDistribution.map((entry, index) => (
        <div key={entry.name} className="flex items-center">
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
          />
          <span className="text-sm text-gray-400">{entry.name}</span>
        </div>
      ))}
    </div>
  </CardContent>
               </Card>
            </div>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle>Daily Participation</CardTitle>
              <CardDescription>Number of participants joining each day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.participantsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">Day</span>
                                  <span className="font-bold text-muted-foreground">{payload[0].payload.name}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">Participants</span>
                                  <span className="font-bold">{payload[0].value}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" fill="#00FFBF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Highest scoring participants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topParticipants.length > 0 ? (
                  analyticsData.topParticipants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center p-4 rounded-lg ${
                        index === 0
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : index === 1
                            ? "bg-gray-400/10 border border-gray-400/30"
                            : index === 2
                              ? "bg-amber-600/10 border border-amber-600/30"
                              : "bg-black/30"
                      }`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 mr-4">
                        <Trophy
                          className={`h-6 w-6 ${
                            index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-400" : "text-amber-600"
                          }`}
                        />
                      </div>

                      <Avatar className="h-10 w-10 mr-4 border">
                        {participant.userAvatar ? (
                          <AvatarImage src={participant.userAvatar || "/placeholder.svg"} alt={participant.userName} />
                        ) : null}
                        <AvatarFallback>{getInitials(participant.userName)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-medium">{participant.userName}</h3>
                            <p className="text-sm text-gray-400">{participant.projectTitle}</p>
                          </div>
                          <div className="flex items-center mt-2 sm:mt-0">
                            {participant.teamName && <Badge className="mr-2 bg-black/50">{participant.teamName}</Badge>}
                            <span className="text-lg font-bold text-[#00FFBF]">{participant.score}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400">No submissions found for this hackathon.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-gray-800">
          <div className="flex justify-center mb-4">
            <BarChart3 className="h-16 w-16 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Analytics Available</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Select a hackathon from the dropdown to view detailed analytics.
          </p>
        </div>
      )}
    </div>
  )
}
