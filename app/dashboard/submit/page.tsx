"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp, collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Github, Globe, ArrowLeft, Loader2, FileCode, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Hackathon {
  id: string
  title: string
  status: "open" | "closed"
  description?: string
  endDate?: any
}

interface Enrollment {
  id: string
  userId: string
  hackathonId: string
  status: "active" | "completed" | "withdrawn"
  submissionUrl?: string
  hostedUrl?: string
  userName?: string
  description?: string
}

export default function SubmitProjectPage() {
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeHackathons, setActiveHackathons] = useState<Hackathon[]>([])

  // Form state
  const [githubUrl, setGithubUrl] = useState("")
  const [hostedUrl, setHostedUrl] = useState("")
  const [userName, setUserName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")

  const searchParams = useSearchParams()
  const hackathonId = searchParams.get("hackathon")
  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchData = async () => {
      if (!db || !user) return

      try {
        // Fetch all active hackathons the user is enrolled in
        const enrollmentsCollection = collection(db, "enrollments")
        const userEnrollmentsQuery = query(
          enrollmentsCollection,
          where("userId", "==", user.uid),
          where("status", "==", "active"),
        )
        const userEnrollmentsSnapshot = await getDocs(userEnrollmentsQuery)

        const hackathonPromises = userEnrollmentsSnapshot.docs.map(async (enrollmentDoc) => {
          const enrollmentData = enrollmentDoc.data()
          const hackathonDoc = await getDoc(doc(db, "hackathons", enrollmentData.hackathonId))
          if (hackathonDoc.exists()) {
            const hackathonData = hackathonDoc.data() as Omit<Hackathon, "id">
            return { id: hackathonDoc.id, ...hackathonData }
          }
          return null
        })

        const hackathons = (await Promise.all(hackathonPromises)).filter(Boolean) as Hackathon[]
        setActiveHackathons(hackathons)

        if (hackathonId) {
          const hackathonDoc = await getDoc(doc(db, "hackathons", hackathonId))
          if (hackathonDoc.exists()) {
            const hackathonData = hackathonDoc.data() as Omit<Hackathon, "id">
            setHackathon({ id: hackathonDoc.id, ...hackathonData })

            const enrollmentQuery = query(
              enrollmentsCollection,
              where("userId", "==", user.uid),
              where("hackathonId", "==", hackathonId),
              where("status", "==", "active"),
            )
            const enrollmentSnapshot = await getDocs(enrollmentQuery)

            if (!enrollmentSnapshot.empty) {
              const enrollmentData = enrollmentSnapshot.docs[0].data() as Omit<Enrollment, "id">
              const enrollmentWithId: Enrollment = {
                id: enrollmentSnapshot.docs[0].id,
                ...enrollmentData,
              }
              setEnrollment(enrollmentWithId)
              if (enrollmentData.submissionUrl) setGithubUrl(enrollmentData.submissionUrl)
              if (enrollmentData.hostedUrl) setHostedUrl(enrollmentData.hostedUrl)
              if (enrollmentData.userName) setUserName(enrollmentData.userName)
              if (enrollmentData.description) setProjectDescription(enrollmentData.description)
              // Set default username from auth if not already set
              else setUserName(user.displayName || "Anonymous")
            } else {
              toast({
                variant: "destructive",
                title: "Not Enrolled",
                description: "You are not enrolled in this hackathon",
              })
              router.push("/dashboard/my-hackathons")
            }
          }
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load hackathon data",
        })
        setLoading(false)
      }
    }

    fetchData()
  }, [db, user, router, toast, hackathonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !user || !enrollment || !hackathon) return

    setSubmitting(true)
    try {
      const enrollmentRef = doc(db, "enrollments", enrollment.id)
      const enrollmentData = {
        submissionUrl: githubUrl,
        hostedUrl: hostedUrl,
        userName: userName,
        description: projectDescription,
        updatedAt: serverTimestamp(),
      }

      await updateDoc(enrollmentRef, enrollmentData)

      toast({
        title: "Success",
        description: "Your project has been submitted successfully",
      })
      router.push("/dashboard/my-hackathons")
    } catch (error: any) {
      console.error("Submission error:", error)
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Failed to submit your project. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectHackathon = (id: string) => {
    router.push(`/dashboard/submit?hackathon=${id}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-[#00FFBF] animate-spin mb-4" />
        <p className="text-xl">Loading submission form...</p>
      </div>
    )
  }

  if (!hackathon || !enrollment) {
    return (
      <div className="py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Submit Project</h1>
            <p className="text-gray-400 mt-1">Submit your project for a hackathon</p>
          </div>
        </div>

        <Card className="bg-[#121212] border-gray-800 max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">No Active Hackathon Selected</CardTitle>
            <CardDescription>
              {activeHackathons.length > 0
                ? "Select a hackathon to submit your project"
                : "You are not enrolled in any active hackathons"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeHackathons.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Your active hackathons:</p>
                <div className="grid gap-3">
                  {activeHackathons.map((hackathon) => (
                    <Card
                      key={hackathon.id}
                      className="bg-[#1A1A1A] border-gray-800 hover:border-[#00FFBF]/50 transition-colors cursor-pointer"
                      onClick={() => selectHackathon(hackathon.id)}
                    >
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{hackathon.title}</h3>
                          <p className="text-sm text-gray-400">
                            {hackathon.description?.substring(0, 60) || "No description available"}...
                          </p>
                        </div>
                        <Badge className="bg-[#00FFBF] text-black">
                          {hackathon.status === "open" ? "Open" : "Closed"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileCode className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No Active Hackathons</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-6">
                  You need to join a hackathon before you can submit a project. Browse available hackathons and join one
                  to get started.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
              <Link href="/hackathons">
                <Calendar className="mr-2 h-4 w-4" />
                Browse Hackathons
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Submit Project</h1>
          <p className="text-gray-400 mt-1">Submit your project for {hackathon.title}</p>
        </div>
        <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
          <Link href="/dashboard/my-hackathons">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Hackathons
          </Link>
        </Button>
      </div>

      <Card className="bg-[#121212] border-gray-800 max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Project Submission</CardTitle>
            <Badge className={hackathon.status === "open" ? "bg-green-600" : "bg-red-600"}>
              {hackathon.status === "open" ? "Open for Submissions" : "Closed"}
            </Badge>
          </div>
          <CardDescription>
            {hackathon.status === "open"
              ? "Submit your project details below"
              : "This hackathon is closed for submissions"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="details">Project Details</TabsTrigger>
                <TabsTrigger value="links">Project Links</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name-input">Your Name / Team Name</Label>
                  <Input
                    id="user-name-input"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-black border-gray-800"
                    placeholder="Enter your name or team name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-description">Project Description</Label>
                  <Textarea
                    id="project-description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="bg-black border-gray-800 min-h-[150px]"
                    placeholder="Describe your project, its features, and how it addresses the hackathon challenge"
                  />
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-url-input">GitHub Repository URL</Label>
                  <div className="flex items-center space-x-2">
                    <div className="bg-black border border-gray-800 rounded-md p-2">
                      <Github className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="github-url-input"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="bg-black border-gray-800 flex-1"
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Link to your project's source code repository</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hosted-url-input">Hosted Project URL</Label>
                  <div className="flex items-center space-x-2">
                    <div className="bg-black border border-gray-800 rounded-md p-2">
                      <Globe className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="hosted-url-input"
                      type="url"
                      value={hostedUrl}
                      onChange={(e) => setHostedUrl(e.target.value)}
                      className="bg-black border-gray-800 flex-1"
                      placeholder="https://your-project.vercel.app"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Link to your deployed project (if available)</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
              disabled={submitting || hackathon.status === "closed"}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Project"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

