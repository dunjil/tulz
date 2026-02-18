"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./auth-provider";
import { LoginModalProvider } from "@/components/shared/login-modal";
import { ProgressModalProvider } from "@/components/shared/progress-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <LoginModalProvider>
            <ProgressModalProvider>
              {children}
            </ProgressModalProvider>
          </LoginModalProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
                padding: "16px 24px",
                fontSize: "15px",
                fontWeight: 500,
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                borderRadius: "12px",
                maxWidth: "500px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#ffffff",
                },
                style: {
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #10b981",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#ffffff",
                },
                style: {
                  background: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #ef4444",
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
