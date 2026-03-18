//! 虚拟滚动日志列表 - Apple 风格扁平设计

import { useRef, useCallback, useEffect, memo, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLogStore, type HighlightRule } from '../../stores/logStore';
import { useFilterStore } from '../../stores/filterStore';
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

const LEVEL_COLORS: Record<string, string> = {
  error: '#ef4444',
  warning: '#f97316',
  display: '#3b82f6',
  verbose: '#6b7280',
  veryverbose: '#4b5563',
  unknown: '#9ca3af',
};

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
    <div className="context-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <div className="context-menu-header">
        <span className="context-menu-preview">"{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}"</span>
      </div>

      {!showColorPicker ? (
        <button className="context-menu-item" onClick={() => setShowColorPicker(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="13.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="10.5" r="2.5" />
            <circle cx="8.5" cy="7.5" r="2.5" />
            <circle cx="6.5" cy="12.5" r="2.5" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
          </svg>
          <span>Add Highlight</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="context-menu-arrow">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      ) : (
        <div className="context-menu-colors">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.color}
              className="context-menu-color-btn"
              style={{ backgroundColor: c.color }}
              onClick={() => {
                onAddHighlight(selectedText, c.color);
                onClose();
              }}
              title={c.name}
            />
          ))}
        </div>
      )}

      <div className="context-menu-divider" />

      <button className="context-menu-item" onClick={() => {
        navigator.clipboard.writeText(selectedText);
        onClose();
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Copy</span>
      </button>
    </div>
  );
}

