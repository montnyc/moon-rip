#!/usr/bin/env bun
/**
 * Development script that runs both Moondream Station and the moonrip CLI
 * Handles graceful shutdown of both processes on Ctrl+C
 */

import { spawn } from "bun";
import { existsSync } from "fs";
import path from "path";

const MOONDREAM_DIR = path.join(process.cwd(), "moondream-station");

// Check if moondream-station is set up
if (!existsSync(MOONDREAM_DIR)) {
  console.error("❌ Moondream Station not found!");
  console.error("\nPlease run setup first:");
  console.error("  chmod +x scripts/setup-moondream.sh");
  console.error("  ./scripts/setup-moondream.sh");
  process.exit(1);
}

// Get CLI args (everything after the script name)
const cliArgs = process.argv.slice(2);

if (cliArgs.length === 0) {
  console.error("❌ Please provide a YouTube URL");
  console.error("\nUsage:");
  console.error("  bun run dev:local <youtube-url> [options]");
  process.exit(1);
}

console.log("🌙 Starting Moondream Station...\n");

// Start Moondream Station
const moondreamProc = spawn(["moondream-station"], {
  stdout: "pipe",
  stderr: "pipe",
  env: { ...process.env },
});

// Store processes for cleanup
const processes = [moondreamProc];

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down...");
  processes.forEach((proc) => {
    try {
      proc.kill();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
  process.exit(0);
});

// Wait for Moondream Station to be ready
console.log("⏳ Waiting for Moondream Station to start (this may take a moment)...\n");

let isReady = false;
const stderrDecoder = new TextDecoder();

// Monitor stderr for ready signal
(async () => {
  for await (const chunk of moondreamProc.stderr) {
    const text = stderrDecoder.decode(chunk);
    process.stderr.write(text);

    if (text.includes("Uvicorn running") || text.includes("Application startup complete")) {
      isReady = true;
    }
  }
})();

// Also monitor stdout
(async () => {
  for await (const chunk of moondreamProc.stdout) {
    const text = stderrDecoder.decode(chunk);
    process.stdout.write(text);
  }
})();

// Wait up to 30 seconds for Moondream to be ready
const startTime = Date.now();
const timeout = 30000;

while (!isReady && Date.now() - startTime < timeout) {
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (!isReady) {
  console.error("\n❌ Moondream Station failed to start within 30 seconds");
  moondreamProc.kill();
  process.exit(1);
}

console.log("\n✅ Moondream Station is ready!\n");
console.log("🎵 Starting moonrip...\n");

// Start the main CLI with local Moondream endpoint
const moonripProc = spawn(["bun", "run", "index.ts", ...cliArgs], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: {
    ...process.env,
    MOONDREAM_ENDPOINT: "http://localhost:3000", // Moondream Station default port
  },
});

processes.push(moonripProc);

// Wait for moonrip to complete
const exitCode = await moonripProc.exited;

// Cleanup
console.log("\n🧹 Cleaning up...");
moondreamProc.kill();

process.exit(exitCode);
