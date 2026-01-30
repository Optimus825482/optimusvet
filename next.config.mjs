/** @type {import('next').NextConfig} */
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  cacheOnFrontEndNavigation: true,
  swSrc: "/public/service-worker.js",
  swDest: "/.next/static/service-worker.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

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

export default withSerwist(nextConfig);
