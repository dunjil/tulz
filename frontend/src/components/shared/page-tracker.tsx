"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

/**
 * Fires a POST /visits/track on every route change.
 * Rendered once in the root layout — invisible to the user.
 */
export function PageTracker() {
    const pathname = usePathname();
    const lastTracked = useRef<string | null>(null);

    useEffect(() => {
        // Avoid double-tracking the same path (React strict mode / fast refresh)
        if (lastTracked.current === pathname) return;
        lastTracked.current = pathname;

        api
            .post("/visits/track", {
                path: pathname,
                referrer: document.referrer || null,
            })
            .catch(() => {
                // Silently ignore — tracking should never break the app
            });
    }, [pathname]);

    return null;
}
