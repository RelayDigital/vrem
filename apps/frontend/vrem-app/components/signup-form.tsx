"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"

import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { AccountType } from "@/types"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { register, loginWithOAuth, isLoading } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("AGENT")
  const [error, setError] = useState("")
  const [oauthError, setOauthError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      await register({
        name,
        email,
        password,
        accountType,
      })
    } catch (err) {
      setError("Registration failed. Please try again.")
    }
  }

  const promptForOAuthToken = (provider: "google" | "facebook") => {
    if (typeof window === "undefined") return null
    return window.prompt(
      `Paste the ${provider} OAuth token/credential here.\n\n(Connect the real ${provider} button to pass the credential instead of using this prompt.)`
    )
  }

  const handleOAuth = async (provider: "google" | "facebook") => {
    setOauthError("")
    try {
      const token = promptForOAuthToken(provider)
      if (!token) {
        setOauthError(`Missing ${provider} token. Please complete the ${provider} sign-in flow.`)
        return
      }
      await loginWithOAuth(provider, {
        token,
        accountType,
        name,
      })
    } catch (err) {
      console.error(`${provider} OAuth failed`, err)
      setOauthError(`${provider} sign-in failed. Please try again.`)
    }
  }

  const accountOptions: { value: AccountType; title: string; subtitle: string }[] = [
    { value: "AGENT", title: "Agent", subtitle: "Book shoots, review & download media" },
    { value: "PROVIDER", title: "Provider", subtitle: "Technician/editor workflows inside provider orgs" },
  ]
  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>
        {error && (
          <div className="text-red-500 text-sm font-medium text-center">{error}</div>
        )}
        <Field>
          <FieldLabel>Select your account type</FieldLabel>
          <div className="grid grid-cols-1 gap-2">
            {accountOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={accountType === option.value ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setAccountType(option.value)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{option.title}</span>
                  <span className="text-muted-foreground text-xs">{option.subtitle}</span>
                </div>
              </Button>
            ))}
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <FieldDescription>Please confirm your password.</FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => handleOAuth("google")}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isLoading ? "Connecting..." : "Sign up with Google"}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => handleOAuth("facebook")}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {isLoading ? "Connecting..." : "Sign up with Facebook"}
            </Button>
          </div>
          {oauthError && (
            <div className="text-red-500 text-sm font-medium text-center mt-2">{oauthError}</div>
          )}
          <FieldDescription className="px-6 text-center mt-2">
            Already have an account? <Link href="/">Sign in</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
