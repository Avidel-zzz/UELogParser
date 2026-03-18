//! 设置状态管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider, ClaudeConfig, GlmConfig } from '../types/ai';

interface SettingsState {
  // AI 配置
  provider: AIProvider;
  claude: ClaudeConfig;
  glm: GlmConfig;

  // UI 状态
  showChat: boolean;
  chatWidth: number;
  showSettings: boolean;

  // Actions
  setProvider: (provider: AIProvider) => void;
  setClaudeConfig: (config: Partial<ClaudeConfig>) => void;
  setGlmConfig: (config: Partial<GlmConfig>) => void;
  setShowChat: (show: boolean) => void;
  setChatWidth: (width: number) => void;
  setShowSettings: (show: boolean) => void;

  // Computed
  isConfigured: () => boolean;
  getCurrentConfig: () => { apiKey: string; baseUrl: string; model: string };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: 'claude',
      claude: {
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
      glm: {
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash',
      },
      showChat: false,
      chatWidth: 320,
      showSettings: false,

      setProvider: (provider) => set({ provider }),
      setClaudeConfig: (config) =>
        set((state) => ({ claude: { ...state.claude, ...config } })),
      setGlmConfig: (config) =>
        set((state) => ({ glm: { ...state.glm, ...config } })),
      setShowChat: (showChat) => set({ showChat }),
      setChatWidth: (chatWidth) => set({ chatWidth }),
      setShowSettings: (showSettings) => set({ showSettings }),

      isConfigured: () => {
        const { provider, claude, glm } = get();
        if (provider === 'claude') {
          return claude.apiKey.length > 0;
        }
        return glm.apiKey.length > 0;
      },

      getCurrentConfig: () => {
        const { provider, claude, glm } = get();
        if (provider === 'claude') {
          return { apiKey: claude.apiKey, baseUrl: claude.baseUrl, model: claude.model };
        }
        return { apiKey: glm.apiKey, baseUrl: glm.baseUrl, model: glm.model };
      },
    }),
    {
      name: 'ue-log-parser-settings',
    }
  )
);
