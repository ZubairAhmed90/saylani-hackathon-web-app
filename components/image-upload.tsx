"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, X } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
  onImageChange: (file: File | null) => void
  defaultImage?: string
}

export function ImageUpload({ onImageChange, defaultImage }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImage || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // Create a preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
      setIsUploading(false)
    }
    reader.readAsDataURL(file)

    // Pass the file to parent component
    onImageChange(file)
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onImageChange(null)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="hackathon-image">Hackathon Banner Image</Label>

      {previewUrl ? (
        <div className="relative rounded-md overflow-hidden">
          <Image
            src={previewUrl || "/placeholder.svg"}
            alt="Hackathon banner preview"
            width={600}
            height={300}
            className="w-full h-[200px] object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-700 rounded-md p-6 text-center">
          <input
            id="hackathon-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-gray-700 hover:bg-gray-800"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
          <p className="mt-2 text-sm text-gray-400">Recommended size: 1200x600px. Max size: 5MB</p>
        </div>
      )}
    </div>
  )
}

