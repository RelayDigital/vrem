import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/sso-callback(.*)',
  '/api/health(.*)',
  '/api/otp(.*)',
  '/api/invitations/by-email(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Don't protect public routes - let them through without auth
  if (isPublicRoute(req)) {
    return
  }

  // For protected routes, just check auth but don't redirect to Clerk's UI
  // The app will handle showing login page if needed
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
