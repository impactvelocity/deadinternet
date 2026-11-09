import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No Next.js badge over the film in development (errors still show).
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // The feed used to live at /flow while it was a lab; it is now the root.
  redirects() {
    return [{ source: "/flow", destination: "/", permanent: false }];
  },
  turbopack: {
    // A stray package-lock.json in the parent directory would otherwise make
    // Next guess the workspace root; pin it to this project.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
