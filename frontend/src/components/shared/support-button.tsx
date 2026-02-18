"use client";

import { Heart } from "lucide-react";
import { KofiIcon } from "@/components/shared/icons/kofi-icon";
import { cn } from "@/lib/utils";

interface SupportButtonProps {
  className?: string;
  size?: "sm" | "md";
}

const KOFI_URL = process.env.NEXT_PUBLIC_KOFI_URL || "https://ko-fi.com/tulzhub";

export function SupportButton({ className, size = "md" }: SupportButtonProps) {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-300",
        "bg-[#FF5E5B] text-white hover:bg-[#ff4f4c]",
        "shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40",
        "hover:scale-105 active:scale-95",
        "overflow-hidden",
        size === "sm" ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-base",
        className
      )}
    >
      <KofiIcon className={cn(
        "relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:animate-swing",
        size === "sm" ? "w-4 h-4" : "w-5 h-5"
      )} />
      <span className="relative z-10">Support on Ko-fi</span>
    </a>
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
        "group inline-flex items-center gap-1.5 transition-all duration-300 hover:text-[#FF5E5B]",
        className
      )}
    >
      <KofiIcon className="w-4 h-4 text-[#FF5E5B] transition-transform duration-300 group-hover:scale-125 group-hover:animate-swing" />
      <span className="bg-gradient-to-r from-[#FF5E5B] to-[#FF5E5B] bg-clip-text text-transparent font-medium group-hover:text-[#FF5E5B]">
        Support on Ko-fi
      </span>
    </a>
  );
}
