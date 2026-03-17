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
    setLoading,
    setError,
    attachedLines,
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
