"use client"

import { useFirebase } from "@/lib/firebase-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function FirebaseErrorBanner() {
  const { isConfigured, configError } = useFirebase()

  if (isConfigured || !configError) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Firebase Configuration Error</AlertTitle>
      <AlertDescription>
        <p>{configError}</p>
        <p className="mt-2">Please add the following environment variables to your project:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
          <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
          <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
          <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
          <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
          <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}

