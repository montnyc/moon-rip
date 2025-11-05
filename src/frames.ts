import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Data, Effect } from "effect";

export class FrameExtractionError extends Data.TaggedError("FrameExtractionError")<{
  message: string;
}> {}

export interface Frame {
  path: string;
  timestamp: number;
}

/**
 * Extract frames from video at regular intervals for cover art selection
 */
export const extractFrames = (
  videoPath: string,
  count = 10
): Effect.Effect<Frame[], FrameExtractionError> =>
  Effect.gen(function* () {
    const videoDir = path.dirname(videoPath);
    const frameDir = path.join(videoDir, "frames");

    // Create frames directory
    yield* Effect.tryPromise({
      try: () => mkdir(frameDir, { recursive: true }),
      catch: (error) =>
        new FrameExtractionError({
          message: `Failed to create frames directory: ${error}`,
        }),
    });

    // Get video duration first
    const duration = yield* Effect.tryPromise({
      try: async () => {
        const proc = Bun.spawn(
          [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            videoPath,
          ],
          {
            stdout: "pipe",
            stderr: "pipe",
          }
        );

        const output = await new Response(proc.stdout).text();
        await proc.exited;

        if (proc.exitCode !== 0) {
          throw new Error("Failed to get video duration");
        }

        return Number.parseFloat(output.trim());
      },
      catch: (error) =>
        new FrameExtractionError({
          message: `Failed to get video duration: ${error}`,
        }),
    });

    // Extract frames at regular intervals
    const interval = duration / (count + 1);
    const frames: Frame[] = [];

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;
      const framePath = path.join(frameDir, `frame_${i.toString().padStart(3, "0")}.jpg`);

      // Show progress
      process.stdout.write(`\r   Extracting frame ${i}/${count}...`);

      yield* Effect.tryPromise({
        try: async () => {
          const proc = Bun.spawn(
            [
              "ffmpeg",
              "-ss",
              timestamp.toString(),
              "-i",
              videoPath,
              "-vframes",
              "1",
              "-q:v",
              "2",
              "-y",
              framePath,
            ],
            {
              stdout: "pipe",
              stderr: "pipe",
            }
          );

          await proc.exited;

          if (proc.exitCode !== 0) {
            throw new Error(`Failed to extract frame at ${timestamp}s`);
          }
        },
        catch: (error) =>
          new FrameExtractionError({
            message: `Failed to extract frame: ${error}`,
          }),
      });

      frames.push({ path: framePath, timestamp });
    }

    // Clear progress line
    process.stdout.write(`\r${" ".repeat(50)}\r`);

    return frames;
  });
