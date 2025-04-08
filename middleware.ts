import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (
    path.includes("/_next") ||
    path.includes("/api/") ||
    path.includes("/favicon.ico") ||
    path.includes(".svg") ||
    path.includes(".png") ||
    path.includes(".jpg") ||
    path.includes(".jpeg") ||
    path.includes(".gif")
  ) {
    return NextResponse.next()
  }

  // Check if the path is an admin route
  const isAdminRoute = path.startsWith("/admin")

  // Check if the path is a user-only route
  const isUserRoute = path.startsWith("/dashboard") || path.startsWith("/my-hackathons") || path.startsWith("/teams")

  // If it's not an admin or user route, allow access
  if (!isAdminRoute && !isUserRoute) {
    return NextResponse.next()
  }

  // Get the session cookie
  const authToken = request.cookies.get("firebase-auth-token")?.value
  const userRole = request.cookies.get("user-role")?.value

  // If no session exists, redirect to login
  if (!authToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  try {
    // Handle admin routes
    if (isAdminRoute && userRole !== "admin") {
      // User is not an admin, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Handle user routes
    if (isUserRoute && userRole === "admin") {
      // User is an admin, redirect to admin dashboard
      return NextResponse.redirect(new URL("/admin", request.url))
    }

    // Allow access
    return NextResponse.next()
  } catch (error) {
    console.error("Error in middleware:", error)
    // On error, redirect to login
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/my-hackathons/:path*", "/teams/:path*"],
}

