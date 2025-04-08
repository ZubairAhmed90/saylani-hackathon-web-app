"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore"
import { deleteUser, sendPasswordResetEmail, getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Import the Cloudinary upload function
import { uploadImage } from "@/lib/cloudinary"

export default function ProfilePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Password reset state
  const [passwordResetSent, setPasswordResetSent] = useState(false)

  // Delete account states
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { user, signOut } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchUserData = async () => {
      if (!db || !user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setName(userData.displayName || "")
          setEmail(user.email || "")
          setAvatarUrl(userData.photoURL || null)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your profile data",
        })
        setLoading(false)
      }
    }

    fetchUserData()
  }, [db, user, router, toast])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)

      // Upload to Cloudinary immediately when file is selected
      try {
        setUploadingImage(true)
        const cloudinaryUrl = await uploadImage(file)
        setAvatarUrl(cloudinaryUrl)
        setUploadingImage(false)

        // Show success toast
        toast({
          title: "Image Uploaded",
          description: "Your profile picture has been uploaded successfully",
        })

        // If user is available, update the profile in Firestore
        if (user && db) {
          await updateDoc(doc(db, "users", user.uid), {
            photoURL: cloudinaryUrl,
            updatedAt: new Date(),
          })
        }
      } catch (error) {
        console.error("Error uploading image:", error)
        setUploadingImage(false)
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Failed to upload image. Please try again.",
        })
      }
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db || !user) return

    if (!name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your name",
      })
      return
    }

    setSubmitting(true)

    try {
      // Update user profile in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name,
        photoURL: avatarUrl,
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Your profile has been updated",
      })

      // Reset file input
      setSelectedFile(null)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !user.email) return

    setSubmitting(true)

    try {
      // Send password reset email
      const auth = getAuth()
      await sendPasswordResetEmail(auth, user.email)

      setPasswordResetSent(true)

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a link to reset your password",
      })
    } catch (error: any) {
      console.error("Error sending password reset:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send password reset email",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError("")

    if (!user || !db || !user.email) return

    if (!deletePassword) {
      setDeleteError("Please enter your password")
      return
    }

    setSubmitting(true)

    try {
      // Check if user has email/password provider
      const providerData = user.providerData || []
      const emailProvider = providerData.find((p) => p.providerId === "password")

      if (!emailProvider) {
        // User doesn't use email/password authentication
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description:
            "Your account uses a different sign-in method. Please delete your account through that provider.",
        })
        setSubmitting(false)
        return
      }

      // Get a fresh auth instance
      const auth = getAuth()

      // Sign in again to get a fresh user credential
      try {
        // Sign in with email and password to get a fresh user credential
        await signInWithEmailAndPassword(auth, user.email, deletePassword)

        // Get the current user after re-authentication
        const currentUser = auth.currentUser

        if (!currentUser) {
          throw new Error("Authentication failed")
        }

        // Delete all user data from Firestore
        // 1. Delete main user document
        await deleteDoc(doc(db, "users", user.uid))

        // 2. Find and delete any collections/documents owned by this user
        // Example: Delete user posts
        const userPostsQuery = query(collection(db, "posts"), where("userId", "==", user.uid))
        const userPostsSnapshot = await getDocs(userPostsQuery)
        const deletePostPromises = userPostsSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        await Promise.all(deletePostPromises)

        // 3. Delete any other user-related collections
        // Example: Delete user comments
        const userCommentsQuery = query(collection(db, "comments"), where("userId", "==", user.uid))
        const userCommentsSnapshot = await getDocs(userCommentsQuery)
        const deleteCommentPromises = userCommentsSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        await Promise.all(deleteCommentPromises)

        // Finally delete the user authentication account
        await deleteUser(currentUser)

        // Close the dialog
        setDeleteDialogOpen(false)

        // Show success message
        toast({
          title: "Account Deleted",
          description: "Your account and all associated data have been permanently deleted",
        })

        // Show redirecting state and redirect after a short delay
        setRedirecting(true)
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } catch (authError: any) {
        console.error("Authentication error:", authError)
        if (authError.code === "auth/invalid-credential" || authError.code === "auth/wrong-password") {
          setDeleteError("Incorrect password. Please try again.")
        } else {
          setDeleteError(authError.message || "Authentication failed. Please try again.")
        }
        setSubmitting(false)
      }
    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete account",
      })
      setSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
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
        <div className="animate-pulse text-xl">Loading profile...</div>
      </div>
    )
  }

  if (redirecting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#00FFBF] mb-4" />
        <h2 className="text-xl font-semibold text-white">Account deleted successfully</h2>
        <p className="text-gray-300 mt-2">Redirecting to home page...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-6">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-2 border-gray-800">
                          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                          <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2">
                          <Label
                            htmlFor="avatar-upload"
                            className="flex items-center justify-center h-8 w-8 rounded-full bg-[#00FFBF] text-black cursor-pointer"
                          >
                            {uploadingImage ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Label>
                          <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="bg-black border-gray-800"
                        />
                        <p className="text-xs text-gray-400">This is the name that will be displayed on your profile</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" value={email} disabled className="bg-black border-gray-800 opacity-70" />
                    </div>

                    <Button
                      type="submit"
                      className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                      disabled={submitting || uploadingImage}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <div className="space-y-6">
                <Card className="bg-[#1A1A1A] border-gray-800">
                  <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>Send a password reset link to your email</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {passwordResetSent ? (
                      <div className="bg-green-900/20 border border-green-800 rounded-md p-4 mb-4">
                        <p className="text-green-400">
                          A password reset link has been sent to your email address. Please check your inbox and follow
                          the instructions to reset your password.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <p className="text-gray-400 mb-4">
                          We'll send a password reset link to your email address ({email}). Click the link in the email
                          to create a new password.
                        </p>

                        <Button
                          type="submit"
                          className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Reset Link"
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-gray-800">
                  <CardHeader>
                    <CardTitle>Delete Account</CardTitle>
                    <CardDescription>Permanently delete your account and all data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">
                      Once you delete your account, there is no going back. All your data will be permanently removed.
                    </p>

                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all your
                            data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <form onSubmit={handleDeleteAccount}>
                          <div className="space-y-2 py-4">
                            <Label htmlFor="delete-password">Enter your password to confirm</Label>
                            <Input
                              id="delete-password"
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              className="bg-black border-gray-800"
                            />
                            {deleteError && <p className="text-red-500 text-sm mt-1">{deleteError}</p>}
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                            <Button type="submit" variant="destructive" disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Account"
                              )}
                            </Button>
                          </AlertDialogFooter>
                        </form>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-gray-800">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                  <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-lg">{name}</h3>
                  <p className="text-gray-400">{email}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="font-medium mb-2">Account Status</h3>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                  <span>Active</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="font-medium mb-2">Member Since</h3>
                <p className="text-gray-400">
                  {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown"}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full border-gray-700 hover:bg-gray-800" onClick={() => signOut()}>
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

