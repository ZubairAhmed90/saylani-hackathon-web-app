"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { user } = useAuth()
  const { db, storage } = useFirebase()
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
          setDisplayName(userData.displayName || "")
          setEmail(user.email || "")
          setEmailNotifications(userData.emailNotifications !== false) // Default to true if not set
          setDarkMode(userData.darkMode !== false) // Default to true if not set
          setAvatarUrl(userData.photoURL || null)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your settings",
        })
        setLoading(false)
      }
    }

    fetchUserData()
  }, [db, user, router, toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!db || !user) return

    if (!displayName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your name",
      })
      return
    }

    setSubmitting(true)

    try {
      let photoURL = avatarUrl

      // Upload avatar if selected
      if (selectedFile && storage) {
        const storageRef = ref(storage, `avatars/${user.uid}`)
        await uploadBytes(storageRef, selectedFile)
        photoURL = await getDownloadURL(storageRef)
      }

      // Update user profile in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        photoURL,
        emailNotifications,
        darkMode,
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Your settings have been updated",
      })

      // Update avatar URL state
      if (photoURL) {
        setAvatarUrl(photoURL)
      }

      // Reset file input
      setSelectedFile(null)
    } catch (error: any) {
      console.error("Error updating settings:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update settings",
      })
    } finally {
      setSubmitting(false)
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00FFBF]"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-[#1A1A1A] border-gray-800 mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-2 border-gray-800">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                      <AvatarFallback className="text-lg">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2">
                      <Label
                        htmlFor="avatar-upload"
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-[#00FFBF] text-black cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-black border-gray-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" value={email} disabled className="bg-black border-gray-800 opacity-70" />
                      <p className="text-xs text-gray-400">
                        To change your email address, please go to your profile page
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                  disabled={submitting}
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
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-400">Receive updates about hackathons and team invitations</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  className="data-[state=checked]:bg-[#00FFBF]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Team Invitations</h3>
                  <p className="text-sm text-gray-400">Receive notifications when you're invited to join a team</p>
                </div>
                <Switch checked={true} disabled className="data-[state=checked]:bg-[#00FFBF] opacity-70" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Hackathon Updates</h3>
                  <p className="text-sm text-gray-400">Receive notifications about hackathon status changes</p>
                </div>
                <Switch checked={true} disabled className="data-[state=checked]:bg-[#00FFBF] opacity-70" />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleUpdateProfile}
                className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                disabled={submitting}
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
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-0">
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how GeekCode looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Dark Mode</h3>
                  <p className="text-sm text-gray-400">Use dark theme throughout the application</p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  className="data-[state=checked]:bg-[#00FFBF]"
                />
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="font-medium mb-4">Theme Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#00FFBF] ring-2 ring-[#00FFBF] ring-offset-2 ring-offset-black cursor-pointer" />
                  <div className="h-8 w-8 rounded-full bg-blue-500 cursor-pointer" />
                  <div className="h-8 w-8 rounded-full bg-purple-500 cursor-pointer" />
                  <div className="h-8 w-8 rounded-full bg-pink-500 cursor-pointer" />
                  <div className="h-8 w-8 rounded-full bg-amber-500 cursor-pointer" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Theme color customization coming soon</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleUpdateProfile}
                className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                disabled={submitting}
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
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

