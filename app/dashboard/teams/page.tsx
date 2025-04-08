"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Users, UserPlus, X, Check, Crown, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
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

interface TeamWithMembers extends Omit<Team, "members"> {
  members: TeamMember[]
}

interface Invitation {
  id: string
  teamId: string
  teamName: string
  hackathonId: string
  hackathonTitle: string
  inviterId: string
  inviterName: string
  inviteeId: string
  inviteeEmail: string
  status: "pending" | "accepted" | "declined"
  createdAt: any
}

interface Hackathon {
  id: string
  title: string
  status: "open" | "closed"
}

export default function TeamsPage() {
  const [myTeams, setMyTeams] = useState<TeamWithMembers[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("my-teams")

  // Create team states
  const [createTeamOpen, setCreateTeamOpen] = useState(false)

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchTeamsAndInvitations = async () => {
      if (!db || !user) return

      try {
        // Fetch teams where user is a member
        const teamsCollection = collection(db, "teams")
        const teamsQuery = query(teamsCollection, where("members", "array-contains", user.uid))
        const teamsSnapshot = await getDocs(teamsQuery)

        const teamsData = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[]

        // Fetch team members for each team
        const enrichedTeams = await Promise.all(
          teamsData.map(async (team) => {
            const membersData = await Promise.all(
              team.members.map(async (memberId) => {
                const userDoc = await getDoc(doc(db, "users", memberId))
                if (userDoc.exists()) {
                  return {
                    id: memberId,
                    displayName: userDoc.data().displayName || "Unknown User",
                    email: userDoc.data().email || "",
                    photoURL: userDoc.data().photoURL,
                    role: memberId === team.leaderId ? "leader" : "member",
                  } as TeamMember
                }
                return null
              }),
            )

            return {
              ...team,
              members: membersData.filter((member): member is TeamMember => member !== null),
            } as TeamWithMembers
          }),
        )

        setMyTeams(enrichedTeams)

        // Fetch invitations for the user
        const invitationsCollection = collection(db, "invitations")
        const invitationsQuery = query(
          invitationsCollection,
          where("inviteeId", "==", user.uid),
          where("status", "==", "pending"),
        )
        const invitationsSnapshot = await getDocs(invitationsQuery)

        const invitationsData = invitationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invitation[]

        setInvitations(invitationsData)

        setLoading(false)
      } catch (error) {
        console.error("Error fetching teams and invitations:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load teams data",
        })
        setLoading(false)
      }
    }

    fetchTeamsAndInvitations()
  }, [db, user, router, toast])

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!db || !user) return

    try {
      // Get the invitation
      const invitationDoc = await getDoc(doc(db, "invitations", invitationId))

      if (!invitationDoc.exists()) {
        throw new Error("Invitation not found")
      }

      const invitation = invitationDoc.data() as Invitation

      // Update team members
      await updateDoc(doc(db, "teams", invitation.teamId), {
        members: arrayRemove(user.uid),
      })

      // Update invitation status
      await updateDoc(doc(db, "invitations", invitationId), {
        status: "accepted",
      })

      toast({
        title: "Success",
        description: "You have joined the team",
      })

      // Remove invitation from state
      setInvitations(invitations.filter((inv) => inv.id !== invitationId))

      // Refresh teams (this is a simple approach - ideally we'd fetch the updated team)
      const teamDoc = await getDoc(doc(db, "teams", invitation.teamId))

      if (teamDoc.exists()) {
        const teamData = teamDoc.data() as Team

        // Add user to team members
        const newMember: TeamMember = {
          id: user.uid,
          displayName: user.displayName || "You",
          email: user.email || "",
          photoURL: user.photoURL || undefined,
          role: "member",
        }

        const updatedTeam: TeamWithMembers = {
          ...teamData,
          id: teamDoc.id,
          members: [newMember],
        }

        setMyTeams([...myTeams, updatedTeam])
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to accept invitation",
      })
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!db) return

    try {
      // Update invitation status
      await updateDoc(doc(db, "invitations", invitationId), {
        status: "declined",
      })

      toast({
        title: "Success",
        description: "Invitation declined",
      })

      // Remove invitation from state
      setInvitations(invitations.filter((inv) => inv.id !== invitationId))
    } catch (error: any) {
      console.error("Error declining invitation:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to decline invitation",
      })
    }
  }

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    if (!db || !user) return

    try {
      const team = myTeams.find((t) => t.id === teamId)

      if (!team) {
        throw new Error("Team not found")
      }

      // Check if user is team leader
      if (team.leaderId !== user.uid) {
        throw new Error("Only team leaders can remove members")
      }

      // Prevent removing the leader
      if (memberId === team.leaderId) {
        throw new Error("Team leader cannot be removed")
      }

      // Update team members
      await updateDoc(doc(db, "teams", teamId), {
        members: arrayRemove(memberId),
      })

      toast({
        title: "Success",
        description: "Team member removed",
      })

      // Update state
      setMyTeams(
        myTeams.map((t) => {
          if (t.id === teamId) {
            return {
              ...t,
              members: t.members.filter((m) => m.id !== memberId),
            }
          }
          return t
        }),
      )
    } catch (error: any) {
      console.error("Error removing team member:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove team member",
      })
    }
  }

  const handleLeaveTeam = async (teamId: string) => {
    if (!db || !user) return

    try {
      const team = myTeams.find((t) => t.id === teamId)

      if (!team) {
        throw new Error("Team not found")
      }

      // Check if user is team leader
      if (team.leaderId === user.uid) {
        throw new Error("Team leaders cannot leave. Transfer leadership or delete the team.")
      }

      // Update team members
      await updateDoc(doc(db, "teams", teamId), {
        members: arrayRemove(user.uid),
      })

      toast({
        title: "Success",
        description: "You have left the team",
      })

      // Update state
      setMyTeams(myTeams.filter((t) => t.id !== teamId))
    } catch (error: any) {
      console.error("Error leaving team:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to leave team",
      })
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!db || !user) return

    try {
      const team = myTeams.find((t) => t.id === teamId)

      if (!team) {
        throw new Error("Team not found")
      }

      // Check if user is team leader
      if (team.leaderId !== user.uid) {
        throw new Error("Only team leaders can delete teams")
      }

      // Delete team
      await deleteDoc(doc(db, "teams", teamId))

      toast({
        title: "Success",
        description: "Team deleted successfully",
      })

      // Update state
      setMyTeams(myTeams.filter((t) => t.id !== teamId))
    } catch (error: any) {
      console.error("Error deleting team:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete team",
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
        <div className="animate-pulse text-xl">Loading teams...</div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-gray-400 mt-1">Create and manage your hackathon teams</p>
        </div>

        <Button
          className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
          onClick={() => router.push("/dashboard/teams/create")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      <Tabs defaultValue="my-teams" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="my-teams">My Teams</TabsTrigger>
          <TabsTrigger value="invitations" className="relative">
            Invitations
            {invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00FFBF] text-xs text-black">
                {invitations.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-teams" className="mt-0">
          {myTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myTeams.map((team) => (
                <Card key={team.id} className="bg-[#1A1A1A] border-gray-800 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{team.name}</CardTitle>
                        <CardDescription>{team.description}</CardDescription>
                      </div>
                      {team.leaderId === user?.uid && <Badge className="bg-[#00FFBF] text-black">Team Leader</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-4">
                      <div className="bg-black/30 p-3 rounded-lg">
                        <p className="text-sm text-gray-400 mb-1">Hackathon</p>
                        <p>{team.hackathonTitle}</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-400">Team Members ({team.members.length})</h3>
                          {team.leaderId === user?.uid && (
                            <TeamInviteDialog
                              teamId={team.id}
                              teamName={team.name}
                              inviteCode={team.inviteCode || "INVITE123"}
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          {team.members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border">
                                  {member.photoURL ? (
                                    <AvatarImage src={member.photoURL} alt={member.displayName} />
                                  ) : null}
                                  <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {member.displayName}
                                    {member.role === "leader" && (
                                      <Crown className="h-3 w-3 text-[#00FFBF] inline ml-1" />
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-400">{member.email}</p>
                                </div>
                              </div>
                              {team.leaderId === user?.uid && member.id !== user?.uid && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                                  onClick={() => handleRemoveMember(team.id, member.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    {team.leaderId === user?.uid ? (
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-700 hover:bg-gray-800"
                          onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          View Team
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="flex-1">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Team
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete your team and remove all members. This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTeam(team.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <TeamInviteDialog
                          teamId={team.id}
                          teamName={team.name}
                          inviteCode={team.inviteCode || "INVITE123"}
                        />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="flex-1 border-gray-700 hover:bg-gray-800">
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
                              <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleLeaveTeam(team.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Leave Team
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-gray-800">
              <div className="flex justify-center mb-4">
                <Users className="h-16 w-16 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Teams Found</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                You are not a member of any teams yet. Create a team to participate in hackathons with others.
              </p>
              <Button
                className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                onClick={() => router.push("/dashboard/teams/create")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          {invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="bg-[#1A1A1A] border-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">Invitation to join {invitation.teamName}</CardTitle>
                      <Badge className="bg-yellow-600">Pending</Badge>
                    </div>
                    <CardDescription>
                      You have been invited by {invitation.inviterName} to join their team for the{" "}
                      <span className="font-medium text-white">{invitation.hackathonTitle}</span> hackathon.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                      onClick={() => handleAcceptInvitation(invitation.id)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-gray-700 hover:bg-gray-800"
                      onClick={() => handleDeclineInvitation(invitation.id)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-gray-800">
              <div className="flex justify-center mb-4">
                <UserPlus className="h-16 w-16 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Pending Invitations</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                You don't have any pending team invitations. When someone invites you to join their team, it will appear
                here.
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

