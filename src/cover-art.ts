import { Effect, Data } from "effect";
import { vl as Moondream } from "moondream";
import type { Frame } from "./frames";
import { readFile } from "fs/promises";

export class CoverArtSelectionError extends Data.TaggedError("CoverArtSelectionError")<{
  message: string;
}> {}

interface ScoredFrame extends Frame {
  score: number;
  description: string;
}

/**
 * Use Moondream AI to select the best frame for cover art
 * If a prompt is provided, find the frame that best matches the prompt
 * Otherwise, select the most visually appealing frame
 */
export const selectCoverArt = (
  frames: Frame[],
  userPrompt?: string
): Effect.Effect<string, CoverArtSelectionError> =>
  Effect.gen(function* () {
    // Initialize Moondream with local endpoint or API key
    const endpoint = process.env.MOONDREAM_ENDPOINT;
    const apiKey = process.env.MOONDREAM_API_KEY;

    const moondream = new Moondream(
      endpoint ? { endpoint } : apiKey ? { apiKey } : {}
    );

    // Analyze each frame
    const scoredFrames: ScoredFrame[] = [];

    for (const frame of frames) {
      const imageBuffer = yield* Effect.tryPromise({
        try: () => readFile(frame.path),
        catch: (error) =>
          new CoverArtSelectionError({
            message: `Failed to read frame: ${error}`,
          }),
      });

      // Get image description
      const description = yield* Effect.tryPromise({
        try: async () => {
          const result = await moondream.caption({
            image: imageBuffer,
            stream: false,
          });
          return typeof result === "string" ? result : result.caption || "";
        },
        catch: (error) =>
          new CoverArtSelectionError({
            message: `Failed to analyze frame: ${error}`,
          }),
      });

      let score = 0;

      if (userPrompt) {
        // If user provided a prompt, score based on how well it matches
        score = yield* Effect.tryPromise({
          try: async () => {
            const answer = await moondream.query({
              image: imageBuffer,
              question: `On a scale of 0-10, how well does this image match the description: "${userPrompt}"? Answer with just a number.`,
              stream: false,
            });
            const answerText = typeof answer === "string" ? answer : answer.answer || "0";
            const match = answerText.match(/\d+/);
            return match ? parseInt(match[0]!, 10) : 0;
          },
          catch: () => 0,
        });
      } else {
        // Score based on visual appeal heuristics
        score = yield* Effect.tryPromise({
          try: async () => {
            // Ask Moondream to rate the image's suitability as album art
            const answer = await moondream.query({
              image: imageBuffer,
              question:
                "On a scale of 0-10, how suitable is this image as album cover art? Consider composition, visual appeal, and focus. Answer with just a number.",
              stream: false,
            });
            const answerText = typeof answer === "string" ? answer : answer.answer || "0";
            const match = answerText.match(/\d+/);
            return match ? parseInt(match[0]!, 10) : 0;
          },
          catch: () => 0,
        });
      }

      scoredFrames.push({
        ...frame,
        score,
        description,
      });
    }

    // Sort by score and return the best frame
    scoredFrames.sort((a, b) => b.score - a.score);

    if (scoredFrames.length === 0 || !scoredFrames[0]) {
      yield* Effect.fail(
        new CoverArtSelectionError({
          message: "No suitable frames found",
        })
      );
    }

    const bestFrame = scoredFrames[0];
    console.log(`Selected frame at ${bestFrame.timestamp.toFixed(1)}s (score: ${bestFrame.score})`);
    console.log(`Description: ${bestFrame.description}`);

    return bestFrame.path;
  });
