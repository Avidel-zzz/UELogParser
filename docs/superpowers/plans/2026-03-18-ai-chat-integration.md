# AI Chat Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered chat sidebar that helps users analyze UE log files through natural language conversation, with autonomous log querying capabilities.

**Architecture:** Three-column layout (Filter | LogViewer | AI Chat) with a modal settings dialog. Zustand stores for chat and settings state. Direct API calls to Claude/GLM from frontend with function calling for log queries.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, Tauri Store plugin for settings persistence

---

## Task 1: Settings Store and Persistence

**Files:**
- Create: `src/stores/settingsStore.ts`
- Create: `src/types/ai.ts`

- [ ] **Step 1: Define AI-related types**

Create `src/types/ai.ts`:

```typescript
//! AI 相关类型定义

/// AI 服务提供商
export type AIProvider = 'claude' | 'glm';

/// Claude 配置
export interface ClaudeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/// GLM 配置
export interface GlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/// Claude 可用模型
export const CLAUDE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-sonnet-20241022',
] as const;

/// GLM 可用模型
export const GLM_MODELS = [
  'glm-4-plus',
  'glm-4-0520',
  'glm-4-flash',
] as const;

/// 聊天消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallResult[];
}

/// 工具调用结果
export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}
```

- [ ] **Step 2: Create settings store with localStorage persistence**

Create `src/stores/settingsStore.ts`:

```typescript
//! 设置状态管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider, ClaudeConfig, GlmConfig } from '../types/ai';
import { CLAUDE_MODELS, GLM_MODELS } from '../types/ai';

interface SettingsState {
  // AI 配置
  provider: AIProvider;
  claude: ClaudeConfig;
  glm: GlmConfig;

  // UI 状态
  showChat: boolean;
  chatWidth: number;
  showSettings: boolean;

  // Actions
  setProvider: (provider: AIProvider) => void;
  setClaudeConfig: (config: Partial<ClaudeConfig>) => void;
  setGlmConfig: (config: Partial<GlmConfig>) => void;
  setShowChat: (show: boolean) => void;
  setChatWidth: (width: number) => void;
  setShowSettings: (show: boolean) => void;

  // Computed
  isConfigured: () => boolean;
  getCurrentConfig: () => { apiKey: string; baseUrl: string; model: string };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: 'claude',
      claude: {
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        model: CLAUDE_MODELS[0],
      },
      glm: {
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: GLM_MODELS[0],
      },
      showChat: false,
      chatWidth: 320,
      showSettings: false,

      setProvider: (provider) => set({ provider }),
      setClaudeConfig: (config) =>
        set((state) => ({ claude: { ...state.claude, ...config } })),
      setGlmConfig: (config) =>
        set((state) => ({ glm: { ...state.glm, ...config } })),
      setShowChat: (showChat) => set({ showChat }),
      setChatWidth: (chatWidth) => set({ chatWidth }),
      setShowSettings: (showSettings) => set({ showSettings }),

      isConfigured: () => {
        const { provider, claude, glm } = get();
        if (provider === 'claude') {
          return claude.apiKey.length > 0;
        }
        return glm.apiKey.length > 0;
      },

      getCurrentConfig: () => {
        const { provider, claude, glm } = get();
        if (provider === 'claude') {
          return { apiKey: claude.apiKey, baseUrl: claude.baseUrl, model: claude.model };
        }
        return { apiKey: glm.apiKey, baseUrl: glm.baseUrl, model: glm.model };
      },
    }),
    {
      name: 'ue-log-parser-settings',
    }
  )
);
```

- [ ] **Step 3: Verify settings store compiles**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors related to settingsStore.ts or ai.ts

- [ ] **Step 4: Commit settings store**

```bash
git add src/stores/settingsStore.ts src/types/ai.ts
git commit -m "feat(ai): add settings store with AI provider configuration"
```

---

## Task 2: Chat Store

**Files:**
- Create: `src/stores/chatStore.ts`

- [ ] **Step 1: Create chat store for conversation management**

Create `src/stores/chatStore.ts`:

