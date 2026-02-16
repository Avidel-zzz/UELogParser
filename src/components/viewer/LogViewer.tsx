//! 虚拟滚动日志列表

import { useRef, useCallback, useEffect, memo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLogStore, type HighlightRule } from '../../stores/logStore';
import { useFilterStore, passesFilter } from '../../stores/filterStore';
import { useHighlight } from '../../hooks/useHighlight';
import { useLogStream } from '../../hooks/useLogStream';
import type { LogEntry, SearchResult } from '../../types/log';

/// 预设高亮颜色
const PRESET_COLORS = [
  { name: 'Yellow', color: '#fbbf24' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Purple', color: '#a855f7' },
];

/// 右键菜单
function ContextMenu({
  x, y,
  selectedText,
  onClose,
  onAddHighlight,
}: {
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
  onAddHighlight: (pattern: string, color: string) => void;
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-[180px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-gray-700 text-xs text-gray-400 truncate">
        "{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}"
      </div>

      {!showColorPicker ? (
        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
          onClick={() => setShowColorPicker(true)}
        >
          <span>🎨</span> Add Highlight Rule
        </button>
      ) : (
        <div className="p-2">
          <div className="text-xs text-gray-400 mb-2">Select color:</div>
          <div className="grid grid-cols-4 gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.color}
                className="w-8 h-8 rounded border-2 border-transparent hover:border-white"
                style={{ backgroundColor: c.color }}
                onClick={() => {
                  onAddHighlight(selectedText, c.color);
                  onClose();
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}

      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 text-gray-400"
        onClick={() => {
          navigator.clipboard.writeText(selectedText);
          onClose();
        }}
      >
        📋 Copy
      </button>
    </div>
  );
}

/// 高亮规则面板
function HighlightRulesPanel({
  rules,
  onRemove,
  onToggle,
}: {
  rules: HighlightRule[];
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  if (rules.length === 0) return null;

  return (
    <div className="border-t border-gray-700 p-2">
      <div className="text-xs text-gray-400 mb-2">Custom Highlights ({rules.length})</div>
      <div className="space-y-1 max-h-32 overflow-auto">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={() => onToggle(rule.id)}
              className="w-3 h-3"
            />
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: rule.color }}
            />
            <span className="flex-1 truncate text-gray-300">{rule.pattern}</span>
            <button
              onClick={() => onRemove(rule.id)}
              className="text-gray-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/// 单个日志行组件
const LogLine = memo(function LogLine({
  entry,
  searchResults,
  isCurrentSearch,
  highlightColor,
  highlightRules,
  onContextMenu,
}: {
  entry: LogEntry;
  searchResults: SearchResult[];
  isCurrentSearch: boolean;
  highlightColor: string;
  highlightRules: HighlightRule[];
  onContextMenu: (e: React.MouseEvent, text: string) => void;
}) {
  const segments = useHighlight(entry.raw, searchResults, entry.line_number, highlightRules);

  const levelClass = entry.level === 'error'
    ? 'error'
    : entry.level === 'warning'
    ? 'warning'
    : entry.level === 'display'
    ? 'display'
    : '';

  const currentHighlight = isCurrentSearch ? 'ring-2 ring-yellow-400 bg-yellow-900/20' : '';

  return (
    <div
      className={`log-line ${levelClass} ${currentHighlight}`}
      onContextMenu={(e) => onContextMenu(e, entry.raw)}
    >
      <span className="text-gray-500 mr-3 select-none min-w-[60px] inline-block text-right">
        {entry.line_number.toString().padStart(6, ' ')}
      </span>
      <span className="flex-1">
        {segments.map((seg, i) =>
          seg.isHighlight ? (
            <span
              key={i}
              style={
                seg.type === 'search'
                  ? { backgroundColor: highlightColor + '40', color: highlightColor }
                  : seg.type === 'custom' && seg.color
                  ? { backgroundColor: seg.color + '30', color: seg.color }
                  : undefined
              }
              className={
                seg.type === 'search' || seg.type === 'custom'
                  ? ''
                  : seg.type === 'path'
                  ? 'highlight-path'
                  : seg.type === 'uuid'
                  ? 'highlight-uuid'
                  : 'highlight-number'
              }
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </span>
    </div>
  );
});

/// 搜索结果面板
function SearchResultsPanel({
  onClose,
  onJumpToLine,
}: {
  onClose: () => void;
  onJumpToLine: (line: number) => void;
}) {
  const { searchResults, currentSearchIndex, entriesMap } = useLogStore();

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium">
          Search Results ({searchResults.length})
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-auto">
        {searchResults.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No search results
          </div>
        ) : (
          searchResults.map((result, idx) => {
            const entry = entriesMap[result.line_number];
            return (
              <div
                key={`${result.line_number}-${result.start}`}
                className={`px-3 py-2 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
                  idx === currentSearchIndex ? 'bg-blue-900/30' : ''
                }`}
                onClick={() => onJumpToLine(result.line_number)}
              >
                <div className="text-xs text-gray-400 mb-1">
                  Line {result.line_number}
                </div>
                <div className="text-sm truncate">
                  {entry?.raw || result.matched_text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/// 设置面板
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { fontSize, setFontSize, highlightColor, setHighlightColor, highlightRules, removeHighlightRule, toggleHighlightRule } = useLogStore();

  return (
    <div className="absolute top-10 right-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-[220px]">
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold">Settings</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* 字体大小 */}
      <div className="p-3 border-b border-gray-700">
        <label className="text-xs text-gray-400 block mb-1">Font Size: {fontSize}px</label>
        <input
          type="range"
          min="8"
          max="24"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 搜索高亮颜色 */}
      <div className="p-3 border-b border-gray-700">
        <label className="text-xs text-gray-400 block mb-2">Search Highlight</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.color}
              className={`w-6 h-6 rounded border-2 ${
                highlightColor === c.color ? 'border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.color }}
              onClick={() => setHighlightColor(c.color)}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* 自定义高亮规则 */}
      <HighlightRulesPanel
        rules={highlightRules}
        onRemove={removeHighlightRule}
        onToggle={toggleHighlightRule}
      />
    </div>
  );
}

/// 日志查看器
export function LogViewer() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);

  const {
    entriesMap,
    searchResults,
    currentSearchIndex,
    fileIndex,
    fontSize,
    highlightColor,
    highlightRules,
    nextSearchResult,
    prevSearchResult,
    addHighlightRule,
  } = useLogStore();
  const filterState = useFilterStore();
  const { handleVisibleRangeChange, scrollToLine, totalLines } = useLogStream();

  const currentSearchLine = searchResults[currentSearchIndex]?.line_number ?? -1;
  const lineHeight = Math.max(16, fontSize + 4);

  // 虚拟滚动
  const virtualizer = useVirtualizer({
    count: totalLines,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => lineHeight, [lineHeight]),
    overscan: 20,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // 监听滚动位置变化
  useEffect(() => {
    if (virtualItems.length === 0) return;
    const first = virtualItems[0].index;
    const last = virtualItems[virtualItems.length - 1].index;
    handleVisibleRangeChange(first, last);
  }, [virtualItems, handleVisibleRangeChange]);

  // 监听搜索结果导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          prevSearchResult();
        } else {
          nextSearchResult();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSearchResult, prevSearchResult]);

  // 跳转到搜索结果
  useEffect(() => {
    if (currentSearchLine > 0) {
      virtualizer.scrollToIndex(currentSearchLine - 1, { align: 'center' });
      scrollToLine(currentSearchLine);
    }
  }, [currentSearchLine, virtualizer, scrollToLine]);

  // 右键菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent, text: string) => {
    e.preventDefault();

    // 获取选中的文本
    const selection = window.getSelection();
    const selectedText = (selection?.toString().trim() || text.slice(0, 50)) || '';

    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      text: selectedText,
    });
  }, []);

  // 跳转到指定行
  const handleJumpToLine = useCallback((lineNumber: number) => {
    virtualizer.scrollToIndex(lineNumber - 1, { align: 'center' });
    scrollToLine(lineNumber);
  }, [virtualizer, scrollToLine]);

  if (!fileIndex) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-900">
        <div className="text-center">
          <p className="text-lg mb-2">No log file opened</p>
          <p className="text-sm">Click "Open File" to load a log file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden relative bg-gray-900">
      {/* 日志列表 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-2 py-1 bg-gray-800 border-b border-gray-700 text-xs">
          <div className="text-gray-400">
            {totalLines.toLocaleString()} lines
            {searchResults.length > 0 && (
              <button
                className="ml-4 text-blue-400 hover:text-blue-300"
                onClick={() => setShowSearchResults(!showSearchResults)}
              >
                Search: {currentSearchIndex + 1}/{searchResults.length} matches ▶
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {highlightRules.length > 0 && (
              <span className="text-gray-500">
                🎨 {highlightRules.filter(r => r.enabled).length}
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
            >
              ⚙ Settings
            </button>
          </div>
        </div>

        {/* 日志列表 */}
        <div
          ref={parentRef}
          className="flex-1 overflow-auto bg-gray-900"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const lineNumber = virtualItem.index + 1;
              const entry = entriesMap[lineNumber];

              if (!entry) {
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className="px-2 py-0.5 text-gray-600 italic"
                  >
                    <span className="text-gray-500 mr-3 min-w-[60px] inline-block text-right">
                      {lineNumber.toString().padStart(6, ' ')}
                    </span>
                    Loading...
                  </div>
                );
              }

              if (!passesFilter(entry, filterState)) {
                return null;
              }

              const isCurrentSearch = lineNumber === currentSearchLine;

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <LogLine
                    entry={entry}
                    searchResults={searchResults}
                    isCurrentSearch={isCurrentSearch}
                    highlightColor={highlightColor}
                    highlightRules={highlightRules}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 搜索结果面板 */}
      {showSearchResults && searchResults.length > 0 && (
        <SearchResultsPanel
          onClose={() => setShowSearchResults(false)}
          onJumpToLine={handleJumpToLine}
        />
      )}

      {/* 设置面板 */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.text}
          onClose={() => setContextMenu(null)}
          onAddHighlight={(pattern, color) => {
            addHighlightRule(pattern, color);
          }}
        />
      )}
    </div>
  );
}
