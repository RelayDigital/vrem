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

interface SecondFactorState {
  required: boolean;
  supportedStrategies: string[];
  currentStrategy: string | null;
  emailHint?: string;
  phoneHint?: string;
}

interface AuthContextType {
  user: User | null;
  memberships: OrganizationMember[];
  activeOrganizationId: string | null;
  token: string | null;
  isLoading: boolean;
  secondFactor: SecondFactorState;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  attemptSecondFactor: (code: string, strategy?: string) => Promise<void>;
  resendSecondFactorCode: () => Promise<void>;
  cancelSecondFactor: () => void;
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
  const [secondFactor, setSecondFactor] = useState<SecondFactorState>({
    required: false,
    supportedStrategies: [],
    currentStrategy: null,
  });
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
      console.debug('[AuthContext] initAuth START | isClerkLoaded=%s isSignedIn=%s', isClerkLoaded, isSignedIn);

      // Wait for Clerk to finish loading before processing auth state
      if (!isClerkLoaded) {
        console.debug('[AuthContext] Waiting for Clerk to load...');
        return; // Keep isLoading: true until Clerk is ready
      }

      // If signed in with Clerk, get the token and sync with backend
      if (isSignedIn) {
        try {
          const clerkToken = await getToken();
          console.debug('[AuthContext] Clerk token obtained: %s', clerkToken ? `${clerkToken.substring(0, 20)}...` : 'NONE');
          if (clerkToken) {
            // Store Clerk token for API calls
            localStorage.setItem("token", clerkToken);
            setToken(clerkToken);

            // Use bootstrap endpoint - ensures user is fully provisioned (idempotent)
            // This guarantees: personal org exists, returns all accessible orgs
            let authData;
            let retryCount = 0;
            const maxRetries = 2;

            const storedOrgBefore = localStorage.getItem("organizationId");
            console.debug('[AuthContext] Before bootstrap | storedOrgId=%s', storedOrgBefore || 'NONE');

            while (retryCount <= maxRetries) {
              try {
                // Use bootstrap endpoint for reliable provisioning
                console.debug('[AuthContext] Calling /auth/me/bootstrap (attempt %d)', retryCount + 1);
                authData = await api.auth.bootstrap();
                console.debug('[AuthContext] Bootstrap SUCCESS | userId=%s personalOrgId=%s recommendedOrgId=%s memberships=%d',
                  authData.id, authData.personalOrgId, authData.recommendedActiveOrgId, authData.memberships?.length || 0);
                break;
              } catch (bootstrapError: any) {
                const is403 = bootstrapError?.message?.includes('403');
                const is404 = bootstrapError?.message?.includes('404');

                // If org-related error, clear stale org and retry
                if ((is403 || is404) && retryCount < maxRetries) {
                  console.warn(`[AuthContext] Bootstrap attempt ${retryCount + 1} failed with org error, clearing org and retrying...`);
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
            // 2. On first login (no stored org), default to personal org for predictability
            // 3. Otherwise use server's recommended org for returning users
            const storedOrg = api.organizations.getActiveOrganization();
            const isValidStoredOrg = storedOrg && orgs.some((m: any) => m.orgId === storedOrg);
            const isFirstLogin = !storedOrg;

            console.debug('[AuthContext] Org resolution | storedOrg=%s isValid=%s isFirstLogin=%s memberships=[%s]',
              storedOrg || 'NONE', isValidStoredOrg, isFirstLogin, orgs.map((m: any) => m.orgId).join(', '));

            if (storedOrg && !isValidStoredOrg) {
              // Stored org is no longer valid - clear it
              console.warn(`[AuthContext] Stored org ${storedOrg} is no longer valid, clearing...`);
              localStorage.removeItem("organizationId");
            }

            // Resolve org deterministically:
            // - Stored org (if still valid) - respect user's previous choice
            // - First login: personal org for predictable UX
            // - Invalid stored org: server recommendation or personal org fallback
            let resolvedOrgId: string | null;
            if (isValidStoredOrg) {
              resolvedOrgId = storedOrg;
            } else if (isFirstLogin && authData.personalOrgId) {
              // First login always defaults to personal org for predictability
              resolvedOrgId = authData.personalOrgId;
            } else {
              // Returning user with invalid stored org - use server recommendation
              resolvedOrgId = authData.recommendedActiveOrgId || authData.personalOrgId || null;
            }

            console.debug('[AuthContext] Resolved orgId=%s (storedValid=%s, isFirstLogin=%s, recommended=%s, personal=%s)',
              resolvedOrgId, isValidStoredOrg ? storedOrg : 'N/A', isFirstLogin, authData.recommendedActiveOrgId, authData.personalOrgId);

            if (resolvedOrgId) {
              api.organizations.setActiveOrganization(resolvedOrgId);
            } else {
              // This should never happen after bootstrap, but handle gracefully
              console.error('[AuthContext] No valid org after bootstrap - this should not happen');
              api.organizations.setActiveOrganization(null as any);
            }
            setActiveOrganizationId(resolvedOrgId);
            console.debug('[AuthContext] initAuth COMPLETE | activeOrgId=%s', resolvedOrgId);
          }
        } catch (error: any) {
          // Check if this is a network error (backend unreachable)
          const isNetworkError =
            error?.message?.includes('Network Error') ||
            error?.message?.includes('Failed to fetch') ||
            error?.message?.includes('ERR_CONNECTION_REFUSED') ||
            error?.name === 'TypeError';

          if (isNetworkError) {
            // Backend is unreachable - sign out completely and redirect to login
            console.warn("Backend unreachable, signing out...");
            localStorage.removeItem("token");
            localStorage.removeItem("organizationId");
            setToken(null);
            setUser(null);
            setMemberships([]);
            setActiveOrganizationId(null);
            try {
              await signOut();
            } catch {
              // Ignore signOut errors
            }
            window.location.href = "/sign-in";
            return;
          }

          // For other errors, just clear local state
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

    // For onboarding completion, default to personal org (first login scenario)
    // This is consistent with initAuth's first-login behavior
    const resolvedOrgId = authData.personalOrgId || authData.recommendedActiveOrgId || null;
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

      // Use backend sign-in token (ticket strategy) for:
      // - All accounts in development (bypasses Clerk's email verification)
      // - @example.com test accounts in production (bypasses 2FA since they can't receive codes)
      const isDevelopment = process.env.NODE_ENV !== "production";
      const isTestAccount = credentials.email.endsWith("@example.com");

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
          // Don't set isLoading(false) here - let the main useEffect handle it
          // after Clerk's isSignedIn updates and bootstrap completes.
          // This prevents the race condition where dashboard loads before auth state syncs.
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
        // Don't set isLoading(false) here - let the main useEffect handle it
        // after Clerk's isSignedIn updates and bootstrap completes.
        router.push("/dashboard");
      } else if (result.status === "needs_second_factor") {
        // Clerk is requiring a second factor (e.g., email code, TOTP)
        console.log("Sign-in requires second factor:", {
          status: result.status,
          supportedSecondFactors: result.supportedSecondFactors,
          firstFactorVerification: result.firstFactorVerification,
        });

        // Extract supported strategies and hints
        const factors = result.supportedSecondFactors || [];
        const strategies = factors.map((factor: any) => factor.strategy);

        // Find email and phone hints if available
        const emailFactor = factors.find((f: any) => f.strategy === "email_code");
        const phoneFactor = factors.find((f: any) => f.strategy === "phone_code");
        const emailHint = emailFactor?.safeIdentifier || emailFactor?.emailAddressId;
        const phoneHint = phoneFactor?.safeIdentifier || phoneFactor?.phoneNumberId;

        // Determine which strategy to use - prefer TOTP, then email, then phone
        let strategyToUse: string;
        if (strategies.includes("totp")) {
          strategyToUse = "totp";
        } else if (strategies.includes("email_code")) {
          strategyToUse = "email_code";
        } else if (strategies.includes("phone_code")) {
          strategyToUse = "phone_code";
        } else {
          strategyToUse = strategies[0] || "totp";
        }

        // For email_code and phone_code, we need to prepare (send the code)
        if (strategyToUse === "email_code" || strategyToUse === "phone_code") {
          console.log(`Preparing ${strategyToUse} second factor...`);
          await signIn.prepareSecondFactor({
            strategy: strategyToUse as "email_code" | "phone_code",
          });
          console.log(`${strategyToUse} verification code sent`);
        }

        // Set state to show 2FA input
        setSecondFactor({
          required: true,
          supportedStrategies: strategies,
          currentStrategy: strategyToUse,
          emailHint,
          phoneHint,
        });
        setIsLoading(false);
        return; // Don't throw - let the UI handle showing 2FA input
      } else if (result.status === "needs_first_factor") {
        console.log("Sign-in needs first factor:", result.supportedFirstFactors);
        throw new Error("Sign-in requires additional verification. Please try again.");
      } else {
        // Handle other statuses
        console.log("Sign-in requires additional steps:", result.status, result);
        throw new Error(`Sign-in incomplete: ${result.status}`);
      }
    } catch (error: any) {
      // Only set isLoading to false on error - successful login lets useEffect handle it
      setIsLoading(false);
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
    }
    // Note: No finally block - isLoading is handled by:
    // - catch block on error
    // - main useEffect after successful login + bootstrap
  };

  const attemptSecondFactor = async (code: string, strategy?: string) => {
    if (!signIn || !setActiveSignIn) {
      throw new Error("Clerk not initialized");
    }

    setIsLoading(true);
    try {
      // Use the provided strategy, current strategy from state, or determine from supported strategies
      const strategyToUse = strategy || secondFactor.currentStrategy ||
        (secondFactor.supportedStrategies.includes("totp") ? "totp" :
         secondFactor.supportedStrategies[0]) || "totp";

      console.log("Attempting second factor with strategy:", strategyToUse);

      const result = await signIn.attemptSecondFactor({
        strategy: strategyToUse as any,
        code,
      });

      if (result.status === "complete") {
        // Clear 2FA state
        setSecondFactor({ required: false, supportedStrategies: [], currentStrategy: null });
        // Set the active session
        await setActiveSignIn({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        throw new Error(`Second factor verification incomplete: ${result.status}`);
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error("Second factor verification failed:", error);
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "Verification failed");
      }
      throw error;
    }
  };

  const resendSecondFactorCode = async () => {
    if (!signIn) {
      throw new Error("Clerk not initialized");
    }

    const strategy = secondFactor.currentStrategy;
    if (strategy !== "email_code" && strategy !== "phone_code") {
      throw new Error("Resend is only available for email or phone verification");
    }

    setIsLoading(true);
    try {
      console.log(`Resending ${strategy} verification code...`);
      await signIn.prepareSecondFactor({
        strategy: strategy as "email_code" | "phone_code",
      });
      console.log(`${strategy} verification code resent`);
    } catch (error: any) {
      console.error("Failed to resend code:", error);
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "Failed to resend code");
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSecondFactor = () => {
    setSecondFactor({ required: false, supportedStrategies: [], currentStrategy: null });
    setIsLoading(false);
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
        // Don't set isLoading(false) here - let the main useEffect handle it
        // after Clerk's isSignedIn updates and bootstrap completes.
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
      // Only set isLoading to false on error - successful registration lets useEffect handle it
      setIsLoading(false);
      console.error("Registration failed:", error);
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "Registration failed");
      }
      throw error;
    }
    // Note: No finally block - isLoading is handled by:
    // - catch block on error
    // - main useEffect after successful registration + bootstrap
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
      // Note: This redirects away from the app, so isLoading state doesn't matter here
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (error: any) {
      // Only set isLoading to false on error
      setIsLoading(false);
      console.error("OAuth login failed:", error);
      if (error.errors) {
        throw new Error(error.errors[0]?.message || "OAuth login failed");
      }
      throw error;
    }
    // Note: No finally block - OAuth redirects away from the page
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
        secondFactor,
        login,
        attemptSecondFactor,
        resendSecondFactorCode,
        cancelSecondFactor,
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
