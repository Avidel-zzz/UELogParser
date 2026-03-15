# 架构说明

## 整体架构

UE Log Parser 采用前后端分离的桌面应用结构：

- React 前端负责界面和交互
- Tauri 作为桌面壳层与调用桥
- Rust 后端负责日志文件处理、索引、搜索和过滤

```text
UI (React)
  ↓
Zustand Store
  ↓
Tauri API invoke
  ↓
Rust Commands
  ↓
Parser / Search / Streaming
  ↓
Local log file
```

关键入口：

- 前端应用壳层：`src/App.tsx:8`
- Tauri API 封装：`src/services/tauriApi.ts:18`
- 后端命令注册：`src-tauri/src/lib.rs:15`

## 前端架构

### 1. 应用壳层

`src/App.tsx:8` 负责整个界面的顶层布局：

- 顶部操作栏
- 搜索栏
- 过滤面板
- 日志查看器
- 底部状态栏

主要职责：

- 打开文件
- 关闭文件
- 切换过滤面板显隐
- 展示当前文件名称与总行数

### 2. 状态管理

前端主要使用 Zustand 统一管理应用状态。

核心状态仓库：`src/stores/logStore.ts:78`

该 store 维护：

- 当前文件索引 `fileIndex`
- 加载中的日志行映射 `entriesMap`
- 已加载范围 `loadedRanges`
- 搜索条件与搜索结果
- 过滤条件与过滤结果行号
- 字体大小、高亮颜色等 UI 设置
- 自定义高亮规则
- 仅显示搜索结果 / 仅显示过滤结果等显示模式

与过滤选择直接相关的 UI 状态还分离在：

- `src/stores/filterStore.ts`

这种划分意味着：

- `logStore` 管理“文件数据和应用行为”
- `filterStore` 管理“筛选选择状态”

### 3. 组件分层

#### 搜索栏

`src/components/search/SearchBar.tsx:5`

负责：

- 搜索关键词输入
- 文本/正则模式切换
- 大小写敏感选项
- 搜索触发
- 搜索结果导航
- 切换“仅显示搜索结果”

#### 过滤面板

`src/components/filter/FilterPanel.tsx:18`

负责：

- 展示级别列表及计数
- 展示类别列表
- 类别搜索
- 应用过滤
- 清空过滤
- 重置所有筛选

#### 日志查看器

`src/components/viewer/LogViewer.tsx:306`

负责：

- 虚拟滚动渲染
- 根据模式决定展示全量行、过滤结果行或搜索结果行
- 滚动时触发按需加载
- 搜索结果跳转
- 右键菜单
- 设置面板与搜索结果面板

### 4. 前端行为 Hook

#### useLogStream

`src/hooks/useLogStream.ts:9`

负责：

- 计算可见范围
- 对视口周边行进行预加载
- 跳转到指定行前确保目标范围已加载

关键策略：

- `CHUNK_SIZE = 200`
- `PRELOAD_THRESHOLD = 50`

#### useHighlight

`src/hooks/useHighlight.ts:14`

负责把一行文本切分为可渲染片段，并按优先级加高亮：

1. 搜索结果
2. 自定义高亮规则
3. 自动高亮（路径 / UUID / 数字）

## Tauri 桥接层

前端通过 `invoke(...)` 与后端命令通信，调用统一封装在：

- `src/services/tauriApi.ts:18`

当前封装的主要命令包括：

- `open_log_file`
- `load_chunk`
- `get_file_index`
- `close_file`
- `search_logs`
- `search_next`
- `test_regex`
- `get_filtered_lines`

后端统一在 `src-tauri/src/lib.rs:25` 注册这些命令。

## 后端架构

后端主要由四层构成：

- commands
- parser
- search
- streaming

### 1. Commands 层

#### 文件命令

`src-tauri/src/commands/file_commands.rs:26`

负责：

- 打开文件
- 建立索引
- 创建行读取器
- 读取预览行
- 读取区间块
- 返回当前文件索引
- 关闭文件

共享状态定义在：

- `src-tauri/src/commands/file_commands.rs:9`

包含：

- 当前文件路径
- 当前索引
- 当前行读取器

#### 搜索命令

`src-tauri/src/commands/search_commands.rs:9`

负责：

- 执行全文件搜索
- 执行增量分页搜索
- 测试正则表达式

#### 过滤命令

`src-tauri/src/commands/filter_commands.rs:17`

