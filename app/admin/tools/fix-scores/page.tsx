"use client"

import { useState } from "react"
import { useFirebase } from "@/lib/firebase-context"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { collection, getDocs, doc, updateDoc, query, where, addDoc } from "firebase/firestore"
import { useToast } from "@/components/ui/use-toast"

export default function FixScoresPage() {
  const [fixing, setFixing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { db } = useFirebase()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleFix = async () => {
    if (!db || !user?.isAdmin) return

    setFixing(true)
    try {
      // 1. Get all enrollments with scores
      const enrollmentsRef = collection(db, "enrollments")
      const enrollmentsSnap = await getDocs(enrollmentsRef)

      let updatedCount = 0
      let errorCount = 0
      let createdCount = 0

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
          } else if (enrollmentData.status === "completed") {
            // Create a submission if it doesn't exist and enrollment is completed
            try {
              const submissionData = {
                userId: enrollmentData.userId,
                userName: enrollmentData.userName,
                hackathonId: enrollmentData.hackathonId,
                hackathonTitle: enrollmentData.hackathonTitle || "Unknown Hackathon",
                projectTitle: enrollmentData.projectTitle || `${enrollmentData.userName}'s Project`,
                submissionUrl: enrollmentData.submissionUrl,
                hostedUrl: enrollmentData.hostedUrl,
                score: enrollmentData.score,
                status: "approved",
                createdAt: new Date(),
                updatedAt: new Date(),
              }

              const submissionsCollection = collection(db, "submissions")
              await addDoc(submissionsCollection, submissionData)
              createdCount++
            } catch (error) {
              console.error("Error creating submission:", error)
              errorCount++
            }
          }
        } catch (error) {
          console.error(`Error syncing score for enrollment ${enrollmentDoc.id}:`, error)
          errorCount++
        }
      }

      const fixResult = {
        success: true,
        stats: {
          processed: enrollmentsSnap.size,
          updated: updatedCount,
          created: createdCount,
          errors: errorCount,
        },
      }

      setResult(fixResult)

      toast({
        title: "Fix Complete",
        description: `Processed ${fixResult.stats.processed} enrollments, updated ${fixResult.stats.updated} submissions, created ${fixResult.stats.created} new submissions.`,
      })
    } catch (error) {
      console.error("Error running fix:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during the fix operation.",
      })
      setResult({ success: false, error })
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Tools - Fix Scores</h1>

      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle>Fix Enrollment and Submission Scores</CardTitle>
          <CardDescription>
            This tool will fix all scores between the enrollments and submissions collections. Use this if you notice
            scores not appearing correctly on the leaderboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This process will:</p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>Scan all enrollment documents with scores</li>
            <li>Find matching submission documents and update their scores</li>
            <li>Create new submission documents for completed enrollments that don't have one</li>
          </ul>
          <p className="text-amber-400">Note: This operation may take some time depending on the number of records.</p>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
          <Button onClick={handleFix} disabled={fixing} className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
            {fixing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing Scores...
              </>
            ) : (
              "Start Fix"
            )}
          </Button>

          {result && (
            <div className="w-full mt-4 p-4 bg-black/30 rounded-lg">
              <h3 className="font-medium mb-2">Fix Results:</h3>
              <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

