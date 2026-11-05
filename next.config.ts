import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: false },
      { source: "/sign-up", destination: "/auth/sign-up", permanent: false },
    ];
  },
};

export default nextConfig;
