"use client";

import { useAuth } from "@/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { GoogleAdBanner } from "@/components/shared/google-ad";
import { SupportBanner } from "@/components/shared/support-banner";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [bannerToolName, setBannerToolName] = useState("Tulz");

  // Global listener: show support banner once per session after any download
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest("button");
      if (
        button &&
        button.textContent?.toLowerCase().includes("download") &&
        !sessionStorage.getItem("support_shown")
      ) {
        // Extract tool slug from URL, e.g. /tools/pdf-merge → "pdf-merge"
        const slug = window.location.pathname.split("/").filter(Boolean).pop() || "Tulz";
        setBannerToolName(slug);
        setShowSupport(true);
        sessionStorage.setItem("support_shown", "true");
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-4 sm:py-8 flex flex-col min-h-[calc(100vh-60px)]">
          {/* Header Ad - Desktop only */}
          <div className="hidden sm:block">
            <GoogleAdBanner className="mb-6" />
          </div>

          {/* Header Ad - Mobile only, compact 50px banner */}
          <div className="sm:hidden mb-1 max-h-[50px] overflow-hidden">
            <GoogleAdBanner bare />
          </div>

          <div className="flex-1">
            {children}
          </div>
        </div>
      </main>

      {/* Support Banner — centered modal overlay after download */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <SupportBanner toolName={bannerToolName} onDismiss={() => setShowSupport(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

