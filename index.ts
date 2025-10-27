#!/usr/bin/env bun
import { Effect, Console } from "effect";
import { checkDependencies } from "./src/utils/dependencies";
import { getInteractiveInputs } from "./src/interactive";
import { downloadVideo } from "./src/download";
import { convertToMp3 } from "./src/convert";
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
    const audioPath = yield* convertToMp3(videoInfo); // TODO: Support other formats
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
