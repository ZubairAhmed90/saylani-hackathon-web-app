"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"
import { getStorage } from "firebase/storage"
import type { FirebaseStorage } from "firebase/storage"

interface FirebaseContextType {
  app: FirebaseApp | null
  db: Firestore | null
  auth: Auth | null
  storage: FirebaseStorage | null
  isConfigured: boolean
  configError: string | null
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  auth: null,
  storage: null,
  isConfigured: false,
  configError: null,
})

export const useFirebase = () => useContext(FirebaseContext)

// Create a mock implementation for development without Firebase
const createMockFirebase = () => {
  return {
    app: null,
    db: null,
    auth: null,
    storage: null,
    isConfigured: false,
    configError: "Firebase is not configured. Please set up your environment variables.",
  }
}

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null)
  const [firestoreDb, setFirestoreDb] = useState<Firestore | null>(null)
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null)
  const [firebaseStorage, setFirebaseStorage] = useState<FirebaseStorage | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean>(false)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    try {
      // Check if all required Firebase config values are present
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

      // Check if any required config is missing
      const missingVars = []
      if (!apiKey) missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY")
      if (!authDomain) missingVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
      if (!projectId) missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
      if (!storageBucket) missingVars.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")
      if (!messagingSenderId) missingVars.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
      if (!appId) missingVars.push("NEXT_PUBLIC_FIREBASE_APP_ID")

      if (missingVars.length > 0) {
        const errorMsg = `Firebase configuration is incomplete. Missing: ${missingVars.join(", ")}`
        console.error(errorMsg)
        setConfigError(errorMsg)
        setIsConfigured(false)
        return // Exit early without initializing Firebase
      }

      const firebaseConfig = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
      }

      let app
      if (!getApps().length) {
        app = initializeApp(firebaseConfig)
      } else {
        app = getApps()[0]
      }

      setFirebaseApp(app)
      setFirestoreDb(getFirestore(app))
      setFirebaseAuth(getAuth(app))
      setFirebaseStorage(getStorage(app))
      setIsConfigured(true)
      setConfigError(null)
    } catch (error: any) {
      console.error("Error initializing Firebase:", error)
      setConfigError(error.message || "Failed to initialize Firebase")
      setIsConfigured(false)
    }
  }, [])

  return (
    <FirebaseContext.Provider
      value={{
        app: firebaseApp,
        db: firestoreDb,
        auth: firebaseAuth,
        storage: firebaseStorage,
        isConfigured,
        configError,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

