"use client";

import Link from "next/link";
import Image from "next/image";
import { SupportLink } from "@/components/shared/support-button";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity duration-200">
              <Image src="/logo.png" alt="Tulz" width={28} height={28} className="rounded-lg shadow-sm" />
              <span className="font-bold text-xl text-slate-900 dark:text-white">Tulz</span>
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              Simple, powerful online tools that help you get things done faster.
              No bloat, no complexity - just the features you need, when you need them.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Tools</h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/dashboard/tools/qrcode" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  QR Code Generator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/image" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Image Editor
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/pdf" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  PDF Tools
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/pdf-filler" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  PDF Filler
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/webpdf" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Website to PDF
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/invoice" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Invoice Generator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/cv" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  CV Builder
                </Link>
              </li>
            </ul>
          </div>

          {/* Free Tools */}
          <div>
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Free Tools</h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/dashboard/tools/calculator" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Calculator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/json" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  JSON Formatter
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/diff" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Text Diff
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/markdown" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Markdown to PDF
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/excel" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Excel to CSV
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/favicon" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Favicon Generator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tools/credit-card" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Card Generator
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Company</h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/support" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 font-medium flex items-center gap-1">
                  ❤️ Support Us
                </Link>
              </li>
              <li>
                <Link href="/dashboard/feedback" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Feedback
                </Link>
              </li>
              <li>
                <Link href="/guides" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Guides & Tutorials
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} Tulz. All rights reserved.</p>
          <SupportLink className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200" />
        </div>
      </div>
    </footer>
  );
}
