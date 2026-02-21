"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { UsageBadge } from "@/components/shared/usage-badge";
import { Moon, Sun, Menu, Heart, HelpCircle, BookOpen } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full h-[60px] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="h-full max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex h-full items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Tulz" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-xl text-slate-900 dark:text-white">Tulz</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              All Tools
            </Link>
            <Link
              href="/#faqs"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="h-4 w-4" />
              FAQs
            </Link>
            <Link
              href="/guides"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="h-4 w-4" />
              Guides
            </Link>
            <Link
              href="/support"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Heart className="h-4 w-4" />
              Support Us
            </Link>
          </nav>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle - Desktop only */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {/* Auth buttons / User menu */}
            {isAuthenticated ? (
              <>
                <UsageBadge className="hidden lg:flex" />
                <Link href="/dashboard/settings" className="hidden lg:block">
                  <button className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Settings
                  </button>
                </Link>
                <button
                  onClick={logout}
                  className="hidden lg:block px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Log out
                </button>
              </>
            ) : null}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-[60px] left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-lg">
            <nav className="flex flex-col py-2">
              <Link
                href="/"
                className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                All Tools
              </Link>
              <Link
                href="/#faqs"
                className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <HelpCircle className="h-4 w-4" />
                FAQs
              </Link>
              <Link
                href="/guides"
                className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="h-4 w-4" />
                Guides
              </Link>
              <Link
                href="/support"
                className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Heart className="h-4 w-4" />
                Support Us
              </Link>

              <div className="border-t border-slate-200 dark:border-slate-800 my-2"></div>

              {/* Theme toggle */}
              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
                className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard/settings"
                    className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="mx-4 my-2 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
