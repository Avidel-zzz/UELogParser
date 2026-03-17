# AI Chat Integration Design

Date: 2026-03-18
Status: Draft

## Overview

Add an AI-powered chat sidebar to UE Log Parser that helps users analyze log files, find bugs, and understand errors through natural language conversation.

## Goals

- Enable conversational log analysis with AI assistance
- Support both Claude (Anthropic) and GLM (Zhipu AI) providers
- Allow AI to autonomously query log files for deeper analysis
- Provide seamless integration with existing log viewer workflow

## Non-Goals

- Code syntax highlighting in AI responses (logs are not code)
- Multi-file analysis (one file at a time)
- Real-time streaming responses (can be added later)

## Architecture

### Layout: Three-Column Design

```
+-------------------------------------------------------------+
|  Header: UE Log Parser | Open File | Filter | AI Chat | ⚙️   |
+-------------------------------------------------------------+
|  Search Bar                                                  |
+----------+----------------------------------+----------------+
|          |                                  |                |
|  Filter  |         LogViewer                |    AI Chat     |
|  Panel   |         (main log area)          |    Sidebar     |
|  256px   |         (flex-1)                 |    320px       |
|          |                                  |                |
+----------+----------------------------------+----------------+
|  Footer                                                      |
+-------------------------------------------------------------+
```

### Component Structure

#### New Files

```
src/
├── components/
│   └── chat/
│       ├── ChatPanel.tsx          # Main chat container
│       ├── ChatMessage.tsx        # Individual message component
│       ├── ChatInput.tsx          # Input box + context indicator
│       └── ContextIndicator.tsx   # "Attached X lines" display
│   └── settings/
│       └── SettingsModal.tsx      # Global settings dialog
├── stores/
│   ├── chatStore.ts               # Chat state management
│   └── settingsStore.ts           # Settings state management
└── services/
    └── aiApi.ts                   # AI API abstraction (Claude + GLM)
```

#### Modified Files

```
src/
├── App.tsx                        # Add AI Chat button and three-column layout
└── components/
    └── ResizablePanel.tsx         # Extend to support three panels
```

## Features

### AI Capabilities

#### Function Calling Tools

AI can autonomously query the log file using these tools:

| Tool | Parameters | Description |
|------|------------|-------------|
| `read_lines` | `start: number, end: number` | Read specific line range |
| `search_logs` | `pattern: string, use_regex?: boolean` | Search matching lines |
| `get_file_info` | none | Get file metadata (total lines, categories, level counts) |
| `get_filtered_lines` | `levels?: string[], categories?: string[]` | Filter by level/category |

#### Context Attachment

- **Auto-attach**: Visible lines in viewport are automatically sent with user messages
- **Manual selection**: Users can select specific lines to send
- **Context indicator**: Shows "Attached 50 lines (100-150)" above input box

### Chat Panel UI

```
+--------------------------+
|  AI Assistant     [x]    |  <- Header + close button
+--------------------------+
|                          |
|  [User] Find errors      |  <- Message list (scrollable)
|                          |
|  [AI] Let me search...   |
|      Calling: search_logs|
|      Found 3 errors      |
|                          |
|  [AI] Found error at     |
|      line 1234...        |
|      -> line 1234 <- click to jump
|                          |
+--------------------------+
|  Attached 50 lines (100-150) | <- Context indicator
+--------------------------+
|  [Input box...]    [Send]|  <- Input area
|  [Clear Chat]            |
+--------------------------+
```

### Settings Modal

```
+-----------------------------------------+
|  Settings                         [x]   |
+-----------------------------------------+
|                                         |
|  AI Provider                            |
|  [Claude ▼]  [GLM]                      |  <- Tab switch
|                                         |
|  --- Claude Configuration ---           |
|                                         |
|  API Key *                              |
|  [sk-ant-************        ] 👁       |  <- Password type + toggle
|                                         |
|  API Base URL (optional)                |
|  [https://api.anthropic.com   ]         |  <- Default value
|                                         |
|  Model                                  |
|  [claude-sonnet-4-6 ▼]                  |
|                                         |
|  --- GLM Configuration ---              |
|  (similar structure)                    |
|                                         |
+-----------------------------------------+
|                    [Cancel]  [Save]     |
+-----------------------------------------+
```

### Settings Items

| Setting | Required | Description |
|---------|----------|-------------|
| API Key | Yes | Authentication key for API |
| API Base URL | No | Custom endpoint (proxy, private deployment) |
| Model | Yes | Dropdown selection (claude-sonnet-4-6, glm-4, etc.) |

