import { Effect, Data } from "effect";

export class InvalidArgumentsError extends Data.TaggedError("InvalidArgumentsError")<{
  message: string;
}> {}

export interface CliArgs {
  url: string;
  prompt?: string;
  outputDir?: string;
}

const HELP_TEXT = `
moonrip - Download YouTube videos and convert to MP3 with AI-powered cover art

Usage:
  moonrip <youtube-url> [options]

Options:
  --prompt, -p <text>       Custom prompt for cover art selection
  --output, -o <directory>  Output directory (default: current directory)
  --help, -h                Show this help message

Examples:
  moonrip "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  moonrip "https://youtu.be/dQw4w9WgXcQ" --prompt "vibrant concert scene"
  moonrip "https://youtu.be/dQw4w9WgXcQ" --output ~/Music
`;

export const parseArgs = (args: string[]): Effect.Effect<CliArgs, InvalidArgumentsError> =>
  Effect.gen(function* () {
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
      console.log(HELP_TEXT);
      yield* Effect.fail(new InvalidArgumentsError({ message: "No arguments provided" }));
    }

    const url = args[0];
    if (!url) {
      yield* Effect.fail(new InvalidArgumentsError({ message: "YouTube URL is required" }));
    }

    // Basic YouTube URL validation
    const isValidUrl =
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.startsWith("http://") ||
      url.startsWith("https://");

    if (!isValidUrl) {
      yield* Effect.fail(
        new InvalidArgumentsError({ message: "Invalid YouTube URL. Must be a valid URL." })
      );
    }

    // Parse optional flags
    let prompt: string | undefined;
    let outputDir: string | undefined;

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--prompt" || arg === "-p") {
        prompt = args[++i];
      } else if (arg === "--output" || arg === "-o") {
        outputDir = args[++i];
      }
    }

    return {
      url,
      prompt,
      outputDir: outputDir || process.cwd(),
    };
  });
