"use client";

import { Heart, Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Heart Animation */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full">
            <Heart className="w-12 h-12 text-white fill-current" />
          </div>
        </div>

        {/* Thank You Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground text-lg">
            Your support means the world to us. You're helping keep Tulz free and continuously improving.
          </p>
        </div>

        {/* What Your Support Does */}
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
          <p className="font-medium text-sm">Your donation helps us:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              Keep all tools free for everyone
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              Add new features and tools
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              Cover server and development costs
            </li>
          </ul>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              Continue to Tools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Share Message */}
        <p className="text-xs text-muted-foreground">
          Love Tulz? Share it with your friends and help us grow!
        </p>
      </div>
    </div>
  );
}
