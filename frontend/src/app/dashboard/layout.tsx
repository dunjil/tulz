"use client";

import { useAuth } from "@/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { GoogleAdBanner } from "@/components/shared/google-ad";
import { SupportBanner } from "@/components/shared/support-banner";
import { useEffect, useRef, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [bannerToolName, setBannerToolName] = useState("Tulz");

  // Use a ref instead of sessionStorage so it resets on page refresh / tab reopen.
  // This means the share modal shows once after the first download per page load,
  // but doesn't persist annoyingly across refreshes.
  const hasShownRef = useRef(false);

  // Global listener: show support/share banner after any download (once per page load)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest("button, a");
      if (
        clickable &&
        clickable.textContent?.toLowerCase().match(/(download|save|export|get pdf|get file)/) &&
        !hasShownRef.current
      ) {
        // Extract tool slug from URL, e.g. /tools/pdf-merge → "pdf-merge"
        const slug = window.location.pathname.split("/").filter(Boolean).pop() || "Tulz";
        setBannerToolName(slug);
        // Small delay so the download starts first
        setTimeout(() => {
          setShowSupport(true);
          hasShownRef.current = true;
        }, 1500);
      }
    };

    const handleCustomDownload = () => {
      if (!hasShownRef.current) {
        const slug = window.location.pathname.split("/").filter(Boolean).pop() || "Tulz";
        setBannerToolName(slug);
        setTimeout(() => {
          setShowSupport(true);
          hasShownRef.current = true;
        }, 1500);
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("tool-download", handleCustomDownload as EventListener);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("tool-download", handleCustomDownload as EventListener);
    };
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSupport(false)}
        >
          <div
            className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <SupportBanner toolName={bannerToolName} onDismiss={() => setShowSupport(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

