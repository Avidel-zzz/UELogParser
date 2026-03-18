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
      className="app-container"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: `${fontSize}px` }}
    >
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="header-title">UE Log Parser</span>
          </div>
          {fileIndex && (
            <div className="header-file-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <span className="header-filename">{fileIndex.file_path.split(/[/\\]/).pop()}</span>
              <span className="header-stats">{fileIndex.total_lines.toLocaleString()} lines</span>
            </div>
          )}
        </div>

        <div className="header-right">
          <button
            className={`header-btn primary ${isLoading ? 'loading' : ''}`}
            onClick={handleOpenFile}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Open</span>
              </>
            )}
          </button>

          {fileIndex && (
            <button className="header-btn" onClick={closeFile}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span>Close</span>
            </button>
          )}

          <div className="header-divider" />

          <button
            className={`header-btn toggle ${showFilter ? 'active' : ''}`}
            onClick={() => setShowFilter(!showFilter)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter</span>
          </button>

          <button
            className={`header-btn toggle ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>AI Chat</span>
          </button>

          <div className="header-divider" />

          <button
            className="header-btn icon-only"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63 1.65 1.65 0 0 0-.33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63 1.65 1.65 0 0 0-.33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63 1.65 1.65 0 0 0-.33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63 1.65 1.65 0 0 0-1.36.63l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3.06 9.19a1.65 1.65 0 0 0 1.36.63 1.65 1.65 0 0 0 1.36-.63 1.65 1.65 0 0 0 .33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9.19a1.65 1.65 0 0 0 1.36-.63 1.65 1.65 0 0 0 .63-1.36V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 .63 1.36 1.65 1.65 0 0 0 1.36.63 1.65 1.65 0 0 0 1.36-.63l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9.19a1.65 1.65 0 0 0 .63 1.36 1.65 1.65 0 0 0 1.36.63 1.65 1.65 0 0 0 1.36-.63l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V17a1.65 1.65 0 0 0 .63 1.36 1.65 1.65 0 0 0 1.36.63 1.65 1.65 0 0 0 1.36-.63l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V21a1.65 1.65 0 0 0-.63 1.36 1.65 1.65 0 0 0 .63 1.36 1.65 1.65 0 0 0 1.36.63 1.65 1.65 0 0 0 1.36-.63l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V21a1.65 1.65 0 0 0-.63 1.36 1.65 1.65 0 0 0 .63 1.36 1.65 1.65 0 0 0 1.36.63h.09a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.36.63 1.65 1.65 0 0 0-.63 1.36v.09a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63H15a1.65 1.65 0 0 0-1.36.63 1.65 1.65 0 0 0-.63 1.36v.09a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63H7a1.65 1.65 0 0 0-1.36.63 1.65 1.65 0 0 0-.63 1.36v.09a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-.63-1.36 1.65 1.65 0 0 0-1.36-.63H0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {fileIndex && <SearchBar />}

      {/* Main Content */}
      <div className="app-main">
        {/* Left: Filter + LogViewer */}
        <div className="app-content-left">
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
              className={`resize-handle ${isDraggingChat ? 'active' : ''}`}
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
            <div style={{ width: chatWidth }} className="chat-panel-container">
              <ChatPanel />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <span className={`footer-status ${error ? 'error' : ''}`}>
          {error ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Ready
            </>
          )}
        </span>
        <span className="footer-hint">
          <kbd>F3</kbd> / <kbd>Shift+F3</kbd> Navigate search
        </span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal />

      <style>{`
        .app-container {
          width: 100vw;
          height: 100vh;
          background: #1a1a1a;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Header */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 44px;
          background: rgba(40, 40, 40, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
        }

        .header-logo svg {
          color: rgba(59, 130, 246, 0.8);
        }

        .header-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.3px;
        }

        .header-file-info {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .header-file-info svg {
          color: rgba(255, 255, 255, 0.4);
        }

        .header-filename {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-stats {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          padding-left: 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-divider {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 6px;
        }

        .header-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .header-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
        }

        .header-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .header-btn.primary {
          background: rgba(59, 130, 246, 0.8);
          color: white;
        }

        .header-btn.primary:hover:not(:disabled) {
          background: rgba(59, 130, 246, 1);
        }

        .header-btn.primary.loading {
          background: rgba(59, 130, 246, 0.5);
        }

        .header-btn.toggle.active {
          background: rgba(59, 130, 246, 0.2);
          color: rgba(96, 165, 250, 1);
        }

        .header-btn.icon-only {
          padding: 6px 8px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Main content */
        .app-main {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .app-content-left {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .chat-panel-container {
          height: 100%;
          flex-shrink: 0;
        }

        .resize-handle {
          width: 4px;
          background: rgba(255, 255, 255, 0.05);
          cursor: col-resize;
          flex-shrink: 0;
          transition: background 0.15s;
        }

        .resize-handle:hover,
        .resize-handle.active {
          background: rgba(59, 130, 246, 0.5);
        }

        /* Footer */
        .app-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 28px;
          background: rgba(40, 40, 40, 0.9);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          flex-shrink: 0;
        }

        .footer-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.5);
        }

        .footer-status svg {
          color: rgba(34, 197, 94, 0.8);
        }

        .footer-status.error {
          color: rgba(239, 68, 68, 0.8);
        }

        .footer-status.error svg {
          color: rgba(239, 68, 68, 0.8);
        }

        .footer-hint {
          color: rgba(255, 255, 255, 0.3);
        }

        .footer-hint kbd {
          display: inline-block;
          padding: 1px 5px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          font-family: inherit;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}

export default App;