```typescript
//! 聊天状态管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '../types/ai';

interface ChatState {
  // 当前对话
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // 上下文
  visibleLineRange: { start: number; end: number };
  attachedLines: number[];

  // 会话存储（按文件路径）
  sessions: Record<string, ChatMessage[]>;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 上下文
  setVisibleLineRange: (start: number, end: number) => void;
  setAttachedLines: (lines: number[]) => void;
  attachVisibleLines: () => void;

  // 会话管理
  saveSession: (filePath: string) => void;
  loadSession: (filePath: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,
      visibleLineRange: { start: 0, end: 0 },
      attachedLines: [],
      sessions: {},

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, newMessage] }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      clearMessages: () => set({ messages: [], error: null }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      setVisibleLineRange: (start, end) =>
        set({ visibleLineRange: { start, end } }),

      setAttachedLines: (attachedLines) => set({ attachedLines }),

      attachVisibleLines: () => {
        const { visibleLineRange } = get();
        const lines: number[] = [];
        for (let i = visibleLineRange.start; i <= visibleLineRange.end; i++) {
          lines.push(i);
        }
        set({ attachedLines: lines });
      },

      saveSession: (filePath) => {
        const { messages } = get();
        set((state) => ({
          sessions: { ...state.sessions, [filePath]: messages },
        }));
      },

      loadSession: (filePath) => {
        const { sessions } = get();
        const messages = sessions[filePath] || [];
        set({ messages, error: null });
      },
    }),
    {
      name: 'ue-log-parser-chat-sessions',
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);
```

- [ ] **Step 2: Verify chat store compiles**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit chat store**

```bash
git add src/stores/chatStore.ts
git commit -m "feat(ai): add chat store for conversation management"
```

---

## Task 3: AI API Service

**Files:**
- Create: `src/services/aiApi.ts`

- [ ] **Step 1: Create AI API service with Claude and GLM support**

Create `src/services/aiApi.ts`:

```typescript
//! AI API 服务层

import type { AIProvider, ChatMessage, ToolCallResult } from '../types/ai';

/// 工具定义
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
}

/// API 响应
interface APIResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  stopReason: string;
}

/// Claude API 请求格式
interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: 'text'; text: string } | { type: 'tool_result'; tool_use_id: string; content: string }>;
  }>;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: ToolDefinition['input_schema'];
  }>;
}

/// GLM API 请求格式（OpenAI 兼容）
interface GlmRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  }>;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: ToolDefinition['input_schema'];
    };
  }>;
  max_tokens?: number;
}

/// 调用 Claude API
async function callClaude(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<APIResponse> {
  // 构建 Claude 消息格式
  const claudeMessages: ClaudeRequest['messages'] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    if (msg.role === 'user') {
      claudeMessages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      // 检查是否有工具调用结果需要包含
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const content: ClaudeRequest['messages'][0]['content'] = [];
        content.push({ type: 'text', text: msg.content });

        // 添加工具使用信息（如果有的话）
        // Claude 的格式稍有不同，这里简化处理
        claudeMessages.push({ role: 'assistant', content: content });
      } else {
        claudeMessages.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  const request: ClaudeRequest = {
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: claudeMessages,
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    })),
  };

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // 解析响应
  let content = '';
  const toolCalls: APIResponse['toolCalls'] = [];

  for (const block of data.content || []) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input,
      });
    }
  }

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: data.stop_reason,
  };
}

/// 调用 GLM API (OpenAI 兼容格式)
async function callGlm(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<APIResponse> {
  const glmMessages: GlmRequest['messages'] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    if (msg.role === 'user') {
      glmMessages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        glmMessages.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        });
      } else {
        glmMessages.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  const request: GlmRequest = {
    model,
    messages: glmMessages,
    tools: tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    })),
    max_tokens: 4096,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const choice = data.choices[0];

  let content = choice.message?.content || '';
  const toolCalls: APIResponse['toolCalls'] = [];

  if (choice.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      });
    }
  }

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: choice.finish_reason,
  };
}

/// 统一的 AI 调用接口
export async function chat(
  provider: AIProvider,
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<APIResponse> {
  if (provider === 'claude') {
    return callClaude(apiKey, baseUrl, model, systemPrompt, messages, tools);
  }
  return callGlm(apiKey, baseUrl, model, systemPrompt, messages, tools);
}

/// 获取工具定义
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'read_lines',
      description: 'Read a specific range of lines from the log file',
      input_schema: {
        type: 'object',
        properties: {
          start: { type: 'number', description: 'Start line number (1-based)' },
          end: { type: 'number', description: 'End line number (inclusive)' },
        },
        required: ['start', 'end'],
      },
    },
    {
      name: 'search_logs',
      description: 'Search for lines matching a pattern in the log file',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search pattern' },
          use_regex: { type: 'boolean', description: 'Whether to use regex matching (default: false)' },
          case_insensitive: { type: 'boolean', description: 'Whether to ignore case (default: true)' },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'get_file_info',
      description: 'Get metadata about the current log file',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_filtered_lines',
      description: 'Get lines filtered by log level and/or category',
      input_schema: {
        type: 'object',
        properties: {
          levels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Log levels to filter (error, warning, display, verbose, veryverbose)',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Categories to filter',
          },
        },
      },
    },
  ];
}
```

