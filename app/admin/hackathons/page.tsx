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
  const [category, setCategory] = useState("")
  const [maxParticipants, setMaxParticipants] = useState(50)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Form states for editing hackathon
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editMaxParticipants, setEditMaxParticipants] = useState(50)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

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

    if (!title || !description || !startDate || !endDate || !category || !maxParticipants) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      })
      return
    }

    setSubmitting(true)

    try {
      // Upload image if provided
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      // Convert string dates to Date objects first, then to Timestamps
      const startTimestamp = Timestamp.fromDate(new Date(startDate))
      const endTimestamp = Timestamp.fromDate(new Date(endDate))

      // Create new hackathon with proper data types
      const newHackathonData = {
        title,
        description,
        startDate: startTimestamp,
        endDate: endTimestamp,
        status: "open",
        category,
        participants: 0,
        maxParticipants: Number(maxParticipants),
        hostedBy: user?.displayName || "Admin",
        createdAt: Timestamp.now(),
        imageUrl: imageUrl, // Add the image URL to the hackathon data
      }

      // Add document to collection
      const docRef = await addDoc(collection(db, "hackathons"), newHackathonData)

      toast({
        title: "Success",
        description: "Hackathon created successfully",
      })

      // Reset form
      setTitle("")
      setDescription("")
      setStartDate("")
      setEndDate("")
      setCategory("")
      setMaxParticipants(50)
      setImageFile(null)
      setCreateDialogOpen(false)

      // Refresh hackathons
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
    setEditDialogOpen(true)
  }

  const handleUpdateHackathon = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db || !editingHackathon) return

    if (!editTitle || !editDescription || !editStartDate || !editEndDate || !editCategory || !editMaxParticipants) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      })
      return
    }

    setSubmitting(true)

    try {
      // Upload image if provided
      let imageUrl = editingHackathon.imageUrl
      if (editImageFile) {
        imageUrl = await uploadImage(editImageFile)
      }

      const startTimestamp = Timestamp.fromDate(new Date(editStartDate))
      const endTimestamp = Timestamp.fromDate(new Date(editEndDate))

      // Update hackathon
      await updateDoc(doc(db, "hackathons", editingHackathon.id), {
        title: editTitle,
        description: editDescription,
        startDate: startTimestamp,
        endDate: endTimestamp,
        category: editCategory,
        maxParticipants: Number(editMaxParticipants),
        updatedAt: Timestamp.now(),
        imageUrl: imageUrl, // Add or update the image URL
      })

      toast({
        title: "Success",
        description: "Hackathon updated successfully",
      })

      // Reset form and close dialog
      setEditingHackathon(null)
      setEditDialogOpen(false)

      // Refresh hackathons
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
      // Delete hackathon
      await deleteDoc(doc(db, "hackathons", id))

      toast({
        title: "Success",
        description: "Hackathon deleted successfully",
      })

      // Refresh hackathons
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
      const newStatus = hackathon.status === "open" ? "closed" : ("open" as "open" | "closed")

      // Update hackathon status
      await updateDoc(doc(db, "hackathons", hackathon.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "Success",
        description: `Hackathon ${newStatus === "open" ? "opened" : "closed"} successfully`,
      })

      // Refresh hackathons
      const updatedHackathons = hackathons.map((h) => {
        if (h.id === hackathon.id) {
          return { ...h, status: newStatus }
        }
        return h
      })

      setHackathons(updatedHackathons)
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

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Hackathon
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create a New Hackathon</DialogTitle>
              <DialogDescription>Fill in the details to create a new hackathon</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateHackathon} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-black border-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-black border-gray-800 min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate || ""}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-black border-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate || ""}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black border-gray-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-black border-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="bg-black border-gray-800"
                  />
                </div>
              </div>

              {/* Image Upload Component */}
              <ImageUpload onImageChange={setImageFile} />

              <DialogFooter>
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

                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
                      <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Hackathon</DialogTitle>
                          <DialogDescription>Update the details of this hackathon</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateHackathon} className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                              id="edit-title"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="bg-black border-gray-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="bg-black border-gray-800 min-h-[100px]"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-start-date">Start Date</Label>
                              <Input
                                id="edit-start-date"
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className="bg-black border-gray-800"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-end-date">End Date</Label>
                              <Input
                                id="edit-end-date"
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                className="bg-black border-gray-800"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-category">Category</Label>
                              <Input
                                id="edit-category"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="bg-black border-gray-800"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-max-participants">Max Participants</Label>
                              <Input
                                id="edit-max-participants"
                                type="number"
                                min="1"
                                value={editMaxParticipants}
                                onChange={(e) => setEditMaxParticipants(Number(e.target.value))}
                                className="bg-black border-gray-800"
                              />
                            </div>
                          </div>

                          {/* Image Upload Component for Edit */}
                          <ImageUpload onImageChange={setEditImageFile} defaultImage={editingHackathon?.imageUrl} />

                          <DialogFooter>
                            <Button
                              type="submit"
                              className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
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

