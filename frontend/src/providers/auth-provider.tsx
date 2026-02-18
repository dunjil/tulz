"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_superuser: boolean;
  subscription_tier: string;
  daily_uses_remaining: number;
  oauth_provider?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // SECURITY: Secure cookie options for token storage
  const getCookieOptions = useCallback(() => ({
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
    sameSite: "lax" as const,
  }), []);

  const fetchUser = useCallback(async () => {
    const token = Cookies.get("access_token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get("/users/me");
      setUser(response.data);
      return response.data;
    } catch (error) {
      // Token invalid, try refresh
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const refreshResponse = await api.post("/auth/refresh", {
            refresh_token: refreshToken,
          });
          const cookieOptions = getCookieOptions();
          Cookies.set("access_token", refreshResponse.data.access_token, {
            ...cookieOptions,
            expires: 1 / 48, // 30 minutes
          });
          Cookies.set("refresh_token", refreshResponse.data.refresh_token, {
            ...cookieOptions,
            expires: 7,
          });
          const userResponse = await api.get("/users/me");
          setUser(userResponse.data);
          return userResponse.data;
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          setUser(null);
        }
      } else {
        Cookies.remove("access_token");
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [getCookieOptions]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token } = response.data;

    // SECURITY: Set secure cookie options
    const cookieOptions = {
      secure: window.location.protocol === "https:",
      sameSite: "lax" as const,
    };

    Cookies.set("access_token", access_token, { ...cookieOptions, expires: 1 / 48 });
    Cookies.set("refresh_token", refresh_token, { ...cookieOptions, expires: 7 });

    // Clear cached queries to get fresh data for the new user
    queryClient.clear();
    const user = await fetchUser();

    if (user?.is_superuser) {
      router.push("/dashboard/admin");
    } else {
      router.push("/");
    }
  };

  const register = async (
    email: string,
    fullName: string,
    password: string
  ) => {
    await api.post("/auth/register", {
      email,
      full_name: fullName,
      password,
    });
  };

  const logout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    setUser(null);
    // Clear all cached queries to prevent stale data for next user
    queryClient.clear();
    router.push("/");
  };

  const refreshUser = async () => {
    // Invalidate cached queries to fetch fresh data
    queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
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
