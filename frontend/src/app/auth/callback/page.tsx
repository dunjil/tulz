"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // New secure flow: exchange one-time code for tokens
      const code = searchParams.get("code");

      if (code) {
        try {
          // Exchange the one-time code for actual tokens via secure API call
          const response = await api.post("/auth/oauth/exchange", null, {
            params: { code },
          });

          const { access_token, refresh_token } = response.data;

          // Store tokens securely
          Cookies.set("access_token", access_token, {
            expires: 1 / 48, // 30 min
            secure: window.location.protocol === "https:",
            sameSite: "lax",
          });
          Cookies.set("refresh_token", refresh_token, {
            expires: 7,
            secure: window.location.protocol === "https:",
            sameSite: "lax",
          });

          // Clear cached queries to get fresh data for the new user
          queryClient.clear();

          // Refresh user data and redirect
          await refreshUser();
          router.push("/dashboard");
        } catch (err: any) {
          console.error("OAuth exchange failed:", err);
          setError(err?.response?.data?.message || "Authentication failed");
          setTimeout(() => router.push("/login?error=auth_failed"), 2000);
        }
        return;
      }

      // Legacy fallback: direct tokens in URL (deprecated, will be removed)
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const isNewUser = searchParams.get("is_new_user");

      if (accessToken && refreshToken) {
        // Store tokens
        Cookies.set("access_token", accessToken, {
          expires: 1 / 48,
          secure: window.location.protocol === "https:",
          sameSite: "lax",
        });
        Cookies.set("refresh_token", refreshToken, {
          expires: 7,
          secure: window.location.protocol === "https:",
          sameSite: "lax",
        });

        queryClient.clear();

        refreshUser().then(() => {
          if (isNewUser === "true") {
            router.push("/dashboard?welcome=true");
          } else {
            router.push("/dashboard");
          }
        });
      } else {
        // No tokens or code, redirect to login
        router.push("/login?error=auth_failed");
      }
    };

    handleCallback();
  }, [searchParams, router, queryClient, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
