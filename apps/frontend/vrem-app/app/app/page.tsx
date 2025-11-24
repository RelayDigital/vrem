"use client"

import { useEffect, useState } from "react"
import VremApp from "@/components/VremApp"

export default function AppPage() {
  const [accountType, setAccountType] = useState<"agent" | "dispatcher" | "photographer" | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get account type from localStorage
    const storedAccountType = localStorage.getItem("accountType") as "agent" | "dispatcher" | "photographer" | null
    if (storedAccountType) {
      setAccountType(storedAccountType)
    } else {
      // Default to dispatcher if not set
      setAccountType("dispatcher")
    }
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <VremApp initialAccountType={accountType || "dispatcher"} />
}

