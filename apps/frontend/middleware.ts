import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporarily disable Clerk middleware to diagnose 500 errors
export function middleware(request: NextRequest) {
  // Simple pass-through middleware for testing
  console.log('Middleware hit:', request.nextUrl.pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

// Original Clerk middleware (disabled for testing)
/*
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

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

export default clerkMiddleware(async (auth, req) => {
  // Don't protect public routes - let them through without auth
  if (isPublicRoute(req)) {
    return
  }

  // Protect all other routes - redirect to sign-in if not authenticated
  await auth.protect()
})
*/
