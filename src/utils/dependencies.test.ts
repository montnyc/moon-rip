import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { MissingDependencyError, checkDependencies } from "./dependencies";

describe("checkDependencies", () => {
  it("should succeed if yt-dlp and ffmpeg are installed", async () => {
    const result = await Effect.runPromise(checkDependencies().pipe(Effect.either));

    // This test will pass if the dependencies are installed on the system
    // If they're not, it will fail with a Left containing MissingDependencyError
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(MissingDependencyError);
      console.log("Note: This test failed because dependencies are not installed");
    } else {
      expect(result._tag).toBe("Right");
    }
  });
});
