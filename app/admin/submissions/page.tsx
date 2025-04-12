"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, doc, getDoc, updateDoc, query, orderBy } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, ExternalLink, Github, Loader2, Search, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateUserScore } from "@/lib/score-utils"

interface Enrollment {
  id: string
  userId: string
  userName: string
  hackathonId: string
  submissionUrl?: string
  hostedUrl?: string
  score?: number
  status: "active" | "completed" | "withdrawn"
  updatedAt?: any
}

interface Hackathon {
  id: string
  title: string
}

export default function AdminSubmissionsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // For scoring
  const [scoringEnrollment, setScoringEnrollment] = useState<Enrollment | null>(null)
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)

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
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().isAdmin) {
          setIsAdmin(true)
          fetchData()
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to access the admin panel",
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
        // Fetch hackathons for filter
        const hackathonsCollection = collection(db, "hackathons")
        const hackathonsSnapshot = await getDocs(hackathonsCollection)
        const hackathonsData = hackathonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
        }))
        setHackathons(hackathonsData)

        // Fetch enrollments
        const enrollmentsCollection = collection(db, "enrollments")
        const enrollmentsQuery = query(enrollmentsCollection, orderBy("updatedAt", "desc"))
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery)

        const enrollmentsData = enrollmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Enrollment[]

        setEnrollments(enrollmentsData)
        setFilteredEnrollments(enrollmentsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching enrollments:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load enrollments data",
        })
        setLoading(false)
      }
    }

    checkAdmin()
  }, [db, user, router, toast])

  useEffect(() => {
    let filtered = [...enrollments]

    if (selectedHackathon !== "all") {
      filtered = filtered.filter((enrollment) => enrollment.hackathonId === selectedHackathon)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((enrollment) => enrollment.userName.toLowerCase().includes(query))
    }

    setFilteredEnrollments(filtered)
  }, [selectedHackathon, searchQuery, enrollments])

  const handleApproveEnrollment = async (enrollment: Enrollment) => {
    if (!db) return

    try {
      await updateDoc(doc(db, "enrollments", enrollment.id), {
        status: "completed",
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Enrollment approved successfully",
      })

      const updatedEnrollments = enrollments.map((e) =>
        e.id === enrollment.id ? { ...e, status: "completed" as const } : e,
      )
      setEnrollments(updatedEnrollments)
    } catch (error: any) {
      console.error("Error approving enrollment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve enrollment",
      })
    }
  }

  const handleRejectEnrollment = async (enrollment: Enrollment) => {
    if (!db) return

    try {
      await updateDoc(doc(db, "enrollments", enrollment.id), {
        status: "withdrawn",
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Enrollment rejected successfully",
      })

      const updatedEnrollments = enrollments.map((e) =>
        e.id === enrollment.id ? { ...e, status: "withdrawn" as const } : e,
      )
      setEnrollments(updatedEnrollments)
    } catch (error: any) {
      console.error("Error rejecting enrollment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject enrollment",
      })
    }
  }

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db || !scoringEnrollment) return

    if (score < 0 || score > 100) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Score must be between 0 and 100",
      })
      return
    }

    setSubmitting(true)

    try {
      const result = await updateUserScore(db, scoringEnrollment.id, Number(score))

      if (!result.success) {
        throw new Error(result.error as string)
      }

      toast({
        title: "Success",
        description: "Score updated successfully",
      })

      // Close the dialog
      setIsDialogOpen(false)

      const updatedEnrollments = enrollments.map((e) =>
        e.id === scoringEnrollment.id ? { ...e, score: Number(score) } : e,
      )
      setEnrollments(updatedEnrollments)
    } catch (error: any) {
      console.error("Error updating score:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update score",
      })
    } finally {
      setSubmitting(false)
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading enrollments...</div>
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
          <h1 className="text-3xl font-bold">Manage Submissions</h1>
          <p className="text-gray-400 mt-1">Review, approve, and score hackathon submissions</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by username..."
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
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Pending</TabsTrigger>
          <TabsTrigger value="completed">Approved</TabsTrigger>
          <TabsTrigger value="withdrawn">Rejected</TabsTrigger>
        </TabsList>

        {["all", "active", "completed", "withdrawn"].map((status) => (
          <TabsContent key={status} value={status} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEnrollments.filter((e) => status === "all" || e.status === status).length > 0 ? (
                filteredEnrollments
                  .filter((e) => status === "all" || e.status === status)
                  .map((enrollment) => (
                    <Card key={enrollment.id} className="bg-[#1A1A1A] border-gray-800">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl">{enrollment.userName}'s Submission</CardTitle>
                            <p className="text-sm text-gray-400">
                              {hackathons.find((h) => h.id === enrollment.hackathonId)?.title || "Unknown Hackathon"}
                            </p>
                          </div>
                          <Badge
                            className={
                              enrollment.status === "completed"
                                ? "bg-green-600"
                                : enrollment.status === "withdrawn"
                                  ? "bg-red-600"
                                  : "bg-yellow-600"
                            }
                          >
                            {enrollment.status === "completed"
                              ? "Approved"
                              : enrollment.status === "withdrawn"
                                ? "Rejected"
                                : "Pending"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-4">
                          {enrollment.submissionUrl && (
                            <div>
                              <p className="text-sm text-gray-400 mb-1">GitHub URL</p>
                              <a
                                href={enrollment.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00FFBF] hover:underline flex items-center"
                              >
                                <Github className="h-4 w-4 mr-1" />
                                View Repository
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          )}

                          {enrollment.hostedUrl && (
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Hosted URL</p>
                              <a
                                href={enrollment.hostedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00FFBF] hover:underline flex items-center"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Project
                              </a>
                            </div>
                          )}

                          <div>
                            <p className="text-sm text-gray-400 mb-1">Score</p>
                            <p className="text-xl font-bold text-[#00FFBF]">{enrollment.score || 0}</p>
                          </div>

                          {enrollment.updatedAt && (
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                              <p>{formatDate(enrollment.updatedAt)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-wrap gap-2">
                        {enrollment.status === "active" && (
                          <>
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveEnrollment(enrollment)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </Button>

                            <Button variant="destructive" onClick={() => handleRejectEnrollment(enrollment)}>
                              <X className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-gray-700 hover:bg-gray-800"
                              onClick={() => {
                                setScoringEnrollment(enrollment)
                                setScore(enrollment.score || 0)
                              }}
                            >
                              Update Score
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Update Score</DialogTitle>
                              <DialogDescription>Set a score for this submission (0-100)</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdateScore} className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label htmlFor="score">Score</label>
                                <Input
                                  id="score"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={score}
                                  onChange={(e) => setScore(Number(e.target.value))}
                                  className="bg-black border-gray-800"
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  type="submit"
                                  className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                                  disabled={submitting}
                                >
                                  {submitting ? (
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
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No {status !== "all" ? status : ""} submissions found.</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}