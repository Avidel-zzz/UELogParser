import { useCallback, useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLogStore } from './stores/logStore';
import { useSettingsStore } from './stores/settingsStore';
import { useChatStore } from './stores/chatStore';
import { SearchBar } from './components/search/SearchBar';
import { FilterPanel } from './components/filter/FilterPanel';
import { LogViewer } from './components/viewer/LogViewer';
import { ResizablePanel } from './components/ResizablePanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { SettingsModal } from './components/settings/SettingsModal';

/// Main application
function App() {
  const { openFile, closeFile, fileIndex, isLoading, error, fontSize } = useLogStore();
  const { showChat, setShowChat, chatWidth, setChatWidth, setShowSettings } = useSettingsStore();
  const { setVisibleLineRange } = useChatStore();
  const [showFilter, setShowFilter] = useState(true);
  const [isDraggingChat, setIsDraggingChat] = useState(false);

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

  // Listen for visible range changes from LogViewer
  useEffect(() => {
    const handleVisibleRange = (e: CustomEvent<{ start: number; end: number }>) => {
      setVisibleLineRange(e.detail.start, e.detail.end);
    };
    window.addEventListener('visiblerangechange', handleVisibleRange as EventListener);
    return () => window.removeEventListener('visiblerangechange', handleVisibleRange as EventListener);
  }, [setVisibleLineRange]);

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
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-4 py-1.5 rounded text-white border-none cursor-pointer ${
              showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white border-none cursor-pointer"
            title="Settings"
          >
            Settings
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {fileIndex && <SearchBar />}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Filter + LogViewer */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {showFilter && fileIndex ? (
            <ResizablePanel
              leftPanel={<FilterPanel />}
              rightPanel={<LogViewer />}
              initialLeftWidth={256}
              minWidth={150}
              maxWidth={500}
            />
          ) : (
            <LogViewer />
          )}
        </div>

        {/* Right: AI Chat */}
        {showChat && (
          <>
            {/* Resize Handle */}
            <div
              className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors duration-150 ${
                isDraggingChat ? 'bg-blue-500' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingChat(true);
                const startX = e.clientX;
                const startWidth = chatWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const delta = startX - e.clientX;
                  const newWidth = Math.min(500, Math.max(250, startWidth + delta));
                  setChatWidth(newWidth);
                };

                const handleMouseUp = () => {
                  setIsDraggingChat(false);
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
            <div style={{ width: chatWidth }} className="h-full flex-shrink-0">
              <ChatPanel />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <span>{error ? `Error: ${error}` : 'Ready'}</span>
        <span>Press F3 or Shift+F3 to navigate search results</span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
}

export default App;
