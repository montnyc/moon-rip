# 🌙 moonrip

> Download YouTube videos and convert them to audio with AI-powered cover art selection

A simple, interactive CLI tool that downloads YouTube videos, extracts high-quality audio, and uses AI to automatically pick the best frame for album cover art.

## ✨ What it does

1. You paste a YouTube URL
2. Pick your audio format (MP3, M4A, or WAV)
3. Optionally describe what kind of cover art you want ("happy concert scene", "vibrant colors", etc.)
4. moonrip downloads, converts, extracts frames, and uses AI to pick the perfect cover art
5. You get a beautiful audio file with embedded album art!

## 📋 Prerequisites

Install these first:

- **[Bun](https://bun.sh)** - Fast JavaScript runtime
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** - YouTube downloader
  ```bash
  brew install yt-dlp  # macOS
  # or: sudo apt install yt-dlp  # Linux
  ```
- **[ffmpeg](https://ffmpeg.org)** - Media converter
  ```bash
  brew install ffmpeg  # macOS
  # or: sudo apt install ffmpeg  # Linux
  ```

## 🚀 Installation

```bash
git clone https://github.com/yourusername/moonrip.git
cd moonrip
bun install
```

## 💻 Usage

**Option 1: With local Moondream server (recommended)**

Start Moondream server in one terminal:
```bash
cd moondream-station
./venv/bin/moondream-station interactive
```

Then run moonrip in another terminal:
```bash
bun start
```

**Option 2: With cloud API**

Just run:
```bash
bun start
```

Set your API key for better results:
```bash
export MOONDREAM_API_KEY=your_key_here  # Get free key at https://console.moondream.ai
```

Then follow the interactive prompts!

## 🎯 Goals

- **Simple UX** - Just paste a URL and answer a few questions
- **Smart AI** - Automatically picks the best frame for cover art, or matches your description
- **High Quality** - Best available audio quality, properly tagged with metadata
- **Type-Safe** - Built with Effect for robust error handling
- **Fast** - Uses Bun for maximum performance

## 🛠️ Tech Stack

- **[Bun](https://bun.sh)** - Runtime
- **[Effect](https://effect.website)** - Type-safe error handling
- **[Moondream](https://moondream.ai)** - Vision AI for cover art selection
- **[OpenTUI](https://github.com/sst/opentui)** - Terminal UI
- **yt-dlp** - Video downloading
- **ffmpeg** - Audio conversion & metadata

## 📝 Example

```bash
$ bun start

╔══════════════════════════════════════════╗
║      🌙 moonrip - YouTube to Audio       ║
╚══════════════════════════════════════════╝

⚙️  Checking dependencies...
   ✓ yt-dlp found
   ✓ ffmpeg found
   ✓ Connected to local Moondream server

🌙 Welcome to moonrip!

📺 Enter YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

🎵 Select audio format:
  1. MP3 (most compatible)
  2. M4A (better quality, smaller size)
  3. WAV (lossless)

Choice (1-3, default: 1): 1

🎨 Cover art selection:
  Describe your ideal cover image (or press Enter):

📁 Output directory (default: current): ~/Music

🚀 Starting conversion...

✅ Complete!
📍 Saved to: /Users/you/Music/Rick Astley - Never Gonna Give You Up.mp3
```

## 🧪 Development

Run tests:
```bash
bun test
```

See `CLAUDE.md` for detailed architecture and development notes.

## 📄 License

MIT

## 🙏 Credits

Built with [yt-dlp](https://github.com/yt-dlp/yt-dlp), [ffmpeg](https://ffmpeg.org), [Moondream](https://moondream.ai), [Effect](https://effect.website), and [Bun](https://bun.sh).
