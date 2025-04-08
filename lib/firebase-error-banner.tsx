"use client"

import { useFirebase } from "@/lib/firebase-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { debugFirestore } from "@/lib/debug-firebase"
import { useToast } from "@/components/ui/use-toast"

export default function FirebaseErrorBanner() {
  const { configError, isConfigured } = useFirebase()
  const { toast } = useToast()

  const handleDebug = async () => {
    try {
      const result = await debugFirestore()
      toast({
        title: "Debug Result",
        description: result,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Debug Error",
        description: String(error),
      })
    }
  }

  if (!configError) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Firebase Configuration Error</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{configError}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDebug}
          className="bg-transparent border-white/20 hover:bg-white/10 text-white"
        >
          Debug Firestore
        </Button>
      </AlertDescription>
    </Alert>
  )
}

