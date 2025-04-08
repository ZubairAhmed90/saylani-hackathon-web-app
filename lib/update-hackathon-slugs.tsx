"use client"

import { useState } from "react"
import { useFirebase } from "@/lib/firebase-context"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

// This is an admin utility component to update all hackathons with slugs
export default function UpdateHackathonSlugs() {
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedCount, setUpdatedCount] = useState(0)
  const { db } = useFirebase()

  const handleUpdateSlugs = async () => {
    if (!db) return

    setUpdating(true)
    setError(null)
    setSuccess(false)

    try {
      const hackathonsCollection = collection(db, "hackathons")
      const hackathonsSnapshot = await getDocs(hackathonsCollection)

      let count = 0

      for (const hackathonDoc of hackathonsSnapshot.docs) {
        const data = hackathonDoc.data()

        // Skip if already has a slug
        if (data.slug) continue

        // Generate slug from title
        const slug = data.title
          .toLowerCase()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "-")

        // Update the document with the new slug
        await updateDoc(doc(db, "hackathons", hackathonDoc.id), {
          slug,
        })

        count++
      }

      setUpdatedCount(count)
      setSuccess(true)
    } catch (err) {
      console.error("Error updating slugs:", err)
      setError("Failed to update hackathon slugs")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Update Hackathon Slugs</h2>
      <p className="text-muted-foreground">
        This utility will generate URL-friendly slugs for all hackathons that don't have one.
      </p>

      {success && (
        <Alert className="bg-green-900/20 border-green-800">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Updated {updatedCount} hackathon{updatedCount !== 1 ? "s" : ""} with new slugs.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleUpdateSlugs} disabled={updating} className="bg-primary">
        {updating ? "Updating..." : "Update Hackathon Slugs"}
      </Button>
    </div>
  )
}

