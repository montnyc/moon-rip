#!/bin/bash
set -e

echo "🌙 Setting up Moondream Station locally..."

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "❌ uv is required but not installed."
    echo "Install it with: brew install uv"
    echo "Or visit: https://docs.astral.sh/uv/"
    exit 1
fi

# Check if moondream-station directory exists
if [ -d "moondream-station" ]; then
    echo "📦 Moondream Station already exists. Updating..."
    cd moondream-station
    git pull
    cd ..
else
    echo "📥 Cloning Moondream Station..."
    git clone https://github.com/m87-labs/moondream-station.git
fi

echo "📦 Installing Moondream Station with uv..."
cd moondream-station
uv venv
uv pip install -e .
cd ..

echo "✅ Moondream Station setup complete!"
echo ""
echo "To run moonrip:"
echo "  bun start"
