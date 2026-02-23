"use client";

import { Heart } from "lucide-react";
import { KofiIcon } from "@/components/shared/icons/kofi-icon";
import { cn } from "@/lib/utils";
import { ShareButton } from "./share-button";

interface SupportButtonProps {
  className?: string;
  size?: "sm" | "md";
  showShare?: boolean;
}

const KOFI_URL = process.env.NEXT_PUBLIC_KOFI_URL || "https://ko-fi.com/tulzhub";

export function SupportButton({ className, size = "md", showShare = true }: SupportButtonProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showShare && <ShareButton size={size === "md" ? "default" : "sm"} />}
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group relative inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200",
          "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
          "text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
          "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
        )}
      >
        <KofiIcon className={cn(
          "text-[#FF5E5B] transition-transform duration-300 group-hover:scale-110",
          size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
        )} />
        <span>Support on Ko-fi</span>
      </a>
    </div>
  );
}

// Text link version for footer
export function SupportLink({ className }: { className?: string }) {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 transition-colors hover:text-[#FF5E5B] text-zinc-500 dark:text-zinc-400 text-sm",
        className
      )}
    >
      <KofiIcon className="w-4 h-4 text-[#FF5E5B]/80 transition-transform group-hover:scale-110" />
      <span className="font-medium">
        Support on Ko-fi
      </span>
    </a>
  );
}
