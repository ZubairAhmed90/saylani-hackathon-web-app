"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useFirebase } from "./firebase-context"
import { useToast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"

// Extend the Firebase User type with our custom properties
interface User extends FirebaseUser {
  isAdmin?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void> // Added alias for signOut for backward compatibility
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  logout: async () => {}, // Added alias for signOut
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { auth, db, isConfigured } = useFirebase()
  const { toast } = useToast()

  useEffect(() => {
    // If Firebase is not configured, set loading to false and return
    if (!isConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user has admin role
        if (db) {
          try {
            // First, ensure user exists in Firestore
            const userRef = doc(db, "users", firebaseUser.uid)
            let userDoc = await getDoc(userRef)

            if (!userDoc.exists()) {
              // Create user document if it doesn't exist
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || "",
                photoURL: firebaseUser.photoURL || "",
                isAdmin: false,
                createdAt: new Date(),
                lastLogin: new Date(),
              })

              // Get the newly created document
              userDoc = await getDoc(userRef)
            } else {
              // Update lastLogin
              await setDoc(
                userRef,
                {
                  lastLogin: new Date(),
                },
                { merge: true },
              )
            }

            const userData = userDoc.data()
            const isAdmin = userData?.isAdmin || false

            // Set the user role cookie
            Cookies.set("user-role", isAdmin ? "admin" : "user", {
              expires: 7, // 7 days
              path: "/",
            })

            // Set the auth token cookie
            const token = await firebaseUser.getIdToken()
            Cookies.set("firebase-auth-token", token, {
              expires: 7, // 7 days
              path: "/",
            })

            // Cast to our extended User type and set the user
            setUser({ ...firebaseUser, isAdmin } as User)
          } catch (error) {
            console.error("Error fetching user data:", error)
            // Cast to our extended User type with default isAdmin value
            setUser({ ...firebaseUser, isAdmin: false } as User)
          }
        } else {
          // Cast to our extended User type with default isAdmin value
          setUser({ ...firebaseUser, isAdmin: false } as User)
        }
      } else {
        // Clear cookies when user is not logged in
        Cookies.remove("user-role", { path: "/" })
        Cookies.remove("firebase-auth-token", { path: "/" })
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth, db, isConfigured])

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not properly configured. Please check your environment variables.",
      })
      return
    }

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Check if this is a new user
      const userRef = doc(db, "users", result.user.uid)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        // Create a new user document
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          isAdmin: false,
          createdAt: new Date(),
          lastLogin: new Date(),
        })
      } else {
        // Update lastLogin
        await setDoc(
          userRef,
          {
            lastLogin: new Date(),
          },
          { merge: true },
        )
      }

      toast({
        title: "Success",
        description: "You have successfully signed in!",
      })
    } catch (error: any) {
      console.error("Error signing in with Google:", error)

      // Handle specific error for popup closed by user
      if (error.code === "auth/popup-closed-by-user") {
        // This is an expected user action, so we can show a more friendly message
        toast({
          title: "Sign-in cancelled",
          description: "You closed the sign-in window. Please try again when you're ready.",
          variant: "default",
        })
      } else {
        // Handle other authentication errors
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to sign in with Google",
        })
      }
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!isConfigured || !auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not properly configured. Please check your environment variables.",
      })
      return
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Success",
        description: "You have successfully signed in!",
      })
    } catch (error: any) {
      console.error("Error signing in with email:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign in",
      })
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!isConfigured || !auth || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not properly configured. Please check your environment variables.",
      })
      return
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile with display name
      await updateProfile(result.user, {
        displayName: name,
      })

      // Create a new user document
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        photoURL: null,
        isAdmin: false,
        createdAt: new Date(),
        lastLogin: new Date(),
      })

      toast({
        title: "Success",
        description: "Your account has been created!",
      })
    } catch (error: any) {
      console.error("Error signing up with email:", error)

      // Handle specific error for email already in use
      if (error.code === "auth/email-already-in-use") {
        toast({
          variant: "destructive",
          title: "Account already exists",
          description: "This email address is already registered. Please sign in instead.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to create account",
        })
      }
      throw error
    }
  }

  const signOut = async () => {
    if (!isConfigured || !auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not properly configured. Please check your environment variables.",
      })
      return
    }

    try {
      await firebaseSignOut(auth)
      // Clear cookies
      Cookies.remove("user-role", { path: "/" })
      Cookies.remove("firebase-auth-token", { path: "/" })
      toast({
        title: "Success",
        description: "You have been signed out",
      })
    } catch (error: any) {
      console.error("Error signing out:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign out",
      })
    }
  }

  // Add logout as an alias for signOut for backward compatibility
  const logout = signOut

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        logout, // Added alias for signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
