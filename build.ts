import { build } from "bun";
import { copyFile, mkdir, cp } from "fs/promises";
import { join } from "path";

async function buildFrontend() {
  console.log("Building frontend...");

  // Clean and create dist directory
  try {
    await mkdir("dist", { recursive: true });
  } catch (error) {
    console.log("Dist directory already exists");
  }

  // Build the main React app
  const buildResult = await build({
    entrypoints: ["src/main.tsx"],
    outdir: "dist/src",
    target: "browser",
    format: "esm",
    minify: true,
    splitting: false,
    sourcemap: false,
  });

  if (!buildResult.success) {
    console.error("Build failed:", buildResult.logs);
    process.exit(1);
  }

  // Copy static files
  try {
    // Copy public directory
    await mkdir("dist/public", { recursive: true });
    await copyFile("public/index.html", "dist/public/index.html");
    
    // Copy CSS files
    await mkdir("dist/styles", { recursive: true });
    await copyFile("styles/globals.css", "dist/styles/globals.css");
    
    // Copy src/index.css to dist/src
    await copyFile("src/index.css", "dist/src/index.css");
    
    // Copy API file
    await mkdir("dist/api", { recursive: true });
    await copyFile("api/index.js", "dist/api/index.js");
    
    console.log("Static files copied successfully");
  } catch (error) {
    console.error("Error copying static files:", error);
  }

  console.log("Frontend build complete!");
}

buildFrontend().catch(console.error);
