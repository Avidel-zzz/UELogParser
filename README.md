# UE Log Parser

A high-performance desktop application for parsing Unreal Engine log files, built with Tauri v2, React 19, and Rust.

## Features

- **High-Performance Parsing**: Rust-based backend for lightning-fast log file processing
- **Modern UI**: Clean, responsive interface built with React 19 and TailwindCSS
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Real-time Filtering**: Filter logs by category, verbosity level, and keywords
- **Log Statistics**: Overview of log categories, warning/error counts
- **AI-Powered Chat**: Conversational log analysis with Claude or GLM integration
  - Ask questions in natural language to find bugs and errors
  - AI can autonomously search and read log lines
  - Click line numbers to jump directly to log entries
  - Per-file chat history persistence

## AI Chat Integration

The AI Chat feature allows you to interactively analyze log files using natural language. Supported providers:

- **Claude** (Anthropic) - claude-sonnet-4, claude-opus-4
- **GLM** (Zhipu AI) - glm-4-plus, glm-4-flash

### Setup

1. Click the **Settings** button (⚙) in the header
2. Select your AI provider (Claude or GLM)
3. Enter your API key
4. Click **AI Chat** button to open the chat sidebar

### Example Queries

- "Find all error messages"
- "What happened around line 5000?"
- "Search for 'crash' and explain what caused it"
- "Show me warnings from the Networking category"

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **State Management**: Zustand
- **Backend**: Rust (Tauri v2)
- **Build Tool**: Vite
- **AI Integration**: Claude API / GLM API with function calling

## Development

### Prerequisites

- Node.js 20+
- Rust (latest stable)
- Platform-specific dependencies for Tauri

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

## Project Structure

```
LogParser/
├── src/                # React frontend
│   ├── components/     # UI components
│   ├── stores/         # Zustand stores
│   └── App.tsx         # Main application
├── src-tauri/          # Rust backend
│   ├── src/            # Rust source
│   └── tauri.conf.json # Tauri configuration
└── package.json
```

## License

MIT
