"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { initializeFirebaseCollections } from "@/lib/firebase-utils"

export function FirebaseInitializer() {
  const { user } = useAuth()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (user && !initialized) {
      const initialize = async () => {
        await initializeFirebaseCollections()
        setInitialized(true)
      }

      initialize()
    }
  }, [user, initialized])

  // This component doesn't render anything
  return null
}

