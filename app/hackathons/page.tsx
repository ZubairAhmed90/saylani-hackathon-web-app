"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, type Timestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Users } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  AnimatedCard,
  AnimatedCardContent,
  AnimatedCardFooter,
  AnimatedCardHeader,
  CardTitle,
  CardDescription,
} from "@/components/animated-card"
import { AnimatedButton } from "@/components/animated-button"
import { motion } from "framer-motion"
import Image from "next/image"

interface Hackathon {
  id: string
  title: string
  description: string
  startDate: Timestamp
  endDate: Timestamp
  status: "open" | "closed"
  category: string
  participants: number
  maxParticipants: number
  hostedBy: string
  imageUrl?: string
  slug?: string
}

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [filteredHackathons, setFilteredHackathons] = useState<Hackathon[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [userEnrollment, setUserEnrollment] = useState<string | null>(null)
  const [teamEnrollment, setTeamEnrollment] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState("all")

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

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
        setFilteredHackathons(hackathonsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching hackathons:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load hackathons",
        })
        setLoading(false)
      }
    }

    const checkUserEnrollment = async () => {
      if (!db || !user) return

      try {
        const enrollmentsCollection = collection(db, "enrollments")
        const q = query(enrollmentsCollection, where("userId", "==", user.uid), where("status", "==", "active"))
        const enrollmentsSnapshot = await getDocs(q)

        if (!enrollmentsSnapshot.empty) {
          setUserEnrollment(enrollmentsSnapshot.docs[0].data().hackathonId)
        } else {
          setUserEnrollment(null)
        }

        const teamsCollection = collection(db, "teams")
        const teamQuery = query(teamsCollection, where("members", "array-contains", user.uid))
        const teamsSnapshot = await getDocs(teamQuery)

        if (!teamsSnapshot.empty) {
          for (const teamDoc of teamsSnapshot.docs) {
            const teamEnrollmentsQuery = query(
              enrollmentsCollection,
              where("teamId", "==", teamDoc.id),
              where("status", "==", "active"),
            )
            const teamEnrollmentsSnapshot = await getDocs(teamEnrollmentsQuery)

            if (!teamEnrollmentsSnapshot.empty) {
              setTeamEnrollment(true)
              break
            }
          }
        }
      } catch (error) {
        console.error("Error checking enrollment:", error)
      }
    }

    fetchHackathons()
    if (user) {
      checkUserEnrollment()
    }
  }, [db, user, toast])

  useEffect(() => {
    let filtered = [...hackathons]

    if (statusFilter !== "all") {
      filtered = filtered.filter((hackathon) => hackathon.status === statusFilter)
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((hackathon) => hackathon.category === categoryFilter)
    }

    setFilteredHackathons(filtered)
  }, [hackathons, statusFilter, categoryFilter])

  const formatDate = (timestamp: any) => {
    try {
      const date =
        timestamp instanceof Date
          ? timestamp
          : typeof timestamp === "string"
            ? new Date(timestamp)
            : new Date(timestamp.seconds * 1000)

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Invalid date format:", error)
      return "Invalid Date"
    }
  }

  const getCategories = () => {
    const categories = new Set<string>()
    hackathons.forEach((hackathon) => categories.add(hackathon.category))
    return Array.from(categories)
  }

  const handleLoginToApply = (hackathonId: string) => {
    sessionStorage.setItem("redirectAfterLogin", `/hackathons/${hackathonId}/apply`)
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="container mx-auto flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading hackathons...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-3xl font-bold">Hackathons</h1>
          <p className="text-gray-400 mt-1">Discover and join exciting coding challenges</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-[#1A1A1A] border-gray-800">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-800">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-[#1A1A1A] border-gray-800">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-800">
              <SelectItem value="all">All Categories</SelectItem>
              {getCategories().map((category, index) => (
                <SelectItem key={`category-${index}-${category}`} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#00FFBF] data-[state=active]:text-black">
            All
          </TabsTrigger>
          <TabsTrigger value="open" className="data-[state=active]:bg-[#00FFBF] data-[state=active]:text-black">
            Open
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-[#00FFBF] data-[state=active]:text-black">
            Closed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHackathons.length > 0 ? (
              filteredHackathons.map((hackathon, index) => (
                <AnimatedCard key={hackathon.id} delay={index * 0.05} className="flex flex-col min-h-[400px]">
                  {hackathon.imageUrl && (
                    <div className="relative w-full h-[160px] overflow-hidden rounded-t-lg">
                      <Image
                        src={hackathon.imageUrl || "/placeholder.svg"}
                        alt={hackathon.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <AnimatedCardHeader className="pb-2 flex-grow-0">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl line-clamp-1">{hackathon.title}</CardTitle>
                      <Badge className={hackathon.status === "open" ? "bg-green-600" : "bg-gray-600"}>
                        {hackathon.status === "open" ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 min-h-[40px]">{hackathon.description}</CardDescription>
                  </AnimatedCardHeader>
                  <AnimatedCardContent className="pb-2 flex-grow">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Users className="h-4 w-4 mr-2" />
                        <span>
                          {hackathon.participants}/{hackathon.maxParticipants} Participants
                        </span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Hosted by {hackathon.hostedBy}</span>
                      </div>
                      <Badge variant="outline" className="mt-2 bg-black/50">
                        {hackathon.category}
                      </Badge>
                    </div>
                  </AnimatedCardContent>
                  <AnimatedCardFooter className="flex-shrink-0 mt-auto">
                    {user ? (
                      hackathon.status === "open" ? (
                        userEnrollment ? (
                          userEnrollment === hackathon.id ? (
                            <AnimatedButton className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                              <Link href={`/dashboard`} className="w-full">
                                View Submission
                              </Link>
                            </AnimatedButton>
                          ) : (
                            <Button disabled className="w-full bg-gray-700 cursor-not-allowed">
                              Already enrolled in another hackathon
                            </Button>
                          )
                        ) : teamEnrollment ? (
                          <Button disabled className="w-full bg-gray-700 cursor-not-allowed">
                            Your team is already enrolled
                          </Button>
                        ) : (
                          <AnimatedButton asChild className="w-full">
                            <Link href={`/hackathons/${hackathon.slug || hackathon.id}/apply`}>Apply Now</Link>
                          </AnimatedButton>
                        )
                      ) : (
                        <Button disabled className="w-full bg-gray-700 cursor-not-allowed">
                          Closed
                        </Button>
                      )
                    ) : (
                      <AnimatedButton
                        className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                        onClick={() => handleLoginToApply(hackathon.slug || hackathon.id)}
                      >
                        Login to Apply
                      </AnimatedButton>
                    )}
                  </AnimatedCardFooter>
                </AnimatedCard>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400">No hackathons found matching your filters.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHackathons.filter((h) => h.status === "open").length > 0 ? (
              filteredHackathons
                .filter((h) => h.status === "open")
                .map((hackathon, index) => (
                  <AnimatedCard key={hackathon.id} delay={index * 0.05} className="flex flex-col min-h-[400px]">
                    {hackathon.imageUrl && (
                      <div className="relative w-full h-[160px] overflow-hidden rounded-t-lg">
                        <Image
                          src={hackathon.imageUrl || "/placeholder.svg"}
                          alt={hackathon.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <AnimatedCardHeader className="pb-2 flex-grow-0">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl line-clamp-1">{hackathon.title}</CardTitle>
                        <Badge className="bg-green-600">Open</Badge>
                      </div>
                      <CardDescription className="line-clamp-2 min-h-[40px]">{hackathon.description}</CardDescription>
                    </AnimatedCardHeader>
                    <AnimatedCardContent className="pb-2 flex-grow">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            {hackathon.participants}/{hackathon.maxParticipants} Participants
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Hosted by {hackathon.hostedBy}</span>
                        </div>
                        <Badge variant="outline" className="mt-2 bg-black/50">
                          {hackathon.category}
                        </Badge>
                      </div>
                    </AnimatedCardContent>
                    <AnimatedCardFooter className="flex-shrink-0 mt-auto">
                      {user ? (
                        userEnrollment ? (
                          userEnrollment === hackathon.id ? (
                            <AnimatedButton className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
                              <Link href={`/dashboard`} className="w-full">
                                View Submission
                              </Link>
                            </AnimatedButton>
                          ) : (
                            <Button disabled className="w-full bg-gray-700 cursor-not-allowed">
                              Already enrolled in another hackathon
                            </Button>
                          )
                        ) : teamEnrollment ? (
                          <Button disabled className="w-full bg-gray-700 cursor-not-allowed">
                            Your team is already enrolled
                          </Button>
                        ) : (
                          <AnimatedButton asChild className="w-full">
                            <Link href={`/hackathons/${hackathon.slug || hackathon.id}/apply`}>Apply Now</Link>
                          </AnimatedButton>
                        )
                      ) : (
                        <AnimatedButton
                          className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                          onClick={() => handleLoginToApply(hackathon.slug || hackathon.id)}
                        >
                          Login to Apply
                        </AnimatedButton>
                      )}
                    </AnimatedCardFooter>
                  </AnimatedCard>
                ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400">No open hackathons found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="closed" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHackathons.filter((h) => h.status === "closed").length > 0 ? (
              filteredHackathons
                .filter((h) => h.status === "closed")
                .map((hackathon, index) => (
                  <AnimatedCard key={hackathon.id} delay={index * 0.05} className="flex flex-col min-h-[400px]">
                    {hackathon.imageUrl && (
                      <div className="relative w-full h-[160px] overflow-hidden rounded-t-lg">
                        <Image
                          src={hackathon.imageUrl || "/placeholder.svg"}
                          alt={hackathon.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <AnimatedCardHeader className="pb-2 flex-grow-0">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl line-clamp-1">{hackathon.title}</CardTitle>
                        <Badge className="bg-gray-600">Closed</Badge>
                      </div>
                      <CardDescription className="line-clamp-2 min-h-[40px]">{hackathon.description}</CardDescription>
                    </AnimatedCardHeader>
                    <AnimatedCardContent className="pb-2 flex-grow">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            {hackathon.participants}/{hackathon.maxParticipants} Participants
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Hosted by {hackathon.hostedBy}</span>
                        </div>
                        <Badge variant="outline" className="mt-2 bg-black/50">
                          {hackathon.category}
                        </Badge>
                      </div>
                    </AnimatedCardContent>
                    <AnimatedCardFooter className="flex-shrink-0 mt-auto">
                      <AnimatedButton asChild variant="outline" className="w-full border-gray-700 hover:bg-gray-800">
                        <Link href={`/hackathons/${hackathon.slug || hackathon.id}`}>View Results</Link>
                      </AnimatedButton>
                    </AnimatedCardFooter>
                  </AnimatedCard>
                ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400">No closed hackathons found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}