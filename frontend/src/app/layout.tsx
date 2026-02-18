import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/providers";
import { PageTracker } from "@/components/shared/page-tracker";

// Body font - similar to Flutterwave's Moderat
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Heading font - similar to Flutterwave's Millik
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Keep monospace font for code
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tulz.tools"),
  title: {
    default: "Tulz - Free Online Tools | QR Codes, PDF, JSON, Images & More",
    template: "%s | Tulz",
  },
  description:
    "Free online productivity tools. Generate QR codes, edit images, merge PDFs, fill & sign PDFs, format JSON, compare text, convert Markdown to PDF, create invoices, build CVs & more. No signup required.",
  keywords: [
    // Core brand
    "Tulz",
    "free online tools",
    "productivity tools",
    "online utilities",
    // QR Code
    "QR code generator",
    "QR code maker",
    "custom QR code",
    // Image
    "image editor online",
    "background remover",
    "image converter",
    // PDF
    "PDF merger",
    "PDF splitter",
    "PDF compressor",
    "PDF filler",
    "fill PDF online",
    "sign PDF online",
    "PDF annotation",
    "website to PDF",
    "Markdown to PDF",
    // Data & Text
    "JSON formatter",
    "JSON validator",
    "text diff tool",
    "text compare",
    // Conversion
    "Excel to CSV converter",
    "favicon generator",
    // Calculator
    "scientific calculator",
    "unit converter",
    "loan calculator",
    // Business
    "invoice generator",
    "free invoice maker",
    "CV builder",
    "resume builder",
    "markdown resume",
    // Testing
    "credit card generator",
    "test card numbers",
  ],
  authors: [{ name: "Tulz", url: "https://tulz.tools" }],
  creator: "Tulz",
  publisher: "Tulz",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://tulz.tools",
  },
  openGraph: {
    title: "Tulz - Free Online Productivity Tools",
    description:
      "Generate QR codes, edit images, merge & fill PDFs, format JSON, compare text, create invoices, build CVs & more. All free, no signup required.",
    type: "website",
    url: "https://tulz.tools",
    siteName: "Tulz",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tulz - Free Online Productivity Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tulz - Free Online Productivity Tools",
    description:
      "Generate QR codes, edit images, merge & fill PDFs, format JSON, compare text, create invoices, build CVs & more. All free, no signup required.",
    images: ["/og-image.png"],
    creator: "@tulztools",
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag (gtag.js) */}
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-YWY3BXLE4S"}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-YWY3BXLE4S"}');
          `}
        </Script>
        {/* Google AdSense Verification */}
        <meta name="google-adsense-account" content="ca-pub-2431099880635106" />
        {/* Google AdSense Script */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-2431099880635106"}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} antialiased`}>
        <Providers><PageTracker />{children}</Providers>
      </body>
    </html>
  );
}
