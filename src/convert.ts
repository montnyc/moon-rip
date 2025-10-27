import { Effect, Data } from "effect";
import path from "path";
import type { VideoInfo } from "./download";

export class ConversionError extends Data.TaggedError("ConversionError")<{
  message: string;
}> {}

export const convertToMp3 = (videoInfo: VideoInfo): Effect.Effect<string, ConversionError> =>
  Effect.gen(function* () {
    const outputPath = videoInfo.videoPath.replace(path.extname(videoInfo.videoPath), ".mp3");

    yield* Effect.tryPromise({
      try: async () => {
        const args = [
          "-i",
          videoInfo.videoPath,
          "-vn", // No video
          "-acodec",
          "libmp3lame",
          "-q:a",
          "0", // Highest quality
          "-metadata",
          `title=${videoInfo.title}`,
        ];

        if (videoInfo.artist) {
          args.push("-metadata", `artist=${videoInfo.artist}`);
        }

        args.push("-y", outputPath); // Overwrite if exists

        const proc = Bun.spawn(["ffmpeg", ...args], {
          stdout: "pipe",
          stderr: "pipe",
        });

        await proc.exited;

        if (proc.exitCode !== 0) {
          const error = await new Response(proc.stderr).text();
          throw new Error(`ffmpeg failed: ${error}`);
        }
      },
      catch: (error) =>
        new ConversionError({
          message: `Conversion failed: ${error}`,
        }),
    });

    return outputPath;
  });
