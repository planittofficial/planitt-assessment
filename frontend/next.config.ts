import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    reactCompiler: true,
    webpackBuildWorker: false,
  },
  output: "standalone",
};

export default nextConfig;
