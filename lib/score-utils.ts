import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore"
import type { Firestore } from "firebase/firestore"

/**
 * Updates a user's score in both enrollments and submissions collections
 * @param db Firestore database instance
 * @param enrollmentId The ID of the enrollment to update
 * @param score The new score value
 * @returns Promise that resolves when the operation is complete
 */
export async function updateUserScore(db: Firestore, enrollmentId: string, score: number) {
  if (!db || !enrollmentId) {
    console.error("Missing db or enrollmentId in updateUserScore")
    return { success: false, error: "Missing required parameters" }
  }

  try {
    // 1. Update the enrollment document
    const enrollmentRef = doc(db, "enrollments", enrollmentId)
    const enrollmentSnap = await getDoc(enrollmentRef)

    if (!enrollmentSnap.exists()) {
      return { success: false, error: "Enrollment not found" }
    }

    const enrollmentData = enrollmentSnap.data()

    // 2. Update the enrollment with the new score
    await updateDoc(enrollmentRef, {
      score: score,
      updatedAt: new Date(),
    })

    // 3. Find and update the corresponding submission document
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("userId", "==", enrollmentData.userId),
      where("hackathonId", "==", enrollmentData.hackathonId),
    )

    const submissionsSnap = await getDocs(submissionsQuery)

    if (!submissionsSnap.empty) {
      // Update each matching submission (should typically be just one)
      const updatePromises = submissionsSnap.docs.map((submissionDoc) => {
        return updateDoc(doc(db, "submissions", submissionDoc.id), {
          score: score,
          updatedAt: new Date(),
        })
      })

      await Promise.all(updatePromises)
      console.log(`Updated score for ${submissionsSnap.size} submission(s)`)
    } else {
      console.warn(`No submission found for enrollment ${enrollmentId}`)

      // Create a submission if it doesn't exist
      if (enrollmentData.status === "completed") {
        try {
          const submissionData = {
            userId: enrollmentData.userId,
            userName: enrollmentData.userName,
            hackathonId: enrollmentData.hackathonId,
            hackathonTitle: enrollmentData.hackathonTitle || "Unknown Hackathon",
            projectTitle: enrollmentData.projectTitle || `${enrollmentData.userName}'s Project`,
            submissionUrl: enrollmentData.submissionUrl,
            hostedUrl: enrollmentData.hostedUrl,
            score: score,
            status: "approved",
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          await setDoc(doc(collection(db, "submissions")), submissionData)
          console.log("Created new submission from enrollment")
        } catch (error) {
          console.error("Error creating submission:", error)
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating score:", error)
    return { success: false, error }
  }
}

