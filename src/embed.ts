import { Effect, Data } from "effect";
import path from "path";
import { copyFile, unlink } from "fs/promises";

export class EmbedError extends Data.TaggedError("EmbedError")<{
  message: string;
}> {}

/**
 * Embed cover art into MP3 file and move to final destination
 */
export const embedCoverArt = (
  mp3Path: string,
  coverArtPath: string,
  outputDir?: string
): Effect.Effect<string, EmbedError> =>
  Effect.gen(function* () {
    const tempOutput = mp3Path.replace(".mp3", "_with_cover.mp3");

    // Embed the cover art using ffmpeg
    yield* Effect.tryPromise({
      try: async () => {
        const proc = Bun.spawn(
          [
            "ffmpeg",
            "-i",
            mp3Path,
            "-i",
            coverArtPath,
            "-map",
            "0:a", // Audio from first input
            "-map",
            "1:0", // Image from second input
            "-c",
            "copy", // Copy audio codec
            "-id3v2_version",
            "3",
            "-metadata:s:v",
            "title=Album cover",
            "-metadata:s:v",
            "comment=Cover (front)",
            "-y",
            tempOutput,
          ],
          {
            stdout: "pipe",
            stderr: "pipe",
          }
        );

        await proc.exited;

        if (proc.exitCode !== 0) {
          const error = await new Response(proc.stderr).text();
          throw new Error(`Failed to embed cover art: ${error}`);
        }
      },
      catch: (error) =>
        new EmbedError({
          message: `Failed to embed cover art: ${error}`,
        }),
    });

    // Determine final output path
    const basename = path.basename(mp3Path, ".mp3");
    const finalDir = outputDir || process.cwd();
    const finalPath = path.join(finalDir, `${basename}.mp3`);

    // Copy to final location
    yield* Effect.tryPromise({
      try: () => copyFile(tempOutput, finalPath),
      catch: (error) =>
        new EmbedError({
          message: `Failed to copy to output directory: ${error}`,
        }),
    });

    // Clean up temp file
    yield* Effect.tryPromise({
      try: () => unlink(tempOutput),
      catch: () => void 0, // Ignore cleanup errors
    });

    return finalPath;
  });
