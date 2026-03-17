//! 聊天状态管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '../types/ai';

interface ChatState {
  // 当前对话
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // 上下文
  visibleLineRange: { start: number; end: number };
  attachedLines: number[];

  // 会话存储（按文件路径）
  sessions: Record<string, ChatMessage[]>;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 上下文
  setVisibleLineRange: (start: number, end: number) => void;
  setAttachedLines: (lines: number[]) => void;
  attachVisibleLines: () => void;

  // 会话管理
  saveSession: (filePath: string) => void;
  loadSession: (filePath: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,
      visibleLineRange: { start: 0, end: 0 },
      attachedLines: [],
      sessions: {},

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, newMessage] }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      clearMessages: () => set({ messages: [], error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setVisibleLineRange: (start, end) =>
        set({ visibleLineRange: { start, end } }),

      setAttachedLines: (attachedLines) => set({ attachedLines }),

      attachVisibleLines: () => {
        const { visibleLineRange } = get();
        const lines: number[] = [];
        for (let i = visibleLineRange.start; i <= visibleLineRange.end; i++) {
          lines.push(i);
        }
        set({ attachedLines: lines });
      },

      saveSession: (filePath) => {
        const { messages } = get();
        set((state) => ({
          sessions: { ...state.sessions, [filePath]: messages },
        }));
      },

      loadSession: (filePath) => {
        const { sessions } = get();
        const messages = sessions[filePath] || [];
        set({ messages, error: null });
      },
    }),
    {
      name: 'ue-log-parser-chat-sessions',
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);
