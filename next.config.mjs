/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ["lucide-react"],
  },
  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {},
};

export default nextConfig;
