import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` would otherwise write (and keep re-adding) a rules block in
  // AGENTS.md. Project rules are maintained by hand.
  agentRules: false,
};

export default nextConfig;
