import type { NextConfig } from "next";

// Backend URL for API rewrites (only used in development)
// In production, nginx handles the /api/v1 proxy
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    domains: ["lh3.googleusercontent.com"], // For Google OAuth avatars
  },
  async rewrites() {
    // Only apply rewrites in development
    // In production, nginx proxies /api/v1/* to the backend
    if (process.env.NODE_ENV === "production") {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
