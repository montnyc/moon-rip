import { describe, it, expect } from "bun:test";
import { parseArgs, InvalidArgumentsError } from "./args";
import { Effect } from "effect";

describe("parseArgs", () => {
  it("should parse valid YouTube URL", async () => {
    const result = await Effect.runPromise(
      parseArgs(["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]).pipe(Effect.either)
    );

    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result.right.outputDir).toBe(process.cwd());
    }
  });

  it("should parse URL with prompt flag", async () => {
    const result = await Effect.runPromise(
      parseArgs([
        "https://youtu.be/dQw4w9WgXcQ",
        "--prompt",
        "vibrant concert scene",
      ]).pipe(Effect.either)
    );

    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.prompt).toBe("vibrant concert scene");
    }
  });

  it("should parse URL with output directory", async () => {
    const result = await Effect.runPromise(
      parseArgs(["https://youtu.be/dQw4w9WgXcQ", "--output", "/tmp"]).pipe(Effect.either)
    );

    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.outputDir).toBe("/tmp");
    }
  });

  it("should reject invalid URL", async () => {
    const result = await Effect.runPromise(
      parseArgs(["not-a-url"]).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(InvalidArgumentsError);
    }
  });

  it("should reject empty arguments", async () => {
    const result = await Effect.runPromise(parseArgs([]).pipe(Effect.either));

    expect(result._tag).toBe("Left");
  });
});
