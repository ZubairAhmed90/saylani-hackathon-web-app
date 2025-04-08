"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { generateInviteCode } from "@/lib/team"
import TeamInviteDialog from "@/components/teams/team-invite-dialog"

export default function CreateTeamPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [directJoin, setDirectJoin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdTeam, setCreatedTeam] = useState<{ id: string; name: string; inviteCode: string } | null>(null)

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Team name is required",
      })
      return
    }

    setLoading(true)

    try {
      if (!db || !user) {
        throw new Error("Authentication required")
      }

      const inviteCode = generateInviteCode()

      // Create team document
      const teamData = {
        name,
        description,
        inviteCode,
        directJoin,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        members: [user.uid], // Creator is automatically a member
        leader: user.uid,
      }

      const docRef = await addDoc(collection(db, "teams"), teamData)

      toast({
        title: "Team Created",
        description: "Your team has been created successfully",
      })

      // Set the created team data for the invite dialog
      setCreatedTeam({
        id: docRef.id,
        name,
        inviteCode,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create team",
      })
      setLoading(false)
    }
  }

  const handleDone = () => {
    router.push("/dashboard/teams")
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

      {createdTeam ? (
        <Card className="bg-[#121212] border-gray-800 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Team Created Successfully!</CardTitle>
            <CardDescription>
              Your team "{createdTeam.name}" has been created. Share the invite code with others to join your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamInviteDialog
              teamId={createdTeam.id}
              teamName={createdTeam.name}
              inviteCode={createdTeam.inviteCode}
              showTrigger={false}
            />
          </CardContent>
          <CardFooter className="flex justify-end pt-4">
            <Button onClick={handleDone} className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
              Done
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="bg-[#1A1A1A] border-gray-800 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create a Team</CardTitle>
            <CardDescription>Create a new team to participate in hackathons together</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-black border-gray-800"
                  placeholder="Enter team name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description">Team Description (Optional)</Label>
                <Textarea
                  id="team-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-black border-gray-800 min-h-[100px]"
                  placeholder="Describe your team and its goals"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="direct-join" checked={directJoin} onCheckedChange={setDirectJoin} />
                <Label htmlFor="direct-join">Allow direct join with invite code (without approval)</Label>
              </div>

              <Button type="submit" className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

