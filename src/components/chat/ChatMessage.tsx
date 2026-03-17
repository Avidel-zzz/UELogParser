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
