# moonrip - YouTube to MP3 Converter with AI-Powered Cover Art

## Project Overview

**moonrip** is a CLI tool that allows users to download YouTube videos, convert them to high-quality MP3 files, and automatically select the best cover art using AI vision analysis.

## How It Works

The tool follows an interactive pipeline:

1. **Startup** - Checks dependencies and starts Moondream Station in background
2. **Interactive Prompts** - Guides user through:
   - YouTube URL input
   - Audio format selection (MP3/M4A/WAV)
   - Optional cover art description
   - Output directory selection
3. **Download** - Uses `yt-dlp` to download the video with metadata
4. **Conversion** - Uses `ffmpeg` to extract audio in selected format
5. **Frame Extraction** - Extracts 10 frames from the video at regular intervals
6. **AI Selection** - Uses Moondream to analyze frames and select best cover art
7. **Embedding** - Uses `ffmpeg` to embed the selected image as album art
8. **Output** - Saves the final file and displays the path
9. **Cleanup** - Automatically stops Moondream Station and cleans temp files

## Tech Stack

- **Runtime**: Bun
- **Error Handling**: Effect (type-safe functional error handling)
- **UI**: OpenTUI React (terminal UI components)
- **AI Vision**: Moondream (image analysis and selection)
- **External Tools**:
  - `yt-dlp` - Video download
  - `ffmpeg` - Audio conversion and cover art embedding

## Project Structure

```
moon-rip/
├── index.ts                    # Main CLI entry point (interactive)
├── src/
│   ├── utils/
│   │   ├── args.ts            # CLI argument parsing (legacy)
│   │   ├── args.test.ts       # Tests
│   │   ├── dependencies.ts    # External dependency validation
│   │   └── dependencies.test.ts
│   ├── interactive.ts         # Interactive prompt flow
│   ├── moondream-manager.ts   # Moondream Station lifecycle
│   ├── download.ts            # YouTube video download
│   ├── convert.ts             # Audio conversion
│   ├── frames.ts              # Frame extraction
│   ├── cover-art.ts           # AI-powered cover art selection
│   ├── embed.ts               # Cover art embedding
│   └── ui.tsx                 # Terminal UI components
├── scripts/
│   ├── setup-moondream.sh     # Moondream setup
│   └── dev-with-moondream.ts  # (legacy)
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md                  # This file
```

## Usage

### Interactive Mode

Simply run:

```bash
moonrip
```

The tool will guide you through:

1. **🌙 Startup** - Auto-starts Moondream AI (shows loading state)
2. **📺 URL** - Prompts for YouTube URL with validation
3. **🎵 Format** - Choose MP3, M4A, or WAV
4. **🎨 Cover Prompt** - Optionally describe your ideal image
5. **📁 Output** - Choose save location
6. **🚀 Processing** - Live progress for each step:
   - Downloading video
   - Converting to audio
   - Extracting frames
   - AI analyzing frames
   - Embedding cover art
7. **✅ Complete** - Shows final file path

## Development

### Install Dependencies

```bash
bun install
```

### Setup Moondream Station (Local AI - Recommended)

For unlimited, offline AI processing:

```bash
bun run setup:moondream
```

This will:
- Clone the Moondream Station repository into `moondream-station/`
- Install it locally with pip
- The directory is gitignored and won't be tracked

### Run in Development Mode

```bash
bun start
```

This will:
1. Auto-start Moondream Station in background
2. Wait for it to be ready (shows loading state)
3. Start the interactive prompt flow
4. Gracefully shut down Moondream on Ctrl+C or completion

### Run Tests

```bash
bun test
```

### Watch Mode for Tests

```bash
bun test:watch
```

### Build

```bash
bun run build
```

### Install Globally (After Build)

```bash
bun link
```

Then you can use `moonrip` from anywhere.

## External Dependencies

Users must have these installed:

- **yt-dlp**: `brew install yt-dlp` (macOS) or see https://github.com/yt-dlp/yt-dlp
- **ffmpeg**: `brew install ffmpeg` (macOS) or see https://ffmpeg.org

## Key Features

1. **Type-Safe Error Handling** - Uses Effect for composable, type-safe errors
2. **AI-Powered Cover Art** - Moondream analyzes frames to find the best image
3. **Custom Prompts** - Users can specify what kind of image they want
4. **High Quality** - Uses best available video/audio quality and highest MP3 encoding
5. **Metadata Preservation** - Extracts and embeds title, artist info
6. **User-Friendly CLI** - Clear progress indicators and error messages

## Testing Strategy

- **Unit Tests**: Using Bun's built-in test runner
- **Integration Tests**: Testing the full pipeline with sample videos
- **Effect Testing**: Using Effect's testing utilities for type-safe error testing

## Future Enhancements

Potential improvements:

- [ ] Progress bars for long downloads
- [ ] Interactive frame selection (show thumbnails in terminal)
- [ ] Batch processing multiple URLs
- [ ] Custom audio quality settings
- [ ] Support for playlists
- [ ] Cache downloaded videos
- [ ] Support for other video platforms
- [ ] Local Moondream server option (for offline use)

## Notes for Claude Code

When working on this project:

1. Always run tests after making changes: `bun test`
2. Use Effect for all error handling - it provides type safety
3. All subprocess calls should use Bun.spawn
4. Keep the UI simple but informative
5. Always validate external dependencies before operations
6. Clean up temp files in .moonrip-temp directory
7. Use proper TypeScript types throughout
8. Add tests for new features using Bun test runner

## Moondream Configuration

The tool uses the Moondream npm package which can connect to:
- **Moondream Cloud** (5,000 free requests/day) - Requires API key
- **Local Moondream Station** (unlimited offline use) - Recommended for development

### Local Setup

The project includes scripts to run Moondream Station locally:

1. **Setup Script** (`scripts/setup-moondream.sh`):
   - Clones Moondream Station repo
   - Installs it with pip
   - The `moondream-station/` directory is gitignored

2. **Dev Script** (`scripts/dev-with-moondream.ts`):
   - Starts Moondream Station server
   - Waits for it to be ready
   - Runs moonrip with `MOONDREAM_ENDPOINT=http://localhost:3000`
   - Handles Ctrl+C to kill both processes gracefully

### Environment Variables

- `MOONDREAM_ENDPOINT`: Set to use a local Moondream Station server
  - Default: Uses cloud API
  - Local: `http://localhost:3000` (automatically set by `dev:local` script)
