"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreeBadgeProps {
    className?: string;
    children?: React.ReactNode;
}

export function FreeBadge({ className, children = "Free Tool" }: FreeBadgeProps) {
    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200",
            "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
            "hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm hover:shadow",
            className
        )}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase">{children}</span>
        </div>
    );
}
