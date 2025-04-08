import { NextRequest, NextResponse } from "next/server"
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"

// ✅ Firebase config — Use environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

// ✅ Initialize app only once (to avoid duplicate init errors)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function POST(request: NextRequest) {
  try {
    const { submissionId, score, feedback } = await request.json()

    if (!submissionId || score === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: submissionId and score" },
        { status: 400 }
      )
    }

    const scoreNum = Number(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return NextResponse.json(
        { error: "Score must be a number between 0 and 100" },
        { status: 400 }
      )
    }

    const submissionRef = doc(db, "submissions", submissionId)
    const submissionDoc = await getDoc(submissionRef)

    if (!submissionDoc.exists()) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    await updateDoc(submissionRef, {
      score: scoreNum,
      feedback: feedback || "",
      scoredAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Submission scored successfully",
    })
  } catch (error: any) {
    console.error("Error scoring submission:", error)
    return NextResponse.json(
      {
        error: "Failed to score submission",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
