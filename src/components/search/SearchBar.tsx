//! 搜索栏组件

import { useState, useCallback, useEffect } from 'react';
import { useLogStore } from '../../stores/logStore';

export function SearchBar() {
  const {
    searchOptions,
    searchResults,
    currentSearchIndex,
    search,
    setSearchOptions,
    nextSearchResult,
    prevSearchResult,
  } = useLogStore();

  const [localPattern, setLocalPattern] = useState(searchOptions.pattern);
  const [showOptions, setShowOptions] = useState(false);

  // 执行搜索
  const handleSearch = useCallback(() => {
    if (!localPattern.trim()) return;
    search({ ...searchOptions, pattern: localPattern });
  }, [localPattern, searchOptions, search]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSearch();
      } else if (e.key === 'F3' || (e.key === 'Enter' && !e.ctrlKey)) {
        if (e.shiftKey) {
          prevSearchResult();
        } else {
          nextSearchResult();
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearch, nextSearchResult, prevSearchResult]);

  const resultCount = searchResults.length;
  const currentPos = currentSearchIndex >= 0 ? currentSearchIndex + 1 : 0;

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-2">
      <div className="flex items-center gap-2">
        {/* 搜索输入 */}
        <div className="flex-1 relative">
          <input
            type="text"
            className="search-input pr-20"
            placeholder="Search (Ctrl+Enter)..."
            value={localPattern}
            onChange={(e) => setLocalPattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSearch();
              }
            }}
          />
          {/* 结果计数 */}
          {resultCount > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {currentPos}/{resultCount}
            </span>
          )}
        </div>

        {/* 搜索按钮 */}
        <button
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          onClick={handleSearch}
        >
          Search
        </button>

        {/* 导航按钮 */}
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
            onClick={prevSearchResult}
            disabled={resultCount === 0}
            title="Previous (Shift+F3)"
          >
            ↑
          </button>
          <button
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
            onClick={nextSearchResult}
            disabled={resultCount === 0}
            title="Next (F3)"
          >
            ↓
          </button>
        </div>

        {/* 选项按钮 */}
        <button
          className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          onClick={() => setShowOptions(!showOptions)}
        >
          ⚙
        </button>
      </div>

      {/* 搜索选项 */}
      {showOptions && (
        <div className="mt-2 flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={searchOptions.use_regex}
              onChange={(e) => setSearchOptions({ use_regex: e.target.checked })}
            />
            Regex
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={searchOptions.case_insensitive}
              onChange={(e) => setSearchOptions({ case_insensitive: e.target.checked })}
            />
            Case Insensitive
          </label>
        </div>
      )}
    </div>
  );
}
