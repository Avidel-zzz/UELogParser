//! AI API 服务层

import type { AIProvider, ChatMessage } from '../types/ai';

/// 工具定义
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      items?: {
        type: string;
      };
    }>;
    required?: string[];
  };
}

/// API 响应
interface APIResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  stopReason: string;
}

/// Claude API 请求格式
interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: 'text'; text: string } | { type: 'tool_result'; tool_use_id: string; content: string }>;
  }>;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: ToolDefinition['input_schema'];
  }>;
}

/// GLM API 请求格式（OpenAI 兼容）
interface GlmRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  }>;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: ToolDefinition['input_schema'];
    };
  }>;
  max_tokens?: number;
}

/// 调用 Claude API
async function callClaude(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<APIResponse> {
  // 构建 Claude 消息格式
  const claudeMessages: ClaudeRequest['messages'] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    if (msg.role === 'user') {
      claudeMessages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      // 检查是否有工具调用结果需要包含
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const content: ClaudeRequest['messages'][0]['content'] = [];
        content.push({ type: 'text', text: msg.content });

        // 添加工具使用信息（如果有的话）
        // Claude 的格式稍有不同，这里简化处理
        claudeMessages.push({ role: 'assistant', content: content });
      } else {
        claudeMessages.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  const request: ClaudeRequest = {
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: claudeMessages,
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    })),
  };

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // 解析响应
  let content = '';
  const toolCalls: APIResponse['toolCalls'] = [];

  for (const block of data.content || []) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input,
      });
    }
  }

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: data.stop_reason,
  };
}

/// 调用 GLM API (OpenAI 兼容格式)
async function callGlm(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<APIResponse> {
  const glmMessages: GlmRequest['messages'] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    if (msg.role === 'user') {
      glmMessages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        glmMessages.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        });
      } else {
        glmMessages.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  const request: GlmRequest = {
    model,
    messages: glmMessages,
    tools: tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    })),
    max_tokens: 4096,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const choice = data.choices[0];

  let content = choice.message?.content || '';
  const toolCalls: APIResponse['toolCalls'] = [];

  if (choice.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      });
    }
  }

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: choice.finish_reason,
  };
}

/// 统一的 AI 调用接口
export async function chat(
  provider: AIProvider,
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<APIResponse> {
  if (provider === 'claude') {
    return callClaude(apiKey, baseUrl, model, systemPrompt, messages, tools);
  }
  return callGlm(apiKey, baseUrl, model, systemPrompt, messages, tools);
}

/// 获取工具定义
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'read_lines',
      description: 'Read a specific range of lines from the log file',
      input_schema: {
        type: 'object',
        properties: {
          start: { type: 'number', description: 'Start line number (1-based)' },
          end: { type: 'number', description: 'End line number (inclusive)' },
        },
        required: ['start', 'end'],
      },
    },
    {
      name: 'search_logs',
      description: 'Search for lines matching a pattern in the log file',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search pattern' },
          use_regex: { type: 'boolean', description: 'Whether to use regex matching (default: false)' },
          case_insensitive: { type: 'boolean', description: 'Whether to ignore case (default: true)' },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'get_file_info',
      description: 'Get metadata about the current log file',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_filtered_lines',
      description: 'Get lines filtered by log level and/or category',
      input_schema: {
        type: 'object',
        properties: {
          levels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Log levels to filter (error, warning, display, verbose, veryverbose)',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Categories to filter',
          },
        },
      },
    },
  ];
}
