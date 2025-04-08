"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import TeamInviteDialog from "@/components/teams/team-invite-dialog"

interface TeamMember {
  id: string
  displayName: string
  email: string
  photoURL?: string
  role: "leader" | "member"
}

interface Team {
  id: string
  name: string
  description: string
  hackathonId: string
  hackathonTitle: string
  leaderId: string
  members: string[]
  createdAt: any
  inviteCode: string
}

export default function TeamDetailsPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isLeader, setIsLeader] = useState(false)

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchTeamDetails = async () => {
      if (!db || !teamId) return

      try {
        const teamDoc = await getDoc(doc(db, "teams", teamId))

        if (!teamDoc.exists()) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Team not found",
          })
          router.push("/dashboard/teams")
          return
        }

        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team
        setTeam(teamData)
        setIsLeader(teamData.leaderId === user.uid)

        // Fetch team members
        const membersData = await Promise.all(
          teamData.members.map(async (memberId) => {
            const userDoc = await getDoc(doc(db, "users", memberId))
            if (userDoc.exists()) {
              return {
                id: memberId,
                displayName: userDoc.data().displayName || "Unknown User",
                email: userDoc.data().email || "",
                photoURL: userDoc.data().photoURL,
                role: memberId === teamData.leaderId ? "leader" : "member",
              } as TeamMember
            }
            return null
          }),
        )

        setMembers(membersData.filter((member): member is TeamMember => member !== null))
        setLoading(false)
      } catch (error) {
        console.error("Error fetching team details:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load team details",
        })
        setLoading(false)
      }
    }

    fetchTeamDetails()
  }, [db, user, teamId, router, toast])

  const handleLeaveTeam = async () => {
    if (!db || !user || !team) return

    try {
      // Check if user is team leader
      if (team.leaderId === user.uid) {
        throw new Error("Team leaders cannot leave. Transfer leadership or delete the team.")
      }

      // Update team members
      await updateDoc(doc(db, "teams", team.id), {
        members: arrayRemove(user.uid),
      })

      toast({
        title: "Success",
        description: "You have left the team",
      })

      router.push("/dashboard/teams")
    } catch (error: any) {
      console.error("Error leaving team:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to leave team",
      })
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading team details...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-xl">Team not found</div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <Card className="bg-[#121212] border-gray-800 max-w-2xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{team.name}</CardTitle>
          <p className="text-gray-400">{team.description || "helloworld"}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-black/30 p-3 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Hackathon</p>
            <p>{team.hackathonTitle || "Hackathon"}</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-400">Team Members ({members.length})</h3>
              {isLeader && (
                <TeamInviteDialog teamId={team.id} teamName={team.name} inviteCode={team.inviteCode || "INVITE123"} />
              )}
            </div>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    {member.photoURL ? <AvatarImage src={member.photoURL} alt={member.displayName} /> : null}
                    <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.displayName}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isLeader && (
            <div className="pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full bg-black hover:bg-gray-900 border-none">
                    Leave Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be removed from this team and will need to be invited again to rejoin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveTeam} className="bg-red-600 hover:bg-red-700">
                      Leave Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

