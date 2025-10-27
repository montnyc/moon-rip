import { Effect, Data } from "effect";
import path from "path";
import { mkdir } from "fs/promises";

export class DownloadError extends Data.TaggedError("DownloadError")<{
  message: string;
}> {}

export interface VideoInfo {
  videoPath: string;  // Path to video file (for frame extraction)
  audioPath?: string; // Path to audio file if separate (e.g., mp3)
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

    // Find the downloaded files
    const files = yield* Effect.tryPromise({
      try: async () => {
        const allFiles = await Array.fromAsync(
          new Bun.Glob("*").scan({ cwd: tempDir })
        );

        return {
          all: allFiles,
          videos: allFiles.filter(f =>
            (f.endsWith(".mp4") || f.endsWith(".mkv") || f.endsWith(".webm") || f.endsWith(".avi")) &&
            !f.includes("_converted")
          ),
          audio: allFiles.filter(f =>
            (f.endsWith(".mp3") || f.endsWith(".m4a")) &&
            !f.includes("_converted")
          ),
        };
      },
      catch: (error) =>
        new DownloadError({
          message: `Failed to list downloaded files: ${error}`,
        }),
    });

    // Find the video file (for frame extraction)
    const videoFile = files.videos[0];
    if (!videoFile) {
      yield* Effect.fail(
        new DownloadError({
          message: "No video file found after download. yt-dlp may have downloaded audio-only.",
        })
      );
    }

    const videoPath = path.join(tempDir, videoFile);
    const audioFile = files.audio[0];
    const audioPath = audioFile ? path.join(tempDir, audioFile) : undefined;

    return {
      videoPath,
      audioPath,
      title: title || "Unknown",
      artist: artist || undefined,
      thumbnail: thumbnail || undefined,
    };
  });