- [ ] **Step 2: Verify AI API service compiles**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit AI API service**

```bash
git add src/services/aiApi.ts
git commit -m "feat(ai): add AI API service with Claude and GLM support"
```

---

## Task 4: Tool Executors

**Files:**
- Create: `src/services/toolExecutors.ts`

- [ ] **Step 1: Create tool executors that interface with existing log store**

Create `src/services/toolExecutors.ts`:

```typescript
//! AI 工具执行器

import * as tauriApi from './tauriApi';
import type { LogEntry } from '../types/log';

/// 工具执行结果
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/// 读取指定行范围
export async function executeReadLines(start: number, end: number): Promise<ToolResult> {
  try {
    // 确保行号有效
    const validStart = Math.max(1, start);
    const validEnd = end;

    // 加载指定范围
    await tauriApi.loadChunk(validStart, validEnd);

    // 获取文件索引以验证范围
    const fileIndex = await tauriApi.getFileIndex();
    if (!fileIndex) {
      return { success: false, error: 'No file is currently open' };
    }

    if (validStart > fileIndex.total_lines) {
      return { success: false, error: `Start line ${validStart} exceeds total lines ${fileIndex.total_lines}` };
    }

    return {
      success: true,
      data: {
        start: validStart,
        end: Math.min(validEnd, fileIndex.total_lines),
        totalLines: fileIndex.total_lines,
        note: 'Lines loaded. Content will be available in the log viewer.',
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 搜索日志
export async function executeSearchLogs(
  pattern: string,
  useRegex: boolean = false,
  caseInsensitive: boolean = true
): Promise<ToolResult> {
  try {
    const results = await tauriApi.searchLogs({
      pattern,
      use_regex: useRegex,
      case_insensitive: caseInsensitive,
    });

    return {
      success: true,
      data: {
        pattern,
        matchCount: results.length,
        matches: results.slice(0, 50).map(r => ({
          line: r.line_number,
          matchedText: r.matched_text.slice(0, 200),
        })),
        hasMore: results.length > 50,
        totalMatches: results.length,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 获取文件信息
export async function executeGetFileInfo(): Promise<ToolResult> {
  try {
    const fileIndex = await tauriApi.getFileIndex();
    if (!fileIndex) {
      return { success: false, error: 'No file is currently open' };
    }

    return {
      success: true,
      data: {
        filename: fileIndex.file_path.split(/[/\\]/).pop(),
        path: fileIndex.file_path,
        totalLines: fileIndex.total_lines,
        fileSize: fileIndex.file_size,
        categories: Object.entries(fileIndex.categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([name, count]) => ({ name, count })),
        levelCounts: fileIndex.level_counts,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 获取过滤后的行
export async function executeGetFilteredLines(
  levels?: string[],
  categories?: string[]
): Promise<ToolResult> {
  try {
    const result = await tauriApi.getFilteredLines(
      levels as tauriApi.LogLevel[] || [],
      categories || []
    );

    return {
      success: true,
      data: {
        levels: levels || [],
        categories: categories || [],
        matchCount: result.total_count,
        lineNumbers: result.line_numbers.slice(0, 100),
        hasMore: result.line_numbers.length > 100,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 执行工具
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case 'read_lines':
      return executeReadLines(
        args.start as number,
        args.end as number
      );
    case 'search_logs':
      return executeSearchLogs(
        args.pattern as string,
        args.use_regex as boolean | undefined,
        args.case_insensitive as boolean | undefined
      );
    case 'get_file_info':
      return executeGetFileInfo();
    case 'get_filtered_lines':
      return executeGetFilteredLines(
        args.levels as string[] | undefined,
        args.categories as string[] | undefined
      );
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}
```

