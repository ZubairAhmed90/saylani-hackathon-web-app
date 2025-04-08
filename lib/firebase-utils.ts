import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import type { User } from "firebase/auth"
import type { Firestore } from "firebase/firestore"

/**
 * Saves user data to Firestore
 * @param db Firestore database instance
 * @param user Firebase user object
 * @param additionalData Additional data to save with the user
 * @returns Promise that resolves when the operation is complete
 */
export async function saveUserToFirestore(db: Firestore, user: User, additionalData = {}) {
  if (!db || !user) {
    console.error("Missing db or user in saveUserToFirestore")
    return null
  }

  try {
    const userRef = doc(db, "users", user.uid)
    const userSnapshot = await getDoc(userRef)

    // Base user data
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      lastLogin: serverTimestamp(),
      ...additionalData,
    }

    if (!userSnapshot.exists()) {
      // If user doesn't exist, create a new document with creation timestamp
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        isAdmin: false,
      })
      console.log("New user created in Firestore:", user.uid)
      return userRef
    } else {
      // If user exists, just update the lastLogin and any other fields
      await setDoc(userRef, userData, { merge: true })
      console.log("User data updated in Firestore:", user.uid)
      return userRef
    }
  } catch (error) {
    console.error("Error saving user to Firestore:", error)
    return null
  }
}

