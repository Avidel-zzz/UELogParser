# 使用指南

## 启动应用

开发时通常使用：

```bash
npm run tauri dev
```

构建桌面应用时使用：

```bash
npm run tauri build
```

## 打开日志文件

### 操作方式

1. 启动应用
2. 点击顶部的 `Open File`
3. 在文件选择框中选择日志文件

当前文件选择器对以下类型提供了直接筛选：

- `.log`
- `.txt`

实现位置：

- `src/App.tsx:12`

### 打开后会发生什么

成功打开文件后，应用会：

- 显示文件名
- 显示总行数
- 建立索引
- 读取前 100 行作为预览
- 启用搜索栏和过滤面板

相关实现：

- `src/App.tsx:39`
- `src-tauri/src/commands/file_commands.rs:37`
- `src-tauri/src/commands/file_commands.rs:45`

## 浏览日志

日志主视图支持大量行的平滑浏览，依赖两套机制：

- 虚拟列表：只渲染可见范围附近的 DOM
- 按需加载：只加载当前需要的数据块

这意味着：

- 文件很大时仍然可以滚动查看
- 未加载到的行会在需要时再请求后端

相关实现：

- `src/components/viewer/LogViewer.tsx:345`
- `src/hooks/useLogStream.ts:52`

## 搜索日志

### 基本搜索

在顶部搜索栏中输入关键词后，点击 `Search`，或使用快捷键：

- `Ctrl + Enter` 执行搜索

相关实现：

- `src/components/search/SearchBar.tsx:22`
- `src/components/search/SearchBar.tsx:30`

### 搜索模式

搜索支持两种模式：

- `Regex`：按正则表达式匹配
- `Text`：按普通文本匹配

可以通过搜索栏左侧切换按钮切换模式。

### 搜索结果导航

搜索完成后，可以使用以下方式在结果间移动：

- `F3`：下一个结果
- `Shift + F3`：上一个结果
- 搜索栏右侧箭头按钮

相关实现：

- `src/components/search/SearchBar.tsx:32`
- `src/components/viewer/LogViewer.tsx:383`
- `src/App.tsx:86`

### 仅查看命中结果

搜索栏中带有一个切换按钮，可切换为“仅显示搜索命中行”。

实现位置：

- `src/components/search/SearchBar.tsx:140`
- `src/components/viewer/LogViewer.tsx:337`

## 过滤日志

左侧 `Filters` 面板提供两类过滤：

- Log Level
- Category

### 按级别过滤

可以按以下级别筛选：

- error
- warning
- display
- verbose
- veryverbose
- unknown

每个级别右侧会显示当前文件中的数量统计。

实现位置：

- `src/components/filter/FilterPanel.tsx:7`
- `src/components/filter/FilterPanel.tsx:120`

### 按类别过滤

类别列表来自文件索引阶段的统计结果，支持：

- 搜索类别名称
- 全选当前过滤结果
- 清空当前类别选择

实现位置：

- `src/components/filter/FilterPanel.tsx:64`
- `src/components/filter/FilterPanel.tsx:145`

### 应用过滤

选择完成后点击 `Apply Filter`，应用会调用后端扫描文件并返回所有匹配的行号，然后进入仅显示匹配行的模式。

实现位置：

- `src/components/filter/FilterPanel.tsx:45`
- `src/stores/logStore.ts:360`
- `src-tauri/src/commands/filter_commands.rs:18`

### 清除过滤

- 如果当前处于过滤结果模式，可以使用 `✕` 按钮退出
- 也可以使用 `Reset All Filters` 清空所有过滤状态

实现位置：

- `src/components/filter/FilterPanel.tsx:220`
- `src/components/filter/FilterPanel.tsx:231`

## 高亮能力

### 搜索高亮

搜索命中内容会在查看器中被高亮显示。

### 自动高亮

如果当前行没有搜索命中，系统还会自动识别并高亮：

- Windows 路径
- UUID
- 数字

实现位置：

- `src/hooks/useHighlight.ts:43`

### 自定义高亮规则

在日志行上右键后，可以：

- 将选中文本加入自定义高亮规则
- 选择颜色
- 后续在查看器中持续高亮匹配内容

实现位置：

- `src/components/viewer/LogViewer.tsx:22`
- `src/components/viewer/LogViewer.tsx:53`
- `src/stores/logStore.ts:311`

### 复制文本

右键菜单还支持把选中文本复制到剪贴板。

实现位置：

- `src/components/viewer/LogViewer.tsx:80`

## 设置项

查看器设置中当前可调整：

- 字体大小
- 搜索高亮颜色
- 自定义高亮规则开关/删除

实现位置：

- `src/components/viewer/LogViewer.tsx:253`
- `src/stores/logStore.ts:297`
- `src/stores/logStore.ts:302`

## 界面状态提示

应用底部状态栏会显示：

- 当前错误信息
- 默认就绪状态 `Ready`
- 搜索导航快捷键提示

实现位置：

- `src/App.tsx:84`

## 适合的使用场景

根据当前实现，这个工具比较适合：

- 打开本地 Unreal Engine 日志进行排查
- 使用关键字或正则快速定位问题
- 按错误级别或模块类别聚焦问题范围
- 在大日志文件中进行滚动浏览和结果跳转

## 当前已知行为边界

基于现有代码，可以明确的边界包括：

- 文件来源是本地文件，不是远程日志流
- 过滤结果由后端扫描计算，不是预先保存的索引查询
- 根目录没有统一的 `npm test` 入口
- 搜索与过滤都依赖先成功打开文件

如果你要扩展使用说明，建议后续再补充：

- 常见日志样式示例
- 正则搜索样例
- 性能建议
- 故障排查
