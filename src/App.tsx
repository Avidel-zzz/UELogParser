import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLogStore, type HighlightRule } from './stores/logStore';
import { useFilterStore, passesFilter } from './stores/filterStore';

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

/// 搜索栏组件
function SearchBar() {
  const { searchOptions, searchResults, currentSearchIndex, search, nextSearchResult, prevSearchResult } = useLogStore();
  const [pattern, setPattern] = useState('');

  const handleSearch = () => {
    if (pattern.trim()) {
      search({ ...searchOptions, pattern });
    }
  };

  return (
    <div style={{
      padding: '8px 16px',
      backgroundColor: '#252525',
      borderBottom: '1px solid #404040',
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
      <input
        type="text"
        placeholder="Search (Ctrl+Enter)..."
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) handleSearch();
          if (e.key === 'F3') {
            e.preventDefault();
            e.shiftKey ? prevSearchResult() : nextSearchResult();
          }
        }}
        style={{
          flex: 1,
          padding: '6px 12px',
          backgroundColor: '#1e1e1e',
          border: '1px solid #404040',
          borderRadius: '4px',
          color: '#e5e7eb',
          fontSize: '13px'
        }}
      />
      <button
        onClick={handleSearch}
        style={{
          padding: '6px 16px',
          backgroundColor: '#3b82f6',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Search
      </button>
      {searchResults.length > 0 && (
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
          {currentSearchIndex + 1}/{searchResults.length}
        </span>
      )}
    </div>
  );
}

/// 过滤面板
function FilterPanel() {
  const { fileIndex, categorySearch, setCategorySearch, highlightRules, addHighlightRule, removeHighlightRule, toggleHighlightRule } = useLogStore();
  const { toggleCategory, toggleLevel, selectedCategories: cats, selectedLevels: levels } = useFilterStore();
  const [showHighlight, setShowHighlight] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].color);

  if (!fileIndex) return null;

  const filteredCategories = Object.keys(fileIndex.categories)
    .filter(c => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
    .sort();

  return (
    <div style={{
      width: '240px',
      backgroundColor: '#252525',
      borderRight: '1px solid #404040',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Level Filter */}
      <div style={{ padding: '8px', borderBottom: '1px solid #404040' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>LOG LEVEL</div>
        {['error', 'warning', 'display', 'verbose'].map(level => (
          <label key={level} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 0',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            <input
              type="checkbox"
              checked={levels.has(level as any)}
              onChange={() => toggleLevel(level as any)}
              style={{ width: '14px', height: '14px' }}
            />
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: level === 'error' ? '#ef4444' :
                             level === 'warning' ? '#f97316' :
                             level === 'display' ? '#3b82f6' : '#6b7280'
            }} />
            <span style={{ textTransform: 'capitalize' }}>{level}</span>
            <span style={{ color: '#6b7280', marginLeft: 'auto' }}>
              {fileIndex.level_counts[level] || 0}
            </span>
          </label>
        ))}
      </div>

      {/* Category Filter */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px', borderBottom: '1px solid #404040' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>CATEGORY</div>
        <input
          type="text"
          placeholder="Search..."
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 8px',
            marginBottom: '8px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #404040',
            borderRadius: '4px',
            color: '#e5e7eb',
            fontSize: '12px'
          }}
        />
        <div style={{ maxHeight: '150px', overflow: 'auto' }}>
          {filteredCategories.slice(0, 50).map(cat => (
            <label key={cat} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '2px 0',
              cursor: 'pointer',
              fontSize: '11px'
            }}>
              <input
                type="checkbox"
                checked={cats.has(cat)}
                onChange={() => toggleCategory(cat)}
                style={{ width: '12px', height: '12px' }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
              <span style={{ color: '#6b7280' }}>{fileIndex.categories[cat]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Highlight Rules */}
      <div style={{ padding: '8px' }}>
        <div
          style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', cursor: 'pointer' }}
          onClick={() => setShowHighlight(!showHighlight)}
        >
          HIGHLIGHT RULES ({highlightRules.length}) {showHighlight ? '▼' : '▶'}
        </div>
        {showHighlight && (
          <>
            <div style={{ marginBottom: '8px' }}>
              {highlightRules.map(rule => (
                <div key={rule.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 0',
                  fontSize: '11px'
                }}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleHighlightRule(rule.id)}
                    style={{ width: '12px', height: '12px' }}
                  />
                  <span style={{ width: '10px', height: '10px', backgroundColor: rule.color }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.pattern}</span>
                  <button
                    onClick={() => removeHighlightRule(rule.id)}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                  >✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="text"
                placeholder="Pattern"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                style={{
                  flex: 1,
                  padding: '4px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #404040',
                  borderRadius: '4px',
                  color: '#e5e7eb',
                  fontSize: '11px'
                }}
              />
              <select
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{
                  padding: '4px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #404040',
                  borderRadius: '4px',
                  color: '#e5e7eb',
                  fontSize: '11px'
                }}
              >
                {PRESET_COLORS.map(c => (
                  <option key={c.color} value={c.color}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (newPattern.trim()) {
                    addHighlightRule(newPattern, newColor);
                    setNewPattern('');
                  }
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#404040',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#e5e7eb',
                  cursor: 'pointer'
                }}
              >+</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/// 日志行组件
function LogLine({ entry, highlightRules, searchPattern }: {
  entry: any;
  highlightRules: HighlightRule[];
  searchPattern: string;
}) {
  // 应用高亮
  let content = entry.raw;
  const highlights: { start: number; end: number; color: string }[] = [];

  // 搜索高亮
  if (searchPattern) {
    try {
      const regex = new RegExp(searchPattern, 'gi');
      let match;
      while ((match = regex.exec(content)) !== null) {
        highlights.push({ start: match.index, end: match.index + match[0].length, color: '#fbbf24' });
      }
    } catch (e) {}
  }

  // 自定义高亮规则
  for (const rule of highlightRules) {
    if (!rule.enabled) continue;
    try {
      const regex = new RegExp(rule.pattern, 'gi');
      let match;
      while ((match = regex.exec(content)) !== null) {
        highlights.push({ start: match.index, end: match.index + match[0].length, color: rule.color });
      }
    } catch (e) {}
  }

  // 渲染带高亮的内容
  const renderContent = () => {
    if (highlights.length === 0) return content;

    highlights.sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    highlights.forEach((h, i) => {
      if (h.start > lastEnd) {
        parts.push(<span key={`t${i}`}>{content.slice(lastEnd, h.start)}</span>);
      }
      parts.push(
        <span key={`h${i}`} style={{ backgroundColor: h.color + '40', color: h.color }}>
          {content.slice(h.start, h.end)}
        </span>
      );
      lastEnd = h.end;
    });

    if (lastEnd < content.length) {
      parts.push(<span key="end">{content.slice(lastEnd)}</span>);
    }

    return parts;
  };

  return (
    <div
      style={{
        padding: '2px 16px',
        borderBottom: '1px solid #2d2d2d',
        whiteSpace: 'pre',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: entry.level === 'error' ? '#3d1515' :
                         entry.level === 'warning' ? '#3d2a15' : 'transparent'
      }}
    >
      <span style={{ color: '#6b7280', marginRight: '12px' }}>
        {entry.line_number.toString().padStart(6, ' ')}
      </span>
      <span style={{ color: '#e5e7eb' }}>{renderContent()}</span>
    </div>
  );
}

/// 主应用
function App() {
  const {
    openFile, closeFile, fileIndex, isLoading, error,
    entriesMap, loadChunk, loadedRanges, searchResults,
    currentSearchIndex, highlightRules, fontSize, setFontSize
  } = useLogStore();
  const filterState = useFilterStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFilter, setShowFilter] = useState(true);

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

  // 初始加载
  useEffect(() => {
    if (fileIndex && loadedRanges.length === 0) {
      loadChunk(1, 500);
    }
  }, [fileIndex, loadedRanges.length, loadChunk]);

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !fileIndex || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 500) {
      const lastRange = loadedRanges[loadedRanges.length - 1];
      if (lastRange && lastRange.end < fileIndex.total_lines) {
        loadChunk(lastRange.end + 1, Math.min(lastRange.end + 500, fileIndex.total_lines));
      }
    }
  }, [fileIndex, isLoading, loadedRanges, loadChunk]);

  // 获取并过滤日志
  const entries = useMemo(() => {
    return Object.values(entriesMap)
      .sort((a, b) => a.line_number - b.line_number)
      .filter(e => passesFilter(e, filterState));
  }, [entriesMap, filterState]);

  // 滚动到搜索结果
  useEffect(() => {
    if (searchResults.length > 0 && scrollRef.current) {
      const line = searchResults[currentSearchIndex]?.line_number;
      if (line) {
        const element = scrollRef.current.querySelector(`[data-line="${line}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchResults, currentSearchIndex]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1e1e1e',
      color: '#e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Consolas, monospace',
      fontSize: `${fontSize}px`
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #404040'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '16px', margin: 0 }}>UE Log Parser</h1>
          {fileIndex && (
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {fileIndex.file_path.split(/[/\\]/).pop()} • {fileIndex.total_lines.toLocaleString()} lines
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleOpenFile}
            disabled={isLoading}
            style={{
              padding: '6px 16px',
              backgroundColor: isLoading ? '#555' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'wait' : 'pointer'
            }}
          >
            {isLoading ? 'Loading...' : 'Open File'}
          </button>
          {fileIndex && (
            <button
              onClick={closeFile}
              style={{
                padding: '6px 16px',
                backgroundColor: '#404040',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          )}
          <button
            onClick={() => setShowFilter(!showFilter)}
            style={{
              padding: '6px 16px',
              backgroundColor: showFilter ? '#3b82f6' : '#404040',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Filter
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              style={{ padding: '4px 8px', backgroundColor: '#404040', border: 'none', borderRadius: '4px', color: '#e5e7eb', cursor: 'pointer' }}
            >A-</button>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(20, fontSize + 1))}
              style={{ padding: '4px 8px', backgroundColor: '#404040', border: 'none', borderRadius: '4px', color: '#e5e7eb', cursor: 'pointer' }}
            >A+</button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      {fileIndex && <SearchBar />}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showFilter && fileIndex && <FilterPanel />}

        {/* Log Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#1a1a1a'
          }}
        >
          {!fileIndex ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              <div>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>No log file opened</p>
                <p>Click "Open File" to load a log file</p>
              </div>
            </div>
          ) : (
            <>
              {entries.map((entry) => (
                <div key={entry.line_number} data-line={entry.line_number}>
                  <LogLine
                    entry={entry}
                    highlightRules={highlightRules}
                    searchPattern=""
                  />
                </div>
              ))}
              {isLoading && (
                <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '4px 16px',
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #404040',
        fontSize: '11px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>{error ? `Error: ${error}` : 'Ready'}</span>
        <span>
          Showing {entries.length} lines
          {searchResults.length > 0 && ` • Search: ${currentSearchIndex + 1}/${searchResults.length}`}
        </span>
      </footer>
    </div>
  );
}

export default App;
