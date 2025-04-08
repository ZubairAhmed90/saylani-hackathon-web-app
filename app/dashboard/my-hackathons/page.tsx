"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, Trophy, FileText, Code, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Enrollment {
  id: string
  userId: string
  hackathonId: string
  status: "active" | "completed" | "withdrawn"
  teamId?: string
  submissionUrl?: string
  submissionFile?: string
  submissionDescription?: string
  score?: number
  rank?: number
  createdAt: any
}

interface Hackathon {
  id: string
  title: string
  description: string
  startDate: any
  endDate: any
  status: "open" | "closed"
  category: string
  participants: number
  maxParticipants: number
  hostedBy: string
}

interface Team {
  id: string
  name: string
  hackathonId: string
  leaderId: string
  members: string[]
  createdAt: any
}

interface TeamMember {
  id: string
  displayName: string
  photoURL?: string
  role: "leader" | "member"
}

export default function MyHackathonsPage() {
  const [enrollments, setEnrollments] = useState<
    (Enrollment & { hackathon?: Hackathon; team?: Team; teamMembers?: TeamMember[] })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchEnrollments = async () => {
      if (!db || !user) return

      try {
        // Fetch user enrollments
        const enrollmentsCollection = collection(db, "enrollments")
        const q = query(enrollmentsCollection, where("userId", "==", user.uid), orderBy("createdAt", "desc"))
        const enrollmentsSnapshot = await getDocs(q)

        if (enrollmentsSnapshot.empty) {
          setEnrollments([])
          setLoading(false)
          return
        }

        const enrollmentsData = enrollmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Enrollment[]

        // Fetch hackathon details for each enrollment
        const enrichedEnrollments = await Promise.all(
          enrollmentsData.map(async (enrollment) => {
            // Fetch hackathon details
            const hackathonsQuery = query(collection(db, "hackathons"), where("__name__", "==", enrollment.hackathonId))
            const hackathonDoc = await getDocs(hackathonsQuery)

            const hackathon = hackathonDoc.empty
              ? undefined
              : ({ id: hackathonDoc.docs[0].id, ...hackathonDoc.docs[0].data() } as Hackathon)

            // Fetch team details if available
            let team: Team | undefined
            let teamMembers: TeamMember[] = []

            if (enrollment.teamId) {
              const teamQuery = query(collection(db, "teams"), where("__name__", "==", enrollment.teamId))
              const teamDoc = await getDocs(teamQuery)

              if (!teamDoc.empty) {
                team = { id: teamDoc.docs[0].id, ...teamDoc.docs[0].data() } as Team

                // Fetch team members
                if (team.members && team.members.length > 0) {
                  const membersData = await Promise.all(
                    team.members.map(async (memberId) => {
                      const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", memberId)))
                      if (!userDoc.empty) {
                        return {
                          id: memberId,
                          displayName: userDoc.docs[0].data().displayName || "Unknown User",
                          photoURL: userDoc.docs[0].data().photoURL,
                          role: memberId === team?.leaderId ? "leader" : "member",
                        } as TeamMember
                      }
                      return null
                    }),
                  )
                  teamMembers = membersData.filter((member): member is TeamMember => member !== null)
                }
              }
            }

            return {
              ...enrollment,
              hackathon,
              team,
              teamMembers,
            }
          }),
        )

        setEnrollments(enrichedEnrollments)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching enrollments:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your hackathons",
        })
        setLoading(false)
      }
    }

    fetchEnrollments()
  }, [db, user, router, toast])

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>
      case "completed":
        return <Badge className="bg-blue-600">Completed</Badge>
      case "withdrawn":
        return <Badge className="bg-gray-600">Withdrawn</Badge>
      default:
        return <Badge className="bg-gray-600">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00FFBF]"></div>
        <span className="ml-2">Loading your hackathons...</span>
      </div>
    )
  }

  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (activeTab === "active") return enrollment.status === "active"
    if (activeTab === "completed") return enrollment.status === "completed"
    if (activeTab === "withdrawn") return enrollment.status === "withdrawn"
    return true
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Hackathons</h1>
          <p className="text-gray-400 mt-1">Track your participation and performance in hackathons</p>
        </div>

        <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
          <Link href="/hackathons">Explore More Hackathons</Link>
        </Button>
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="withdrawn">Withdrawn</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {filteredEnrollments.length > 0 ? (
            <div className="space-y-6">
              {filteredEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="bg-[#1A1A1A] border-gray-800 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{enrollment.hackathon?.title || "Unknown Hackathon"}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {enrollment.hackathon?.description || "No description available"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(enrollment.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {enrollment.hackathon
                              ? `${formatDate(enrollment.hackathon.startDate)} - ${formatDate(enrollment.hackathon.endDate)}`
                              : "Dates unavailable"}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            {enrollment.hackathon
                              ? `${enrollment.hackathon.participants}/${enrollment.hackathon.maxParticipants} Participants`
                              : "Participant count unavailable"}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Joined on {formatDate(enrollment.createdAt)}</span>
                        </div>

                        {enrollment.submissionUrl && (
                          <div className="flex items-center text-gray-400">
                            <FileText className="h-4 w-4 mr-2" />
                            <a
                              href={enrollment.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00FFBF] hover:underline"
                            >
                              View Submission
                            </a>
                          </div>
                        )}

                        {enrollment.score !== undefined && (
                          <div className="flex items-center text-gray-400">
                            <Trophy className="h-4 w-4 mr-2" />
                            <span>
                              Score: <span className="text-[#00FFBF] font-bold">{enrollment.score}</span>
                              {enrollment.rank && ` (Rank: ${enrollment.rank})`}
                            </span>
                          </div>
                        )}
                      </div>

                      {enrollment.team && (
                        <div className="bg-black/30 p-4 rounded-lg">
                          <h3 className="font-medium mb-3 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Team: {enrollment.team.name}
                          </h3>
                          <div className="space-y-3">
                            {enrollment.teamMembers?.map((member) => (
                              <div key={member.id} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border">
                                  {member.photoURL ? (
                                    <AvatarImage src={member.photoURL} alt={member.displayName} />
                                  ) : null}
                                  <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm">{member.displayName}</p>
                                </div>
                                {member.role === "leader" && (
                                  <Badge variant="outline" className="bg-black/50">
                                    Team Leader
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {enrollment.status === "active" ? (
                      <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                        <Link href={`/dashboard/submit?hackathon=${enrollment.hackathonId}`}>Submit Project</Link>
                      </Button>
                    ) : enrollment.status === "completed" ? (
                      <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
                        <Link href={`/dashboard/leaderboard?hackathon=${enrollment.hackathonId}`}>View Results</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
                        <Link href={`/hackathons/${enrollment.hackathonId}`}>View Hackathon</Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-gray-800">
              <div className="flex justify-center mb-4">
                {activeTab === "active" ? (
                  <Code className="h-16 w-16 text-gray-500" />
                ) : activeTab === "completed" ? (
                  <CheckCircle2 className="h-16 w-16 text-gray-500" />
                ) : (
                  <Users className="h-16 w-16 text-gray-500" />
                )}
              </div>
              <h3 className="text-xl font-medium mb-2">No {activeTab} hackathons found</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                {activeTab === "active"
                  ? "You are not currently participating in any hackathons."
                  : activeTab === "completed"
                    ? "You haven't completed any hackathons yet."
                    : activeTab === "withdrawn"
                      ? "You haven't withdrawn from any hackathons."
                      : "You haven't participated in any hackathons yet."}
              </p>
              <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                <Link href="/hackathons">Browse Hackathons</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

