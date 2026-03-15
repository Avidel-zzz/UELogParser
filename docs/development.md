# 开发说明

## 环境要求

根据当前仓库内容，开发这个项目需要至少具备以下环境：

- Node.js 20+
- Rust stable
- Tauri v2 所需平台依赖

参考位置：

- `README.md:21`
- `package.json:5`
- `.github/workflows/build.yml`

## 安装依赖

```bash
npm install
```

如果是 CI 或希望使用锁文件安装：

```bash
npm ci
```

## 常用命令

当前 `package.json` 中定义的脚本如下：

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run tauri dev
npm run tauri build
```

对应来源：

- `package.json:5`
- `README.md:27`

### 命令说明

#### `npm run dev`

启动 Vite 前端开发服务器。

#### `npm run tauri dev`

启动完整桌面应用开发环境，适合联调前端与 Rust 后端。

#### `npm run build`

执行 TypeScript 构建并打包前端资源：

- `tsc -b`
- `vite build`

定义位置：`package.json:7`

#### `npm run tauri build`

构建 Tauri 桌面应用产物。

#### `npm run lint`

运行 ESLint 检查前端代码。

## 推荐开发流程

### 1. 启动应用

优先使用：

```bash
npm run tauri dev
```

这样可以直接验证：

- 文件打开流程
- Tauri invoke 通信
- Rust 后端命令
- 大文件滚动加载
- 搜索与过滤功能

### 2. 前端快速开发

如果只处理纯前端界面问题，也可以先运行：

```bash
npm run dev
```

但需要注意：

- 项目核心能力依赖 Tauri 后端
- 仅运行 Vite 时，和本地文件交互相关的能力不一定完整可测

### 3. 代码修改后验证

建议至少执行：

```bash
npm run lint
npm run build
```

如果修改涉及桌面交互、文件读取、搜索、过滤或索引逻辑，建议再运行：

```bash
npm run tauri dev
```

进行手动回归。

## 后端测试现状

当前根目录 `package.json` 没有定义 `npm test` 脚本，因此项目并不存在统一的前端测试入口。

不过 Rust 源码中已经包含若干单元测试，主要分布在：

- `src-tauri/src/parser/log_parser.rs:104`
- `src-tauri/src/streaming/file_indexer.rs:107`
- `src-tauri/src/streaming/line_reader.rs:186`

这说明：

- 后端核心逻辑已有一定测试覆盖
- 但仓库尚未暴露统一的测试命令给根目录脚本

如果需要在本地执行 Rust 测试，通常会在 `src-tauri` 下使用 Cargo 测试命令；不过当前文档只基于仓库中已显式体现的信息，不额外扩展未写入说明的工作流。

## 关键开发关注点

### 1. 大文件性能

该项目最重要的设计目标之一是处理较大的日志文件。修改相关逻辑时，优先关注：

- 是否破坏索引结构
- 是否导致前端一次性持有过多数据
- 是否影响虚拟列表和按需加载配合

关键文件：

- `src/hooks/useLogStream.ts:5`
- `src/components/viewer/LogViewer.tsx:339`
- `src-tauri/src/streaming/file_indexer.rs:33`
- `src-tauri/src/streaming/line_reader.rs:42`

### 2. 搜索行为一致性

搜索功能涉及：

- 搜索条件状态
- 前端结果导航
- 后端文件级搜索
- 搜索结果高亮

修改其中任一部分时，最好连同以下文件一起检查：

- `src/components/search/SearchBar.tsx:21`
- `src/stores/logStore.ts:245`
- `src/hooks/useHighlight.ts:21`
- `src-tauri/src/commands/search_commands.rs:9`

### 3. 过滤模式与展示模式

当前“过滤”不是简单的前端列表筛选，而是后端扫描得到匹配行号，前端再切换显示模式。因此修改过滤功能时要同时确认：

- 过滤选择状态
- 后端返回的匹配行号
- 查看器使用 `filteredLines` 的展示逻辑

关键文件：

- `src/components/filter/FilterPanel.tsx:44`
- `src/stores/logStore.ts:359`
- `src/components/viewer/LogViewer.tsx:334`
- `src-tauri/src/commands/filter_commands.rs:18`

## 构建与发布

仓库中包含 GitHub Actions 工作流，用于多平台 Tauri 构建。

可以关注：

- `.github/workflows/build.yml`

从工作流可以看出：

- Windows / macOS / Ubuntu 都是目标平台
- Ubuntu 平台安装了 Tauri 所需系统依赖
- 前端依赖通过 `npm ci` 安装

## 建议的阅读顺序

如果你要继续维护这个项目，建议按以下顺序阅读：

1. `README.md`
2. `src/App.tsx`
3. `src/stores/logStore.ts`
4. `src/components/viewer/LogViewer.tsx`
5. `src/services/tauriApi.ts`
6. `src-tauri/src/lib.rs`
7. `src-tauri/src/commands/file_commands.rs`
8. `src-tauri/src/commands/search_commands.rs`
9. `src-tauri/src/commands/filter_commands.rs`
10. `src-tauri/src/streaming/file_indexer.rs`
11. `src-tauri/src/streaming/line_reader.rs`
12. `src-tauri/src/parser/log_parser.rs`

这样可以先理解产品入口，再理解状态和视图层，最后再深入后端实现。
