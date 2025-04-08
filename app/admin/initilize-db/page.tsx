"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, doc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check, AlertTriangle } from "lucide-react"

export default function InitializeDbPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const initializeDatabase = async () => {
    if (!user) return

    setLoading(true)
    setStatus(null)

    try {
      // Create teams collection with a sample team
      const teamsCollection = collection(db, "teams")
      await setDoc(doc(teamsCollection, "sample-team"), {
        name: "Sample Team",
        description: "This is a sample team for testing purposes.",
        hackathonId: "sample-hackathon",
        hackathonTitle: "Sample Hackathon 2023",
        leaderId: user.uid,
        members: [user.uid],
        createdAt: Timestamp.now(),
      })

      // Create invitations collection
      const invitationsCollection = collection(db, "invitations")

      // Create hackathons collection with a sample hackathon
      const hackathonsCollection = collection(db, "hackathons")
      await setDoc(doc(hackathonsCollection, "sample-hackathon"), {
        title: "Sample Hackathon 2023",
        description: "This is a sample hackathon for testing purposes.",
        startDate: Timestamp.fromDate(new Date("2023-12-01")),
        endDate: Timestamp.fromDate(new Date("2023-12-15")),
        status: "open",
        registrationOpen: true,
        maxTeamSize: 5,
        createdAt: Timestamp.now(),
      })

      setStatus({
        success: true,
        message: "Database initialized successfully with sample data!",
      })
    } catch (error: any) {
      console.error("Error initializing database:", error)
      setStatus({
        success: false,
        message: `Error: ${error.message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle>Initialize Database</CardTitle>
          <CardDescription>Create required collections and sample data in Firebase</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">This will create the following collections if they don't exist:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            <li>teams</li>
            <li>invitations</li>
            <li>hackathons</li>
          </ul>

          {status && (
            <div className={`mt-4 p-3 rounded-md ${status.success ? "bg-green-900/30" : "bg-red-900/30"}`}>
              <div className="flex items-center">
                {status.success ? (
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                )}
                <p className="text-sm">{status.message}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={initializeDatabase}
            disabled={loading}
            className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

