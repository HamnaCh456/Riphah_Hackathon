import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  experimental: {
    // How long the browser reuses a page before asking the server again, in seconds.
    // components/keep-fresh.tsx reloads quietly after 30 seconds, so data doesn't stay old this long.
    staleTimes: { dynamic: 300, static: 300 },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: false },
      { source: "/sign-up", destination: "/auth/sign-up", permanent: false },
    ];
  },
};

export default nextConfig;
