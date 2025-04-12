"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Check, X } from "lucide-react"
import FirebaseErrorBanner from "@/components/firebase-error-banner"

interface ValidationState {
  hasMinLength: boolean
  hasUpperCase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
  isEmailValid: boolean
}

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationState>({
    hasMinLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    isEmailValid: false,
  })

  const { signUpWithEmail, signInWithGoogle } = useAuth()
  const { isConfigured } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()

  // Validate password as user types
  useEffect(() => {
    setValidation({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      isEmailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    })
  }, [password, email])

  const isPasswordValid =
    validation.hasMinLength && validation.hasUpperCase && validation.hasNumber && validation.hasSpecialChar

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isConfigured) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase is not properly configured. Please check your environment variables.",
      })
      return
    }

    if (!name || !email || !password || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      })
      return
    }

    if (!validation.isEmailValid) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      })
      return
    }

    if (!isPasswordValid) {
      toast({
        variant: "destructive",
        title: "Password Requirements Not Met",
        description: "Please ensure your password meets all the requirements",
      })
      return
    }

    setIsLoading(true)

    try {
      await signUpWithEmail(email, password, name)
      router.push("/dashboard")
    } catch (error: any) {
      // Handle specific error for email already in use
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.")
      } else {
        setError(error.message || "Failed to create account")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!isConfigured) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase is not properly configured. Please check your environment variables.",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await signInWithGoogle()
      router.push("/dashboard")
    } catch (error: any) {
      // Handle specific error for popup closed by user
      if (error.code !== "auth/popup-closed-by-user") {
        setError(error.message || "Failed to sign in with Google")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
      <Card className="w-full max-w-md bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <FirebaseErrorBanner />

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-sm text-red-400">
              {error}
              {error.includes("already registered") && (
                <span className="block mt-1">
                  <Link href="/auth/login" className="text-[#00FFBF] hover:underline">
                    Sign in here
                  </Link>
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black border-gray-800"
                disabled={isLoading || !isConfigured}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`bg-black border-gray-800 ${email && !validation.isEmailValid ? "border-red-500" : ""}`}
                disabled={isLoading || !isConfigured}
              />
              {email && !validation.isEmailValid && (
                <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowPasswordRequirements(true)}
                className={`bg-black border-gray-800 ${password && !isPasswordValid ? "border-red-500" : password && isPasswordValid ? "border-green-500" : ""}`}
                disabled={isLoading || !isConfigured}
              />
              {showPasswordRequirements && (
                <div className="mt-2 p-3 bg-black/50 border border-gray-800 rounded-md">
                  <p className="text-sm font-medium mb-2">Password must contain:</p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center">
                      {validation.hasMinLength ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 mr-2" />
                      )}
                      At least 8 characters
                    </li>
                    <li className="flex items-center">
                      {validation.hasUpperCase ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 mr-2" />
                      )}
                      At least one uppercase letter (A-Z)
                    </li>
                    <li className="flex items-center">
                      {validation.hasNumber ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 mr-2" />
                      )}
                      At least one number (0-9)
                    </li>
                    <li className="flex items-center">
                      {validation.hasSpecialChar ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 mr-2" />
                      )}
                      At least one special character (!@#$%^&*...)
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`bg-black border-gray-800 ${
                  confirmPassword && password !== confirmPassword
                    ? "border-red-500"
                    : confirmPassword && password === confirmPassword
                      ? "border-green-500"
                      : ""
                }`}
                disabled={isLoading || !isConfigured}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
              disabled={isLoading || !isConfigured}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center">
            <Separator className="flex-1" />
            <span className="mx-2 text-xs text-gray-400">OR</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4 border-gray-800 hover:bg-gray-800"
            onClick={handleGoogleSignup}
            disabled={isLoading || !isConfigured}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#00FFBF] hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
