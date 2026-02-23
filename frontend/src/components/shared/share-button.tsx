"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportBanner } from "@/components/shared/support-banner";
import { useState } from "react";
import { usePathname } from "next/navigation";

interface ShareButtonProps {
    className?: string;
    size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({ className, size = "md" as any }: ShareButtonProps) {
    const [showBanner, setShowBanner] = useState(false);
    const pathname = usePathname();

    // Default to "Tulz", or extract the tool slug from the URL e.g. /dashboard/tools/pdf-merge -> pdf-merge
    let toolName = "Tulz";
    if (pathname && pathname.includes("/tools/")) {
        toolName = pathname.split("/").filter(Boolean).pop() || "Tulz";
    }

    return (
        <>
            <Button
                size={size}
                variant="outline"
                className={`gap-1.5 border-pink-200 hover:bg-pink-50 dark:border-pink-900 dark:hover:bg-pink-950/30 text-pink-600 dark:text-pink-400 ${className}`}
                onClick={() => setShowBanner(true)}
            >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share Tool</span>
                <span className="sm:hidden">Share</span>
            </Button>

            {showBanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <SupportBanner toolName={toolName} onDismiss={() => setShowBanner(false)} />
                    </div>
                </div>
            )}
        </>
    );
}