负责：

- 根据级别和类别扫描文件
- 返回匹配的行号列表
- 返回总匹配数量

这里的过滤结果是“行号列表”，不是直接返回完整日志内容，因此可以和前端现有的按需加载机制结合。

## 解析层

核心解析器位于：

- `src-tauri/src/parser/log_parser.rs:10`

当前支持的日志形式包括：

- Unreal Engine 标准格式
- 简化的 `Category: Level: Message` 格式
- 文件头格式
- 续行

主要能力：

- 解析单行到结构化 `LogEntry`
- 从原始文本提取日志级别
- 从原始文本提取日志类别

解析输出在前后端间通过共享结构表达：

- TypeScript：`src/types/log.ts`
- Rust：`src-tauri/src/parser/types.rs`

## 搜索层

搜索逻辑位于：

- `src-tauri/src/search/regex_engine.rs`

搜索支持两类模式：

- 正则表达式
- 纯文本（通过转义后作为正则处理）

搜索输出包含：

- 匹配行号
- 匹配文本
- 起止位置

前端据此实现：

- 搜索结果计数
- 当前结果定位
- 文本高亮
- F3 / Shift+F3 导航

## Streaming 层

### 1. 文件索引器

`src-tauri/src/streaming/file_indexer.rs:18`

作用：

- 使用 `memmap2` 建立内存映射
- 扫描全文，记录行偏移检查点
- 统计类别分布和日志级别分布
- 生成 `FileIndex`

这一步是大文件能力的基础，因为它避免了每次从头顺序扫描来定位目标行。

### 2. 行读取器

`src-tauri/src/streaming/line_reader.rs:29`

作用：

- 依据索引定位文件偏移
- 使用 `Seek` + `BufReader` 读取指定行范围
- 把文本解析为 `LogEntry`
- 对读取块做简单缓存

缓存容量定义为：

- `CACHE_SIZE = 100`

## 关键数据流

### 打开文件

```text
App.tsx
  → logStore.openFile
  → tauriApi.openLogFile
  → Rust open_log_file
  → index_file + LineReader::from_index + read_preview
  → 返回 FileIndex + preview
  → 前端保存 fileIndex / entriesMap / loadedRanges
```

相关位置：

- `src/App.tsx:12`
- `src/stores/logStore.ts:106`
- `src/services/tauriApi.ts:18`
- `src-tauri/src/commands/file_commands.rs:26`

### 滚动加载

```text
LogViewer virtual scroll
  → useLogStream.handleVisibleRangeChange
  → logStore.ensureRangeLoaded
  → tauriApi.loadChunk
  → Rust load_chunk
  → LineReader.read_range
  → 返回 LogChunk
  → 前端合并 entriesMap / loadedRanges
```

相关位置：

- `src/components/viewer/LogViewer.tsx:355`
- `src/hooks/useLogStream.ts:52`
- `src/stores/logStore.ts:208`
- `src-tauri/src/commands/file_commands.rs:59`
- `src-tauri/src/streaming/line_reader.rs:42`

### 搜索

```text
SearchBar
  → logStore.search
  → tauriApi.searchLogs
  → Rust search_logs
  → SearchEngine.search_in_file
  → 返回 SearchResult[]
  → 前端保存结果并支持导航/高亮
```

相关位置：

- `src/components/search/SearchBar.tsx:22`
- `src/stores/logStore.ts:245`
- `src-tauri/src/commands/search_commands.rs:9`

### 过滤

```text
FilterPanel
  → logStore.applyLevelCategoryFilter
  → tauriApi.getFilteredLines
  → Rust get_filtered_lines
  → 扫描并返回匹配行号
  → 前端切换到仅显示过滤结果模式
```

相关位置：

- `src/components/filter/FilterPanel.tsx:45`
- `src/stores/logStore.ts:360`
- `src-tauri/src/commands/filter_commands.rs:18`

## 当前架构特点

### 优点

- 前后端职责边界明确
- 对大文件浏览友好
- 搜索与过滤都能复用“按行号懒加载”的展示模式
- 前端渲染压力可控

### 当前实现上的注意点

- 根目录 `package.json` 中没有定义统一的 `test` 脚本
- 文档与代码中存在中英文混合注释风格
- 过滤结果是后端扫描后返回行号，不是增量索引结构

这些都不是错误，但在后续迭代和维护时值得留意。
