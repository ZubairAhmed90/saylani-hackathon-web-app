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
  onIdTokenChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useFirebase } from "./firebase-context"
import { useToast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"

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
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateDisplayName: (name: string, photoURL?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateDisplayName: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { auth, db, isConfigured } = useFirebase()
  const { toast } = useToast()

  // Handle auth state changes
  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          if (!db) {
            setLoading(false)
            return
          }
          const userRef = doc(db, "users", firebaseUser.uid)
          let userDoc = await getDoc(userRef)

          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              isAdmin: false,
              createdAt: new Date(),
              lastLogin: new Date(),
            })
            userDoc = await getDoc(userRef)
          } else {
            await setDoc(
              userRef,
              { lastLogin: new Date() },
              { merge: true },
            )
          }

          const userData = userDoc.data()
          const isAdmin = userData?.isAdmin || false

          Cookies.set("user-role", isAdmin ? "admin" : "user", { expires: 7, path: "/" })
          const token = await firebaseUser.getIdToken()
          Cookies.set("firebase-auth-token", token, { expires: 7, path: "/" })

          localStorage.setItem("auth-user", JSON.stringify({ uid: firebaseUser.uid, email: firebaseUser.email, isAdmin }))
          setUser({ ...firebaseUser, isAdmin } as User)
        } catch (error) {
          console.error("Error during auth change:", error)
          setUser({ ...firebaseUser, isAdmin: false } as User)
        }
      } else {
        Cookies.remove("user-role", { path: "/" })
        Cookies.remove("firebase-auth-token", { path: "/" })
        localStorage.removeItem("auth-user")
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth, db, isConfigured])

  // Token auto-refresh handler
  useEffect(() => {
    if (!isConfigured || !auth) return

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken()
        Cookies.set("firebase-auth-token", token, {
          expires: 7,
          path: "/",
        })
      } else {
        Cookies.remove("firebase-auth-token", { path: "/" })
      }
    })

    return () => unsubscribe()
  }, [auth, isConfigured])

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not properly configured.",
      })
      return
    }

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      if (!db) {
        throw new Error("Firestore not available")
      }

      const userRef = doc(db, "users", result.user.uid)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
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
        await setDoc(userRef, { lastLogin: new Date() }, { merge: true })
      }

      toast({
        title: "Success",
        description: "You have successfully signed in!",
      })
    } catch (error: any) {
      console.error("Google Sign-In Error:", error)
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: error.message || "Unable to sign in with Google",
      })
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!isConfigured || !auth) return

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Signed In",
        description: "You have successfully signed in.",
      })
    } catch (error: any) {
      console.error("Email Sign-In Error:", error)
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: error.message || "Invalid email or password",
      })
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!isConfigured || !auth || !db) return

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: name })

      if (!db) {
        throw new Error("Firestore not available")
      }

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
        title: "Account Created",
        description: "Welcome aboard!",
      })
    } catch (error: any) {
      console.error("Sign-Up Error:", error)
      toast({
        variant: "destructive",
        title: "Sign-Up Failed",
        description: error.message || "Could not create account",
      })
      throw error
    }
  }

  const signOut = async () => {
    if (!isConfigured || !auth) return

    try {
      await firebaseSignOut(auth)
      Cookies.remove("user-role", { path: "/" })
      Cookies.remove("firebase-auth-token", { path: "/" })
      localStorage.removeItem("auth-user")
      toast({
        title: "Signed Out",
        description: "You have been logged out.",
      })
    } catch (error: any) {
      console.error("Sign-Out Error:", error)
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message || "Could not sign out",
      })
    }
  }

  const resetPassword = async (email: string) => {
    if (!isConfigured || !auth) return

    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "Password Reset Sent",
        description: "Check your email for the reset link.",
      })
    } catch (error: any) {
      console.error("Reset Error:", error)
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message || "Could not send reset email",
      })
      throw error
    }
  }

  const updateDisplayName = async (name: string, photoURL?: string) => {
    if (!isConfigured || !auth || !auth.currentUser || !db) return

    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoURL || null,
      })

      await setDoc(doc(db, "users", auth.currentUser.uid), {
        displayName: name,
        photoURL: photoURL || null,
      }, { merge: true })

      setUser({ ...auth.currentUser, displayName: name, photoURL } as User)

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      })
    } catch (error: any) {
      console.error("Update Profile Error:", error)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update profile",
      })
      throw error
    }
  }

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
        logout,
        resetPassword,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
