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

            // Clear potentially stale org ID before syncing to avoid 403 errors
            // This can happen when viewing cross-org pages like delivery
            const storedOrgBeforeSync = api.organizations.getActiveOrganization();

            // Sync user with backend (backend will validate Clerk token and return/create user)
            let user;
            try {
              user = await api.auth.me();
              setUser(normalizeUser(user));
            } catch (meError: any) {
              // If me() fails with 403, try clearing org and retrying
              if (meError?.message?.includes('403')) {
                localStorage.removeItem("organizationId");
                api.organizations.setActiveOrganization(null as any);
                user = await api.auth.me();
                setUser(normalizeUser(user));
              } else {
                throw meError;
              }
            }

            // Agents don't have org memberships - skip listMine for them
            const isAgent = user?.accountType?.toUpperCase() === 'AGENT';
            let orgs: any[] = [];
            if (!isAgent) {
              orgs = await api.organizations.listMine();
            }
            setMemberships(orgs);

            const storedOrg = api.organizations.getActiveOrganization();
            const isValidStoredOrg = storedOrg && orgs.some((m) => m.orgId === storedOrg);

            if (storedOrg && !isValidStoredOrg) {
              localStorage.removeItem("organizationId");
            }

            const personal = orgs.find(
              (m) =>
                m.organization?.type === "PERSONAL" ||
                (m.organization as any)?.type === "PERSONAL"
            );
            const resolvedOrgId =
              (isValidStoredOrg ? storedOrg : null) ||
              personal?.orgId ||
              orgs[0]?.orgId ||
              null;
            if (resolvedOrgId) {
              api.organizations.setActiveOrganization(resolvedOrgId);
            } else if (isAgent) {
              // Agents don't need org context - clear any stale org ID
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

    if (typeof window !== "undefined") {
      window.addEventListener("organizationUpdated", handleOrganizationUpdated);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "organizationUpdated",
          handleOrganizationUpdated
        );
      }
    };
  }, []);

  const applyAuthResponse = async (response: { token: string; user: any }) => {
    localStorage.setItem("token", response.token);
    setToken(response.token);
    const normalizedUser = normalizeUser(response.user);
    setUser(normalizedUser);

    // Agents don't have org memberships - skip listMine for them
    const isAgent = normalizedUser?.accountType?.toUpperCase() === 'AGENT';
    let orgs: any[] = [];
    if (!isAgent) {
      orgs = await api.organizations.listMine();
    }
    setMemberships(orgs);

    // Find the best organization to use (prefer personal org, then first available)
    const personal = orgs.find(
      (m) =>
        m.organization?.type === "PERSONAL" ||
        (m.organization as any)?.type === "PERSONAL"
    );
    const resolvedOrgId =
      personal?.orgId ||
      orgs[0]?.orgId ||
      null;
    if (resolvedOrgId) {
      api.organizations.setActiveOrganization(resolvedOrgId);
    } else if (isAgent) {
      // Agents don't need org context - clear any stale org ID
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
