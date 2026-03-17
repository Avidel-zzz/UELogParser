//! 设置弹窗组件

import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { CLAUDE_MODELS, GLM_MODELS } from '../../types/ai';

export function SettingsModal() {
  const {
    provider,
    claude,
    glm,
    setProvider,
    setClaudeConfig,
    setGlmConfig,
    showSettings,
    setShowSettings,
  } = useSettingsStore();

  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGlmKey, setShowGlmKey] = useState(false);

  const handleClose = useCallback(() => setShowSettings(false), [setShowSettings]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!showSettings) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, handleClose]);

  if (!showSettings) return null;

  const handleSave = () => {
    setShowSettings(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {/* Provider Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded text-sm ${
                provider === 'claude'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setProvider('claude')}
            >
              Claude
            </button>
            <button
              className={`px-4 py-2 rounded text-sm ${
                provider === 'glm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setProvider('glm')}
            >
              GLM
            </button>
          </div>

          {/* Claude Config */}
          {provider === 'claude' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showClaudeKey ? 'text' : 'password'}
                    value={claude.apiKey}
                    onChange={(e) => setClaudeConfig({ apiKey: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="sk-ant-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowClaudeKey(!showClaudeKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showClaudeKey ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={claude.baseUrl}
                  onChange={(e) => setClaudeConfig({ baseUrl: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="https://api.anthropic.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Model
                </label>
                <select
                  value={claude.model}
                  onChange={(e) => setClaudeConfig({ model: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {CLAUDE_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* GLM Config */}
          {provider === 'glm' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showGlmKey ? 'text' : 'password'}
                    value={glm.apiKey}
                    onChange={(e) => setGlmConfig({ apiKey: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Enter GLM API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGlmKey(!showGlmKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showGlmKey ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={glm.baseUrl}
                  onChange={(e) => setGlmConfig({ baseUrl: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="https://open.bigmodel.cn/api/paas/v4"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Model
                </label>
                <select
                  value={glm.model}
                  onChange={(e) => setGlmConfig({ model: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {GLM_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
