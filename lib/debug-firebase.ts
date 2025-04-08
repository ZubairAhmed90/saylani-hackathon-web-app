import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore"
import { db, auth } from "./firebase"

/**
 * Debug function to check Firestore connection and permissions
 */
export async function debugFirestore() {
  try {
    console.log("Testing Firestore connection...")

    // Check if user is authenticated
    const currentUser = auth.currentUser
    console.log("Current user:", currentUser ? currentUser.uid : "No user logged in")

    // Try to read from the users collection
    const usersCollection = collection(db, "users")
    const usersQuery = query(usersCollection, limit(5))

    try {
      const usersSnapshot = await getDocs(usersQuery)
      console.log(`Users collection read successful. Found ${usersSnapshot.size} documents.`)

      // If user is logged in, try to read their document
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid))
          if (userDoc.exists()) {
            console.log("Current user document exists:", userDoc.data())
          } else {
            console.log("Current user document does not exist in Firestore")
          }
        } catch (error) {
          console.error("Error reading current user document:", error)
        }
      }
    } catch (error) {
      console.error("Error reading from users collection:", error)
    }

    // Check Firestore rules
    console.log("Your Firestore security rules might be preventing writes to the users collection.")
    console.log("Make sure your rules allow authenticated users to write to their own document.")

    return "Firestore debug complete. Check console for details."
  } catch (error) {
    console.error("Firestore debug error:", error)
    return `Firestore debug error: ${error}`
  }
}

