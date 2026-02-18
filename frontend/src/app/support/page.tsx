"use client";

import { Heart, Zap, Globe, Users } from "lucide-react";
import { KofiIcon } from "@/components/shared/icons/kofi-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SupportPage() {
  const handleFlutterwaveDonation = () => {
    // This will be replaced with your actual Flutterwave payment link
    // Get this from: https://dashboard.flutterwave.com/donate
    const flutterwaveLink = process.env.NEXT_PUBLIC_FLUTTERWAVE_DONATION_LINK || "YOUR_FLUTTERWAVE_DONATION_LINK_HERE";

    // For now, alert user to add their link
    if (flutterwaveLink === "YOUR_FLUTTERWAVE_DONATION_LINK_HERE") {
      alert("Please add your Flutterwave donation link in .env.local");
      return;
    }

    window.open(flutterwaveLink, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
            <Heart className="h-8 w-8 text-red-600 dark:text-red-400" fill="currentColor" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Support Tulz
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            Help us keep all tools <span className="font-semibold text-green-600 dark:text-green-400">free forever</span>!
            Your support helps us maintain servers, add new features, and keep everything running smoothly.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-sm text-blue-700 dark:text-blue-300">
            <Zap className="h-4 w-4" />
            <span>100% of donations go towards development & hosting</span>
          </div>
        </div>

        {/* Donation Card */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card className="border-2">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Make a Donation</CardTitle>
              <CardDescription>
                Every contribution, big or small, helps us improve Tulz for everyone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ko-fi Donation Button */}
              <div className="text-center">
                <a
                  href={process.env.NEXT_PUBLIC_KOFI_URL || "https://ko-fi.com/tulzhub"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full max-w-md mx-auto px-8 py-4 bg-[#FF5E5B] hover:bg-[#ff4f4c] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-lg group"
                >
                  <KofiIcon className="h-6 w-6 group-hover:animate-swing" />
                  Support on Ko-fi
                </a>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                  Quick, secure, and no sign-up required
                </p>
              </div>




            </CardContent>
          </Card>
        </div>

        {/* Why Support Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-8">
            Why Your Support Matters
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">Server Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Hosting and bandwidth costs to keep all tools running fast and reliably 24/7
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
                  <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg">New Features</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Development time for adding new tools and improving existing ones based on your feedback
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg">Free for Everyone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Keep all tools accessible to everyone worldwide, regardless of their ability to pay
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="p-8 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl border border-red-200 dark:border-red-900">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Thank You! ❤️
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              Your support means the world to us and helps us continue building great free tools for everyone.
              Whether you donate or just use our tools, we're grateful to have you as part of our community!
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Back to Tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
