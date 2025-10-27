# Live Progress Bars Implementation Plan

## Overview
Add real-time progress tracking for yt-dlp and ffmpeg with live updating progress bars in the terminal.

## Components Needed

### 1. Progress Parsers (create `src/progress-parsers.ts`)
- `parseYtDlpProgress()` - Parse yt-dlp stderr output
  - Regex: `/\[download\]\s+([\d.]+)%.*?at\s+([\d.]+\w+\/s).*?ETA\s+(\d+:\d+)/`
  - Extract: percentage, speed, ETA
- `parseFfmpegProgress()` - Parse ffmpeg stderr output
  - Regex: `/time=(\d+:\d+:\d+\.\d+).*?speed=([\d.]+)x/`
  - Calculate percentage from duration vs time
  - Extract: current time, speed

### 2. Progress Component (update `src/ui.tsx`)
- Create `<LiveProgress>` component using OpenTUI's `box` and `text`
- Real-time state updates with React useState
- Display: `[████████░░] 45.2% | 10.5MB/s | ETA 00:05`
- Multiple simultaneous progress bars (download, convert, etc.)

### 3. Stream Processors (create `src/utils/stream-processor.ts`)
- `createProgressStream()` - Generic stream processor
  - Takes: subprocess, parser function, callback
  - Reads stderr/stdout line by line
  - Calls parser on each line
  - Invokes callback with progress data
  - Returns: process handle

### 4. Integration Updates

**`src/download.ts`:**
- Replace static "Downloading..." with live progress
- Stream yt-dlp stderr → parse → update UI state
- Show: percentage, speed, ETA, downloaded size

**`src/convert.ts`:**
- Get video duration first (ffprobe)
- Stream ffmpeg stderr → parse → calculate percentage
- Show: percentage, speed, time remaining

**`src/frames.ts`:**
- Show progress: "Extracting frame 3/10..."
- Simple counter, not streaming

**`src/cover-art.ts`:**
- Show progress: "Analyzing frame 5/10..."
- Per-frame spinner/indicator

## Technical Approach

```typescript
// Stream processor pattern
const proc = Bun.spawn([...], { stderr: "pipe" });
const decoder = new TextDecoder();

for await (const chunk of proc.stderr) {
  const text = decoder.decode(chunk);
  for (const line of text.split('\n')) {
    const progress = parseYtDlpProgress(line);
    if (progress) {
      setProgressState(progress); // Update React state
    }
  }
}
```

## UI Layout

```
╔══════════════════════════════════════════╗
║      🌙 moonrip - YouTube to Audio       ║
╚══════════════════════════════════════════╝

📥 Downloading video
[████████████░░░░░░░░] 65.2% | 12.5MB/s | ETA 00:12
Downloaded: 215.3MB / 330.1MB

🎵 Converting to MP3
[██████████████████░░] 92.1% | 1.5x speed | 00:08 / 00:09
```

## Benefits
- **Better UX** - Users see real progress, not just spinners
- **Transparency** - Know exactly what's happening
- **Debugging** - See if downloads are stuck/slow
- **Professional** - Matches expectations from modern CLIs

## Complexity
- Medium - Need to parse two different output formats
- OpenTUI may need custom rendering (it's alpha software)
- Alternative: Use simpler `console.log()` with ANSI escape codes for progress

## Alternative: ANSI Progress Bars
If OpenTUI proves difficult, use simple ANSI:
```typescript
process.stderr.write(`\r[${bar}] ${percent}%`);
```
Simpler, more reliable, less "fancy"

## Example Progress Parser

```typescript
interface YtDlpProgress {
  percentage: number;
  speed: string;
  eta: string;
  downloaded: string;
  total: string;
}

function parseYtDlpProgress(line: string): YtDlpProgress | null {
  // [download]  45.2% of  100.50MiB at   10.5MiB/s ETA 00:05
  const match = line.match(
    /\[download\]\s+([\d.]+)%\s+of\s+([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\d+:\d+)/
  );

  if (!match) return null;

  return {
    percentage: parseFloat(match[1]),
    total: match[2],
    speed: match[3],
    eta: match[4],
    downloaded: calculateDownloaded(match[1], match[2])
  };
}
```

## Example FFmpeg Parser

```typescript
interface FfmpegProgress {
  percentage: number;
  currentTime: string;
  speed: string;
  fps: number;
}

function parseFfmpegProgress(
  line: string,
  totalDuration: number
): FfmpegProgress | null {
  // time=00:01:23.45 fps=30 speed=1.5x
  const match = line.match(/time=(\d+):(\d+):(\d+\.\d+).*?speed=([\d.]+)x/);

  if (!match) return null;

  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3]);
  const currentSeconds = hours * 3600 + minutes * 60 + seconds;

  return {
    percentage: (currentSeconds / totalDuration) * 100,
    currentTime: `${match[1]}:${match[2]}:${match[3]}`,
    speed: `${match[4]}x`,
    fps: parseFps(line)
  };
}
```
