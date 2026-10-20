import type { NextConfig } from "next";

export { nextConfig as default };

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["@libsql/client", "libsql"],
};
