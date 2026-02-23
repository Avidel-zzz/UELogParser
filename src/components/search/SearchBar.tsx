//! 搜索栏组件

import { useState, useCallback, useEffect } from 'react';
import { useLogStore } from '../../stores/logStore';

export function SearchBar() {
  const {
    searchOptions,
    searchResults,
    currentSearchIndex,
    showSearchOnly,
    search,
    setSearchOptions,
    nextSearchResult,
    prevSearchResult,
    setShowSearchOnly,
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

  // Toggle regex mode
  const toggleRegex = useCallback(() => {
    setSearchOptions({ use_regex: !searchOptions.use_regex });
  }, [searchOptions.use_regex, setSearchOptions]);

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-2">
      <div className="flex items-center gap-2">
        {/* Regex Toggle Switch - Visible in main bar */}
        <button
          onClick={toggleRegex}
          className={`
            relative flex items-center h-6 w-12 rounded-full transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
            ${searchOptions.use_regex ? 'bg-blue-600' : 'bg-gray-600'}
          `}
          title={searchOptions.use_regex ? 'Regex mode: ON' : 'Regex mode: OFF'}
          aria-pressed={searchOptions.use_regex}
          aria-label="Toggle regex search mode"
        >
          {/* Slider dot */}
          <span
            className={`
              inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
              ${searchOptions.use_regex ? 'translate-x-6' : 'translate-x-0.5'}
            `}
          />
        </button>
        {/* Regex label */}
        <span
          className={`text-xs font-medium min-w-[40px] ${
            searchOptions.use_regex ? 'text-blue-400' : 'text-gray-400'
          }`}
        >
          {searchOptions.use_regex ? 'Regex' : 'Text'}
        </span>

        {/* 搜索输入 */}
        <div className="flex-1 relative">
          <input
            type="text"
            className={`search-input pr-20 ${
              searchOptions.use_regex
                ? 'border-blue-500 focus:border-blue-400'
                : 'border-gray-600 focus:border-gray-500'
            }`}
            placeholder={searchOptions.use_regex ? 'Regex Search (Ctrl+Enter)...' : 'Text Search (Ctrl+Enter)...'}
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

        {/* 过滤切换按钮 */}
        <button
          className={`px-2 py-1.5 rounded text-sm disabled:opacity-50 transition-colors ${
            showSearchOnly
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          onClick={() => setShowSearchOnly(!showSearchOnly)}
          disabled={resultCount === 0}
          title={showSearchOnly ? 'Show all lines' : 'Show only matching lines'}
        >
          🔍
        </button>

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