## State Management

### chatStore.ts

```typescript
interface ChatState {
  // Conversation
  messages: Message[];
  isLoading: boolean;

  // Context
  visibleLineRange: { start: number; end: number };
  selectedLines: number[];

  // Persistence
  sessions: Record<string, Message[]>;  // filePath -> messages

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setVisibleRange: (start: number, end: number) => void;
  setSelectedLines: (lines: number[]) => void;
  loadSession: (filePath: string) => void;
  saveSession: () => void;
}
```

### settingsStore.ts

```typescript
interface SettingsState {
  // AI Configuration
  provider: 'claude' | 'glm';
  claudeApiKey: string;
  claudeBaseUrl: string;
  claudeModel: string;
  glmApiKey: string;
  glmBaseUrl: string;
  glmModel: string;

  // UI State
  showChat: boolean;
  chatWidth: number;

  // Actions
  setProvider: (provider: 'claude' | 'glm') => void;
  updateClaudeConfig: (config: Partial<...>) => void;
  updateGlmConfig: (config: Partial<...>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}
```

## Data Persistence

| Data | Storage Method |
|------|----------------|
| API Keys / Settings | Tauri Store (encrypted for sensitive data) |
| Chat History | localStorage (keyed by file path) |
| UI State (width, visibility) | localStorage |

## API Service Layer

### services/aiApi.ts

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
}

// Unified AI call interface
async function chat(
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<AIResponse>;

// Tool executors
const toolExecutors = {
  read_lines: async (start: number, end: number) => {...},
  search_logs: async (pattern: string, useRegex?: boolean) => {...},
  get_file_info: async () => {...},
  get_filtered_lines: async (levels?: string[], categories?: string[]) => {...},
};
```

### Multi-turn Tool Calling Flow

```
1. User sends message
2. Build system prompt (includes file info)
3. Call AI API
4. If AI returns tool_calls:
   a. Execute tools and get results
   b. Return tool results to AI
   c. Repeat steps 3-4 until AI returns final response
5. Display AI response to user
```

### Provider Adaptation

| Provider | Function Calling Format | Auth Method |
|----------|------------------------|-------------|
| Claude | `tools` + `tool_use` content block | `x-api-key` header |
| GLM | `tools` + `tool_calls` in response | `Authorization: Bearer` |

## System Prompt

```
You are a UE log analysis assistant. The user is viewing a log file in UE Log Parser.

Current file information:
- Filename: {filename}
- Total lines: {total_lines}
- Error count: {error_count}
- Warning count: {warning_count}

You can use these tools to query the log:
- read_lines: Read specific line ranges
- search_logs: Search for matching patterns
- get_file_info: Get file metadata
- get_filtered_lines: Filter by level/category

When analyzing logs:
1. Use tools to query relevant content, don't guess
2. When finding issues, tell user the specific line number (format: line 1234)
3. Keep explanations concise and clear
4. If you need more context, actively use read_lines to get it
```

## Error Handling

| Error Scenario | Handling |
|----------------|----------|
| API Key not configured | Show prompt: "Please configure API Key in Settings first" |
| Invalid API Key | Show error: "Invalid API Key, please check settings" |
| Network error | Show error: "Network connection failed, please check network" |
| Rate limit | Show error: "Too many requests, please retry later" |
| Tool execution failed | Tell AI the failure reason, let AI decide next step |

## Security Considerations

- API Keys stored in Tauri's secure storage (not exposed in frontend code)
- Never log API Keys
- Only send log content to AI service after user confirmation

## Interactions

| Interaction | Behavior |
|-------------|----------|
| Click line number link | Jump to line in LogViewer and highlight |
| AI thinking | Show loading animation + "AI is analyzing..." |
| Tool calling | Show tool name + status indicator |
| Clear chat | Confirm before clearing, keep settings |
| No API Key configured | Prompt to configure when opening Chat |

## Implementation Phases

### Phase 1: Foundation
- Settings modal with API configuration
- Settings persistence (Tauri Store)
- Basic chat panel UI

### Phase 2: AI Integration
- AI API service layer
- Basic chat functionality (no tools)
- Message display and input

### Phase 3: Tool Calling
- Tool definitions and executors
- Multi-turn conversation with tools
- Context attachment (visible lines)

### Phase 4: Polish
- Line number jump functionality
- Chat history persistence per file
- Error handling and loading states
