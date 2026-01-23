import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/delivery/(.*)',
  '/api/health(.*)',
  '/api/otp(.*)',
  '/api/invitations/by-email(.*)',
])

// Wrap Clerk middleware with error handling for debugging
const wrappedClerkMiddleware = clerkMiddleware(async (auth, req) => {
  // Don't protect public routes - let them through without auth
  if (isPublicRoute(req)) {
    return
  }

  // Protect all other routes - redirect to sign-in if not authenticated
  await auth.protect()
})

export default async function middleware(request: NextRequest) {
  try {
    return await wrappedClerkMiddleware(request, {} as any)
  } catch (error) {
    // Log the error for debugging
    console.error('Clerk middleware error:', error)
    console.error('CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY)
    console.error('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists:', !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

    // Return a response with error details (only for debugging)
    return new NextResponse(
      JSON.stringify({
        error: 'Middleware error',
        message: error instanceof Error ? error.message : 'Unknown error',
        clerkSecretExists: !!process.env.CLERK_SECRET_KEY,
        clerkPubKeyExists: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
