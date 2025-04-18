"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Check, Edit, Loader2, Plus, Trash, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { ImageUpload } from "@/components/image-upload"
import { uploadImage } from "@/lib/cloudinary"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

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
  teamSupport: boolean
  teamSize?: number
  duration?: string | null
}

export default function AdminHackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Form states for new hackathon
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [duration, setDuration] = useState("")
  const [category, setCategory] = useState("")
  const [maxParticipants, setMaxParticipants] = useState(50)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [teamSupport, setTeamSupport] = useState(false)
  const [teamSize, setTeamSize] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Validation error states for create form
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Form states for editing hackathon
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editMaxParticipants, setEditMaxParticipants] = useState(50)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editTeamSupport, setEditTeamSupport] = useState(false)
  const [editTeamSize, setEditTeamSize] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Validation error states for edit form
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({})

  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const checkAdmin = async () => {
      if (!db || !user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().isAdmin) {
          setIsAdmin(true)
          fetchHackathons()
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to access the admin panel",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        router.push("/")
      }
    }

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
        setLoading(false)
      } catch (error) {
        console.error("Error fetching hackathons:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load hackathons data",
        })
        setLoading(false)
      }
    }

    checkAdmin()
  }, [db, user, router, toast])

  const validateCreateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!title) {
      newErrors.title = "Title is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title is required",
      })
    }

    if (!description) {
      newErrors.description = "Description is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Description is required",
      })
    }

    if (!startDate) {
      newErrors.startDate = "Start Date is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Start Date is required",
      })
    }

    // Only validate endDate if duration is not "6"
    if (duration !== "6" && !endDate) {
      newErrors.endDate = "End Date is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "End Date is required",
      })
    }

    if (!category) {
      newErrors.category = "Category is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Category is required",
      })
    }

    if (!maxParticipants) {
      newErrors.maxParticipants = "Max Participants is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Max Participants is required",
      })
    }

    if (maxParticipants <= 0) {
      newErrors.maxParticipants = "Max Participants must be a positive number"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Max Participants must be a positive number",
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDateTime = startDate ? new Date(startDate) : null
    if (startDateTime) {
      startDateTime.setHours(0, 0, 0, 0)
      if (startDateTime < today) {
        newErrors.startDate = "Start Date must be today or in the future"
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Start Date must be today or in the future",
        })
      }
    }

    // Validate End Date is after Start Date only if duration is not "6"
    if (duration !== "6") {
      const endDateTime = endDate ? new Date(endDate) : null
      if (startDateTime && endDateTime) {
        endDateTime.setHours(0, 0, 0, 0)
        if (endDateTime <= startDateTime) {
          newErrors.endDate = "End Date must be after Start Date"
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "End Date must be after Start Date",
          })
        }

        // If duration is provided (and not "6"), ensure End Date matches Start Date + Duration
        if (duration) {
          const calculatedEndDate = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 60 * 1000)
          calculatedEndDate.setHours(0, 0, 0, 0)
          if (endDateTime.getTime() !== calculatedEndDate.getTime()) {
            newErrors.endDate = "End Date must match the Start Date plus the selected Duration"
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "End Date must match the Start Date plus the selected Duration",
            })
          }
        }
      }
    }

    if (teamSupport && !teamSize) {
      newErrors.teamSize = "Please select a team size if Team Support is enabled"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a team size if Team Support is enabled",
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateEditForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!editTitle) {
      newErrors.editTitle = "Title is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title is required",
      })
    }

    if (!editDescription) {
      newErrors.editDescription = "Description is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Description is required",
      })
    }

    if (!editStartDate) {
      newErrors.editStartDate = "Start Date is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Start Date is required",
      })
    }

    // Only validate editEndDate if editDuration is not "6"
    if (editDuration !== "6" && !editEndDate) {
      newErrors.editEndDate = "End Date is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "End Date is required",
      })
    }

    if (!editCategory) {
      newErrors.editCategory = "Category is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Category is required",
      })
    }

    if (!editMaxParticipants) {
      newErrors.editMaxParticipants = "Max Participants is required"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Max Participants is required",
      })
    }

    if (editMaxParticipants <= 0) {
      newErrors.editMaxParticipants = "Max Participants must be a positive number"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Max Participants must be a positive number",
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDateTime = editStartDate ? new Date(editStartDate) : null
    if (startDateTime) {
      startDateTime.setHours(0, 0, 0, 0)
      if (startDateTime < today) {
        newErrors.editStartDate = "Start Date must be today or in the future"
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Start Date must be today or in the future",
        })
      }
    }

    // Validate End Date is after Start Date only if duration is not "6"
    if (editDuration !== "6") {
      const endDateTime = editEndDate ? new Date(editEndDate) : null
      if (startDateTime && endDateTime) {
        endDateTime.setHours(0, 0, 0, 0)
        if (endDateTime <= startDateTime) {
          newErrors.editEndDate = "End Date must be after Start Date"
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "End Date must be after Start Date",
          })
        }

        // If duration is provided (and not "6"), ensure End Date matches Start Date + Duration
        if (editDuration) {
          const calculatedEndDate = new Date(startDateTime.getTime() + parseInt(editDuration) * 60 * 60 * 1000)
          calculatedEndDate.setHours(0, 0, 0, 0)
          if (endDateTime.getTime() !== calculatedEndDate.getTime()) {
            newErrors.editEndDate = "End Date must match the Start Date plus the selected Duration"
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "End Date must match the Start Date plus the selected Duration",
            })
          }
        }
      }
    }

    if (editTeamSupport && !editTeamSize) {
      newErrors.editTeamSize = "Please select a team size if Team Support is enabled"
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a team size if Team Support is enabled",
      })
    }

    setEditErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateHackathon = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Database connection not available",
      })
      return
    }

    const isValid = validateCreateForm()
    if (!isValid) {
      return
    }

    setSubmitting(true)

    try {
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const startDateTime = new Date(startDate)
      startDateTime.setHours(0, 0, 0, 0)

      let endDateTime: Date
      if (duration === "6") {
        // If duration is 6 hours, calculate endDateTime as startDateTime + 6 hours
        endDateTime = new Date(startDateTime.getTime() + 6 * 60 * 60 * 1000)
      } else {
        // Otherwise, use the provided endDate
        endDateTime = new Date(endDate)
      }
      endDateTime.setHours(0, 0, 0, 0)

      const startTimestamp = Timestamp.fromDate(startDateTime)
      const endTimestamp = Timestamp.fromDate(endDateTime)

      const newHackathonData = {
        title,
        description,
        startDate: startTimestamp,
        endDate: endTimestamp,
        duration: duration || null,
        status: "open" as const,
        category,
        participants: 0,
        maxParticipants: Number(maxParticipants),
        hostedBy: user?.displayName || "Admin",
        createdAt: Timestamp.now(),
        imageUrl: imageUrl,
        teamSupport,
        teamSize: teamSupport ? Number(teamSize) : null,
      }

      await addDoc(collection(db, "hackathons"), newHackathonData)

      toast({
        title: "Success",
        description: "Hackathon created successfully",
      })

      setTitle("")
      setDescription("")
      setStartDate("")
      setEndDate("")
      setDuration("")
      setCategory("")
      setMaxParticipants(50)
      setImageFile(null)
      setTeamSupport(false)
      setTeamSize("")
      setErrors({})
      setCreateDialogOpen(false)

      const hackathonsCollection = collection(db, "hackathons")
      const hackathonsSnapshot = await getDocs(hackathonsCollection)

      const hackathonsData = hackathonsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Hackathon[]

      setHackathons(hackathonsData)
    } catch (error: any) {
      console.error("Error creating hackathon:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create hackathon",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditHackathon = (hackathon: Hackathon) => {
    setEditingHackathon(hackathon)
    setEditTitle(hackathon.title)
    setEditDescription(hackathon.description)
    setEditStartDate(hackathon.startDate.toDate().toISOString().split("T")[0])
    setEditEndDate(hackathon.endDate.toDate().toISOString().split("T")[0])
    setEditCategory(hackathon.category)
    setEditMaxParticipants(hackathon.maxParticipants)
    setEditImageFile(null)

    setEditDuration(hackathon.duration || "")
    
    setEditTeamSupport(hackathon.teamSupport || false)
    setEditTeamSize(hackathon.teamSize ? hackathon.teamSize.toString() : "")
    setEditErrors({})
    setEditDialogOpen(true)
  }

  const handleUpdateHackathon = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db || !editingHackathon) return

    const isValid = validateEditForm()
    if (!isValid) {
      return
    }

    setSubmitting(true)

    try {
      let imageUrl = editingHackathon.imageUrl
      if (editImageFile) {
        imageUrl = await uploadImage(editImageFile)
      }

      const startDateTime = new Date(editStartDate)
      startDateTime.setHours(0, 0, 0, 0)

      let endDateTime: Date
      if (editDuration === "6") {
        // If duration is 6 hours, calculate endDateTime as startDateTime + 6 hours
        endDateTime = new Date(startDateTime.getTime() + 6 * 60 * 60 * 1000)
      } else {
        // Otherwise, use the provided editEndDate
        endDateTime = new Date(editEndDate)
      }
      endDateTime.setHours(0, 0, 0, 0)

      const startTimestamp = Timestamp.fromDate(startDateTime)
      const endTimestamp = Timestamp.fromDate(endDateTime)

      await updateDoc(doc(db, "hackathons", editingHackathon.id), {
        title: editTitle,
        description: editDescription,
        startDate: startTimestamp,
        endDate: endTimestamp,
        duration: editDuration || null,
        category: editCategory,
        maxParticipants: Number(editMaxParticipants),
        updatedAt: Timestamp.now(),
        imageUrl: imageUrl,
        teamSupport: editTeamSupport,
        teamSize: editTeamSupport ? Number(editTeamSize) : null,
      })

      toast({
        title: "Success",
        description: "Hackathon updated successfully",
      })

      setEditingHackathon(null)
      setEditErrors({})
      setEditDialogOpen(false)

      const hackathonsCollection = collection(db, "hackathons")
      const hackathonsSnapshot = await getDocs(hackathonsCollection)

      const hackathonsData = hackathonsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Hackathon[]

      setHackathons(hackathonsData)
    } catch (error: any) {
      console.error("Error updating hackathon:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update hackathon",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteHackathon = async (id: string) => {
    if (!db) return

    try {
      await deleteDoc(doc(db, "hackathons", id))

      toast({
        title: "Success",
        description: "Hackathon deleted successfully",
      })

      setHackathons(hackathons.filter((h) => h.id !== id))
    } catch (error: any) {
      console.error("Error deleting hackathon:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete hackathon",
      })
    }
  }

  const handleToggleHackathonStatus = async (hackathon: Hackathon) => {
    if (!db) return

    try {
      const newStatus: "open" | "closed" = hackathon.status === "open" ? "closed" : "open"

      await updateDoc(doc(db, "hackathons", hackathon.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "Success",
        description: `Hackathon ${newStatus === "open" ? "opened" : "closed"} successfully`,
      })

      setHackathons(
        hackathons.map((h) =>
          h.id === hackathon.id ? { ...h, status: newStatus } : h
        )
      )
    } catch (error: any) {
      console.error("Error toggling hackathon status:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update hackathon status",
      })
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading hackathons...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-xl">Access denied. You must be an admin to view this page.</div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Hackathons</h1>
          <p className="text-gray-400 mt-1">Create, edit, and manage hackathons on the platform</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setErrors({})
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Hackathon
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create a New Hackathon</DialogTitle>
              <DialogDescription>Fill in the details to create a new hackathon</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateHackathon} className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`bg-black border-gray-800 ${errors.title ? "border-red-500" : ""}`}
                  />
                  {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className={`bg-black border-gray-800 ${errors.maxParticipants ? "border-red-500" : ""}`}
                  />
                  {errors.maxParticipants && <p className="text-red-500 text-sm">{errors.maxParticipants}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate || ""}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`bg-black border-gray-800 ${errors.startDate ? "border-red-500" : ""}`}
                    placeholder="mm/dd/yyyy"
                  />
                  {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate || ""}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`bg-black border-gray-800 ${errors.endDate ? "border-red-500" : ""}`}
                    placeholder="mm/dd/yyyy"
                  />
                  {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (Optional)</Label>
                  <Select onValueChange={setDuration} value={duration}>
                    <SelectTrigger className={`bg-black border-gray-800 ${errors.duration ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select duration (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-gray-800">
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.duration && <p className="text-red-500 text-sm">{errors.duration}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`bg-black border-gray-800 ${errors.category ? "border-red-500" : ""}`}
                  />
                  {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`bg-black border-gray-800 min-h-[40px] ${errors.description ? "border-red-500" : ""}`}
                  />
                  {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Team Support</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="team-support"
                        checked={teamSupport}
                        onCheckedChange={setTeamSupport}
                      />
                      <Label htmlFor="team-support">
                        {teamSupport ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                    {teamSupport && (
                      <div className="flex-1">
                        <Select onValueChange={setTeamSize} value={teamSize}>
                          <SelectTrigger className={`bg-black border-gray-800 w-full ${errors.teamSize ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select team size" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-gray-800">
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.teamSize && <p className="text-red-500 text-sm">{errors.teamSize}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Hackathon Banner Image</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-md p-2 text-center">
                    <ImageUpload onImageChange={setImageFile} />
                    <p className="text-sm text-gray-400 mt-2">
                      Recommended size: 1200x600px, Max size: 5MB
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="submit"
                  className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Hackathon
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 gap-6">
            {hackathons.length > 0 ? (
              hackathons.map((hackathon) => (
                <Card key={hackathon.id} className="bg-[#1A1A1A] border-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{hackathon.title}</CardTitle>
                      <Badge className={hackathon.status === "open" ? "bg-green-600" : "bg-gray-600"}>
                        {hackathon.status === "open" ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{hackathon.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {hackathon.imageUrl && (
                      <div className="mb-4">
                        <Image
                          src={hackathon.imageUrl || "/placeholder.svg"}
                          alt={hackathon.title}
                          width={800}
                          height={400}
                          className="w-full h-[200px] object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">Category</p>
                        <p>{hackathon.category}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">Participants</p>
                        <p>
                          {hackathon.participants}/{hackathon.maxParticipants}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">Start Date</p>
                        <p>{formatDate(hackathon.startDate)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">End Date</p>
                        <p>{formatDate(hackathon.endDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-gray-700 hover:bg-gray-800"
                      onClick={() => handleToggleHackathonStatus(hackathon)}
                    >
                      {hackathon.status === "open" ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Close Hackathon
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Open Hackathon
                        </>
                      )}
                    </Button>

                    <Dialog open={editDialogOpen} onOpenChange={(open) => {
                      setEditDialogOpen(open)
                      if (!open) setEditErrors({})
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-gray-700 hover:bg-gray-800"
                          onClick={() => handleEditHackathon(hackathon)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Edit Hackathon</DialogTitle>
                          <DialogDescription>Update the details of this hackathon</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateHackathon} className="py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-title">Title</Label>
                              <Input
                                id="edit-title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className={`bg-black border-gray-800 ${editErrors.editTitle ? "border-red-500" : ""}`}
                              />
                              {editErrors.editTitle && <p className="text-red-500 text-sm">{editErrors.editTitle}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-max-participants">Max Participants</Label>
                              <Input
                                id="edit-max-participants"
                                type="number"
                                min="1"
                                value={editMaxParticipants}
                                onChange={(e) => setEditMaxParticipants(Number(e.target.value))}
                                className={`bg-black border-gray-800 ${editErrors.editMaxParticipants ? "border-red-500" : ""}`}
                              />
                              {editErrors.editMaxParticipants && <p className="text-red-500 text-sm">{editErrors.editMaxParticipants}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-start-date">Start Date</Label>
                              <Input
                                id="edit-start-date"
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className={`bg-black border-gray-800 ${editErrors.editStartDate ? "border-red-500" : ""}`}
                              />
                              {editErrors.editStartDate && <p className="text-red-500 text-sm">{editErrors.editStartDate}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-end-date">End Date</Label>
                              <Input
                                id="edit-end-date"
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                className={`bg-black border-gray-800 ${editErrors.editEndDate ? "border-red-500" : ""}`}
                              />
                              {editErrors.editEndDate && <p className="text-red-500 text-sm">{editErrors.editEndDate}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-duration">Duration (Optional)</Label>
                              <Select onValueChange={setEditDuration} value={editDuration}>
                                <SelectTrigger className={`bg-black border-gray-800 ${editErrors.editDuration ? "border-red-500" : ""}`}>
                                  <SelectValue placeholder="Select duration (optional)" />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-gray-800">
                                  <SelectItem value="6">6 hours</SelectItem>
                                  <SelectItem value="12">12 hours</SelectItem>
                                  <SelectItem value="24">24 hours</SelectItem>
                                </SelectContent>
                              </Select>
                              {editErrors.editDuration && <p className="text-red-500 text-sm">{editErrors.editDuration}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-category">Category</Label>
                              <Input
                                id="edit-category"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className={`bg-black border-gray-800 ${editErrors.editCategory ? "border-red-500" : ""}`}
                              />
                              {editErrors.editCategory && <p className="text-red-500 text-sm">{editErrors.editCategory}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className={`bg-black border-gray-800 min-h-[40px] ${editErrors.editDescription ? "border-red-500" : ""}`}
                              />
                              {editErrors.editDescription && <p className="text-red-500 text-sm">{editErrors.editDescription}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label>Team Support</Label>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id="edit-team-support"
                                    checked={editTeamSupport}
                                    onCheckedChange={setEditTeamSupport}
                                  />
                                  <Label htmlFor="edit-team-support">
                                    {editTeamSupport ? "Enabled" : "Disabled"}
                                  </Label>
                                </div>
                                {editTeamSupport && (
                                  <div className="flex-1">
                                    <Select onValueChange={setEditTeamSize} value={editTeamSize}>
                                      <SelectTrigger className={`bg-black border-gray-800 w-full ${editErrors.editTeamSize ? "border-red-500" : ""}`}>
                                        <SelectValue placeholder="Select team size" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-black border-gray-800">
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="6">6</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {editErrors.editTeamSize && <p className="text-red-500 text-sm">{editErrors.editTeamSize}</p>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2 md:col-span-3">
                              <Label>Hackathon Banner Image</Label>
                              <div className="border-2 border-dashed border-gray-600 rounded-md p-2 text-center">
                                <ImageUpload
                                  onImageChange={setEditImageFile}
                                  defaultImage={editingHackathon?.imageUrl}
                                />
                                <p className="text-sm text-gray-400 mt-2">
                                  Recommended size: 1200x600px, Max size: 5MB
                                </p>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="mt-4">
                            <Button
                              type="submit"
                              className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                              disabled={submitting}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update Hackathon"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the hackathon and all associated data. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteHackathon(hackathon.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No hackathons found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-0">
          <div className="grid grid-cols-1 gap-6">
            {hackathons.filter((h) => h.status === "open").length > 0 ? (
              hackathons
                .filter((h) => h.status === "open")
                .map((hackathon) => (
                  <Card key={hackathon.id} className="bg-[#1A1A1A] border-gray-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{hackathon.title}</CardTitle>
                        <Badge className="bg-green-600">Open</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{hackathon.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {hackathon.imageUrl && (
                        <div className="mb-4">
                          <Image
                            src={hackathon.imageUrl || "/placeholder.svg"}
                            alt={hackathon.title}
                            width={800}
                            height={400}
                            className="w-full h-[200px] object-cover rounded-md"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">Category</p>
                          <p>{hackathon.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">Participants</p>
                          <p>
                            {hackathon.participants}/{hackathon.maxParticipants}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">Start Date</p>
                          <p>{formatDate(hackathon.startDate)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">End Date</p>
                          <p>{formatDate(hackathon.endDate)}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-800"
                        onClick={() => handleToggleHackathonStatus(hackathon)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Close Hackathon
                      </Button>

                      <Button
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-800"
                        onClick={() => handleEditHackathon(hackathon)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the hackathon and all associated data. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteHackathon(hackathon.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No open hackathons found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="closed" className="mt-0">
          <div className="grid grid-cols-1 gap-6">
            {hackathons.filter((h) => h.status === "closed").length > 0 ? (
              hackathons
                .filter((h) => h.status === "closed")
                .map((hackathon) => (
                  <Card key={hackathon.id} className="bg-[#1A1A1A] border-gray-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{hackathon.title}</CardTitle>
                        <Badge className="bg-gray-600">Closed</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{hackathon.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {hackathon.imageUrl && (
                        <div className="mb-4">
                          <Image
                            src={hackathon.imageUrl || "/placeholder.svg"}
                            alt={hackathon.title}
                            width={800}
                            height={400}
                            className="w-full h-[200px] object-cover rounded-md"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">Category</p>
                          <p>{hackathon.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">Participants</p>
                          <p>
                            {hackathon.participants}/{hackathon.maxParticipants}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">Start Date</p>
                          <p>{formatDate(hackathon.startDate)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">End Date</p>
                          <p>{formatDate(hackathon.endDate)}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-800"
                        onClick={() => handleToggleHackathonStatus(hackathon)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Open Hackathon
                      </Button>

                      <Button
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-800"
                        onClick={() => handleEditHackathon(hackathon)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the hackathon and all associated data. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteHackathon(hackathon.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No closed hackathons found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}