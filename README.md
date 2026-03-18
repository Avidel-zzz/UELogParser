
<div align="center">

# UE Log Parser

<img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%20Linux-blue.svg" alt="Platform" />

<img src="https://img.shields.io/badge/React-19-blue?style=flat-square" alt="React" />
<img src="https://img.shields.io/badge/Rust-orange?style=flat-square" alt="Rust" />
<img src="https://img.shields.io/badge/Tauri-v2-purple?style=flat-square" alt="Tauri" />

<img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />

**A high-performance desktop application for parsing Unreal Engine log files**

<img src="https://img.shields.io/badge/Features-High%20Performance-orange.svg" alt="Features" />

</div>

---

## ✨ Features

- 🚀 **High-Performance Parsing** — Rust-based backend for lightning-fast log file processing
- 🎨 **Modern UI** — Clean, responsive interface built with React 19 and TailwindCSS
- 🌍 **Cross-Platform** — Works on Windows, macOS, and Linux
- 🔍 **Real-time Filtering** — Filter logs by category, verbosity level, and keywords
- 📊 **Log Statistics** — Overview of log categories, warning/error counts
- 🤖 **AI-Powered Chat** — Conversational log analysis with Claude or GLM integration
  - Ask questions in natural language to find bugs and errors
  - AI can autonomously search and read log lines
  - Click line numbers to jump directly to log entries

---

## 🤖 AI Chat Integration

The AI Chat feature allows you to interactively analyze log files using natural language.

**Supported Providers:**

| Provider | Models |
|----------|-------|
| **Claude** (Anthropic) | claude-sonnet-4, claude-opus-4 |
| **GLM** (Zhipu AI) | glm-4-plus, glm-4-flash |

### Setup

1. Click the **Settings** button (⚙) in the header
2. Select your AI provider (Claude or GLM)
3. Enter your API key
4. Click **AI Chat** button to open the chat sidebar

### Example Queries

```
"Find all error messages"
"What happened around line 5000?"
"Search for 'crash' and explain what caused it"
"Show me warnings from the Networking category"
```

---

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **State Management** | Zustand |
| **Backend** | Rust (Tauri v2) |
| **Build Tool** | Vite |
| **AI Integration** | Claude API, GLM API (Function Calling) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **Rust** (latest stable)
- Platform-specific dependencies for Tauri

### Installation

```bash
# Clone the repository
git clone https://github.com/Avidel-zzz/UELogParser.git
cd UELogParser

# Install dependencies
npm install

# Run development server
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

---

## 📁 Project Structure

```
UELogParser/
├── src/                    # React frontend
│   ├── components/        # UI components
│   │   ├── chat/          # AI Chat panel
│   │   ├── filter/         # Filter panel
│   │   ├── search/         # Search bar
│   │   ├── settings/       # Settings modal
│   │   └── viewer/         # Log viewer
│   ├── stores/            # Zustand stores
│   ├── services/          # API services
│   └── App.tsx            # Main application
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── parser/         # Log parser
│   │   ├── search/         # Search engine
│   │   └── streaming/      # File streaming
│   └── tauri.conf.json
└── package.json
```

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

*Built with ❤️ using Tauri, React, and Rust*

</div>