- [ ] **Step 2: Verify tool executors compile**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit tool executors**

```bash
git add src/services/toolExecutors.ts
git commit -m "feat(ai): add tool executors for AI function calling"
```

---

## Task 5: Settings Modal Component

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`

- [ ] **Step 1: Create settings modal component**

Create `src/components/settings/SettingsModal.tsx`:

```tsx
//! 设置弹窗组件

import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { CLAUDE_MODELS, GLM_MODELS } from '../../types/ai';

export function SettingsModal() {
  const {
    provider,
    claude,
    glm,
    setProvider,
    setClaudeConfig,
    setGlmConfig,
    showSettings,
    setShowSettings,
  } = useSettingsStore();

  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGlmKey, setShowGlmKey] = useState(false);

  if (!showSettings) return null;

  const handleClose = () => setShowSettings(false);

  const handleSave = () => {
    setShowSettings(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {/* Provider Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded text-sm ${
                provider === 'claude'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setProvider('claude')}
            >
              Claude
            </button>
            <button
              className={`px-4 py-2 rounded text-sm ${
                provider === 'glm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setProvider('glm')}
            >
              GLM
            </button>
          </div>

          {/* Claude Config */}
          {provider === 'claude' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showClaudeKey ? 'text' : 'password'}
                    value={claude.apiKey}
                    onChange={(e) => setClaudeConfig({ apiKey: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="sk-ant-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowClaudeKey(!showClaudeKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showClaudeKey ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={claude.baseUrl}
                  onChange={(e) => setClaudeConfig({ baseUrl: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="https://api.anthropic.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Model
                </label>
                <select
                  value={claude.model}
                  onChange={(e) => setClaudeConfig({ model: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {CLAUDE_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* GLM Config */}
          {provider === 'glm' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showGlmKey ? 'text' : 'password'}
                    value={glm.apiKey}
                    onChange={(e) => setGlmConfig({ apiKey: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Enter GLM API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGlmKey(!showGlmKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showGlmKey ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={glm.baseUrl}
                  onChange={(e) => setGlmConfig({ baseUrl: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="https://open.bigmodel.cn/api/paas/v4"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Model
                </label>
                <select
                  value={glm.model}
                  onChange={(e) => setGlmConfig({ model: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {GLM_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify settings modal compiles**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit settings modal**

```bash
git add src/components/settings/SettingsModal.tsx
git commit -m "feat(ai): add settings modal for AI provider configuration"
```

---

## Task 6: Chat Panel Components

**Files:**
- Create: `src/components/chat/ChatMessage.tsx`
- Create: `src/components/chat/ChatInput.tsx`
- Create: `src/components/chat/ContextIndicator.tsx`
- Create: `src/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Create ContextIndicator component**

Create `src/components/chat/ContextIndicator.tsx`:

```tsx
//! 上下文指示器组件

import { useChatStore } from '../../stores/chatStore';

export function ContextIndicator() {
  const { attachedLines, visibleLineRange } = useChatStore();

  if (attachedLines.length === 0) {
    return (
      <div className="px-3 py-1.5 bg-gray-800 text-xs text-gray-500 border-t border-gray-700">
        No lines attached. Messages will be sent without log context.
      </div>
    );
  }

  const start = attachedLines[0];
  const end = attachedLines[attachedLines.length - 1];

  return (
    <div className="px-3 py-1.5 bg-gray-800 text-xs text-gray-400 border-t border-gray-700 flex items-center justify-between">
      <span>
        📎 Attached {attachedLines.length} lines ({start} - {end})
      </span>
      <button
        onClick={() => useChatStore.getState().setAttachedLines([])}
        className="text-gray-500 hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatMessage component**

Create `src/components/chat/ChatMessage.tsx`:

```tsx
//! 聊天消息组件

import { memo } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/ai';

interface ChatMessageProps {
  message: ChatMessageType;
  onJumpToLine?: (line: number) => void;
}

export const ChatMessage = memo(function ChatMessage({ message, onJumpToLine }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Parse line number references (e.g., "line 1234")
  const renderContent = (content: string) => {
    if (!onJumpToLine) return content;

    // Match patterns like "line 1234" or "line: 1234"
    const lineRegex = /line[:\s]+(\d+)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = lineRegex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add clickable line number
      const lineNumber = parseInt(match[1], 10);
      parts.push(
        <button
          key={match.index}
          onClick={() => onJumpToLine(lineNumber)}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {match[0]}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className={`px-3 py-2 ${isUser ? 'bg-gray-800' : 'bg-gray-900'}`}>
      <div className="flex items-start gap-2">
        <div
          className={`w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          {isUser ? '👤' : '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </div>

          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.toolCalls.map((tc) => (
                <div
                  key={tc.id}
                  className={`text-xs px-2 py-1 rounded ${
                    tc.status === 'running'
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : tc.status === 'error'
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <span className="font-mono">{tc.name}</span>
                  {tc.status === 'running' && ' ⏳'}
                  {tc.status === 'success' && ' ✓'}
                  {tc.status === 'error' && ` ✗ ${tc.error}`}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
```

- [ ] **Step 3: Create ChatInput component**

Create `src/components/chat/ChatInput.tsx`:

```tsx
//! 聊天输入组件

import { useState, useCallback, KeyboardEvent } from 'react';
import { useChatStore } from '../../stores/chatStore';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const { attachVisibleLines, attachedLines, visibleLineRange } = useChatStore();

  const handleSend = useCallback(() => {
    if (!input.trim() || disabled) return;

    // Auto-attach visible lines if none attached
    if (attachedLines.length === 0 && visibleLineRange.start > 0) {
      attachVisibleLines();
    }

    onSend(input.trim());
    setInput('');
  }, [input, disabled, attachedLines.length, visibleLineRange.start, attachVisibleLines, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-700">
      <div className="p-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about logs..."
          disabled={disabled}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={() => useChatStore.getState().clearMessages()}
            className="text-xs text-gray-500 hover:text-gray-300"
            disabled={disabled}
          >
            Clear Chat
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ChatPanel component**

Create `src/components/chat/ChatPanel.tsx`:

```tsx
//! 聊天面板组件

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLogStore } from '../../stores/logStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ContextIndicator } from './ContextIndicator';
import { chat, getToolDefinitions } from '../../services/aiApi';
import { executeTool } from '../../services/toolExecutors';
import type { ChatMessage as ChatMessageType, ToolCallResult } from '../../types/ai';

export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallResult[]>([]);

  const {
    messages,
    isLoading,
    error,
    addMessage,
    updateMessage,
    setLoading,
    setError,
    attachedLines,
    clearMessages,
    saveSession,
    loadSession,
  } = useChatStore();

  const { provider, isConfigured, getCurrentConfig, setShowChat } = useSettingsStore();
  const { fileIndex, entriesMap, ensureRangeLoaded } = useLogStore();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolCalls]);

  // Load session when file changes
  useEffect(() => {
    if (fileIndex) {
      loadSession(fileIndex.file_path);
    }
  }, [fileIndex?.file_path, loadSession]);

  // Save session when messages change
  useEffect(() => {
    if (fileIndex && messages.length > 0) {
      saveSession(fileIndex.file_path);
    }
  }, [messages, fileIndex, saveSession]);

  // Build system prompt
  const buildSystemPrompt = useCallback(() => {
    if (!fileIndex) {
      return 'You are a UE log analysis assistant. No log file is currently open.';
    }

    const errorCount = fileIndex.level_counts['error'] || 0;
    const warningCount = fileIndex.level_counts['warning'] || 0;

    let contextLines = '';
    if (attachedLines.length > 0) {
      const lines: string[] = [];
      for (const lineNum of attachedLines.slice(0, 100)) {
        const entry = entriesMap[lineNum];
        if (entry) {
          lines.push(`${lineNum}: ${entry.raw}`);
        }
      }
      if (lines.length > 0) {
        contextLines = `\n\nCurrent log context (lines ${attachedLines[0]}-${attachedLines[attachedLines.length - 1]}):\n\`\`\`\n${lines.join('\n')}\n\`\`\``;
      }
    }

    return `You are a UE log analysis assistant. The user is viewing a log file in UE Log Parser.

Current file information:
- Filename: ${fileIndex.file_path.split(/[/\\]/).pop()}
- Total lines: ${fileIndex.total_lines}
- Error count: ${errorCount}
- Warning count: ${warningCount}

You can use these tools to query the log:
- read_lines: Read specific line ranges
- search_logs: Search for matching patterns
- get_file_info: Get file metadata
- get_filtered_lines: Filter by level/category

When analyzing logs:
1. Use tools to query relevant content, don't guess
2. When finding issues, tell user the specific line number (format: line 1234)
3. Keep explanations concise and clear
4. If you need more context, actively use read_lines to get it${contextLines}`;
  }, [fileIndex, attachedLines, entriesMap]);

  // Handle sending message
  const handleSend = useCallback(async (content: string) => {
    if (!isConfigured()) {
      setError('Please configure API Key in Settings first');
      return;
    }

    // Add user message
    addMessage({ role: 'user', content });
    setLoading(true);
    setError(null);
    setToolCalls([]);

    const config = getCurrentConfig();
    const tools = getToolDefinitions();

    try {
      let currentMessages: ChatMessageType[] = [...useChatStore.getState().messages];
      let maxIterations = 10;

      while (maxIterations-- > 0) {
        const response = await chat(
          provider,
          config.apiKey,
          config.baseUrl,
          config.model,
          buildSystemPrompt(),
          currentMessages,
          tools
        );

        if (response.toolCalls && response.toolCalls.length > 0) {
          // Show tool calls
          const newToolCalls: ToolCallResult[] = response.toolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            status: 'running' as const,
          }));
          setToolCalls(newToolCalls);

          // Add assistant message with tool calls
          const assistantMsg: ChatMessageType = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.content,
            timestamp: Date.now(),
            toolCalls: newToolCalls,
          };
          currentMessages.push(assistantMsg);
          addMessage({ role: 'assistant', content: response.content, toolCalls: newToolCalls });

          // Execute tools
          for (let i = 0; i < response.toolCalls.length; i++) {
            const tc = response.toolCalls[i];
            const result = await executeTool(tc.name, tc.arguments);

            // Update tool call status
            const updatedToolCalls = [...newToolCalls];
            updatedToolCalls[i] = {
              ...updatedToolCalls[i],
              status: result.success ? 'success' : 'error',
              result: result.data,
              error: result.error,
            };
            setToolCalls(updatedToolCalls);

            // Add tool result as a message for the next API call
            currentMessages.push({
              id: `tool-${tc.id}`,
              role: 'user',
              content: `Tool ${tc.name} result: ${JSON.stringify(result.data || result.error, null, 2)}`,
              timestamp: Date.now(),
            });

            // If tool involved reading lines, ensure they're loaded
            if (tc.name === 'read_lines' && result.success) {
              const data = result.data as { start: number; end: number };
              await ensureRangeLoaded(data.start, data.end);
            }
          }

          // Continue the conversation
          continue;
        }

        // No tool calls - this is the final response
        if (response.content) {
          addMessage({ role: 'assistant', content: response.content });
        }
        break;
      }
    } catch (e) {
      const errorMessage = String(e);
      if (errorMessage.includes('401') || errorMessage.includes('Invalid')) {
        setError('Invalid API Key, please check settings');
      } else if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
        setError('Network connection failed, please check network');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        setError('Too many requests, please retry later');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setToolCalls([]);
    }
  }, [provider, isConfigured, getCurrentConfig, buildSystemPrompt, addMessage, setLoading, setError, ensureRangeLoaded]);

  // Handle jump to line
  const handleJumpToLine = useCallback((lineNumber: number) => {
    // Dispatch custom event that LogViewer can listen to
    window.dispatchEvent(new CustomEvent('jumptoline', { detail: { line: lineNumber } }));
  }, []);

  if (!isConfigured()) {
    return (
      <div className="h-full flex flex-col bg-gray-800">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <button
            onClick={() => setShowChat(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Please configure API Key first</p>
            <button
              onClick={() => useSettingsStore.getState().setShowSettings(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Open Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h2 className="text-sm font-semibold">AI Assistant</h2>
        <button
          onClick={() => setShowChat(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-auto">
        {messages.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p className="mb-2">Ask me about your log file!</p>
            <p className="text-xs">Examples:</p>
            <ul className="text-xs mt-1 space-y-1">
              <li>"Find all errors"</li>
              <li>"What happened around line 1000?"</li>
              <li>"Search for 'crash'"</li>
            </ul>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onJumpToLine={msg.role === 'assistant' ? handleJumpToLine : undefined}
              />
            ))}
            {toolCalls.length > 0 && (
              <div className="px-3 py-2 bg-gray-800">
                {toolCalls.map((tc) => (
                  <div
                    key={tc.id}
                    className={`text-xs px-2 py-1 rounded mb-1 ${
                      tc.status === 'running'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {tc.status === 'running' ? '⏳' : '✓'} {tc.name}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-900/30 text-red-400 text-xs border-t border-red-800">
          {error}
        </div>
      )}

      {/* Context Indicator */}
      <ContextIndicator />

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
```

- [ ] **Step 5: Verify chat components compile**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit chat components**

```bash
git add src/components/chat/
git commit -m "feat(ai): add chat panel components"
```

---

## Task 7: Integrate into App Layout

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to add AI Chat button and panel**

Modify `src/App.tsx` to add the AI Chat integration:

```tsx
import { useCallback, useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLogStore } from './stores/logStore';
import { useSettingsStore } from './stores/settingsStore';
import { useChatStore } from './stores/chatStore';
import { SearchBar } from './components/search/SearchBar';
import { FilterPanel } from './components/filter/FilterPanel';
import { LogViewer } from './components/viewer/LogViewer';
import { ResizablePanel } from './components/ResizablePanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { SettingsModal } from './components/settings/SettingsModal';

/// Main application
function App() {
  const { openFile, closeFile, fileIndex, isLoading, error, fontSize } = useLogStore();
  const { showChat, setShowChat, chatWidth, setChatWidth, showSettings, setShowSettings } = useSettingsStore();
  const { setVisibleLineRange } = useChatStore();
  const [showFilter, setShowFilter] = useState(true);
  const [isDraggingChat, setIsDraggingChat] = useState(false);

  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Log Files', extensions: ['log', 'txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (selected && typeof selected === 'string') {
        await openFile(selected);
      }
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }, [openFile]);

  // Listen for visible range changes from LogViewer
  useEffect(() => {
    const handleVisibleRange = (e: CustomEvent<{ start: number; end: number }>) => {
      setVisibleLineRange(e.detail.start, e.detail.end);
    };
    window.addEventListener('visiblerangechange', handleVisibleRange as EventListener);
    return () => window.removeEventListener('visiblerangechange', handleVisibleRange as EventListener);
  }, [setVisibleLineRange]);

  return (
    <div
      className="w-screen h-screen bg-gray-900 text-gray-200 flex flex-col"
      style={{ fontFamily: 'Consolas, monospace', fontSize: `${fontSize}px` }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-base m-0">UE Log Parser</h1>
          {fileIndex && (
            <span className="text-xs text-gray-400">
              {fileIndex.file_path.split(/[/\\]/).pop()} • {fileIndex.total_lines.toLocaleString()} lines
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleOpenFile}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded text-white border-none cursor-pointer ${
              isLoading ? 'bg-gray-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Loading...' : 'Open File'}
          </button>
          {fileIndex && (
            <button
              onClick={closeFile}
              className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-white border-none cursor-pointer"
            >
              Close
            </button>
          )}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`px-4 py-1.5 rounded text-white border-none cursor-pointer ${
              showFilter ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            Filter
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-4 py-1.5 rounded text-white border-none cursor-pointer ${
              showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white border-none cursor-pointer"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {fileIndex && <SearchBar />}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Filter + LogViewer */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {showFilter && fileIndex ? (
            <ResizablePanel
              leftPanel={<FilterPanel />}
              rightPanel={<LogViewer />}
              initialLeftWidth={256}
              minWidth={150}
              maxWidth={500}
            />
          ) : (
            <LogViewer />
          )}
        </div>

        {/* Right: AI Chat */}
        {showChat && (
          <>
            {/* Resize Handle */}
            <div
              className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors duration-150 ${
                isDraggingChat ? 'bg-blue-500' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingChat(true);
                const startX = e.clientX;
                const startWidth = chatWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const delta = startX - e.clientX;
                  const newWidth = Math.min(500, Math.max(250, startWidth + delta));
                  setChatWidth(newWidth);
                };

                const handleMouseUp = () => {
                  setIsDraggingChat(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  document.body.style.cursor = '';
                  document.body.style.userSelect = '';
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            />
            <div style={{ width: chatWidth }} className="h-full flex-shrink-0">
              <ChatPanel />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <span>{error ? `Error: ${error}` : 'Ready'}</span>
        <span>Press F3 or Shift+F3 to navigate search results</span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Update LogViewer to dispatch visible range events**

Add to `src/components/viewer/LogViewer.tsx` in the `useEffect` that handles virtual items:

Find the existing effect that monitors virtualItems and add the event dispatch:

```tsx
// In the useEffect that handles virtualItems, add:
useEffect(() => {
  // ... existing code ...

  // Dispatch visible range for AI Chat context
  if (virtualItems.length > 0 && !effectiveShowFiltered && !effectiveShowSearch) {
    const first = virtualItems[0].index + 1;  // 1-based
    const last = virtualItems[virtualItems.length - 1].index + 1;
    window.dispatchEvent(new CustomEvent('visiblerangechange', {
      detail: { start: first, end: last }
    }));
  }
}, [virtualItems, effectiveShowFiltered, effectiveShowSearch]);
```

- [ ] **Step 3: Verify App compiles**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit App integration**

```bash
git add src/App.tsx src/components/viewer/LogViewer.tsx
git commit -m "feat(ai): integrate AI Chat into main app layout"
```

---

## Task 8: Testing and Polish

- [ ] **Step 1: Run development server**

Run: `cd /Users/avidel/Documents/Prog/Claude/UELogParser && npm run tauri dev`
Expected: Application starts without errors

- [ ] **Step 2: Test Settings Modal**
1. Click ⚙ button in header
2. Verify modal opens
3. Enter test API key for Claude
4. Switch to GLM tab
5. Verify settings persist after closing/reopening

- [ ] **Step 3: Test Chat Panel**
1. Click "AI Chat" button
2. Verify panel opens on right side
3. Verify "Please configure API Key" prompt if not configured
4. Configure API key
5. Send a test message
6. Verify message appears in chat
7. Verify context indicator shows attached lines

- [ ] **Step 4: Test Tool Calling**
1. With a log file open, ask "Find all errors"
2. Verify AI calls `search_logs` or `get_filtered_lines` tool
3. Verify tool status indicator shows
4. Verify AI responds with found errors

- [ ] **Step 5: Test Line Jump**
1. Ask AI to find a specific error
2. Verify AI mentions line numbers
3. Click on a line number link
4. Verify LogViewer scrolls to that line

- [ ] **Step 6: Fix any issues found during testing**

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(ai): complete AI Chat integration with tool calling"
```

---

## Summary

This plan creates an AI-powered chat sidebar with:

1. **Settings Store** - Manages Claude/GLM API configuration with localStorage persistence
2. **Chat Store** - Manages conversation state and per-file session persistence
3. **AI API Service** - Unified interface for Claude and GLM with function calling
4. **Tool Executors** - Execute AI tool calls to query log files
5. **Settings Modal** - UI for configuring AI providers
6. **Chat Panel** - Full chat interface with message history and context attachment
7. **App Integration** - Three-column layout with resizable AI Chat panel

The implementation follows existing codebase patterns (Zustand stores, Tailwind styling) and integrates seamlessly with the existing log viewer functionality.
