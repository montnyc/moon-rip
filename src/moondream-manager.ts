import { Data, Effect } from "effect";

export class MoondreamError extends Data.TaggedError("MoondreamError")<{
  message: string;
}> {}

interface MoondreamProcess {
  isReady: boolean;
}

/**
 * Checks if a local Moondream server is running, otherwise suggests cloud API.
 * User should manually start moondream server before running moonrip.
 */
export const startMoondreamStation = (): Effect.Effect<MoondreamProcess, MoondreamError> =>
  Effect.gen(function* () {
    // Check if local server is running (moondream-station runs on port 2020)
    const localServerRunning = yield* Effect.tryPromise({
      try: async () => {
        try {
          const response = await fetch("http://localhost:2020/v1", {
            signal: AbortSignal.timeout(1000),
          });
          return response.ok || response.status === 404; // Server exists
        } catch {
          return false;
        }
      },
      catch: () => false,
    });

    if (localServerRunning) {
      console.log("   * Connected to local Moondream server (http://localhost:2020)");
      process.env.MOONDREAM_ENDPOINT = "http://localhost:2020/v1";
    } else {
      console.log("   * No local Moondream server found");
      console.log("   * Using cloud API (set MOONDREAM_API_KEY for best results)");

      if (process.env.MOONDREAM_API_KEY) {
        console.log("   * API key found");
      }
    }

    return {
      isReady: true,
    };
  });

export const stopMoondreamStation = (moondream: MoondreamProcess): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    // Nothing to clean up - user manages their own server
  });
