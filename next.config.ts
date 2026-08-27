import type { NextConfig } from "next";

// Set by the GitHub Pages workflow to "/<repo-name>" — this is a project page, not a
// user/org root page, so every asset URL needs that prefix. Empty locally, where the
// app is served from the domain root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  // GitHub Pages has no server to rewrite "/foo" to "/foo/index.html" — trailingSlash
  // makes the export itself produce foo/index.html, matching how GitHub Pages resolves paths.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
