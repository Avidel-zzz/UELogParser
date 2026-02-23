import { useCallback, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLogStore } from './stores/logStore';
import { SearchBar } from './components/search/SearchBar';
import { FilterPanel } from './components/filter/FilterPanel';
import { LogViewer } from './components/viewer/LogViewer';

/// Main application
function App() {
  const { openFile, closeFile, fileIndex, isLoading, error, fontSize } = useLogStore();
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
        </div>
      </header>

      {/* Search Bar */}
      {fileIndex && <SearchBar />}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {showFilter && fileIndex && <FilterPanel />}
        <LogViewer />
      </div>

      {/* Footer */}
      <footer className="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <span>{error ? `Error: ${error}` : 'Ready'}</span>
        <span>Press F3 or Shift+F3 to navigate search results</span>
      </footer>
    </div>
  );
}

export default App;
