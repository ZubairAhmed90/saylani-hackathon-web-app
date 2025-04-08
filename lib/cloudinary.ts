"use server"

import { v2 as cloudinary } from "cloudinary"


cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(file: File): Promise<string> {
  try {
    // Convert file to base64
    const fileBuffer = await file.arrayBuffer()
    const base64String = Buffer.from(fileBuffer).toString("base64")
    const dataURI = `data:${file.type};base64,${base64String}`

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataURI,
        {
          folder: "hackathons",
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        },
      )
    })

    return result.secure_url
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error)
    throw new Error("Failed to upload image")
  }
}

