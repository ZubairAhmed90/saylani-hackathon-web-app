"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "@/lib/firebase-context"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, X, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface JoinRequest {
  id: string
  teamId: string
  teamName: string
  userId: string
  userName: string
  userEmail: string
  status: string
  createdAt: any
}

export default function TeamJoinRequestList({ teamId }: { teamId: string }) {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const { db } = useFirebase()
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchJoinRequests = async () => {
      if (!db || !teamId) return

      try {
        const requestsCollection = collection(db, "teamJoinRequests")
        const requestsQuery = query(requestsCollection, where("teamId", "==", teamId), where("status", "==", "pending"))
        const requestsSnapshot = await getDocs(requestsQuery)

        const requestsData: JoinRequest[] = []
        requestsSnapshot.forEach((doc) => {
          requestsData.push({ id: doc.id, ...doc.data() } as JoinRequest)
        })

        setRequests(requestsData)
      } catch (error) {
        console.error("Error fetching join requests:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load join requests",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchJoinRequests()
  }, [db, teamId, toast])

  const handleAcceptRequest = async (requestId: string, userId: string) => {
    if (!db || !teamId) return

    setProcessingId(requestId)

    try {
      // Update team document to add the user
      const teamRef = doc(db, "teams", teamId)
      await updateDoc(teamRef, {
        members: arrayUnion(userId),
      })

      // Update request status
      const requestRef = doc(db, "teamJoinRequests", requestId)
      await updateDoc(requestRef, {
        status: "accepted",
      })

      // Update local state
      setRequests(requests.filter((req) => req.id !== requestId))

      toast({
        title: "Request Accepted",
        description: "The user has been added to your team",
      })
    } catch (error) {
      console.error("Error accepting request:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to accept join request",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!db) return

    setProcessingId(requestId)

    try {
      // Delete the request
      const requestRef = doc(db, "teamJoinRequests", requestId)
      await deleteDoc(requestRef)

      // Update local state
      setRequests(requests.filter((req) => req.id !== requestId))

      toast({
        title: "Request Rejected",
        description: "The join request has been rejected",
      })
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject join request",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#00FFBF]" />
        <span className="ml-2">Loading requests...</span>
      </div>
    )
  }

  if (requests.length === 0) {
    return <div className="text-center py-8 text-gray-400">No pending join requests</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Pending Join Requests</h3>
      {requests.map((request) => (
        <Card key={request.id} className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.userName}`} />
                  <AvatarFallback>{request.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{request.userName}</p>
                  <p className="text-sm text-gray-400">{request.userEmail}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-800 hover:bg-red-900/30 text-red-500"
                  onClick={() => handleRejectRequest(request.id)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                  onClick={() => handleAcceptRequest(request.id, request.userId)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

