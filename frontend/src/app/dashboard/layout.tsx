"use client";

import { useAuth } from "@/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { GoogleAdBanner } from "@/components/shared/google-ad";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-[60px]">
        <div className="container mx-auto px-4 py-8">
          {/* Google Ad Banner for non-Pro users */}
          <GoogleAdBanner className="mb-6" />

          {children}
        </div>
      </main>
    </div>
  );
}
