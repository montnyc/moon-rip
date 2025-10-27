# moonrip

Download online videos and convert them to audio with AI-powered cover art selection.

I download a lot of live sets and DJ mixes. I wanted a simple way to grab the audio with cover art automatically selected from the video, so I built this.

## How it works

1. Paste a video URL
2. Pick audio format (MP3, M4A, or WAV)
3. Optionally describe what kind of cover art you want
4. Downloads video, extracts audio, analyzes frames with Moondream, embeds selected cover art

## Prerequisites

- [Bun](https://bun.sh)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - `brew install yt-dlp`
- [ffmpeg](https://ffmpeg.org) - `brew install ffmpeg`

## Installation

```bash
git clone https://github.com/yourusername/moonrip.git
cd moonrip
bun install
```

## Usage

Run `bun start` and follow the prompts.

Optionally run a local Moondream server first (faster):
```bash
cd moondream-station
./venv/bin/moondream-station interactive
```

Or use the cloud API:
```bash
export MOONDREAM_API_KEY=your_key_here  # https://console.moondream.ai
```

## Tech

- [Bun](https://bun.sh)
- [Effect](https://effect.website)
- [Moondream](https://moondream.ai)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [ffmpeg](https://ffmpeg.org)

## License

MIT
