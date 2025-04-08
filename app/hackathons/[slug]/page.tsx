"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { doc, getDoc, collection, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Clock, AlertCircle, Eye } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

export default function HackathonDetailsPage() {
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)

  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()
  const params = useParams()
  const slugOrId = params.slug as string

  useEffect(() => {
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

        setHackathon(hackathonData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching hackathon:", error)
        setError("Failed to load hackathon details")
        setLoading(false)
      }
    }

    const checkUserRole = async () => {
      if (!db || !user) return

      try {
        // Check if user is an admin
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true)
        }
      } catch (error) {
        console.error("Error checking user role:", error)
      }
    }

    fetchHackathon()
    if (user) {
      checkUserRole()
    }
  }, [db, user, router, slugOrId])

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

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex justify-center mt-6">
          <Button asChild variant="outline">
            <Link href="/hackathons">Back to Hackathons</Link>
          </Button>
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{hackathon.title}</h1>
        {isAdmin && (
          <Button asChild variant="outline" className="border-[#00FFBF] text-[#00FFBF] hover:bg-[#00FFBF]/10">
            <Link href={`/admin/hackathons/${hackathon.id}`}>
              <Eye className="w-4 h-4 mr-2" />
              Admin View
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="bg-[#1A1A1A] border-gray-800 mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">Hackathon Details</CardTitle>
                <Badge className={hackathon.status === "open" ? "bg-green-600" : "bg-red-600"}>
                  {hackathon.status === "open" ? "Open" : "Closed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

              <Badge variant="outline" className="bg-black/50 text-gray-300 mb-6">
                {hackathon.category}
              </Badge>

              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-gray-300">{hackathon.description}</p>
              </div>
            </CardContent>
          </Card>

          {hackathon.status === "open" && (
            <div className="flex justify-center mt-6">
              <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                <Link href={`/hackathons/${hackathon.slug}/apply`}>Apply Now</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card className="bg-[#1A1A1A] border-gray-800 overflow-hidden">
            {hackathon.imageUrl ? (
              <div className="w-full aspect-video relative">
                <Image
                  src={hackathon.imageUrl || "/placeholder.svg"}
                  alt={hackathon.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
                <Calendar className="w-16 h-16 text-gray-600" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg">Important Dates</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <h3 className="font-medium mb-2">Participation Details</h3>
                  <p className="text-gray-400 text-sm">
                    {hackathon.status === "open"
                      ? "This hackathon is currently open for applications."
                      : "This hackathon is currently closed for applications."}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {hackathon.participants} out of {hackathon.maxParticipants} spots filled.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

