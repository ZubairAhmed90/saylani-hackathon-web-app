"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Clock, AlertCircle, CheckCircle, Eye, Timer } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Particles from "react-particles"
import { loadSlim } from "tsparticles-slim"
import type { Container, Engine } from "tsparticles-engine"
import Image from "next/image"

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
  imageUrl?: string
  slug?: string
}

export default function ApplyHackathonPage() {
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [userEnrollment, setUserEnrollment] = useState<string | null>(null)
  const [teamEnrollment, setTeamEnrollment] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [hackathonStatus, setHackathonStatus] = useState<string>("")

  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const slugOrId = params.slug as string

  const particlesInit = async (engine: Engine) => {
    await loadSlim(engine)
  }

  const particlesLoaded = async (container: Container | undefined): Promise<void> => {
    console.log("Particles container loaded", container)
  }

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchHackathon = async () => {
      if (!db) return

      try {
        let hackathonData = null

        // Check if the ID is a valid document ID format
        // This is a simple check - Firebase IDs are typically alphanumeric
        const isValidDocId = /^[A-Za-z0-9]+$/.test(slugOrId)

        if (isValidDocId) {
          try {
            // Try to fetch by ID first, but wrap in try/catch to handle invalid IDs
            const hackathonDoc = await getDoc(doc(db, "hackathons", slugOrId))
            if (hackathonDoc.exists()) {
              hackathonData = {
                id: hackathonDoc.id,
                ...hackathonDoc.data(),
              } as Hackathon
            }
          } catch (idError) {
            console.error("Error fetching by ID:", idError)
            // Continue to slug query if ID fetch fails
          }
        }

        // If not found by ID, try to find by slug
        if (!hackathonData) {
          console.log("Searching by slug:", slugOrId)
          const hackathonsCollection = collection(db, "hackathons")

          // Get all hackathons and filter by slug
          const hackathonsSnapshot = await getDocs(hackathonsCollection)

          for (const doc of hackathonsSnapshot.docs) {
            const data = doc.data()
            // Check if the slug matches (case insensitive)
            if (data.slug && data.slug.toLowerCase() === slugOrId.toLowerCase()) {
              hackathonData = {
                id: doc.id,
                ...data,
              } as Hackathon
              break
            }

            // If no slug exists, generate one from title and check
            if (!data.slug && data.title) {
              const generatedSlug = data.title
                .toLowerCase()
                .replace(/[^\w\s]/gi, "")
                .replace(/\s+/g, "-")

              if (generatedSlug === slugOrId) {
                hackathonData = {
                  id: doc.id,
                  ...data,
                  slug: generatedSlug,
                } as Hackathon
                break
              }
            }
          }
        }

        if (!hackathonData) {
          setError("Hackathon not found")
          setLoading(false)
          return
        }

        // Generate a slug from the title if not already present
        if (!hackathonData.slug) {
          hackathonData.slug = hackathonData.title
            .toLowerCase()
            .replace(/[^\w\s]/gi, "")
            .replace(/\s+/g, "-")
        }

        if (hackathonData.status === "closed") {
          setError("This hackathon is closed for applications")
          setLoading(false)
          return
        }

        setHackathon(hackathonData)
        updateTimeStatus(hackathonData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching hackathon:", error)
        setError("Failed to load hackathon details")
        setLoading(false)
      }
    }

    const checkUserEnrollment = async () => {
      if (!db || !user) return

      try {
        // Check if user is directly enrolled in any hackathon
        const enrollmentsCollection = collection(db, "enrollments")
        const q = query(enrollmentsCollection, where("userId", "==", user.uid), where("status", "==", "active"))
        const enrollmentsSnapshot = await getDocs(q)

        if (!enrollmentsSnapshot.empty) {
          const enrollmentData = enrollmentsSnapshot.docs[0].data()
          setUserEnrollment(enrollmentData.hackathonId)

          if (hackathon && enrollmentData.hackathonId === hackathon.id) {
            setError("You are already enrolled in this hackathon")
          } else {
            setError(
              "You are already enrolled in another hackathon. You can only participate in one hackathon at a time.",
            )
          }
        }

        // Check if user is part of a team that's enrolled in any hackathon
        const teamsCollection = collection(db, "teams")
        const teamQuery = query(teamsCollection, where("members", "array-contains", user.uid))
        const teamsSnapshot = await getDocs(teamQuery)

        if (!teamsSnapshot.empty) {
          // User is part of at least one team
          for (const teamDoc of teamsSnapshot.docs) {
            const teamData = teamDoc.data()

            // Check if this team is enrolled in a hackathon
            const teamEnrollmentsQuery = query(
              enrollmentsCollection,
              where("teamId", "==", teamDoc.id),
              where("status", "==", "active"),
            )
            const teamEnrollmentsSnapshot = await getDocs(teamEnrollmentsQuery)

            if (!teamEnrollmentsSnapshot.empty) {
              // Team is enrolled in a hackathon
              setTeamEnrollment(true)
              const teamEnrollmentData = teamEnrollmentsSnapshot.docs[0].data()

              if (hackathon && teamEnrollmentData.hackathonId === hackathon.id) {
                setError(`You are already part of a team (${teamData.name}) that is enrolled in this hackathon`)
              } else {
                setError(`You are already part of a team (${teamData.name}) that is enrolled in another hackathon`)
              }
              break
            }
          }
        }

        // Check if user is an admin
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true)
        }
      } catch (error) {
        console.error("Error checking enrollment:", error)
      }
    }

    fetchHackathon()
    checkUserEnrollment()

    // Set up timer to update time remaining
    const timer = setInterval(() => {
      if (hackathon) {
        updateTimeStatus(hackathon)
      }
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [db, user, router, slugOrId, toast, hackathon])

  const updateTimeStatus = (hackathon: Hackathon) => {
    const now = new Date().getTime()
    const startTime = hackathon.startDate.toDate
      ? hackathon.startDate.toDate().getTime()
      : new Date(hackathon.startDate).getTime()
    const endTime = hackathon.endDate.toDate
      ? hackathon.endDate.toDate().getTime()
      : new Date(hackathon.endDate).getTime()

    // Calculate time remaining
    let timeString = ""
    let statusText = ""

    if (now < startTime) {
      // Hackathon hasn't started yet
      const timeLeft = startTime - now
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (days > 0) {
        timeString = `${days} day${days !== 1 ? "s" : ""} ${hours} hour${hours !== 1 ? "s" : ""}`
      } else {
        timeString = `${hours} hour${hours !== 1 ? "s" : ""}`
      }

      statusText = "Registration open"
    } else if (now < endTime) {
      // Hackathon is in progress
      const timeLeft = endTime - now
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (days > 0) {
        timeString = `${days} day${days !== 1 ? "s" : ""} ${hours} hour${hours !== 1 ? "s" : ""}`
      } else {
        timeString = `${hours} hour${hours !== 1 ? "s" : ""}`
      }

      statusText = "Hackathon in progress"
    } else {
      // Hackathon has ended
      timeString = "0 days"
      statusText = "Hackathon ended"
    }

    setTimeRemaining(timeString)
    setHackathonStatus(statusText)
  }

  const handleApply = async () => {
    if (!db || !user || !hackathon) return

    setApplying(true)

    try {
      // Check if hackathon is full
      if (hackathon.participants >= hackathon.maxParticipants) {
        setError("This hackathon is already full")
        setApplying(false)
        return
      }

      // Create enrollment
      await addDoc(collection(db, "enrollments"), {
        userId: user.uid,
        hackathonId: hackathon.id,
        status: "active",
        createdAt: serverTimestamp(),
      })

      // Update hackathon participants count
      // Note: In a production app, you'd use a transaction or cloud function for this
      // to ensure atomic updates and prevent race conditions

      setSuccess(true)
      toast({
        title: "Success!",
        description: "You have successfully enrolled in this hackathon",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/my-hackathons")
      }, 2000)
    } catch (error) {
      console.error("Error applying to hackathon:", error)
      setError("Failed to apply to hackathon. Please try again.")
      setApplying(false)
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
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading hackathon details...</div>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex justify-center mt-6">
          <Button asChild variant="outline" className="mr-4">
            <Link href="/hackathons">Back to Hackathons</Link>
          </Button>

          {userEnrollment && (
            <Button asChild>
              <Link href="/dashboard/my-hackathons">View My Hackathons</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!hackathon) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Hackathon not found</AlertDescription>
        </Alert>

        <div className="flex justify-center mt-6">
          <Button asChild variant="outline">
            <Link href="/hackathons">Back to Hackathons</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        className="absolute inset-0 -z-10"
        options={{
          background: {
            color: {
              value: "#000000",
            },
          },
          fpsLimit: 60,
          particles: {
            color: {
              value: "#00FFBF",
            },
            links: {
              color: "#00FFBF",
              distance: 150,
              enable: true,
              opacity: 0.2,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: false,
              speed: 1,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 80,
            },
            opacity: {
              value: 0.3,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 3 },
            },
          },
          detectRetina: true,
        }}
      />

      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Apply to Hackathon</h1>

        {success ? (
          <Alert className="mb-6 bg-green-900/20 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              You have successfully enrolled in this hackathon. Redirecting to your hackathons...
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Details Card */}
        <Card className="bg-[#1A1A1A] border-gray-800 mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl">{hackathon.title}</CardTitle>
              <Badge className={hackathon.status === "open" ? "bg-green-600" : "bg-red-600"}>
                {hackathon.status === "open" ? "Open" : "Closed"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="flex items-center text-gray-400">
                <Calendar className="h-5 w-5 mr-3" />
                <span className="text-gray-300">
                  {formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}
                </span>
              </div>

              <div className="flex items-center text-gray-400">
                <Users className="h-5 w-5 mr-3" />
                <span className="text-gray-300">
                  {hackathon.participants}/{hackathon.maxParticipants} Participants
                </span>
              </div>

              <div className="flex items-center text-gray-400">
                <Clock className="h-5 w-5 mr-3" />
                <span className="text-gray-300">Hosted by {hackathon.hostedBy}</span>
              </div>
            </div>

            <Badge variant="outline" className="bg-black/50 text-gray-300">
              {hackathon.category}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Description Card */}
          <Card className="bg-[#1A1A1A] border-gray-800 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Hackathon Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-6">{hackathon.description}</p>

              <div className="space-y-4">
                <div className="bg-black/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Hackathon Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Registration Opens:</span>
                      <span className="text-gray-300">{formatDate(hackathon.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hackathon Ends:</span>
                      <span className="text-gray-300">{formatDate(hackathon.endDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Application Details</h3>
                  <p className="text-gray-400 text-sm">
                    By applying to this hackathon, you agree to follow all rules and guidelines set by the organizers.
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    You can create or join a team after enrolling in the hackathon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image and Action Card */}
          <Card className="bg-[#1A1A1A] border-gray-800 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Time Remaining</CardTitle>
              <div className="flex items-center mt-2">
                <Timer className="w-5 h-5 text-[#00FFBF] mr-2" />
                <div>
                  <p className="text-[#00FFBF] font-bold text-xl">{timeRemaining}</p>
                  <p className="text-gray-400 text-sm">{hackathonStatus}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
              {hackathon.imageUrl ? (
                <div className="w-full aspect-video relative rounded-lg overflow-hidden mb-6">
                  <Image
                    src={hackathon.imageUrl || "/placeholder.svg"}
                    alt={hackathon.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg flex items-center justify-center mb-6">
                  <Timer className="w-20 h-20 text-[#00FFBF] opacity-50" />
                </div>
              )}

              <div className="w-full flex flex-col gap-4">
                {isAdmin && (
                  <Button
                    asChild
                    variant="outline"
                    className="border-[#00FFBF] text-[#00FFBF] hover:bg-[#00FFBF]/10 w-full"
                  >
                    <Link href={`/admin/hackathons/${hackathon.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                )}

                <Button
                  onClick={handleApply}
                  disabled={applying || userEnrollment !== null || teamEnrollment || success}
                  className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90 w-full"
                >
                  {applying ? "Applying..." : "Confirm Application"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

