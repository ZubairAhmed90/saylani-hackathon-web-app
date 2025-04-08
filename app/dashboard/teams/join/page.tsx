"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import {
  collection,
  getDocs,
  query,
  where,
  documentId,
  addDoc,
  Timestamp,
  updateDoc,
  arrayUnion,
  doc,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isValidInviteCode } from "@/lib/team"
import TeamQrScanner from "@/components/teams/team-qr-scanner"

export default function JoinTeamPage() {
  const [inviteCode, setInviteCode] = useState("")
  const [teamId, setTeamId] = useState("")
  const [teamEmail, setTeamEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("code")
  const [initialLoading, setInitialLoading] = useState(true)

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize email from user if available and handle URL params
  useEffect(() => {
    if (!user) {
      router.push("/auth/login?redirect=/dashboard/teams/join")
      return
    }

    if (user?.email) {
      setTeamEmail(user.email)
    }

    // Get the code from the URL
    const code = searchParams.get("code")
    const team = searchParams.get("team")

    // Set invite code or team ID from url param
    if (code) {
      setInviteCode(code)
      setActiveTab("code")
      // Auto-join if code is provided
      if (isValidInviteCode(code)) {
        handleJoinByCode(null, code)
      }
    } else if (team) {
      setTeamId(team)
      setActiveTab("email")
    }

    setInitialLoading(false)
  }, [user, searchParams])

  const handleJoinByCode = async (e: React.FormEvent | null, codeOverride?: string) => {
    if (e) e.preventDefault()

    const codeToUse = codeOverride || inviteCode

    if (!codeToUse) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an invite code",
      })
      return
    }

    setLoading(true)

    try {
      if (!db || !user) {
        throw new Error("Authentication required")
      }

      // Find team with matching invite code
      const teamsCollection = collection(db, "teams")
      const teamsQuery = query(teamsCollection, where("inviteCode", "==", codeToUse))
      const teamsSnapshot = await getDocs(teamsQuery)

      if (teamsSnapshot.empty) {
        throw new Error("Invalid invite code. Please check and try again.")
      }

      const teamDoc = teamsSnapshot.docs[0]
      const teamData = teamDoc.data()

      // Check if user is already a member
      if (teamData.members && teamData.members.includes(user.uid)) {
        toast({
          title: "Already a Member",
          description: "You are already a member of this team",
        })
        router.push("/dashboard/teams")
        return
      }

      // If team has direct join enabled, add them directly
      // Otherwise create a join request
      if (teamData.directJoin) {
        // Add user to team members
        const teamRef = doc(db, "teams", teamDoc.id)
        await updateDoc(teamRef, {
          members: arrayUnion(user.uid),
        })

        toast({
          title: "Team Joined",
          description: `You have successfully joined ${teamData.name}`,
        })
        router.push("/dashboard/teams")
      } else {
        // Create a join request
        await addDoc(collection(db, "teamJoinRequests"), {
          teamId: teamDoc.id,
          teamName: teamData.name,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || "Anonymous User",
          status: "pending",
          createdAt: Timestamp.now(),
        })

        toast({
          title: "Join Request Sent",
          description: `Your request to join ${teamData.name} has been sent to the team leader`,
        })
        router.push("/dashboard/teams")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to join team",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJoinByTeamId = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId || !teamEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      })
      return
    }

    setLoading(true)

    try {
      if (!db || !user) {
        throw new Error("Authentication required")
      }

      // Check if team exists
      const teamsCollection = collection(db, "teams")
      const teamsQuery = query(teamsCollection, where(documentId(), "==", teamId))
      const teamsSnapshot = await getDocs(teamsQuery)

      if (teamsSnapshot.empty) {
        throw new Error("Team not found. Please check the Team ID and try again.")
      }

      const teamData = teamsSnapshot.docs[0].data()

      // Check if user is already a member
      if (teamData.members && teamData.members.includes(user.uid)) {
        toast({
          title: "Already a Member",
          description: "You are already a member of this team",
        })
        router.push("/dashboard/teams")
        return
      }

      // Create a join request
      await addDoc(collection(db, "teamJoinRequests"), {
        teamId: teamId,
        teamName: teamData.name,
        userId: user.uid,
        userEmail: teamEmail,
        userName: user.displayName || "Anonymous User",
        status: "pending",
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Join Request Sent",
        description: "Your request to join the team has been sent to the team leader",
      })

      // Redirect to teams page
      router.push("/dashboard/teams")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send join request",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQrCodeScanned = (code: string) => {
    // If the scanned code is a valid invite code, use it directly
    if (isValidInviteCode(code)) {
      setInviteCode(code)
      handleJoinByCode(null, code)
    } else {
      // Otherwise, set it and let the user submit the form
      setInviteCode(code)
      setActiveTab("code")
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FFBF]" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
          <Link href="/dashboard/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
      </div>

      <Card className="bg-[#1A1A1A] border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Join a Team</CardTitle>
          <CardDescription>Join an existing team to participate in hackathons together</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-black border-gray-800 mb-4">
              <TabsTrigger value="code">Join by Invite Code</TabsTrigger>
              <TabsTrigger value="email">Join by Team ID</TabsTrigger>
              <TabsTrigger value="qr">Scan QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="code">
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="bg-black border-gray-800 font-mono text-center text-lg"
                    placeholder="Enter invite code"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-400">Enter the 6-character invite code provided by the team leader</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Team"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleJoinByTeamId} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-id">Team ID</Label>
                  <Input
                    id="team-id"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="bg-black border-gray-800 font-mono"
                    placeholder="Enter team ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-email">Your Email</Label>
                  <Input
                    id="team-email"
                    type="email"
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    className="bg-black border-gray-800"
                    placeholder="Enter your email"
                  />
                  <p className="text-xs text-gray-400">The team leader will send you an invitation to this email</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Request to Join
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="qr">
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <p className="mb-4">Scan a team QR code to join instantly</p>
                  <TeamQrScanner onCodeScanned={handleQrCodeScanned} />
                </div>
                <div className="text-center text-sm text-gray-400 mt-4">
                  <p>Team QR codes can be generated by team leaders</p>
                  <p>Scanning a valid code will automatically join you to the team</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400">
            Already have a team?{" "}
            <Link href="/dashboard/teams" className="text-[#00FFBF] hover:underline">
              View your teams
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

