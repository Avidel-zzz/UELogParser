//! AI 相关类型定义

/// AI 服务提供商
export type AIProvider = 'claude' | 'glm';

/// Claude 配置
export interface ClaudeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/// GLM 配置
export interface GlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/// Claude 可用模型
export const CLAUDE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-sonnet-20241022',
] as const;

/// GLM 可用模型
export const GLM_MODELS = [
  'glm-4-plus',
  'glm-4-0520',
  'glm-4-flash',
] as const;

/// 聊天消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallResult[];
}

/// 工具调用结果
export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}
