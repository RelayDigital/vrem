"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
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
  logout: () => void;
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

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const user = await api.auth.me();
          setUser(normalizeUser(user));
          const orgs = await api.organizations.listMine();
          setMemberships(orgs);
          const storedOrg = api.organizations.getActiveOrganization();
          // Validate stored org is in user's memberships
          const isValidStoredOrg = storedOrg && orgs.some((m) => m.orgId === storedOrg);

          // If stored org is invalid, clear it immediately
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
          }
          setActiveOrganizationId(resolvedOrgId);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          // Clear all auth data on error
          localStorage.removeItem("token");
          localStorage.removeItem("organizationId");
          setToken(null);
          setMemberships([]);
          setActiveOrganizationId(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

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
    setUser(normalizeUser(response.user));
    const orgs = await api.organizations.listMine();
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
    }
    setActiveOrganizationId(resolvedOrgId);
    router.push("/dashboard");
  };

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      // Clear any stale organization data before login to prevent 403 errors
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      const response = await api.auth.login(credentials);
      await applyAuthResponse(response);
    } catch (error) {
      console.error("Login failed:", error);
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
    setIsLoading(true);
    try {
      // Clear any stale organization data before registration
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      const response = await api.auth.register(data);
      await applyAuthResponse(response);
    } catch (error) {
      console.error("Registration failed:", error);
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
    setIsLoading(true);
    try {
      // Clear any stale organization data before login to prevent 403 errors
      localStorage.removeItem("organizationId");
      setActiveOrganizationId(null);

      const response = await api.auth.oauthLogin(provider, {
        accountType: payload.accountType || "AGENT",
        token: payload.token,
        name: payload.name,
      });

      await applyAuthResponse(response);
    } catch (error) {
      console.error("OAuth login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear authentication data
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
