import { Data, Effect } from "effect";

export class MissingDependencyError extends Data.TaggedError("MissingDependencyError")<{
  dependency: string;
  installInstructions: string;
}> {}

const checkCommand = (command: string): Effect.Effect<boolean, never> =>
  Effect.tryPromise({
    try: async () => {
      const proc = Bun.spawn(["which", command], {
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
      return proc.exitCode === 0;
    },
    catch: () => false,
  });

export const checkDependencies = (): Effect.Effect<void, MissingDependencyError> =>
  Effect.gen(function* () {
    // Check for yt-dlp
    const hasYtDlp = yield* checkCommand("yt-dlp");
    if (!hasYtDlp) {
      yield* Effect.fail(
        new MissingDependencyError({
          dependency: "yt-dlp",
          installInstructions: `
ERROR: yt-dlp is not installed.

Install it with one of the following methods:

macOS (Homebrew):
  brew install yt-dlp

Linux (apt):
  sudo apt install yt-dlp

Linux (pip):
  pip install yt-dlp

Or visit: https://github.com/yt-dlp/yt-dlp#installation
`,
        })
      );
    }

    // Check for ffmpeg
    const hasFfmpeg = yield* checkCommand("ffmpeg");
    if (!hasFfmpeg) {
      yield* Effect.fail(
        new MissingDependencyError({
          dependency: "ffmpeg",
          installInstructions: `
ERROR: ffmpeg is not installed.

Install it with one of the following methods:

macOS (Homebrew):
  brew install ffmpeg

Linux (apt):
  sudo apt install ffmpeg

Or visit: https://ffmpeg.org/download.html
`,
        })
      );
    }
  });
