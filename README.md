# UE Log Parser

A high-performance desktop application for parsing Unreal Engine log files, built with Tauri v2, React 19, and Rust.

## Features

- **High-Performance Parsing**: Rust-based backend for lightning-fast log file processing
- **Modern UI**: Clean, responsive interface built with React 19 and TailwindCSS
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Real-time Filtering**: Filter logs by category, verbosity level, and keywords
- **Log Statistics**: Overview of log categories, warning/error counts

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **State Management**: Zustand
- **Backend**: Rust (Tauri v2)
- **Build Tool**: Vite

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
