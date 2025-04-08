import { collection, query, getDocs, doc, updateDoc, where } from "firebase/firestore"
import type { Firestore } from "firebase/firestore"

/**
 * Syncs all scores between enrollments and submissions collections
 * This can be run as a one-time fix or periodically
 * @param db Firestore database instance
 */
export async function syncAllScores(db: Firestore) {
  if (!db) return { success: false, error: "No database instance provided" }

  try {
    // 1. Get all enrollments with scores
    const enrollmentsRef = collection(db, "enrollments")
    const enrollmentsSnap = await getDocs(enrollmentsRef)

    let updatedCount = 0
    let errorCount = 0

    // 2. Process each enrollment
    for (const enrollmentDoc of enrollmentsSnap.docs) {
      const enrollmentData = enrollmentDoc.data()

      // Skip if no score
      if (enrollmentData.score === undefined || enrollmentData.score === null) continue

      try {
        // Find matching submission
        const submissionsQuery = query(
          collection(db, "submissions"),
          where("userId", "==", enrollmentData.userId),
          where("hackathonId", "==", enrollmentData.hackathonId),
        )

        const submissionsSnap = await getDocs(submissionsQuery)

        if (!submissionsSnap.empty) {
          // Update each matching submission with the enrollment score
          for (const submissionDoc of submissionsSnap.docs) {
            await updateDoc(doc(db, "submissions", submissionDoc.id), {
              score: enrollmentData.score,
              updatedAt: new Date(),
            })
            updatedCount++
          }
        }
      } catch (error) {
        console.error(`Error syncing score for enrollment ${enrollmentDoc.id}:`, error)
        errorCount++
      }
    }

    return {
      success: true,
      stats: {
        processed: enrollmentsSnap.size,
        updated: updatedCount,
        errors: errorCount,
      },
    }
  } catch (error) {
    console.error("Error syncing scores:", error)
    return {
      success: false,
      error,
      stats: {
        processed: 0,
        updated: 0,
        errors: 1,
      },
    }
  }
}

