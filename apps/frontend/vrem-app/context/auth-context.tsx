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
  register: (data: any) => Promise<void>;
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
    const accountType =
      (u.accountType || "").toUpperCase() === "DISPATCHER"
        ? "COMPANY"
        : (u.accountType || "").toUpperCase() === "TECHNICIAN"
        ? "PROVIDER"
        : u.accountType;
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
          const personal = orgs.find(
            (m) =>
              m.organization?.type === "PERSONAL" ||
              (m.organization as any)?.type === "PERSONAL"
          );
          const resolvedOrgId =
            storedOrg ||
            user.organizationId ||
            personal?.orgId ||
            orgs[0]?.orgId ||
            null;
          if (resolvedOrgId) {
            api.organizations.setActiveOrganization(resolvedOrgId);
          }
          setActiveOrganizationId(resolvedOrgId);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          localStorage.removeItem("token");
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

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await api.auth.login(credentials);
      localStorage.setItem("token", response.token);
      setToken(response.token);
      setUser(normalizeUser(response.user));
      const orgs = await api.organizations.listMine();
      setMemberships(orgs);
      const personal = orgs.find(
        (m) =>
          m.organization?.type === "PERSONAL" ||
          (m.organization as any)?.type === "PERSONAL"
      );
      const resolvedOrgId =
        api.organizations.getActiveOrganization() ||
        response.user.organizationMemberships?.[0]?.orgId ||
        personal?.orgId ||
        orgs[0]?.orgId ||
        null;
      if (resolvedOrgId) {
        api.organizations.setActiveOrganization(resolvedOrgId);
      }
      setActiveOrganizationId(resolvedOrgId);

      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await api.auth.register(data);
      localStorage.setItem("token", response.token);
      setToken(response.token);
      setUser(normalizeUser(response.user));
      const orgs = await api.organizations.listMine();
      setMemberships(orgs);
      const personal = orgs.find(
        (m) =>
          m.organization?.type === "PERSONAL" ||
          (m.organization as any)?.type === "PERSONAL"
      );
      const resolvedOrgId =
        api.organizations.getActiveOrganization() ||
        response.user.organizationMemberships?.[0]?.orgId ||
        personal?.orgId ||
        orgs[0]?.orgId ||
        null;
      if (resolvedOrgId) {
        api.organizations.setActiveOrganization(resolvedOrgId);
      }
      setActiveOrganizationId(resolvedOrgId);
      router.push("/");
    } catch (error) {
      console.error("Registration failed:", error);
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
