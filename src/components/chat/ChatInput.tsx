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
