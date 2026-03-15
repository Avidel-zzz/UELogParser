# 项目概览

## 项目定位

UE Log Parser 是一个 Unreal Engine 日志查看与分析桌面工具。当前实现重点覆盖以下能力：

- 打开本地 `.log` / `.txt` 文件
- 对日志构建索引并统计类别、级别信息
- 按需加载日志区间，避免一次性加载整文件
- 使用文本或正则表达式进行全文件搜索
- 根据日志级别和类别过滤匹配行
- 在查看器中进行高亮、跳转和结果导航

从实现上看，这是一个 **Tauri 桌面应用**：

- 前端：React + TypeScript + Zustand + Vite
- 后端：Rust + Tauri v2
- UI：Tailwind 风格类名 + 虚拟滚动列表

## 核心使用流程

### 1. 打开日志文件

用户在主界面点击 `Open File` 后，前端通过 Tauri 文件对话框选择本地日志文件，然后调用后端命令打开并索引文件。

相关实现：

- `src/App.tsx:12`
- `src/services/tauriApi.ts:18`
- `src-tauri/src/commands/file_commands.rs:26`

### 2. 建立文件索引

后端在打开文件时会：

- 校验文件是否存在
- 为文件建立索引
- 统计总行数、类别分布、日志级别分布
- 返回前 100 行预览内容

相关实现：

- `src-tauri/src/commands/file_commands.rs:37`
- `src-tauri/src/streaming/file_indexer.rs:33`
- `src-tauri/src/commands/file_commands.rs:45`

### 3. 浏览大文件

前端不会一次性把整个日志加载到内存，而是：

- 先显示预览行
- 根据当前可见区域按需加载更多行
- 利用虚拟列表仅渲染当前视口附近的内容

相关实现：

- `src/hooks/useLogStream.ts:51`
- `src/components/viewer/LogViewer.tsx:345`
- `src-tauri/src/streaming/line_reader.rs:41`

### 4. 搜索日志

搜索支持两种模式：

- 文本搜索
- 正则搜索

搜索结果会保存行号与匹配范围，支持使用 `F3` / `Shift+F3` 在结果间导航，也可以切换为“仅显示搜索命中行”。

相关实现：

- `src/components/search/SearchBar.tsx:21`
- `src/stores/logStore.ts:245`
- `src-tauri/src/commands/search_commands.rs:9`

### 5. 过滤日志

过滤面板支持：

- 按日志级别筛选
- 按类别筛选
- 查看筛选结果数量
- 切换为仅显示匹配行

相关实现：

- `src/components/filter/FilterPanel.tsx:44`
- `src/stores/logStore.ts:359`
- `src-tauri/src/commands/filter_commands.rs:16`

### 6. 高亮与辅助阅读

查看器支持：

- 搜索结果高亮
- 自动高亮路径、UUID、数字
- 为选中文本创建自定义高亮规则
- 复制所选内容

相关实现：

- `src/hooks/useHighlight.ts:14`
- `src/components/viewer/LogViewer.tsx:22`
- `src/components/viewer/LogViewer.tsx:135`

## 仓库结构

```text
UELogParser/
├── docs/                  # 项目文档
├── public/                # 前端静态资源
├── src/                   # React 前端
│   ├── components/        # UI 组件
│   ├── hooks/             # 前端行为封装
│   ├── services/          # Tauri API 调用封装
│   ├── stores/            # Zustand 状态管理
│   ├── types/             # TypeScript 类型定义
│   └── App.tsx            # 前端应用壳层
├── src-tauri/             # Rust / Tauri 后端
│   ├── src/commands/      # Tauri 命令
│   ├── src/parser/        # 日志解析逻辑
│   ├── src/search/        # 搜索引擎
│   ├── src/streaming/     # 索引与按需读取
│   └── tauri.conf.json    # Tauri 配置
├── test/                  # 示例日志文件
├── package.json           # 前端脚本与依赖
└── README.md              # 项目根说明
```

## 当前实现特征

### 面向大文件

项目的处理思路不是“全量读入”，而是：

- 先索引文件偏移
- 再按范围读取行
- 最后在前端仅渲染当前窗口附近的数据

这使它适合较大的日志文件浏览场景。

### 前后端职责清晰

前端主要负责：

- 界面交互
- 状态管理
- 搜索/过滤操作发起
- 列表展示与高亮

后端主要负责：

- 文件打开与索引
- 日志行解析
- 文件范围读取
- 全文件搜索
- 过滤匹配行计算

### 当前文档范围

本文档只描述仓库中已经实现的能力，不扩展未在代码中落地的功能设想。
