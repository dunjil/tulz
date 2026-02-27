"use client";

import { useEffect } from "react";
import "./globals.css"; // Ensure global styles are loaded for this root error boundary
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
          <div className="text-center max-w-lg">
            {/* Animated Icon */}
            <div className="relative mx-auto mb-8">
              <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Bug className="h-4 w-4 text-orange-500" />
              </div>
            </div>

            {/* Content */}
            <h1 className="text-3xl font-bold mb-3 text-foreground tracking-tight">
              Fatal System Error
            </h1>
            <p className="text-muted-foreground mb-2 text-lg">
              We hit an unexpected critical bump in the road.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Don&apos;t worry, it&apos;s not you — it&apos;s us. Please try reloading the application.
            </p>

            {/* Error digest for debugging */}
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 mb-6 font-mono bg-muted/50 inline-block px-3 py-1 rounded">
                Error ID: {error.digest}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>

              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Home className="h-4 w-4" />
                Return Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
