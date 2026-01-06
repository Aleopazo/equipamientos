import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.railway.app",
        pathname: "/preserved-case-7pxx-i5thk/**",
      },
    ],
  },
};

export default nextConfig;
