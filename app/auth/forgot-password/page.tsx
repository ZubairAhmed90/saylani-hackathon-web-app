"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { sendPasswordResetEmail } from "firebase/auth"
import { useFirebase } from "@/lib/firebase-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { auth } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSuccess(false)

    try {
      if (!auth) throw new Error("Authentication not initialized")
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      let errorMessage = "Failed to send reset email. Please try again."

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later."
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-64px)] py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="space-y-1">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => router.push("/auth/login")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            </div>
            <CardDescription>Enter your email address and we'll send you a link to reset your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-900/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Reset link sent! Check your email for instructions to reset your password.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#0D0D0D] border-gray-700"
                />
              </div>
              <Button type="submit" className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-400">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-[#00FFBF] hover:underline">
                Back to login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

