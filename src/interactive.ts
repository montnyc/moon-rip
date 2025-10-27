import { Effect } from "effect";
import { createInterface } from "readline";

export interface InteractiveInputs {
  url: string;
  format: "mp3" | "m4a" | "wav";
  imagePrompt?: string;
  outputDir: string;
}

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    readline.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
};

export const getInteractiveInputs = (): Effect.Effect<InteractiveInputs, Error> =>
  Effect.gen(function* () {
    console.log("\nWelcome to moonrip!\n");

    // Get URL
    let url = "";
    while (!url) {
      url = yield* Effect.tryPromise({
        try: () => question("Enter video URL: "),
        catch: (error) => new Error(`Failed to read input: ${error}`),
      });

      if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        console.log("Please enter a valid video URL\n");
        url = "";
      }
    }

    // Get format
    console.log("\nSelect audio format:");
    console.log("  1. MP3 (most compatible)");
    console.log("  2. M4A (better quality, smaller size)");
    console.log("  3. WAV (lossless)");

    let format: "mp3" | "m4a" | "wav" = "mp3";
    const formatChoice = yield* Effect.tryPromise({
      try: () => question("\nChoice (1-3, default: 1): "),
      catch: (error) => new Error(`Failed to read input: ${error}`),
    });

    switch (formatChoice) {
      case "2":
        format = "m4a";
        break;
      case "3":
        format = "wav";
        break;
      default:
        format = "mp3";
    }

    // Get image prompt
    console.log("\nCover art selection:");
    console.log("  You can describe what kind of image you want for the cover art,");
    console.log("  or press Enter to let AI automatically select the best frame.");

    const imagePrompt = yield* Effect.tryPromise({
      try: () => question("\nDescribe your ideal cover image (or press Enter): "),
      catch: (error) => new Error(`Failed to read input: ${error}`),
    });

    // Get output directory
    const outputDir = yield* Effect.tryPromise({
      try: async () => {
        const dir = await question(`\nOutput directory (default: current): `);
        if (!dir) return process.cwd();

        // Expand ~ to home directory
        if (dir.startsWith("~/")) {
          return dir.replace("~", process.env.HOME || "~");
        }
        return dir;
      },
      catch: (error) => new Error(`Failed to read input: ${error}`),
    });

    readline.close();

    return {
      url,
      format,
      imagePrompt: imagePrompt || undefined,
      outputDir,
    };
  });
