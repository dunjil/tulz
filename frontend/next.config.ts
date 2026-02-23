import type { NextConfig } from "next";

// Backend URL for API rewrites (only used in development)
// In production, nginx handles the /api/v1 proxy
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // For Google OAuth avatars
      },
    ],
  },
  async redirects() {
    // Redirect old /dashboard/tools/* URLs to clean /tools/* (301 permanent for SEO)
    return [
      {
        source: "/dashboard/tools/:path*",
        destination: "/tools/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const rewrites = [
      // Serve /tools/* from /dashboard/tools/* internally (no file movement needed)
      {
        source: "/tools/:path*",
        destination: "/dashboard/tools/:path*",
      },
    ];

    // In development also proxy API calls to the backend
    if (process.env.NODE_ENV !== "production") {
      rewrites.push({
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
