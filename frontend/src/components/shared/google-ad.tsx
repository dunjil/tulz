"use client";


import { useEffect, useRef } from "react";

interface GoogleAdProps {
  slot?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  responsive?: boolean;
  className?: string;
}

export function GoogleAd({
  slot = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT || "1234567890",
  format = "auto",
  responsive = true,
  className = "",
}: GoogleAdProps) {
  // const { user } = useAuth(); // Auth not needed for ads anymore
  // const isPro = false; // user?.subscription_tier === "pro"; 
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXX";
  const adLoaded = useRef(false);

  useEffect(() => {
    // Only load ads if AdSense is configured
    // Prevent duplicate initialization
    if (adsenseClientId !== "ca-pub-XXXXXXXXXX" && !adLoaded.current) {
      try {
        adLoaded.current = true;
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        // Ignore duplicate ad errors in development
        if (process.env.NODE_ENV === "development") {
          // Silent in dev mode - this is expected due to hot reloading
        } else {
          console.error("AdSense error:", err);
        }
      }
    }
  }, [adsenseClientId]);

  // Don't show ads if AdSense is not configured (development mode)

  // Don't show ads if AdSense is not configured (development mode)
  if (adsenseClientId === "ca-pub-XXXXXXXXXX") {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 sm:p-4">
          <div className="text-xs text-yellow-700 dark:text-yellow-400 text-center">
            ⚠️ Configure Google AdSense in .env.local to show ads
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 sm:p-4">
        <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center mb-1 hidden sm:block">
          Advertisement
        </div>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={adsenseClientId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        ></ins>
      </div>
    </div>
  );
}

export function GoogleAdBanner({ className = "" }: { className?: string }) {
  return (
    <GoogleAd
      slot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT || "1234567890"}
      format="horizontal"
      responsive={true}
      className={className}
    />
  );
}