/// 设置面板
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { fontSize, setFontSize, highlightColor, setHighlightColor, highlightRules, removeHighlightRule, toggleHighlightRule } = useLogStore();

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Display Settings</h3>
        <button onClick={onClose} className="settings-panel-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 字体大小 */}
      <div className="settings-section">
        <label className="settings-label">Font Size: {fontSize}px</label>
        <input
          type="range"
          min="10"
          max="20"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="settings-slider"
        />
      </div>

      {/* 搜索高亮颜色 */}
      <div className="settings-section">
        <label className="settings-label">Search Highlight</label>
        <div className="settings-colors">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.color}
              className={`settings-color-btn ${highlightColor === c.color ? 'active' : ''}`}
              style={{ backgroundColor: c.color }}
              onClick={() => setHighlightColor(c.color)}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* 自定义高亮规则 */}
      {highlightRules.length > 0 && (
        <div className="settings-section">
          <label className="settings-label">Custom Highlights ({highlightRules.length})</label>
          <div className="settings-rules">
            {highlightRules.map((rule) => (
              <div key={rule.id} className="settings-rule">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleHighlightRule(rule.id)}
                  className="settings-rule-check"
                />
                <span className="settings-rule-dot" style={{ backgroundColor: rule.color }} />
                <span className="settings-rule-pattern">{rule.pattern}</span>
                <button onClick={() => removeHighlightRule(rule.id)} className="settings-rule-remove">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const levelColor = LEVEL_COLORS[entry.level] || LEVEL_COLORS.unknown;

  return (
    <div
      className={`log-line ${isCurrentSearch ? 'current-search' : ''}`}
      onContextMenu={(e) => onContextMenu(e, entry.raw)}
    >
      <div className="log-line-indicator" style={{ backgroundColor: levelColor }} />
      <span className="log-line-number">{entry.line_number}</span>
      <span className="log-line-content">
        {segments.map((seg, i) =>
          seg.isHighlight ? (
            <span
              key={i}
              style={
                seg.type === 'search'
                  ? { backgroundColor: highlightColor + '30', color: highlightColor }
                  : seg.type === 'custom' && seg.color
                  ? { backgroundColor: seg.color + '25', color: seg.color }
                  : undefined
              }
              className={`log-highlight ${seg.type === 'search' ? 'search' : seg.type === 'custom' ? 'custom' : ''}`}
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
  width,
  onClose,
  onJumpToLine,
}: {
  width: number;
  onClose: () => void;
  onJumpToLine: (line: number) => void;
}) {
  const { searchResults, currentSearchIndex, entriesMap } = useLogStore();

  // Deduplicate by line number
  const uniqueResults = useMemo(() => {
    const seen = new Set<number>();
    return searchResults.filter(r => {
      if (seen.has(r.line_number)) return false;
      seen.add(r.line_number);
      return true;
    });
  }, [searchResults]);

  return (
    <div className="search-results-panel" style={{ width }}>
      <div className="search-results-header">
        <span className="search-results-title">
          Search Results ({uniqueResults.length})
        </span>
        <button onClick={onClose} className="search-results-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="search-results-list">
        {uniqueResults.length === 0 ? (
          <div className="search-results-empty">No search results</div>
        ) : (
          uniqueResults.map((result, idx) => {
            const entry = entriesMap[result.line_number];
            const isCurrent = idx === currentSearchIndex;
            return (
              <div
                key={`${result.line_number}-${result.start}`}
                className={`search-results-item ${isCurrent ? 'current' : ''}`}
                onClick={() => onJumpToLine(result.line_number)}
              >
                <span className="search-results-line">Line {result.line_number}</span>
                <span className="search-results-preview">{entry?.raw || result.matched_text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/// 日志查看器
export function LogViewer() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchPanelWidth, setSearchPanelWidth] = useState(300);
  const [isDraggingSearchPanel, setIsDraggingSearchPanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);

  const {
    entriesMap,
    searchResults,
    currentSearchIndex,
    fileIndex,
    fontSize,
    highlightColor,
    highlightRules,
    showSearchOnly,
    showFilteredOnly,
    filteredLines,
    nextSearchResult,
    prevSearchResult,
    addHighlightRule,
    ensureRangeLoaded,
  } = useLogStore();
  const filterState = useFilterStore();
  const { handleVisibleRangeChange, scrollToLine, totalLines } = useLogStream();

  const currentSearchLine = searchResults[currentSearchIndex]?.line_number ?? -1;
  const lineHeight = Math.max(18, fontSize + 5);

  // Determine which mode we're in
  const effectiveShowFiltered = showFilteredOnly && filteredLines.length > 0;
  const effectiveShowSearch = showSearchOnly && searchResults.length > 0 && !effectiveShowFiltered;

  // Deduplicate search results by line_number
  const uniqueSearchLines = useMemo(() => {
    const seen = new Set<number>();
    const unique: number[] = [];
    for (const result of searchResults) {
      if (!seen.has(result.line_number)) {
        seen.add(result.line_number);
        unique.push(result.line_number);
      }
    }
    return unique;
  }, [searchResults]);

  const virtualCount = effectiveShowFiltered
    ? filteredLines.length
    : effectiveShowSearch
    ? uniqueSearchLines.length
    : totalLines;

  // 虚拟滚动
  const virtualizer = useVirtualizer({
    count: virtualCount,
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

    if (effectiveShowFiltered) {
      const lineNumbers = virtualItems.map(item => filteredLines[item.index]).filter((n): n is number => n !== undefined);
      if (lineNumbers.length > 0) {
        const minLine = Math.min(...lineNumbers);
        const maxLine = Math.max(...lineNumbers);
        ensureRangeLoaded(minLine, maxLine);
      }
    } else if (effectiveShowSearch) {
      const lineNumbers = virtualItems.map(item => uniqueSearchLines[item.index]).filter((n): n is number => n !== undefined);
      if (lineNumbers.length > 0) {
        const minLine = Math.min(...lineNumbers);
        const maxLine = Math.max(...lineNumbers);
        ensureRangeLoaded(minLine, maxLine);
      }
    } else {
      handleVisibleRangeChange(first, last);

      const visibleFirst = first + 1;
      const visibleLast = last + 1;
      window.dispatchEvent(new CustomEvent('visiblerangechange', {
        detail: { start: visibleFirst, end: visibleLast }
      }));
    }
  }, [virtualItems, handleVisibleRangeChange, effectiveShowFiltered, effectiveShowSearch, uniqueSearchLines, filteredLines, ensureRangeLoaded]);

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
    if (currentSearchIndex >= 0 && searchResults.length > 0 && currentSearchLine > 0) {
      if (effectiveShowSearch) {
        const idx = uniqueSearchLines.indexOf(currentSearchLine);
        if (idx >= 0) {
          virtualizer.scrollToIndex(idx, { align: 'center' });
        }
      } else if (effectiveShowFiltered) {
        const idx = filteredLines.indexOf(currentSearchLine);
        if (idx >= 0) {
          virtualizer.scrollToIndex(idx, { align: 'center' });
        }
      } else {
        virtualizer.scrollToIndex(currentSearchLine - 1, { align: 'center' });
        scrollToLine(currentSearchLine);
      }
    }
  }, [currentSearchIndex, currentSearchLine, virtualizer, scrollToLine, effectiveShowSearch, effectiveShowFiltered, searchResults.length, uniqueSearchLines, filteredLines]);

  // 右键菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent, text: string) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = (selection?.toString().trim() || text.slice(0, 50)) || '';

    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      text: selectedText,
    });
  }, []);

  if (!fileIndex) {
    return (
      <div className="log-viewer-empty">
        <div className="log-viewer-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
        <p className="log-viewer-empty-title">No Log File</p>
        <p className="log-viewer-empty-hint">Click "Open" to load a log file</p>
      </div>
    );
  }

  return (
    <div className="log-viewer">
      {/* 工具栏 */}
      <div className="log-toolbar">
        <div className="log-toolbar-left">
          {effectiveShowFiltered ? (
            <span className="log-status filtered">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {filteredLines.length.toLocaleString()} filtered
            </span>
          ) : effectiveShowSearch ? (
            <span className="log-status search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              {uniqueSearchLines.length.toLocaleString()} matches
            </span>
          ) : (
            <span className="log-status">
              {totalLines.toLocaleString()} lines
            </span>
          )}

          {searchResults.length > 0 && !effectiveShowFiltered && (
            <span className="log-search-nav">
              <button onClick={prevSearchResult} title="Previous (Shift+F3)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
              <span>{currentSearchIndex + 1}/{searchResults.length}</span>
              <button onClick={nextSearchResult} title="Next (F3)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </span>
          )}

          {searchResults.length > 0 && (
            <button
              className={`log-toggle-results-btn ${showSearchResults ? 'active' : ''}`}
              onClick={() => setShowSearchResults(!showSearchResults)}
              title="Toggle search results panel"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
          )}
        </div>

        <div className="log-toolbar-right">
          {highlightRules.length > 0 && (
            <span className="log-highlights-count" title="Custom highlights">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="13.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="10.5" r="2.5" />
                <circle cx="8.5" cy="7.5" r="2.5" />
                <circle cx="6.5" cy="12.5" r="2.5" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
              </svg>
              {highlightRules.filter(r => r.enabled).length}
            </span>
          )}
          <button className="log-settings-btn" onClick={() => setShowSettings(!showSettings)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div
        ref={parentRef}
        className="log-content"
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
            let lineNumber: number;
            if (effectiveShowFiltered) {
              lineNumber = filteredLines[virtualItem.index] ?? 0;
            } else if (effectiveShowSearch) {
              lineNumber = uniqueSearchLines[virtualItem.index] ?? 0;
            } else {
              lineNumber = virtualItem.index + 1;
            }

            const entry = entriesMap[lineNumber];

            if (!entry) {
              return (
                <div
                  key={virtualItem.key}
                  className="log-line loading"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="log-line-indicator" style={{ backgroundColor: '#4b5563' }} />
                  <span className="log-line-number">{lineNumber}</span>
                  <span className="log-line-content loading-text">Loading...</span>
                </div>
              );
            }

            if (!effectiveShowFiltered && !passesFilter(entry, filterState)) {
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

      {/* 搜索结果面板 */}
      {showSearchResults && searchResults.length > 0 && (
        <>
          <div
            className={`log-resize-handle ${isDraggingSearchPanel ? 'active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingSearchPanel(true);
              const startX = e.clientX;
              const startWidth = searchPanelWidth;

              const handleMouseMove = (e: MouseEvent) => {
                const delta = startX - e.clientX;
                const newWidth = Math.min(400, Math.max(200, startWidth + delta));
                setSearchPanelWidth(newWidth);
              };

              const handleMouseUp = () => {
                setIsDraggingSearchPanel(false);
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
          <SearchResultsPanel
            width={searchPanelWidth}
            onClose={() => setShowSearchResults(false)}
            onJumpToLine={(line) => {
              if (effectiveShowSearch) {
                const idx = uniqueSearchLines.indexOf(line);
                if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' });
              } else if (effectiveShowFiltered) {
                const idx = filteredLines.indexOf(line);
                if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' });
              } else {
                virtualizer.scrollToIndex(line - 1, { align: 'center' });
                scrollToLine(line);
              }
            }}
          />
        </>
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

      <style>{`
        .log-viewer {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0d0d0d;
          overflow: hidden;
          position: relative;
        }

        .log-viewer-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0d0d0d;
          color: rgba(255, 255, 255, 0.4);
        }

        .log-viewer-empty-icon {
          margin-bottom: 16px;
          color: rgba(255, 255, 255, 0.2);
        }

        .log-viewer-empty-title {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.6);
        }

        .log-viewer-empty-hint {
          font-size: 13px;
          margin: 0;
        }

        /* Toolbar */
        .log-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(30, 30, 30, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .log-toolbar-left, .log-toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .log-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .log-status svg {
          color: rgba(255, 255, 255, 0.4);
        }

        .log-status.filtered {
          color: rgba(34, 197, 94, 0.8);
        }

        .log-status.filtered svg {
          color: rgba(34, 197, 94, 0.8);
        }

        .log-status.search {
          color: rgba(59, 130, 246, 0.8);
        }

        .log-status.search svg {
          color: rgba(59, 130, 246, 0.8);
        }

        .log-search-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .log-search-nav button {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          padding: 4px 6px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          display: flex;
          transition: all 0.15s;
        }

        .log-search-nav button:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .log-highlights-count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .log-settings-btn {
          background: transparent;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          transition: all 0.15s;
        }

        .log-settings-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
        }

        .log-toggle-results-btn {
          background: transparent;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          transition: all 0.15s;
        }

        .log-toggle-results-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
        }

        .log-toggle-results-btn.active {
          background: rgba(59, 130, 246, 0.2);
          color: rgba(96, 165, 250, 1);
        }

        .log-resize-handle {
          position: absolute;
          right: 300px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: transparent;
          cursor: col-resize;
          z-index: 10;
          transition: background 0.15s;
        }

        .log-resize-handle:hover,
        .log-resize-handle.active {
          background: rgba(59, 130, 246, 0.5);
        }

        /* Search Results Panel */
        .search-results-panel {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(30, 30, 30, 0.98);
          backdrop-filter: blur(10px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          z-index: 5;
        }

        .search-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-results-title {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .search-results-close {
          background: transparent;
          border: none;
          padding: 4px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          transition: all 0.15s;
        }

        .search-results-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .search-results-list {
          flex: 1;
          overflow-y: auto;
        }

        .search-results-empty {
          padding: 40px 20px;
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
        }

        .search-results-item {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.15s;
        }

        .search-results-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .search-results-item.active {
          background: rgba(59, 130, 246, 0.15);
        }

        .search-results-line {
          display: block;
          font-size: 11px;
          color: rgba(59, 130, 246, 0.8);
          margin-bottom: 4px;
        }

        .search-results-preview {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
        }

        /* Log Content */
        .log-content {
          flex: 1;
          min-height: 0;
          overflow: auto;
          font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
        }

        /* Log Line */
        .log-line {
          display: flex;
          align-items: center;
          padding: 0 8px;
          border-left: 2px solid transparent;
          transition: background 0.1s;
        }

        .log-line:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .log-line.current-search {
          background: rgba(251, 191, 36, 0.1);
        }

        .log-line.current-search .log-line-indicator {
          box-shadow: 0 0 8px currentColor;
        }

        .log-line-indicator {
          width: 3px;
          height: 100%;
          min-height: 14px;
          flex-shrink: 0;
          margin-right: 8px;
          border-radius: 0 2px 2px 0;
        }

        .log-line-number {
          min-width: 50px;
          text-align: right;
          color: rgba(255, 255, 255, 0.25);
          font-variant-numeric: tabular-nums;
          padding-right: 12px;
          user-select: none;
          flex-shrink: 0;
        }

        .log-line-content {
          flex: 1;
          white-space: pre;
          overflow: hidden;
          text-overflow: ellipsis;
          color: rgba(255, 255, 255, 0.85);
        }

        .log-line-content.loading-text {
          color: rgba(255, 255, 255, 0.3);
          font-style: italic;
        }

        .log-highlight {
          border-radius: 2px;
          padding: 0 1px;
        }

        /* Context Menu */
        .context-menu {
          position: fixed;
          background: rgba(40, 40, 40, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 1000;
          min-width: 180px;
          padding: 4px;
        }

        .context-menu-header {
          padding: 8px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 4px;
        }

        .context-menu-preview {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .context-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }

        .context-menu-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .context-menu-item svg {
          color: rgba(255, 255, 255, 0.5);
        }

        .context-menu-arrow {
          margin-left: auto;
        }

        .context-menu-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 4px 0;
        }

        .context-menu-colors {
          display: flex;
          gap: 4px;
          padding: 8px 10px;
        }

        .context-menu-color-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }

        .context-menu-color-btn:hover {
          border-color: white;
          transform: scale(1.1);
        }

        /* Settings Panel */
        .settings-panel {
          position: absolute;
          top: 40px;
          right: 8px;
          background: rgba(40, 40, 40, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 100;
          min-width: 240px;
        }

        .settings-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .settings-panel-header h3 {
          font-size: 13px;
          font-weight: 600;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
        }

        .settings-panel-close {
          background: transparent;
          border: none;
          padding: 4px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          transition: all 0.15s;
        }

        .settings-panel-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .settings-section {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .settings-section:last-child {
          border-bottom: none;
        }

        .settings-label {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .settings-slider {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          appearance: none;
          cursor: pointer;
        }

        .settings-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.8);
          cursor: pointer;
        }

        .settings-colors {
          display: flex;
          gap: 6px;
        }

        .settings-color-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }

        .settings-color-btn:hover {
          border-color: rgba(255, 255, 255, 0.5);
        }

        .settings-color-btn.active {
          border-color: white;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .settings-rules {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 120px;
          overflow-y: auto;
        }

        .settings-rule {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .settings-rule-check {
          width: 14px;
          height: 14px;
          accent-color: #3b82f6;
        }

        .settings-rule-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .settings-rule-pattern {
          flex: 1;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-rule-remove {
          background: transparent;
          border: none;
          padding: 2px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          display: flex;
          transition: all 0.15s;
        }

        .settings-rule-remove:hover {
          background: rgba(239, 68, 68, 0.2);
          color: rgba(239, 68, 68, 0.8);
        }
      `}</style>
    </div>
  );
}

/// 检查日志条目是否通过过滤器
function passesFilter(
  entry: { category?: string; level: string },
  filterState: { selectedLevels: Set<string>; selectedCategories: Set<string>; excludedCategories: Set<string> }
): boolean {
  if (filterState.selectedLevels.size > 0) {
    if (!filterState.selectedLevels.has(entry.level)) {
      return false;
    }
  }

  if (filterState.selectedCategories.size > 0) {
    if (!entry.category || !filterState.selectedCategories.has(entry.category)) {
      return false;
    }
  }

  if (entry.category && filterState.excludedCategories.has(entry.category)) {
    return false;
  }

  return true;
}
