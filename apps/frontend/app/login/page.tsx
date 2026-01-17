"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { LoginMapView } from "@/components/shared/map/LoginMapView";

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already signed in
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If signed in, show loading while redirecting
  if (isSignedIn) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            VX Media
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <LoginMapView />
      </div>
    </div>
  );
}
