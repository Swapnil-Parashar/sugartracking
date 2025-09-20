import { build } from "bun";
import { copyFile, mkdir } from "fs/promises";
import { join } from "path";

async function buildFrontend() {
  console.log("Building frontend...");

  // Build the main React app
  await build({
    entrypoints: ["src/main.tsx"],
    outdir: "dist",
    target: "browser",
    format: "esm",
    minify: true,
    splitting: false,
  });

  // Build individual components for better caching
  await build({
    entrypoints: [
      "src/App.tsx",
      "src/components/Login.tsx",
      "src/components/Dashboard.tsx",
      "src/components/LoadingScreen.tsx",
      "src/components/ErrorBoundary.tsx",
    ],
    outdir: "dist/components",
    target: "browser",
    format: "esm",
    minify: true,
    splitting: false,
  });

  // Copy static files
  try {
    await mkdir("dist/public", { recursive: true });
    await copyFile("public/index.html", "dist/public/index.html");
  } catch (error) {
    console.log("Static files already exist or error copying:", error);
  }

  console.log("Frontend build complete!");
}

buildFrontend().catch(console.error);
