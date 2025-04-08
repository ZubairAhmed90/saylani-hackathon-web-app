"use client"

import { useState } from "react"
import { useFirebase } from "@/lib/firebase-context"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { syncAllScores } from "@/lib/sync-scores"
import { useToast } from "@/components/ui/use-toast"

export default function SyncScoresPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { db } = useFirebase()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSync = async () => {
    if (!db || !user?.isAdmin) return

    setSyncing(true)
    try {
      const syncResult = await syncAllScores(db)
      setResult(syncResult)

      if (syncResult.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully processed ${syncResult?.stats?.processed || 0} enrollments and updated ${syncResult?.stats?.updated || 0} submissions.`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: "There was an error syncing scores. Check the console for details.",
        })
      }
    } catch (error) {
      console.error("Error running sync:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during sync.",
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Tools - Sync Scores</h1>

      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle>Sync Enrollment and Submission Scores</CardTitle>
          <CardDescription>
            This tool will sync all scores between the enrollments and submissions collections. Use this if you notice
            discrepancies in scores across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This process will:</p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>Scan all enrollment documents with scores</li>
            <li>Find matching submission documents</li>
            <li>Update submission scores to match enrollment scores</li>
          </ul>
          <p className="text-amber-400">Note: This operation may take some time depending on the number of records.</p>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
          <Button onClick={handleSync} disabled={syncing} className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing Scores...
              </>
            ) : (
              "Start Sync"
            )}
          </Button>

          {result && (
            <div className="w-full mt-4 p-4 bg-black/30 rounded-lg">
              <h3 className="font-medium mb-2">Sync Results:</h3>
              <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

