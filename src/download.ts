import { Effect, Data } from "effect";
import path from "path";
import { mkdir } from "fs/promises";

export class DownloadError extends Data.TaggedError("DownloadError")<{
  message: string;
}> {}

export interface VideoInfo {
  videoPath: string;
  title: string;
  artist?: string;
  thumbnail?: string;
}

export const downloadVideo = (url: string): Effect.Effect<VideoInfo, DownloadError> =>
  Effect.gen(function* () {
    const tempDir = path.join(process.cwd(), ".moonrip-temp");

    // Ensure temp directory exists
    yield* Effect.tryPromise({
      try: () => mkdir(tempDir, { recursive: true }),
      catch: (error) =>
        new DownloadError({
          message: `Failed to create temp directory: ${error}`,
        }),
    });

    const outputTemplate = path.join(tempDir, "%(id)s.%(ext)s");

    // Download video with metadata
    const result = yield* Effect.tryPromise({
      try: async () => {
        const proc = Bun.spawn(
          [
            "yt-dlp",
            "--no-playlist",
            "--write-thumbnail",
            "--convert-thumbnails",
            "jpg",
            // Don't specify format - let yt-dlp pick best available
            "-o",
            outputTemplate,
            "--print",
            "after_move:%(id)s|%(title)s|%(artist,uploader)s|%(thumbnail)s",
            "--newline", // Better progress output
            url,
          ],
          {
            stdout: "pipe",
            stderr: "pipe",
          }
        );

        const output = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();
        await proc.exited;

        if (proc.exitCode !== 0) {
          throw new Error(`yt-dlp failed (exit code ${proc.exitCode}): ${errorOutput}`);
        }

        // Log stderr for debugging (yt-dlp uses stderr for progress)
        if (errorOutput) {
          console.log("   yt-dlp output:", errorOutput.split("\n").slice(-3).join("\n"));
        }

        return output.trim();
      },
      catch: (error) =>
        new DownloadError({
          message: `Download failed: ${error}`,
        }),
    });

    // Parse the output
    const [videoId, title, artist, thumbnail] = result.split("|");

    // Find the downloaded video file
    const videoFiles = yield* Effect.tryPromise({
      try: async () => {
        // List all files in temp dir for debugging
        const allFiles = await Array.fromAsync(
          new Bun.Glob("*").scan({ cwd: tempDir })
        );

        // Filter for video files (not images)
        const videos = allFiles.filter(
          (f) => !f.endsWith(".jpg") && !f.endsWith(".webp") && !f.endsWith(".png")
        );

        // If we have multiple files, prefer ones matching the video ID
        if (videos.length > 1) {
          const matching = videos.filter((f) => f.includes(videoId || ""));
          return matching.length > 0 ? matching : videos;
        }

        return videos;
      },
      catch: (error) =>
        new DownloadError({
          message: `Failed to find downloaded video: ${error}`,
        }),
    });

    if (videoFiles.length === 0) {
      yield* Effect.fail(
        new DownloadError({
          message: "No video file found after download. Check if yt-dlp completed successfully.",
        })
      );
    }

    const videoPath = path.join(tempDir, videoFiles[0]!);

    return {
      videoPath,
      title: title || "Unknown",
      artist: artist || undefined,
      thumbnail: thumbnail || undefined,
    };
  });
