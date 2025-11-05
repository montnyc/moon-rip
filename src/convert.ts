import path from "node:path";
import { Data, Effect } from "effect";
import type { VideoInfo } from "./download";

export class ConversionError extends Data.TaggedError("ConversionError")<{
  message: string;
}> {}

export type AudioFormat = "mp3" | "m4a" | "wav";

interface FormatConfig {
  extension: string;
  codec: string;
  qualityArgs: string[];
}

const FORMAT_CONFIGS: Record<AudioFormat, FormatConfig> = {
  mp3: {
    extension: ".mp3",
    codec: "libmp3lame",
    qualityArgs: ["-q:a", "0"], // Highest quality VBR
  },
  m4a: {
    extension: ".m4a",
    codec: "aac",
    qualityArgs: ["-b:a", "256k"], // High quality AAC
  },
  wav: {
    extension: ".wav",
    codec: "pcm_s16le",
    qualityArgs: [], // WAV is lossless, no quality setting needed
  },
};

export const convertAudio = (
  videoInfo: VideoInfo,
  format: AudioFormat
): Effect.Effect<string, ConversionError> =>
  Effect.gen(function* () {
    // If yt-dlp already extracted audio, check if it matches the desired format
    if (videoInfo.audioPath) {
      const audioExt = path.extname(videoInfo.audioPath);
      const desiredExt = FORMAT_CONFIGS[format].extension;

      // If the extracted audio is already in the desired format, use it
      if (audioExt === desiredExt) {
        return videoInfo.audioPath;
      }
      // Otherwise, we'll convert it below
    }

    const config = FORMAT_CONFIGS[format];
    const inputExt = path.extname(videoInfo.videoPath);
    const outputPath = videoInfo.videoPath.replace(inputExt, `_converted${config.extension}`);

    yield* Effect.tryPromise({
      try: async () => {
        const args = [
          "-i",
          videoInfo.audioPath || videoInfo.videoPath,
          "-vn", // No video
          "-acodec",
          config.codec,
          ...config.qualityArgs,
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

        // Read stderr for progress updates
        const stderrReader = proc.stderr.getReader();
        const stderrChunks: Uint8Array[] = [];
        let duration: number | null = null;
        let lastProgress = "";

        const readStderr = async () => {
          while (true) {
            const { done, value } = await stderrReader.read();
            if (done) break;

            stderrChunks.push(value);
            const text = new TextDecoder().decode(value);

            // Parse duration (appears early in ffmpeg output)
            if (!duration) {
              const durationMatch = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
              if (durationMatch) {
                const [_, hours, minutes, seconds] = durationMatch;
                duration =
                  Number.parseInt(hours) * 3600 +
                  Number.parseInt(minutes) * 60 +
                  Number.parseFloat(seconds);
              }
            }

            // Parse progress (time=00:01:23.45)
            if (duration) {
              const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
              if (timeMatch) {
                const [_, hours, minutes, seconds] = timeMatch;
                const currentTime =
                  Number.parseInt(hours) * 3600 +
                  Number.parseInt(minutes) * 60 +
                  Number.parseFloat(seconds);
                const progress = Math.min(100, (currentTime / duration) * 100).toFixed(1);

                if (progress !== lastProgress) {
                  process.stdout.write(`\r   Progress: ${progress}%`);
                  lastProgress = progress;
                }
              }
            }
          }
        };

        // Start reading stderr in background
        const stderrPromise = readStderr();

        await stderrPromise;
        await proc.exited;

        // Clear progress line
        if (lastProgress) {
          process.stdout.write(`\r${" ".repeat(50)}\r`);
        }

        if (proc.exitCode !== 0) {
          // Efficiently concatenate Uint8Arrays
          const totalLength = stderrChunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of stderrChunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          const error = new TextDecoder().decode(combined);
          throw new Error(`ffmpeg failed: ${error}`);
        }
      },
      catch: (error) =>
        new ConversionError({
          message: `Conversion to ${format.toUpperCase()} failed: ${error}`,
        }),
    });

    return outputPath;
  });
