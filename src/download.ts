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

        // Read stderr for progress updates
        const stderrReader = proc.stderr.getReader();
        const stderrChunks: Uint8Array[] = [];
        let lastProgress = "";

        const readStderr = async () => {
          while (true) {
            const { done, value } = await stderrReader.read();
            if (done) break;

            stderrChunks.push(value);
            const text = new TextDecoder().decode(value);

            // Parse progress lines (yt-dlp format: [download]  45.2% of ~123.45MiB at 1.23MiB/s ETA 00:12)
            const progressMatch = text.match(/\[download\]\s+(\d+\.?\d*)%/);
            if (progressMatch) {
              const progress = progressMatch[1];
              if (progress !== lastProgress) {
                process.stdout.write(`\r   Progress: ${progress}%`);
                lastProgress = progress;
              }
            }
          }
        };

        // Start reading stderr in background
        const stderrPromise = readStderr();

        const output = await new Response(proc.stdout).text();
        await stderrPromise;
        await proc.exited;

        // Clear progress line
        if (lastProgress) {
          process.stdout.write("\r" + " ".repeat(50) + "\r");
        }

        if (proc.exitCode !== 0) {
          const errorOutput = new TextDecoder().decode(
            new Uint8Array(
              stderrChunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])
            )
          );
          throw new Error(`yt-dlp failed (exit code ${proc.exitCode}): ${errorOutput}`);
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
