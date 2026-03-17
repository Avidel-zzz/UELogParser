//! 上下文指示器组件

import { useChatStore } from '../../stores/chatStore';

export function ContextIndicator() {
  const { attachedLines } = useChatStore();

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
