"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import VremApp from "@/components/VremApp"

export default function AppPage() {
  const [accountType, setAccountType] = useState<"agent" | "dispatcher" | "photographer" | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get account type from localStorage
    const storedAccountType = localStorage.getItem("accountType") as "agent" | "dispatcher" | "photographer" | null
    if (storedAccountType) {
      setAccountType(storedAccountType)
      
      // Redirect agents to the new agent routes
      if (storedAccountType === "agent") {
        router.replace("/agent")
        return
      }
      
      // Redirect photographers to the new photographer routes
      if (storedAccountType === "photographer") {
        router.replace("/photographer")
        return
      }
    } else {
      // Default to dispatcher if not set
      setAccountType("dispatcher")
    }
    setIsLoading(false)
  }, [router])

  // If agent or photographer, don't render anything (redirect is happening)
  if (accountType === "agent" || accountType === "photographer") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <VremApp initialAccountType={accountType || "dispatcher"} />
}

