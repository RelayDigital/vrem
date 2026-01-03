"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSignIn, useSignUp, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";
import { User, OrganizationMember } from "@/types";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  memberships: OrganizationMember[];
  activeOrganizationId: string | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    accountType: User['accountType'];
  }) => Promise<void>;
  loginWithOAuth: (
    provider: 'google' | 'facebook',
    payload: {
      token: string;
      accountType?: User['accountType'];
      name?: string;
    },
  ) => Promise<void>;
  completeOnboarding: (response: { token: string; user: any }) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Clerk hooks
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded: isClerkLoaded, getToken } = useClerkAuth();

  const normalizeUser = (u: any): User => {
    // accountType is always one of: AGENT, PROVIDER, COMPANY
    // Normalize to uppercase and default to PROVIDER if missing
    const normalizedType = (u.accountType || "").toUpperCase();
    const accountType =
      normalizedType === "AGENT" ? "AGENT" :
      normalizedType === "PROVIDER" ? "PROVIDER" :
      normalizedType === "COMPANY" ? "COMPANY" :
      "PROVIDER"; // Default to PROVIDER if unknown/empty
    return {
      ...u,
      accountType,
      role: accountType, // backward compatibility
    };
  };

  // Sync with Clerk auth state
  useEffect(() => {
    const initAuth = async () => {
      // Wait for Clerk to finish loading before processing auth state
      if (!isClerkLoaded) {
        return; // Keep isLoading: true until Clerk is ready
      }

      // If signed in with Clerk, get the token and sync with backend
      if (isSignedIn) {
        try {
          const clerkToken = await getToken();
          if (clerkToken) {
            // Store Clerk token for API calls
            localStorage.setItem("token", clerkToken);
            setToken(clerkToken);

            // Use bootstrap endpoint - ensures user is fully provisioned (idempotent)
            // This guarantees: personal org exists, returns all accessible orgs
            let authData;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
              try {
                // Use bootstrap endpoint for reliable provisioning
                authData = await api.auth.bootstrap();
                break;
              } catch (bootstrapError: any) {
                const is403 = bootstrapError?.message?.includes('403');
                const is404 = bootstrapError?.message?.includes('404');

                // If org-related error, clear stale org and retry
                if ((is403 || is404) && retryCount < maxRetries) {
                  console.warn(`Bootstrap attempt ${retryCount + 1} failed with org error, clearing org and retrying...`);
                  localStorage.removeItem("organizationId");
                  api.organizations.setActiveOrganization(null as any);
                  retryCount++;
                  continue;
                }
                throw bootstrapError;
              }
            }

            if (!authData) {
              throw new Error('Failed to bootstrap after retries');
            }

            setUser(normalizeUser(authData));

            // Use memberships from the auth response (DB is source of truth)
            const orgs = authData.memberships || [];
            setMemberships(orgs);

            // Determine active org with recovery logic:
            // 1. Check if stored org is still valid (user is still a member)
            // 2. Otherwise use server's recommended org (which is guaranteed to exist)
            // 3. Fall back to personalOrgId if recommendation is null
            const storedOrg = api.organizations.getActiveOrganization();
            const isValidStoredOrg = storedOrg && orgs.some((m: any) => m.orgId === storedOrg);

            if (storedOrg && !isValidStoredOrg) {
              // Stored org is no longer valid - clear it
              console.warn(`Stored org ${storedOrg} is no longer valid, clearing...`);
              localStorage.removeItem("organizationId");
            }

            // Resolve org with guaranteed fallback to personal org
            const resolvedOrgId = isValidStoredOrg
              ? storedOrg
              : authData.recommendedActiveOrgId || authData.personalOrgId || null;

            if (resolvedOrgId) {
              api.organizations.setActiveOrganization(resolvedOrgId);
            } else {
              // This should never happen after bootstrap, but handle gracefully
              console.error('No valid org after bootstrap - this should not happen');
              api.organizations.setActiveOrganization(null as any);
            }
            setActiveOrganizationId(resolvedOrgId);
          }
        } catch (error) {
          console.error("Failed to sync with backend:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("organizationId");
          setToken(null);
          setUser(null);
          setMemberships([]);
          setActiveOrganizationId(null);
        }
      } else if (isSignedIn === false) {
        // Clerk says not signed in, clear local state
        localStorage.removeItem("token");
        localStorage.removeItem("organizationId");
        setToken(null);
        setUser(null);
        setMemberships([]);
        setActiveOrganizationId(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [isClerkLoaded, isSignedIn, getToken]);

  // Refresh Clerk token periodically to prevent expiration (tokens expire in ~60s)
  useEffect(() => {
    if (!isClerkLoaded || !isSignedIn) {
      return;
    }

    const refreshToken = async () => {
      try {
        const freshToken = await getToken();
        if (freshToken) {
          localStorage.setItem("token", freshToken);
          setToken(freshToken);
          // Notify API client that token has been refreshed
          window.dispatchEvent(new CustomEvent("auth-token-refreshed"));
        }
      } catch (error) {
        console.error("Failed to refresh Clerk token:", error);
      }
    };

    // Refresh token every 30 seconds (Clerk tokens expire in ~60s, give ample buffer)
    const intervalId = setInterval(refreshToken, 30 * 1000);

    // Also refresh immediately in case the stored token is stale
    refreshToken();

    // Listen for auth-token-expired events from API client and refresh token
    const handleTokenExpired = () => {
      console.log("Token expired event received, refreshing token...");
      refreshToken();
    };
    window.addEventListener("auth-token-expired", handleTokenExpired);

    // Refresh token when tab becomes visible again (browser pauses intervals when tab is inactive)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, refreshing token...");
        refreshToken();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also refresh on window focus (backup for visibility change)
    const handleWindowFocus = () => {
      console.log("Window focused, refreshing token...");
      refreshToken();
    };
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("auth-token-expired", handleTokenExpired);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isClerkLoaded, isSignedIn, getToken]);

  useEffect(() => {
    const handleOrganizationUpdated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const updatedOrg = detail?.organization;
      if (!updatedOrg) return;
      setMemberships((prev) =>
        prev.map((m) =>
          m.orgId === updatedOrg.id
            ? { ...m, organization: { ...m.organization, ...updatedOrg } }
            : m
        )
      );
    };

    // Handle org context errors - auto-recover by switching to personal org
    const handleOrgContextError = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const { status, orgId: failedOrgId } = detail || {};

      console.warn(`Org context error: status=${status}, orgId=${failedOrgId}`);

      // Only recover if we have a user and personal org
      if (user?.personalOrgId) {
        const personalOrg = memberships.find((m) => m.orgId === user.personalOrgId);
        if (personalOrg) {
          console.log(`Recovering from org error by switching to personal org ${user.personalOrgId}`);
          setActiveOrganizationId(user.personalOrgId);
          api.organizations.setActiveOrganization(user.personalOrgId);

          // Notify user that we've recovered
          window.dispatchEvent(
            new CustomEvent("organizationChanged", { detail: { orgId: user.personalOrgId, recovered: true } })
          );
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("organizationUpdated", handleOrganizationUpdated);
      window.addEventListener("org-context-error", handleOrgContextError);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "organizationUpdated",
          handleOrganizationUpdated
        );
        window.removeEventListener("org-context-error", handleOrgContextError);
      }
    };
  }, [user, memberships]);

  const applyAuthResponse = async (response: { token: string; user: any }) => {
    localStorage.setItem("token", response.token);
    setToken(response.token);

    // Use bootstrap to ensure user is fully provisioned (idempotent)
    const authData = await api.auth.bootstrap();
    setUser(normalizeUser(authData));

    // Use memberships from auth response
    const orgs = authData.memberships || [];
    setMemberships(orgs);

    // Use server's recommended org with fallback to personal org
    const resolvedOrgId = authData.recommendedActiveOrgId || authData.personalOrgId || null;
    if (resolvedOrgId) {
      api.organizations.setActiveOrganization(resolvedOrgId);
    } else {
      api.organizations.setActiveOrganization(null as any);
    }
    setActiveOrganizationId(resolvedOrgId);
    router.push("/dashboard");
  };

  const login = async (credentials: { email: string; password: string }) => {
    // If already signed in, just redirect to dashboard
    if (isSignedIn) {
      router.push("/dashboard");
      return;
    }

    if (!signIn || !setActiveSignIn) {
      throw new Error("Clerk not initialized");
    }

    setIsLoading(true);
    try {
      // Clear any stale organization data before login to prevent 403 errors
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      // In development, use backend sign-in token to bypass Clerk's email verification requirement
      // In production, only test accounts (@example.com) use this flow
      const isTestAccount = credentials.email.toLowerCase().endsWith("@example.com");
      const isDevelopment = process.env.NODE_ENV !== "production";

      if (isDevelopment || isTestAccount) {
        // Get sign-in token from backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/test-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Login failed");
        }

        const { token: signInToken } = await response.json();

        // Use the sign-in token to complete sign-in with Clerk
        const result = await signIn.create({
          strategy: "ticket",
          ticket: signInToken,
        });

        if (result.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          router.push("/dashboard");
          return;
        } else {
          throw new Error(`Sign-in incomplete: ${result.status}`);
        }
      }

      // Normal Clerk sign-in flow (production only, non-test accounts)
      const result = await signIn.create({
        identifier: credentials.email,
        password: credentials.password,
      });

      if (result.status === "complete") {
        // Set the active session - this will trigger the useEffect to sync with backend
        await setActiveSignIn({ session: result.createdSessionId });
        router.push("/dashboard");
      } else if (result.status === "needs_second_factor") {
        // Clerk is requiring a second factor (e.g., email code, TOTP)
        console.log("Sign-in requires second factor:", {
          status: result.status,
          supportedSecondFactors: result.supportedSecondFactors,
          firstFactorVerification: result.firstFactorVerification,
        });
        throw new Error(
          "This account requires email verification. Please check your email for a verification code."
        );
      } else if (result.status === "needs_first_factor") {
        console.log("Sign-in needs first factor:", result.supportedFirstFactors);
        throw new Error("Sign-in requires additional verification. Please try again.");
      } else {
        // Handle other statuses
        console.log("Sign-in requires additional steps:", result.status, result);
        throw new Error(`Sign-in incomplete: ${result.status}`);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      // Handle "already signed in" error gracefully
      if (error.errors?.[0]?.code === "session_exists" ||
          error.message?.includes("already signed in")) {
        router.push("/dashboard");
        return;
      }
      // Clerk errors have a specific structure
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "Login failed");
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    accountType: User['accountType'];
  }) => {
    // If already signed in, just redirect to dashboard
    if (isSignedIn) {
      router.push("/dashboard");
      return;
    }

    if (!signUp || !setActiveSignUp) {
      throw new Error("Clerk not initialized");
    }

    setIsLoading(true);
    try {
      // Clear any stale organization data before registration
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      // Split name into first and last name for Clerk
      const nameParts = data.name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Use Clerk's sign-up flow
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName,
        lastName,
        unsafeMetadata: {
          accountType: data.accountType,
        },
      });

      if (result.status === "complete") {
        // Set the active session - this will trigger the useEffect to sync with backend
        await setActiveSignUp({ session: result.createdSessionId });
        router.push("/dashboard");
      } else if (result.status === "missing_requirements") {
        // Email verification might be required
        // Check if email verification is needed
        if (result.unverifiedFields?.includes("email_address")) {
          // Prepare email verification
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          // You'll need to show a verification code input in your UI
          throw new Error("EMAIL_VERIFICATION_REQUIRED");
        }
        throw new Error(`Registration incomplete: ${result.status}`);
      } else {
        throw new Error(`Registration incomplete: ${result.status}`);
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "Registration failed");
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOAuth = async (
    provider: 'google' | 'facebook',
    payload: {
      token: string;
      accountType?: User['accountType'];
      name?: string;
    },
  ) => {
    // If already signed in, just redirect to dashboard
    if (isSignedIn) {
      router.push("/dashboard");
      return;
    }

    if (!signIn) {
      throw new Error("Clerk not initialized");
    }

    setIsLoading(true);
    try {
      // Clear any stale organization data before login to prevent 403 errors
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      // Map provider to Clerk's OAuth strategy
      const strategy = provider === 'google' ? 'oauth_google' : 'oauth_facebook';

      // Initiate OAuth flow with Clerk
      // This will redirect to the provider's OAuth page
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (error: any) {
      console.error("OAuth login failed:", error);
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "OAuth login failed");
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (response: { token: string; user: any }) => {
    setIsLoading(true);
    try {
      // Clear any stale organization data
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      await applyAuthResponse(response);
    } catch (error) {
      console.error("Onboarding completion failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Sign out from Clerk
      await signOut();
    } catch (error) {
      console.error("Clerk signout error:", error);
    }

    // Clear local authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("organizationId");
    setToken(null);
    setUser(null);
    setMemberships([]);
    setActiveOrganizationId(null);
    // Use window.location for a full page reload to ensure complete logout
    window.location.href = "/";
  };

  const switchOrganization = (orgId: string | null) => {
    // Validate that orgId is accessible (user is a member)
    if (orgId) {
      const isValidOrg = memberships.some((m) => m.orgId === orgId);
      if (!isValidOrg) {
        // Invalid org - fall back to personal org or first available
        console.warn(`Attempted to switch to invalid org ${orgId}, recovering...`);
        const fallbackOrgId = user?.personalOrgId || memberships[0]?.orgId || null;
        if (fallbackOrgId) {
          setActiveOrganizationId(fallbackOrgId);
          api.organizations.setActiveOrganization(fallbackOrgId);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("organizationChanged", { detail: { orgId: fallbackOrgId } })
            );
          }
        }
        return;
      }
    }

    setActiveOrganizationId(orgId);
    api.organizations.setActiveOrganization(orgId);
    // Notify listeners (job context, etc.) that org changed
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("organizationChanged", { detail: { orgId } })
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeOrganizationId,
        token,
        isLoading,
        login,
        register,
        loginWithOAuth,
        completeOnboarding,
        logout,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
