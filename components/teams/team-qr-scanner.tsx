"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { QrCode, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

// Dynamically import with type safety
const QrScanner = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-black/20 rounded-lg">
      <div className="animate-pulse text-[#00FFBF]">Loading scanner...</div>
    </div>
  ),
})

interface TeamQrScannerProps {
  onCodeScanned: (code: string) => void
}

export default function TeamQrScanner({ onCodeScanned }: TeamQrScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCameraAvailable, setIsCameraAvailable] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => setIsCameraAvailable(true))
        .catch(() => {
          setIsCameraAvailable(false)
          toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please allow camera access to scan QR codes",
          })
        })
    }
  }, [isOpen, toast])

  const handleScan = (data: any) => {
    if (data) {
      try {
        const url = new URL(data.text)
        const code = url.searchParams.get("code")
        if (code) {
          onCodeScanned(code)
          setIsOpen(false)
          toast({
            title: "QR Code Scanned",
            description: "Processing team invitation...",
          })
        } else {
          onCodeScanned(data.text)
          setIsOpen(false)
        }
      } catch {
        onCodeScanned(data.text)
        setIsOpen(false)
      }
    }
  }

  const handleError = (err: any) => {
    console.error("QR Scanner error:", err)
    toast({
      variant: "destructive",
      title: "Scanner Error",
      description: "There was a problem with the QR scanner",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-gray-700 hover:bg-gray-800">
          <QrCode className="mr-2 h-4 w-4" />
          Scan QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1A1A1A] border-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Team QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at a team invitation QR code
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          {isCameraAvailable ? (
            <div className="overflow-hidden rounded-lg">
              <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: "100%", height: "300px" }}
                constraints={{
                  video: { facingMode: "environment" },
                }}
              />
              <div className="absolute inset-0 border-2 border-[#00FFBF] rounded-lg pointer-events-none"></div>
            </div>
          ) : (
            <div className="bg-black rounded-lg p-8 text-center">
              <p>Camera access is required to scan QR codes</p>
              <Button
                className="mt-4 bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
          <Button
            className="absolute top-2 right-2 rounded-full p-2 h-8 w-8 bg-black/50 hover:bg-black/70"
            variant="ghost"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
