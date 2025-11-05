#!/usr/bin/env bun
import { Effect, Console } from "effect";
import { rm } from "fs/promises";
import path from "path";
import { checkDependencies } from "./src/utils/dependencies";
import { getInteractiveInputs } from "./src/interactive";
import { downloadVideo } from "./src/download";
import { convertAudio } from "./src/convert";
import { extractFrames } from "./src/frames";
import { selectCoverArt } from "./src/cover-art";
import { embedCoverArt } from "./src/embed";
import { startMoondreamStation, stopMoondreamStation } from "./src/moondream-manager";

const showProgress = (step: string) => {
  console.log(`\n${step}...`);
};

const main = Effect.gen(function* () {
  console.clear();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║       moonrip - Video to Audio           ║");
  console.log("║   with AI-powered cover art selection    ║");
  console.log("╚══════════════════════════════════════════╝");

  // Check external dependencies first
  showProgress("Checking dependencies");
  yield* checkDependencies();
  console.log("   * yt-dlp found");
  console.log("   * ffmpeg found");

  // Initialize Moondream (cloud API)
  const moondreamProcess = yield* startMoondreamStation();

  try {
    // Get interactive inputs from user
    const inputs = yield* getInteractiveInputs();

    console.log("\n" + "=".repeat(50));
    console.log("Starting conversion...");
    console.log("=".repeat(50));

    // Download the video
    showProgress("Downloading video");
    const videoInfo = yield* downloadVideo(inputs.url);
    console.log(`   * Downloaded: ${videoInfo.title}`);

    // Convert to selected format
    showProgress(`Converting to ${inputs.format.toUpperCase()}`);
    const audioPath = yield* convertAudio(videoInfo, inputs.format);
    console.log(`   * Conversion complete`);

    // Extract frames for cover art
    showProgress("Extracting frames from video");
    const frames = yield* extractFrames(videoInfo.videoPath);
    console.log(`   * Extracted ${frames.length} frames`);

    // Select best cover art using Moondream
    if (inputs.imagePrompt) {
      showProgress(`Analyzing frames (looking for: "${inputs.imagePrompt}")`);
    } else {
      showProgress("Analyzing frames with AI");
    }
    const coverArt = yield* selectCoverArt(frames, inputs.imagePrompt);
    console.log(`   * Selected best cover art`);

    // Embed cover art into audio file
    showProgress("Embedding cover art");
    const finalPath = yield* embedCoverArt(audioPath, coverArt, inputs.outputDir);

    // Success!
    console.log("\n" + "=".repeat(50));
    console.log("Complete!");
    console.log("=".repeat(50));
    console.log(`\nSaved to: ${finalPath}\n`);

    return finalPath;
  } finally {
    // Always clean up Moondream Station
    yield* stopMoondreamStation(moondreamProcess);

    // Clean up temp directory
    yield* Effect.tryPromise({
      try: async () => {
        const tempDir = path.join(process.cwd(), ".moonrip-temp");
        await rm(tempDir, { recursive: true, force: true });
      },
      catch: () => void 0, // Ignore cleanup errors
    });
  }
});

// Run the program
Effect.runPromise(main).catch((error) => {
  console.error("\nError:", error.message);
  if (error.installInstructions) {
    console.error(error.installInstructions);
  }
  process.exit(1);
});
